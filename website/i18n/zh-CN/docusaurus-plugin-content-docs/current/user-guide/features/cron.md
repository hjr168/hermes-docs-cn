---
sidebar_position: 5
title: "定时任务（Cron）"
description: "使用自然语言调度自动化任务，通过单一 cron 工具管理，并可附加一个或多个 Skill"
---

# 定时任务（Cron）

使用自然语言或 Cron 表达式自动调度任务。Hermes 通过单一的 `cronjob` 工具暴露 Cron 管理功能，使用动作风格操作替代独立的 schedule/list/remove 工具。

## Cron 当前功能

Cron 任务可以：

- 调度一次性或循环任务
- 暂停、恢复、编辑、触发和删除任务
- 给任务附加零个、一个或多个 Skill
- 将结果投递回原始聊天、本地文件或配置的平台目标
- 在带有正常静态工具列表的新鲜 Agent 会话中运行

:::warning
Cron 运行的会话不能递归创建更多 Cron 任务。Hermes 在 Cron 执行期间禁用 Cron 管理工具，以防止失控的调度循环。
:::

## 创建定时任务

### 在聊天中使用 `/cron`

```bash
/cron add 30m "提醒我检查构建"
/cron add "every 2h" "检查服务器状态"
/cron add "every 1h" "总结新的 Feed 条目" --skill blogwatcher
/cron add "every 1h" "使用两个 Skill 并合并结果" --skill blogwatcher --skill maps
```

### 通过独立 CLI

```bash
hermes cron create "every 2h" "检查服务器状态"
hermes cron create "every 1h" "总结新的 Feed 条目" --skill blogwatcher
hermes cron create "every 1h" "使用两个 Skill 并合并结果" \
  --skill blogwatcher \
  --skill maps \
  --name "Skill 组合"
```

### 通过自然对话

直接向 Hermes 提问：

```text
每天早上9点，检查 Hacker News 上的 AI 新闻并在 Telegram 上发送摘要。
```

Hermes 会在内部使用统一的 `cronjob` 工具。

## Skill 支持的 Cron 任务

Cron 任务可以在运行提示之前加载一个或多个 Skill。

### 单个 Skill

```python
cronjob(
    action="create",
    skill="blogwatcher",
    prompt="检查配置的 Feed 并总结任何新内容。",
    schedule="0 9 * * *",
    name="Morning feeds",
)
```

### 多个 Skill

Skill 按顺序加载。提示成为叠加在这些 Skill 之上的任务指令。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="查找新的本地活动和附近有趣的地方，然后将它们合并成一份简报。",
    schedule="every 6h",
    name="Local brief",
)
```

当你希望调度 Agent 继承可复用工作流而不必将完整 Skill 文本塞入 Cron 提示时，这很有用。

## 编辑任务

你不需要为了修改任务而删除再重新创建。

### 聊天

```bash
/cron edit <job_id> --schedule "every 4h"
/cron edit <job_id> --prompt "使用修订后的任务"
/cron edit <job_id> --skill blogwatcher --skill maps
/cron edit <job_id> --remove-skill blogwatcher
/cron edit <job_id> --clear-skills
```

### 独立 CLI

```bash
hermes cron edit <job_id> --schedule "every 4h"
hermes cron edit <job_id> --prompt "使用修订后的任务"
hermes cron edit <job_id> --skill blogwatcher --skill maps
hermes cron edit <job_id> --add-skill maps
hermes cron edit <job_id> --remove-skill blogwatcher
hermes cron edit <job_id> --clear-skills
```

注意：

- 重复的 `--skill` 会替换任务附加的 Skill 列表
- `--add-skill` 追加到现有列表而不替换
- `--remove-skill` 移除指定的附加 Skill
- `--clear-skills` 移除所有附加 Skill

## 生命周期操作

Cron 任务现在拥有比仅创建/移除更完整的生命周期。

### 聊天

```bash
/cron list
/cron pause <job_id>
/cron resume <job_id>
/cron run <job_id>
/cron remove <job_id>
```

### 独立 CLI

```bash
hermes cron list
hermes cron pause <job_id>
hermes cron resume <job_id>
hermes cron run <job_id>
hermes cron remove <job_id>
hermes cron status
hermes cron tick
```

各操作说明：

- `pause` — 保留任务但停止调度
- `resume` — 重新启用任务并计算下次运行时间
- `run` — 在下次调度器心跳时触发任务
- `remove` — 完全删除任务

## 工作原理

**Cron 执行由网关守护进程处理。** 网关每 60 秒心跳一次调度器，在隔离的 Agent 会话中运行所有到期的任务。

```bash
hermes gateway install     # 安装为用户服务
sudo hermes gateway install --system   # Linux：为服务器安装开机自启系统服务
hermes gateway             # 或在前台运行

