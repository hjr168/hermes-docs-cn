---
sidebar_position: 12
title: "Cron 故障排除"
description: "诊断和修复常见的 Hermes Cron 问题 — 任务未触发、投递失败、Skill 加载错误和性能问题"
---

# Cron 故障排除

当 Cron 任务表现异常时，按顺序检查以下项目。大多数问题属于四类之一：定时、投递、权限或 Skill 加载。

---

## 任务未触发

### 检查 1：确认任务存在且活跃

```bash
hermes cron list
```

查找任务并确认其状态是 `[active]`（不是 `[paused]` 或 `[completed]`）。如果显示 `[completed]`，可能是重复次数已用尽 — 编辑任务以重置。

### 检查 2：确认调度表达式正确

格式错误的调度表达式会静默默认为一次性或被完全拒绝。测试你的表达式：

| 你的表达式 | 应该解析为 |
|-----------|-----------|
| `0 9 * * *` | 每天上午 9:00 |
| `0 9 * * 1` | 每周一上午 9:00 |
| `every 2h` | 从现在起每 2 小时 |
| `30m` | 从现在起 30 分钟 |
| `2025-06-01T09:00:00` | 2025 年 6 月 1 日上午 9:00 UTC |

如果任务触发一次后从列表中消失，这是一次性调度（`30m`、`1d` 或 ISO 时间戳）— 正常行为。

### 检查 3：网关是否在运行？

Cron 任务由网关的后台心跳线程触发，每 60 秒心跳一次。常规 CLI 聊天会话**不会**自动触发 Cron 任务。

如果你期望任务自动触发，需要一个运行中的网关（`hermes gateway` 或 `hermes serve`）。对于一次性调试，你可以用 `hermes cron tick` 手动触发一次心跳。

### 检查 4：检查系统时钟和时区

任务使用本地时区。如果你的机器时钟错误或不在预期时区，任务会在错误的时间触发。验证：

```bash
date
hermes cron list   # 将 next_run 时间与本地时间对比
```

---

## 投递失败

### 检查 1：验证投递目标是否正确

投递目标区分大小写，且需要配置正确的平台。配置错误的目标会静默丢弃响应。

| 目标 | 需要 |
|------|------|
| `telegram` | `~/.hermes/.env` 中的 `TELEGRAM_BOT_TOKEN` |
| `discord` | `~/.hermes/.env` 中的 `DISCORD_BOT_TOKEN` |
| `slack` | `~/.hermes/.env` 中的 `SLACK_BOT_TOKEN` |
| `whatsapp` | WhatsApp 网关已配置 |
| `signal` | Signal 网关已配置 |
| `matrix` | Matrix 服务器已配置 |
| `email` | config.yaml 中的 SMTP 已配置 |
| `sms` | SMS Provider 已配置 |
| `local` | 对 `~/.hermes/cron/output/` 的写权限 |
| `origin` | 投递到任务创建时的聊天 |

其他支持的平台包括 `mattermost`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot` 和 `webhook`。你也可以用 `platform:chat_id` 语法指定特定聊天（如 `telegram:-1001234567890`）。

如果投递失败，任务仍会运行 — 只是不会发送到任何地方。检查 `hermes cron list` 的 `last_error` 字段（如有）。

### 检查 2：检查 `[SILENT]` 使用

如果你的 Cron 任务没有输出或 Agent 回复了 `[SILENT]`，投递会被抑制。这对监控任务是故意的 — 但确保你的提示没有意外地抑制所有内容。

说"如果没有变化就回复 [SILENT]"的提示也会静默吞掉非空响应。检查你的条件逻辑。

### 检查 3：平台 Token 权限

每个消息平台 Bot 需要特定权限才能发送消息。如果投递静默失败：

- **Telegram**：Bot 必须是目标群组/频道的管理员
- **Discord**：Bot 必须有在目标频道发送的权限
- **Slack**：Bot 必须被添加到工作区并有 `chat:write` 范围

### 检查 4：响应包装

默认情况下，Cron 响应会用头部和尾部包装（config.yaml 中的 `cron.wrap_response: true`）。某些平台或集成可能不能很好地处理。要禁用：

```yaml
cron:
  wrap_response: false
