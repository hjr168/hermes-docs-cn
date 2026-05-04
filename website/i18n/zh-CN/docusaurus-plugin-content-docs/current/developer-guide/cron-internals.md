---
sidebar_position: 11
title: "Cron 内部机制"
description: "Hermes 如何存储、调度、编辑、暂停、加载 Skill 和投递 Cron 任务"
---

# Cron 内部机制

Cron 子系统提供定时任务执行 — 从简单的一次性延迟到带 Skill 注入和跨平台投递的循环 Cron 表达式任务。

## 关键文件

| 文件 | 用途 |
|------|------|
| `cron/jobs.py` | 任务模型、存储，对 `jobs.json` 的原子读写 |
| `cron/scheduler.py` | 调度器循环 — 到期任务检测、执行、重复跟踪 |
| `tools/cronjob_tools.py` | 面向模型的 `cronjob` 工具注册和处理器 |
| `gateway/run.py` | Gateway 集成 — 在长时间运行循环中推进 Cron |
| `hermes_cli/cron.py` | CLI `hermes cron` 子命令 |

## 调度模型

支持四种调度格式：

| 格式 | 示例 | 行为 |
|------|------|------|
| **相对延迟** | `30m`、`2h`、`1d` | 一次性，在指定持续时间后触发 |
| **间隔** | `every 2h`、`every 30m` | 循环，按固定间隔触发 |
| **Cron 表达式** | `0 9 * * *` | 标准 5 字段 Cron 语法（分钟、小时、日、月、星期） |
| **ISO 时间戳** | `2025-01-15T09:00:00` | 一次性，在精确时间触发 |

面向模型的接口是单个 `cronjob` 工具，支持动作式操作：`create`、`list`、`update`、`pause`、`resume`、`run`、`remove`。

## 任务存储

任务存储在 `~/.hermes/cron/jobs.json` 中，具有原子写入语义（先写入临时文件，然后重命名）。每条任务记录包含：

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "Daily briefing",
  "prompt": "Summarize today's AI news and funding rounds",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *",
    "display": "0 9 * * *"
  },
  "skills": ["ai-funding-daily-report"],
  "deliver": "telegram:-1001234567890",
  "repeat": {
    "times": null,
    "completed": 42
  },
  "state": "scheduled",
  "enabled": true,
  "next_run_at": "2025-01-16T09:00:00Z",
  "last_run_at": "2025-01-15T09:00:00Z",
  "last_status": "ok",
  "created_at": "2025-01-01T00:00:00Z",
  "model": null,
  "provider": null,
  "script": null
}
```

### 任务生命周期状态

| 状态 | 含义 |
|------|------|
| `scheduled` | 活跃，将在下次计划时间触发 |
| `paused` | 暂停 — 不会触发直到恢复 |
| `completed` | 重复次数已用完或一次性任务已触发 |
| `running` | 正在执行（瞬态） |

### 向后兼容

旧任务可能使用单个 `skill` 字段而非 `skills` 数组。调度器在加载时标准化 — 单个 `skill` 会被提升为 `skills: [skill]`。

## 调度器运行时

### Tick 循环

调度器运行在周期性 tick 上（默认：每 60 秒）：

```text
tick()
  1. 获取调度器锁（防止重叠 tick）
  2. 从 jobs.json 加载所有任务
  3. 筛选到期任务（next_run <= now AND state == "scheduled"）
  4. 对每个到期任务：
     a. 设置状态为 "running"
     b. 创建全新 AIAgent 会话（无对话历史）
     c. 按顺序加载附加的 Skill（作为用户消息注入）
     d. 通过 Agent 运行任务提示
     e. 将响应投递到配置的目标
     f. 更新运行计数，计算 next_run
     g. 如果重复次数用完 → state = "completed"
     h. 否则 → state = "scheduled"
  5. 将更新的任务写回 jobs.json
  6. 释放调度器锁