hermes cron list
hermes cron status
```

### 网关调度器行为

每次心跳时 Hermes 会：

1. 从 `~/.hermes/cron/jobs.json` 加载任务
2. 检查 `next_run_at` 与当前时间的对比
3. 为每个到期任务启动新的 `AIAgent` 会话
4. 可选地将一个或多个附加 Skill 注入到新会话中
5. 运行提示直到完成
6. 投递最终响应
7. 更新运行元数据和下次调度时间

`~/.hermes/cron/.tick.lock` 处的文件锁防止重叠的调度器心跳重复运行同一批任务。

## 投递选项

调度任务时，你指定输出的去向：

| 选项 | 说明 | 示例 |
|------|------|------|
| `"origin"` | 回到任务创建处 | 消息平台上的默认值 |
| `"local"` | 仅保存到本地文件（`~/.hermes/cron/output/`） | CLI 上的默认值 |
| `"telegram"` | Telegram 主频道 | 使用 `TELEGRAM_HOME_CHANNEL` |
| `"telegram:123456"` | 按 ID 指定 Telegram 聊天 | 直接投递 |
| `"telegram:-100123:17585"` | 指定 Telegram 话题 | `chat_id:thread_id` 格式 |
| `"discord"` | Discord 主频道 | 使用 `DISCORD_HOME_CHANNEL` |
| `"discord:#engineering"` | 按名称指定 Discord 频道 | 按频道名 |
| `"slack"` | Slack 主频道 | |
| `"whatsapp"` | WhatsApp 主页 | |
| `"signal"` | Signal | |
| `"matrix"` | Matrix 主房间 | |
| `"mattermost"` | Mattermost 主频道 | |
| `"email"` | 邮件 | |
| `"sms"` | 通过 Twilio 的 SMS | |
| `"homeassistant"` | Home Assistant | |
| `"dingtalk"` | 钉钉 | |
| `"feishu"` | 飞书/Lark | |
| `"wecom"` | 企业微信 | |
| `"weixin"` | 微信（WeChat） | |
| `"bluebubbles"` | BlueBubbles（iMessage） | |
| `"qqbot"` | QQ Bot（腾讯 QQ） | |

Agent 的最终响应会自动投递。你不需要在 Cron 提示中调用 `send_message`。

### 响应包装

默认情况下，投递的 Cron 输出会包裹头部和尾部，以便接收者知道它来自定时任务：

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

要投递不带包装的原始 Agent 输出，将 `cron.wrap_response` 设为 `false`：

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### 静默抑制

如果 Agent 的最终响应以 `[SILENT]` 开头，投递会被完全抑制。输出仍会保存在本地以供审计（在 `~/.hermes/cron/output/` 中），但不会向投递目标发送任何消息。

这对只有出问题时才需要报告的监控任务很有用：

```text
检查 nginx 是否在运行。如果一切正常，只回复 [SILENT]。
否则，报告问题。
```

失败的任务始终会投递，无论是否有 `[SILENT]` 标记 — 只有成功运行可以被静默。

## 脚本超时

预运行脚本（通过 `script` 参数附加）的默认超时为 120 秒。如果你的脚本需要更长时间 — 例如包含随机延迟以避免类似机器人的时间模式 — 可以增加此值：

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 300   # 5 分钟
```

