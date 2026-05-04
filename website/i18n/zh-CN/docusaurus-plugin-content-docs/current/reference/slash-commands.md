---
sidebar_position: 2
title: "斜杠命令参考"
description: "CLI 交互式命令与消息平台斜杠命令的完整参考"
---

# 斜杠命令参考

Hermes 拥有两个斜杠命令入口，两者均由 `hermes_cli/commands.py` 中的中央 `COMMAND_REGISTRY` 驱动：

- **CLI（命令行界面）交互式斜杠命令** — 由 `cli.py` 分发，支持从注册表自动补全
- **消息平台斜杠命令** — 由 `gateway/run.py` 分发，从注册表生成帮助文本和平台菜单

已安装的 Skill（技能）也会在两个入口中作为动态斜杠命令暴露。其中包括内置的 `/plan` 技能，它会打开计划模式并将 Markdown 计划保存到当前工作区/后端工作目录的 `.hermes/plans/` 下。

## CLI 交互式斜杠命令

在 CLI 中输入 `/` 可打开自动补全菜单。内置命令不区分大小写。

### 会话

| 命令 | 说明 |
|---------|-------------|
| `/new`（别名：`/reset`） | 开始新的会话（新的会话 ID 和历史记录） |
| `/clear` | 清屏并开始新会话 |
| `/history` | 显示对话历史 |
| `/save` | 保存当前对话 |
| `/retry` | 重试上一条消息（重新发送给 Agent） |
| `/undo` | 撤销上一轮用户/助手交互 |
| `/title` | 为当前会话设置标题（用法：/title 我的会话名称） |
| `/compress [焦点话题]` | 手动压缩对话上下文（刷新记忆 + 摘要）。可选焦点话题用于限定摘要保留的内容范围。 |
| `/rollback` | 列出或恢复文件系统检查点（用法：/rollback [编号]） |
| `/snapshot [create\|restore <id>\|prune]`（别名：`/snap`） | 创建或恢复 Hermes 配置/状态的状态快照。`create [标签]` 保存快照，`restore <id>` 恢复到指定快照，`prune [N]` 删除旧快照，不带参数则列出所有快照。 |
| `/stop` | 终止所有正在运行的后台进程 |
| `/queue <提示词>`（别名：`/q`） | 为下一轮排队一个提示词（不会中断当前 Agent 的回复）。**注意：** `/q` 同时被 `/queue` 和 `/quit` 注册；以最后注册为准，因此 `/q` 实际解析为 `/quit`。请使用 `/queue` 来显式调用排队功能。 |
| `/resume [名称]` | 恢复之前命名的会话 |
| `/status` | 显示会话信息 |
| `/agents`（别名：`/tasks`） | 显示当前会话中的活跃 Agent 和正在运行的任务。 |
| `/background <提示词>`（别名：`/bg`） | 在独立的后台会话中运行提示词。Agent 会独立处理你的提示词——当前会话保持空闲，可继续其他工作。任务完成后会以面板形式显示结果。参见 [CLI 后台会话](/docs/user-guide/cli#background-sessions)。 |
| `/btw <问题>` | 使用会话上下文的临时旁问（不使用工具，不持久化）。适用于快速提问而不影响对话历史。 |
| `/plan [请求]` | 加载内置的 `plan` 技能来编写 Markdown 计划而非执行工作。计划保存在当前工作区/后端工作目录的 `.hermes/plans/` 下。 |
| `/branch [名称]`（别名：`/fork`） | 分支当前会话（探索不同的路径） |

### 配置

| 命令 | 说明 |
|---------|-------------|
| `/config` | 显示当前配置 |
| `/model [模型名称]` | 显示或切换当前模型。支持：`/model claude-sonnet-4`、`/model provider:model`（切换提供商）、`/model custom:model`（自定义端点）、`/model custom:name:model`（命名的自定义提供商）、`/model custom`（从端点自动检测）。使用 `--global` 可将更改持久化到 config.yaml。**注意：** `/model` 只能在已配置的提供商之间切换。要添加新提供商，请退出会话并在终端中运行 `hermes model`。 |
| `/provider` | 显示可用的提供商及当前提供商 |
| `/personality` | 设置预定义人格 |
| `/verbose` | 循环切换工具进度显示模式：off → new → all → verbose。可通过配置为消息平台启用，参见[下方说明](#notes)。 |
| `/fast [normal\|fast\|status]` | 切换快速模式 — OpenAI Priority Processing / Anthropic Fast Mode。选项：`normal`、`fast`、`status`。 |
| `/reasoning` | 管理推理力度和显示（用法：/reasoning [级别\|show\|hide]） |
| `/skin` | 显示或切换显示皮肤/主题 |
| `/statusbar`（别名：`/sb`） | 开关上下文/模型状态栏 |
| `/voice [on\|off\|tts\|status]` | 开关 CLI 语音模式和语音播放。录制使用 `voice.record_key`（默认：`Ctrl+B`）。 |
| `/yolo` | 切换 YOLO 模式 — 跳过所有危险命令的确认提示。 |

### 工具与技能

| 命令 | 说明 |
|---------|-------------|
| `/tools [list\|disable\|enable] [名称...]` | 管理工具：列出可用工具，或在当前会话中禁用/启用指定工具。禁用工具会将其从 Agent 的工具集中移除并触发会话重置。 |
| `/toolsets` | 列出可用的工具集 |
| `/browser [connect\|disconnect\|status]` | 管理本地 Chrome CDP 连接。`connect` 将浏览器工具附加到运行中的 Chrome 实例（默认：`ws://localhost:9222`）。`disconnect` 断开连接。`status` 显示当前连接状态。如果未检测到调试器，会自动启动 Chrome。 |
| `/skills` | 从在线注册表搜索、安装、检查或管理技能 |
| `/cron` | 管理定时任务（列表、添加/创建、编辑、暂停、恢复、运行、删除） |
| `/reload-mcp`（别名：`/reload_mcp`） | 从 config.yaml 重新加载 MCP 服务器 |
| `/reload` | 将 `.env` 变量重新加载到运行中的会话（无需重启即可获取新的 API Key） |
| `/plugins` | 列出已安装的插件及其状态 |

### 信息

| 命令 | 说明 |
|---------|-------------|
| `/help` | 显示帮助信息 |
| `/usage` | 显示 Token 用量、费用明细和会话时长 |
| `/insights` | 显示使用洞察和分析数据（最近 30 天） |
| `/platforms`（别名：`/gateway`） | 显示网关/消息平台状态 |
| `/paste` | 检查剪贴板中的图片并附加 |
| `/copy [编号]` | 将上一条助手回复复制到剪贴板（带编号则复制倒数第 N 条）。仅限 CLI。 |
| `/image <路径>` | 附加本地图片文件到下一次提示。 |
| `/debug` | 上传调试报告（系统信息 + 日志）并获取可分享的链接。消息平台也可用。 |
| `/profile` | 显示活跃配置文件名称和主目录 |
| `/gquota` | 显示 Google Gemini Code Assist 的配额使用情况（带进度条），仅在 `google-gemini-cli` 提供商激活时可用。 |

### 退出

| 命令 | 说明 |
|---------|-------------|
| `/quit` | 退出 CLI（也可用 `/exit`）。参见上方 `/queue` 下关于 `/q` 的说明。 |

### 动态 CLI 斜杠命令

| 命令 | 说明 |
|---------|-------------|
| `/<skill-name>` | 将任意已安装的技能作为按需命令加载。例如：`/gif-search`、`/github-pr-workflow`、`/excalidraw`。 |
| `/skills ...` | 从注册表和官方可选技能目录中搜索、浏览、检查、安装、审计、发布和配置技能。 |

### 快捷命令

用户自定义的快捷命令将短别名映射到较长的提示词。在 `~/.hermes/config.yaml` 中配置：

```yaml
quick_commands:
  review: "审查我最新的 git diff 并提出改进建议"
  deploy: "运行 scripts/deploy.sh 中的部署脚本并验证输出"
  morning: "查看我的日历、未读邮件，并总结今天的优先事项"
```

然后在 CLI 中输入 `/review`、`/deploy` 或 `/morning`。快捷命令在分发时解析，不会显示在内置的自动补全/帮助表中。

### 别名解析

命令支持前缀匹配：输入 `/h` 解析为 `/help`，`/mod` 解析为 `/model`。当前缀有歧义（匹配多个命令）时，以注册表顺序中的第一个匹配为准。完整命令名和已注册的别名始终优先于前缀匹配。

## 消息平台斜杠命令

消息网关支持在 Telegram、Discord、Slack、WhatsApp、Signal、Email 和 Home Assistant 聊天中使用以下内置命令：

| 命令 | 说明 |
|---------|-------------|
| `/new` | 开始新的对话。 |
| `/reset` | 重置对话历史。 |
| `/status` | 显示会话信息。 |
| `/stop` | 终止所有正在运行的后台进程并中断正在运行的 Agent。 |
| `/model [provider:model]` | 显示或切换模型。支持提供商切换（`/model zai:glm-5`）、自定义端点（`/model custom:model`）、命名的自定义提供商（`/model custom:local:qwen`）和自动检测（`/model custom`）。使用 `--global` 可将更改持久化到 config.yaml。**注意：** `/model` 只能在已配置的提供商之间切换。要添加新提供商或设置 API Key，请在终端中使用 `hermes model`（在聊天会话之外）。 |
| `/provider` | 显示提供商可用性和认证状态。 |
| `/personality [名称]` | 为当前会话设置人格覆盖。 |
| `/fast [normal\|fast\|status]` | 切换快速模式 — OpenAI Priority Processing / Anthropic Fast Mode。 |
| `/retry` | 重试上一条消息。 |
| `/undo` | 撤销上一轮交互。 |
| `/sethome`（别名：`/set-home`） | 将当前聊天标记为平台的主频道，用于消息投递。 |
| `/compress [焦点话题]` | 手动压缩对话上下文。可选焦点话题用于限定摘要保留的内容范围。 |
| `/title [名称]` | 设置或显示会话标题。 |
| `/resume [名称]` | 恢复之前命名的会话。 |
| `/usage` | 显示 Token 用量、估算费用明细（输入/输出）、上下文窗口状态和会话时长。 |
| `/insights [天数]` | 显示使用分析数据。 |
| `/reasoning [级别\|show\|hide]` | 更改推理力度或切换推理显示。 |
| `/voice [on\|off\|tts\|join\|channel\|leave\|status]` | 控制聊天中的语音回复。`join`/`channel`/`leave` 管理 Discord 语音频道模式。 |
| `/rollback [编号]` | 列出或恢复文件系统检查点。 |
| `/snapshot [create\|restore <id>\|prune]`（别名：`/snap`） | 创建或恢复 Hermes 配置/状态的状态快照。 |
| `/background <提示词>` | 在独立的后台会话中运行提示词。任务完成后结果会发送回同一聊天。参见[消息平台后台会话](/docs/user-guide/messaging/#background-sessions)。 |
| `/plan [请求]` | 加载内置的 `plan` 技能来编写 Markdown 计划而非执行工作。计划保存在当前工作区/后端工作目录的 `.hermes/plans/` 下。 |
| `/reload-mcp`（别名：`/reload_mcp`） | 从配置中重新加载 MCP 服务器。 |
| `/reload` | 将 `.env` 变量重新加载到运行中的会话。 |
| `/yolo` | 切换 YOLO 模式 — 跳过所有危险命令的确认提示。 |
| `/commands [页码]` | 浏览所有命令和技能（分页显示）。 |
| `/approve [session\|always]` | 批准并执行待处理的危险命令。`session` 仅在当前会话中批准；`always` 添加到永久允许列表。 |
| `/deny` | 拒绝待处理的危险命令。 |
| `/update` | 将 Hermes Agent 更新到最新版本。 |
| `/restart` | 优雅地重启网关（等待活跃任务完成后重启）。网关重新上线后，会向请求者的聊天/线程发送确认消息。 |
| `/debug` | 上传调试报告（系统信息 + 日志）并获取可分享的链接。 |
| `/help` | 显示消息平台帮助。 |
| `/<skill-name>` | 按名称调用任意已安装的技能。 |

## 备注 {#notes}

- `/skin`、`/tools`、`/toolsets`、`/browser`、`/config`、`/cron`、`/skills`、`/platforms`、`/paste`、`/image`、`/statusbar` 和 `/plugins` 是 **仅限 CLI** 的命令。
- `/verbose` **默认仅限 CLI**，但可通过在 `config.yaml` 中设置 `display.tool_progress_command: true` 为消息平台启用。启用后，它会循环切换 `display.tool_progress` 模式并保存到配置。
- `/sethome`、`/update`、`/restart`、`/approve`、`/deny` 和 `/commands` 是 **仅限消息平台** 的命令。
- `/status`、`/background`、`/voice`、`/reload-mcp`、`/rollback`、`/snapshot`、`/debug`、`/fast` 和 `/yolo` 在 **CLI 和消息网关** 中均可使用。
- `/voice join`、`/voice channel` 和 `/voice leave` 仅在 Discord 上有意义。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/slash-commands)