```

### Gateway 集成

在 Gateway 模式下，调度器 tick 集成到 Gateway 的主事件循环中。Gateway 在其定期维护周期中调用 `scheduler.tick()`，与消息处理并行运行。

在 CLI 模式下，Cron 任务只在运行 `hermes cron` 命令或活跃 CLI 会话期间触发。

### 全新会话隔离

每个 Cron 任务在完全全新的 Agent 会话中运行：

- 没有之前运行的对话历史
- 没有之前 Cron 执行的记忆（除非持久化到记忆/文件）
- 提示必须自包含 — Cron 任务无法提问澄清
- `cronjob` 工具集被禁用（递归防护）

## Skill 支持的任务

Cron 任务可以通过 `skills` 字段附加一个或多个 Skill。执行时：

1. Skill 按指定顺序加载
2. 每个 Skill 的 SKILL.md 内容作为上下文注入
3. 任务的提示作为任务指令附加
4. Agent 处理组合的 Skill 上下文 + 提示

这实现了可复用、经过测试的工作流，无需将完整指令粘贴到 Cron 提示中。例如：

```
创建每日融资报告 → 附加 "ai-funding-daily-report" Skill
```

### 脚本支持的任务

任务也可以通过 `script` 字段附加 Python 脚本。脚本在每次 Agent 轮次之前运行，其标准输出作为上下文注入到提示中。这实现了数据收集和变更检测模式：

```python
# ~/.hermes/scripts/check_competitors.py
import requests, json
# 获取竞品发布说明，与上次运行对比
# 将摘要打印到标准输出 — Agent 分析并报告
```

脚本超时默认为 120 秒。`_get_script_timeout()` 通过三层链解析限制：

1. **模块级覆盖** — `_SCRIPT_TIMEOUT`（用于测试/猴子补丁）。仅在与默认值不同时使用。
2. **环境变量** — `HERMES_CRON_SCRIPT_TIMEOUT`
3. **配置** — `config.yaml` 中的 `cron.script_timeout_seconds`（通过 `load_config()` 读取）
4. **默认值** — 120 秒

### 提供商恢复

`run_job()` 将用户配置的回退提供商和凭证池传递给 `AIAgent` 实例：

- **回退提供商** — 从 `config.yaml` 读取 `fallback_providers`（列表）或 `fallback_model`（旧版字典），匹配 Gateway 的 `_load_fallback_model()` 模式。作为 `fallback_model=` 传递给 `AIAgent.__init__`，后者将两种格式标准化为回退链。
- **凭证池** — 通过 `agent.credential_pool` 的 `load_pool(provider)` 使用已解析的运行时提供商名称加载。仅在池有凭证时传递（`pool.has_credentials()`）。启用 429/速率限制错误时的同提供商密钥轮换。

这镜像了 Gateway 的行为 — 没有它，Cron Agent 会在速率限制时失败而不会尝试恢复。

## 投递模型

Cron 任务结果可以投递到任何支持的平台：

| 目标 | 语法 | 示例 |
|------|------|------|
| 原始聊天 | `origin` | 投递到创建任务的聊天 |
| 本地文件 | `local` | 保存到 `~/.hermes/cron/output/` |
| Telegram | `telegram` 或 `telegram:<chat_id>` | `telegram:-1001234567890` |
| Discord | `discord` 或 `discord:#channel` | `discord:#engineering` |
| Slack | `slack` | 投递到 Slack 主频道 |
| WhatsApp | `whatsapp` | 投递到 WhatsApp 主频道 |
| Signal | `signal` | 投递到 Signal |
| Matrix | `matrix` | 投递到 Matrix 主房间 |
| Mattermost | `mattermost` | 投递到 Mattermost 主频道 |
| Email | `email` | 通过邮件投递 |
| SMS | `sms` | 通过短信投递 |
| Home Assistant | `homeassistant` | 投递到 HA 对话 |
| 钉钉 | `dingtalk` | 投递到钉钉 |
| 飞书 | `feishu` | 投递到飞书 |
| 企业微信 | `wecom` | 投递到企业微信 |
| 微信 | `weixin` | 投递到微信 |
| BlueBubbles | `bluebubbles` | 通过 BlueBubbles 投递到 iMessage |
| QQ Bot | `qqbot` | 通过官方 API v2 投递到 QQ |

对于 Telegram 话题，使用格式 `telegram:<chat_id>:<thread_id>`（如 `telegram:-1001234567890:17585`）。

### 响应包装

默认情况下（`cron.wrap_response: true`），Cron 投递会包装：
- 标识 Cron 任务名称和任务的头部
- 说明 Agent 无法在对话中看到投递消息的尾部

Cron 响应中的 `[SILENT]` 前缀会完全抑制投递 — 适用于只需写入文件或执行副作用的任务。

### 会话隔离

Cron 投递**不会**镜像到 Gateway 会话对话历史中。它们仅存在于 Cron 任务自己的会话中。这防止目标聊天的对话中出现消息交替违规。

## 递归防护

Cron 运行的会话禁用了 `cronjob` 工具集。这防止：
- 定时任务创建新的 Cron 任务
- 可能导致 Token 使用量爆炸的递归调度
- 从任务内部意外修改任务计划

## 锁定

调度器使用基于文件的锁定来防止重叠 tick 两次执行同一批到期任务。这在 Gateway 模式中很重要，因为如果前一个 tick 花费时间超过 tick 间隔，多个维护周期可能重叠。

## CLI 接口

`hermes cron` CLI 提供直接的任务管理：

```bash
hermes cron list                    # 显示所有任务
hermes cron create                  # 交互式创建任务（别名：add）
hermes cron edit <job_id>           # 编辑任务配置
hermes cron pause <job_id>          # 暂停运行中的任务
hermes cron resume <job_id>         # 恢复暂停的任务
hermes cron run <job_id>            # 触发立即执行
hermes cron remove <job_id>         # 删除任务
```

## 相关文档

- [Cron 功能指南](/docs/user-guide/features/cron)
- [Gateway 内部机制](./gateway-internals.md)
- [Agent 循环内部机制](./agent-loop.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/cron-internals)