或设置 `HERMES_CRON_SCRIPT_TIMEOUT` 环境变量。解析顺序为：环境变量 → config.yaml → 120 秒默认值。

## Provider 恢复

Cron 任务继承你配置的回退 Provider 和凭证池轮换。如果主 API Key 被限速或 Provider 返回错误，Cron Agent 可以：

- **回退到备用 Provider**（如果你在 `config.yaml` 中配置了 `fallback_providers` 或旧版 `fallback_model`）
- **轮换到同一 Provider 的下一个凭证**（在你的[凭证池](/docs/user-guide/configuration#credential-pool-strategies)中）

这意味着高频运行或在高峰时段运行的 Cron 任务更具韧性 — 单个被限速的 Key 不会导致整个运行失败。

## 调度格式

Agent 的最终响应会自动投递 — 你**不**需要在 Cron 提示中为同一目标包含 `send_message`。如果 Cron 运行调用 `send_message` 发送到调度器已经投递的完全相同的目标，Hermes 会跳过该重复发送并告诉模型将面向用户的内容放在最终响应中。仅在需要向额外或不同目标发送时使用 `send_message`。

### 相对延迟（一次性）

```text
30m     → 30 分钟后运行一次
2h      → 2 小时后运行一次
1d      → 1 天后运行一次
```

### 间隔（循环）

```text
every 30m    → 每 30 分钟
every 2h     → 每 2 小时
every 1d     → 每天
```

### Cron 表达式

```text
0 9 * * *       → 每天上午 9:00
0 9 * * 1-5     → 工作日上午 9:00
0 */6 * * *     → 每 6 小时
30 8 1 * *      → 每月 1 号上午 8:30
0 0 * * 0       → 每周日午夜
```

### ISO 时间戳

```text
2026-03-15T09:00:00    → 一次性：2026 年 3 月 15 日上午 9:00
```

## 重复行为

| 调度类型 | 默认重复 | 行为 |
|---------|---------|------|
| 一次性（`30m`、时间戳） | 1 | 运行一次 |
| 间隔（`every 2h`） | 无限 | 持续运行直到删除 |
| Cron 表达式 | 无限 | 持续运行直到删除 |

你可以覆盖此设置：

```python
cronjob(
    action="create",
    prompt="...",
    schedule="every 2h",
    repeat=5,
)
```

## 编程方式管理任务

面向 Agent 的 API 是一个工具：

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

对于 `update`，传入 `skills=[]` 移除所有附加 Skill。

## 任务存储

任务存储在 `~/.hermes/cron/jobs.json` 中。任务运行的输出保存到 `~/.hermes/cron/output/{job_id}/{timestamp}.md`。

任务的 `model` 和 `provider` 可能存储为 `null`。当这些字段被省略时，Hermes 在执行时从全局配置中解析它们。它们仅在设置了 per-job 覆盖时出现在任务记录中。

存储使用原子文件写入，因此中断的写入不会留下部分写入的任务文件。

## 自包含提示仍然重要

:::warning 重要
Cron 任务在完全新鲜的 Agent 会话中运行。提示必须包含 Agent 需要的所有内容，但已由附加 Skill 提供的除外。
:::

**不好：** `"检查那个服务器问题"`

**好：** `"以用户 'deploy' SSH 登录服务器 192.168.1.100，用 'systemctl status nginx' 检查 nginx 是否在运行，并验证 https://example.com 返回 HTTP 200。"`

## 安全

定时任务提示在创建和更新时会扫描提示注入和凭证泄露模式。包含不可见 Unicode 技巧、SSH 后门尝试或明显秘密泄露载荷的提示会被阻止。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/cron)