```

---

## Skill 加载失败

### 检查 1：验证 Skill 已安装

```bash
hermes skills list
```

Skill 必须先安装才能附加到 Cron 任务。如果缺少某个 Skill，先用 `hermes skills install <skill-name>` 安装或在 CLI 中使用 `/skills`。

### 检查 2：检查 Skill 名称 vs Skill 文件夹名称

Skill 名称区分大小写，必须匹配已安装 Skill 的文件夹名称。如果你的任务指定 `ai-funding-daily-report` 但 Skill 文件夹是 `ai-funding-daily-report`，从 `hermes skills list` 确认确切名称。

### 检查 3：需要交互工具的 Skill

Cron 任务运行时禁用 `cronjob`、`messaging` 和 `clarify` 工具集。这防止递归 Cron 创建、直接消息发送（投递由调度器处理）和交互提示。如果某个 Skill 依赖这些工具集，它在 Cron 上下文中不会工作。

检查 Skill 文档确认它在非交互（无头）模式下可用。

### 检查 4：多 Skill 排序

使用多个 Skill 时，它们按顺序加载。如果 Skill A 依赖 Skill B 的上下文，确保 B 先加载：

```bash
/cron add "0 9 * * *" "..." --skill context-skill --skill target-skill
```

在此示例中，`context-skill` 在 `target-skill` 之前加载。

---

## 任务错误和失败

### 检查 1：查看最近的任务输出

如果任务运行并失败，你可以在以下位置查看错误上下文：

1. 任务投递的聊天（如果投递成功）
2. `~/.hermes/logs/agent.log` 用于调度器消息（或 `errors.log` 用于警告）
3. 通过 `hermes cron list` 查看任务的 `last_run` 元数据

### 检查 2：常见错误模式

**脚本的"No such file or directory"**
`script` 路径必须是绝对路径（或相对于 Hermes 配置目录）。验证：
```bash
ls ~/.hermes/scripts/your-script.py   # 必须存在
hermes cron edit <job_id> --script ~/.hermes/scripts/your-script.py
```

**任务执行时的"Skill not found"**
Skill 必须安装运行调度器的机器上。如果你在机器之间移动，Skill 不会自动同步 — 用 `hermes skills install <skill-name>` 重新安装。

**任务运行但不投递任何内容**
可能是投递目标问题（见上方投递失败）或静默抑制的响应（`[SILENT]`）。

**任务挂起或超时**
调度器使用基于非活跃的超时（默认 600 秒，可通过 `HERMES_CRON_TIMEOUT` 环境变量配置，`0` 表示无限制）。只要 Agent 在主动调用工具就可以运行 — 计时器仅在持续不活跃后触发。长时间运行的任务应使用脚本处理数据收集，只投递结果。

### 检查 3：锁竞争

调度器使用基于文件的锁定防止重叠心跳。如果有两个网关实例在运行（或 CLI 会话与网关冲突），任务可能被延迟或跳过。

终止重复的网关进程：
```bash
ps aux | grep hermes
# 终止重复进程，只保留一个
```

### 检查 4：jobs.json 权限

任务存储在 `~/.hermes/cron/jobs.json`。如果此文件对你的用户不可读/写，调度器会静默失败：

```bash
ls -la ~/.hermes/cron/jobs.json
chmod 600 ~/.hermes/cron/jobs.json   # 你的用户应该拥有它
```

---

## 性能问题

### 任务启动慢

每个 Cron 任务创建新的 AIAgent 会话，可能涉及 Provider 认证和模型加载。对于时间敏感的调度，添加缓冲时间（如用 `0 8 * * *` 而不是 `0 9 * * *`）。

### 过多重叠任务

调度器在每个心跳中按顺序执行任务。如果多个任务同时到期，它们会一个接一个运行。考虑错开调度（如用 `0 9 * * *` 和 `5 9 * * *` 而不是都在 `0 9 * * *`）以避免延迟。

### 大量脚本输出

输出数 MB 的脚本会拖慢 Agent 并可能触及 Token 限制。在脚本层面过滤/摘要 — 只输出 Agent 需要推理的内容。

---

## 诊断命令

```bash
hermes cron list                    # 显示所有任务、状态、next_run 时间
hermes cron run <job_id>            # 安排到下次心跳（用于测试）
hermes cron edit <job_id>           # 修复配置问题
hermes logs                         # 查看最近的 Hermes 日志
hermes skills list                  # 验证已安装的 Skill
```

---

## 获取更多帮助

如果你已按本指南排查但问题仍然存在：

1. 用 `hermes cron run <job_id>` 运行任务（在下次网关心跳时触发）并观察聊天输出中的错误
2. 检查 `~/.hermes/logs/agent.log` 中的调度器消息和 `~/.hermes/logs/errors.log` 中的警告
3. 在 [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 提交 Issue，包含：
   - 任务 ID 和调度
   - 投递目标
   - 你期望的 vs 实际发生的情况
   - 日志中的相关错误消息

---

*完整 Cron 参考，参见[用 Cron 自动化一切](/docs/guides/automate-with-cron)和[定时任务（Cron）](/docs/user-guide/features/cron)。*

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/cron-troubleshooting)
