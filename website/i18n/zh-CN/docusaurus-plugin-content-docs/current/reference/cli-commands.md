---
sidebar_position: 1
title: "CLI 命令参考"
description: "Hermes 终端命令和命令族的权威参考"
---

# CLI 命令参考

本页涵盖你从 Shell（命令行）中运行的**终端命令**。

关于聊天中的斜杠命令，请参阅[斜杠命令参考](./slash-commands.md)。

## 全局入口

```bash
hermes [global-options] <command> [subcommand/options]
```

### 全局选项

| 选项 | 说明 |
|------|------|
| `--version`、`-V` | 显示版本并退出。 |
| `--profile <name>`、`-p <name>` | 选择本次调用使用的 Hermes 配置文件（Profile）。覆盖 `hermes profile use` 设置的默认值。 |
| `--resume <session>`、`-r <session>` | 通过 ID 或标题恢复之前的会话（Session）。 |
| `--continue [name]`、`-c [name]` | 恢复最近的会话，或匹配标题的最近会话。 |
| `--worktree`、`-w` | 在隔离的 Git Worktree（工作树）中启动，适用于并行 Agent 工作流。 |
| `--yolo` | 跳过危险命令的审批提示。 |
| `--pass-session-id` | 在 Agent 的系统提示中包含会话 ID。 |
| `--ignore-user-config` | 忽略 `~/.hermes/config.yaml`，回退到内置默认值。`.env` 中的凭据仍会加载。 |
| `--ignore-rules` | 跳过自动注入 `AGENTS.md`、`SOUL.md`、`.cursorrules`、记忆和预加载 Skill。 |
| `--tui` | 启动 [TUI](../user-guide/tui.md) 界面而非经典 CLI。等同于 `HERMES_TUI=1`。 |
| `--dev` | 配合 `--tui` 使用：通过 `tsx` 直接运行 TypeScript 源码而非预构建包（面向 TUI 贡献者）。 |

## 顶层命令

| 命令 | 用途 |
|------|------|
| `hermes chat` | 交互式或单次聊天。 |
| `hermes model` | 交互式选择默认的 Provider（提供商）和模型。 |
| `hermes gateway` | 运行或管理消息网关服务。 |
| `hermes setup` | 全部或部分配置的交互式设置向导。 |
| `hermes whatsapp` | 配置和配对 WhatsApp 桥接。 |
| `hermes auth` | 管理凭证 — 添加、列出、移除、重置、设置策略。处理 Codex/Nous/Anthropic 的 OAuth 流程。 |
| `hermes login` / `logout` | **已废弃** — 请使用 `hermes auth`。 |
| `hermes status` | 显示 Agent、认证和平台状态。 |
| `hermes cron` | 检查和触发 Cron（定时任务）调度器。 |
| `hermes webhook` | 管理 Webhook 订阅，用于事件驱动的激活。 |
| `hermes doctor` | 诊断配置和依赖问题。 |
| `hermes dump` | 生成可复制粘贴的配置摘要，用于获取支持/调试。 |
| `hermes debug` | 调试工具 — 上传日志和系统信息以获取支持。 |
| `hermes backup` | 将 Hermes 主目录备份为 zip 文件。 |
| `hermes import` | 从 zip 文件恢复 Hermes 备份。 |
| `hermes logs` | 查看、跟踪和过滤 Agent/网关/错误日志文件。 |
| `hermes config` | 显示、编辑、迁移和查询配置文件。 |
| `hermes pairing` | 批准或撤销消息配对码。 |
| `hermes skills` | 浏览、安装、发布、审计和配置 Skill（技能）。 |
| `hermes honcho` | 管理 Honcho 跨会话记忆集成。 |
| `hermes memory` | 配置外部记忆提供商。 |
| `hermes acp` | 将 Hermes 作为 ACP 服务器运行，用于编辑器集成。 |
| `hermes mcp` | 管理 MCP 服务器配置或将 Hermes 作为 MCP 服务器运行。 |
| `hermes plugins` | 管理 Hermes Agent 插件（安装、启用、禁用、移除）。 |
| `hermes tools` | 按平台配置启用的工具。 |
| `hermes sessions` | 浏览、导出、清理、重命名和删除会话。 |
| `hermes insights` | 显示 Token/费用/活动分析数据。 |
| `hermes claw` | OpenClaw 迁移辅助工具。 |
| `hermes dashboard` | 启动 Web 仪表盘，用于管理配置、API 密钥和会话。 |
| `hermes profile` | 管理配置文件 — 多个隔离的 Hermes 实例。 |
| `hermes completion` | 输出 Shell 补全脚本（bash/zsh）。 |
| `hermes version` | 显示版本信息。 |
| `hermes update` | 拉取最新代码并重新安装依赖。 |
| `hermes uninstall` | 从系统中移除 Hermes。 |

## `hermes chat`

```bash
hermes chat [options]
```

常用选项：

| 选项 | 说明 |
|------|------|
| `-q`、`--query "..."` | 单次非交互式提示。 |
| `-m`、`--model <model>` | 覆盖本次运行的模型。 |
| `-t`、`--toolsets <csv>` | 启用逗号分隔的工具集。 |
| `--provider <provider>` | 强制指定提供商：`auto`、`openrouter`、`nous`、`openai-codex`、`copilot-acp`、`copilot`、`anthropic`、`gemini`、`google-gemini-cli`、`huggingface`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`kilocode`、`xiaomi`、`arcee`、`alibaba`、`deepseek`、`nvidia`、`ollama-cloud`、`xai`（别名 `grok`）、`qwen-oauth`、`bedrock`、`opencode-zen`、`opencode-go`、`ai-gateway`、`azure-foundry`。 |
| `-s`、`--skills <name>` | 预加载一个或多个 Skill（可重复或逗号分隔）。 |
| `-v`、`--verbose` | 详细输出。 |
| `-Q`、`--quiet` | 编程模式：隐藏横幅/进度条/工具预览。 |
| `--image <path>` | 将本地图片附加到单次查询。 |
| `--resume <session>` / `--continue [name]` | 从 `chat` 直接恢复会话。 |
| `--worktree` | 为本次运行创建隔离的 Git Worktree。 |
| `--checkpoints` | 在破坏性文件变更前启用文件系统检查点。 |
| `--yolo` | 跳过审批提示。 |
| `--pass-session-id` | 将会话 ID 传入系统提示。 |
| `--ignore-user-config` | 忽略 `~/.hermes/config.yaml`，使用内置默认值。`.env` 中的凭据仍会加载。对于隔离的 CI 运行、可重现的 Bug 报告和第三方集成很有用。 |
| `--ignore-rules` | 跳过自动注入 `AGENTS.md`、`SOUL.md`、`.cursorrules`、持久记忆和预加载 Skill。结合 `--ignore-user-config` 可实现完全隔离运行。 |
| `--source <tag>` | 会话来源标签，用于过滤（默认：`cli`）。使用 `tool` 表示不应出现在用户会话列表中的第三方集成。 |
| `--max-turns <N>` | 每次对话的最大工具调用迭代次数（默认：90，或配置中的 `agent.max_turns`）。 |

示例：

```bash
hermes
hermes chat -q "Summarize the latest PRs"
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6
hermes chat --toolsets web,terminal,skills
hermes chat --quiet -q "Return only JSON"
hermes chat --worktree -q "Review this repo and open a PR"
hermes chat --ignore-user-config --ignore-rules -q "Repro without my personal setup"
```

## `hermes model`

交互式 Provider + 模型选择器。**这是添加新提供商、设置 API 密钥和运行 OAuth 流程的命令。** 请在终端中运行 — 而不是在 Hermes 聊天会话内部。

```bash
hermes model
```

适用于以下场景：
- **添加新提供商**（OpenRouter、Anthropic、Copilot、DeepSeek、自定义等）
- 登录 OAuth 支持的提供商（Anthropic、Copilot、Codex、Nous Portal）
- 输入或更新 API 密钥
- 从提供商的模型列表中选择
- 配置自定义/自托管端点
- 将新默认值保存到配置

:::warning hermes model 与 /model 的区别
**`hermes model`**（在终端中运行，不在任何 Hermes 会话内）是**完整的提供商设置向导**。它可以添加新提供商、运行 OAuth 流程、提示输入 API 密钥和配置端点。

**`/model`**（在活跃的 Hermes 聊天会话中输入）只能在**已配置的提供商和模型之间切换**。它不能添加新提供商、运行 OAuth 或提示输入 API 密钥。

**如果你需要添加新提供商：** 先退出 Hermes 会话（`Ctrl+C` 或 `/quit`），然后在终端中运行 `hermes model`。
:::

### `/model` 斜杠命令（会话中）

在会话中切换已配置的模型，无需离开：

```
/model                              # 显示当前模型和可用选项
/model claude-sonnet-4              # 切换模型（自动检测提供商）
/model zai:glm-5                    # 切换提供商和模型
/model custom:qwen-2.5              # 在自定义端点上使用模型
/model custom                       # 从自定义端点自动检测模型
/model custom:local:qwen-2.5        # 使用命名的自定义提供商
/model openrouter:anthropic/claude-sonnet-4  # 切回云端
```

默认情况下，`/model` 的更改**仅对当前会话生效**。添加 `--global` 可将更改持久化到 `config.yaml`：

```
/model claude-sonnet-4 --global     # 切换并保存为新默认值
```

:::info 如果只看到 OpenRouter 模型怎么办？
如果你只配置了 OpenRouter，`/model` 将只显示 OpenRouter 模型。要添加其他提供商（Anthropic、DeepSeek、Copilot 等），退出会话并在终端中运行 `hermes model`。
:::

Provider 和基础 URL 的更改会自动持久化到 `config.yaml`。当从自定义端点切换走时，过时的基础 URL 会被清除，以防止泄漏到其他提供商。

## `hermes gateway`

```bash
hermes gateway <subcommand>
```

子命令：

| 子命令 | 说明 |
|--------|------|
| `run` | 在前台运行网关。推荐用于 WSL、Docker 和 Termux。 |
| `start` | 启动已安装的 systemd/launchd 后台服务。 |
| `stop` | 停止服务（或前台进程）。 |
| `restart` | 重启服务。 |
| `status` | 显示服务状态。 |
| `install` | 安装为 systemd（Linux）或 launchd（macOS）后台服务。 |
| `uninstall` | 移除已安装的服务。 |
| `setup` | 交互式消息平台设置。 |

:::tip WSL 用户
使用 `hermes gateway run` 而非 `hermes gateway start` — WSL 的 systemd 支持不够可靠。用 tmux 包装以实现持久化：`tmux new -s hermes 'hermes gateway run'`。详情参阅 [WSL FAQ](/docs/reference/faq#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails)。
:::

## `hermes setup`

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure]
```

**首次运行：** 启动首次运行向导。

**返回用户（已配置）：** 直接进入完整重新配置向导 — 每个提示显示你当前的值作为默认值，按 Enter 保留或输入新值。无菜单。

| 部分 | 说明 |
|------|------|
| `model` | 提供商和模型设置。 |
| `terminal` | 终端后端和沙箱设置。 |
| `gateway` | 消息平台设置。 |
| `tools` | 按平台启用/禁用工具。 |
| `agent` | Agent 行为设置。 |

选项：

| 选项 | 说明 |
|------|------|
| `--quick` | 返回用户运行：仅提示缺失或未设置的项目。跳过已配置的项目。 |
| `--non-interactive` | 使用默认值/环境变量，无需提示。 |
| `--reset` | 在设置前将配置重置为默认值。 |
| `--reconfigure` | 向后兼容别名 — 在现有安装上运行裸 `hermes setup` 现在默认执行此操作。 |

## `hermes whatsapp`

```bash
hermes whatsapp
```

运行 WhatsApp 配对/设置流程，包括模式选择和二维码配对。

## `hermes login` / `hermes logout` *（已废弃）*

:::caution
`hermes login` 已被移除。请使用 `hermes auth` 管理 OAuth 凭证，`hermes model` 选择提供商，或 `hermes setup` 进行完整的交互式设置。
:::

## `hermes auth`

管理用于同提供商密钥轮换的凭证池。完整文档请参阅[凭证池](/docs/user-guide/features/credential-pools)。

```bash
hermes auth                                              # 交互式向导
hermes auth list                                         # 显示所有凭证池
hermes auth list openrouter                              # 显示特定提供商
hermes auth add openrouter --api-key sk-or-v1-xxx        # 添加 API 密钥
hermes auth add anthropic --type oauth                   # 添加 OAuth 凭证
hermes auth remove openrouter 2                          # 按索引移除
hermes auth reset openrouter                             # 清除冷却
```

子命令：`add`、`list`、`remove`、`reset`。不带子命令调用时，启动交互式管理向导。

## `hermes status`

```bash
hermes status [--all] [--deep]
```

| 选项 | 说明 |
|------|------|
| `--all` | 以可分享的脱敏格式显示所有详情。 |
| `--deep` | 运行更深入的检查，可能需要更长时间。 |

## `hermes cron`

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|tick>
```

| 子命令 | 说明 |
|--------|------|
| `list` | 显示已调度的任务。 |
| `create` / `add` | 从提示创建定时任务，可选通过重复 `--skill` 附加一个或多个 Skill。 |
| `edit` | 更新任务的调度时间、提示、名称、投递方式、重复次数或附加的 Skill。支持 `--clear-skills`、`--add-skill` 和 `--remove-skill`。 |
| `pause` | 暂停任务而不删除。 |
| `resume` | 恢复暂停的任务并计算下一次运行时间。 |
| `run` | 在下一次调度周期触发任务。 |
| `remove` | 删除定时任务。 |
| `status` | 检查 Cron 调度器是否正在运行。 |
| `tick` | 执行到期的任务一次后退出。 |

## `hermes webhook`

```bash
hermes webhook <subscribe|list|remove|test>
```

管理用于事件驱动 Agent 激活的动态 Webhook 订阅。需要在配置中启用 Webhook 平台 — 如果未配置，会打印设置说明。

| 子命令 | 说明 |
|--------|------|
| `subscribe` / `add` | 创建 Webhook 路由。返回 URL 和 HMAC 密钥以配置到你的服务上。 |
| `list` / `ls` | 显示所有 Agent 创建的订阅。 |
| `remove` / `rm` | 删除动态订阅。config.yaml 中的静态路由不受影响。 |
| `test` | 发送测试 POST 以验证订阅是否正常工作。 |

### `hermes webhook subscribe`

```bash
hermes webhook subscribe <name> [options]
```

| 选项 | 说明 |
|------|------|
| `--prompt` | 带有 `{dot.notation}` 负载引用的提示模板。 |
| `--events` | 逗号分隔的接受事件类型（如 `issues,pull_request`）。空 = 全部。 |
| `--description` | 人类可读的描述。 |
| `--skills` | 逗号分隔的 Skill 名称，用于加载到 Agent 运行中。 |
| `--deliver` | 投递目标：`log`（默认）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | 跨平台投递的目标聊天/频道 ID。 |
| `--secret` | 自定义 HMAC 密钥。省略时自动生成。 |

订阅持久化到 `~/.hermes/webhook_subscriptions.json`，并由 Webhook 适配器热加载，无需重启网关。

## `hermes doctor`

```bash
hermes doctor [--fix]
```

| 选项 | 说明 |
|------|------|
| `--fix` | 尝试在可能的地方自动修复。 |

## `hermes dump`

```bash
hermes dump [--show-keys]
```

输出一份紧凑的纯文本 Hermes 配置摘要。专为复制粘贴到 Discord、GitHub Issue 或 Telegram 以寻求支持而设计 — 无 ANSI 颜色，无特殊格式，只有数据。

| 选项 | 说明 |
|------|------|
| `--show-keys` | 显示脱敏的 API 密钥前缀（前 4 位和后 4 位）而非仅显示 `set`/`not set`。 |

### 输出内容

| 部分 | 详情 |
|------|------|
| **Header** | Hermes 版本、发布日期、Git 提交哈希 |
| **环境** | 操作系统、Python 版本、OpenAI SDK 版本 |
| **身份** | 活跃的 Profile 名称、HERMES_HOME 路径 |
| **模型** | 已配置的默认模型和提供商 |
| **终端** | 后端类型（local、docker、ssh 等） |
| **API 密钥** | 全部 22 个提供商/工具 API 密钥的存在性检查 |
| **功能** | 已启用的工具集、MCP 服务器数量、记忆提供商 |
| **服务** | 网关状态、已配置的消息平台 |
| **工作负载** | Cron 任务数量、已安装的 Skill 数量 |
| **配置覆盖** | 任何与默认值不同的配置值 |

### 示例输出

```
--- hermes dump ---
version:          0.8.0 (2026.4.8) [af4abd2f]
os:               Linux 6.14.0-37-generic x86_64
python:           3.11.14
openai_sdk:       2.24.0
profile:          default
hermes_home:      ~/.hermes
model:            anthropic/claude-opus-4.6
provider:         openrouter
terminal:         local

api_keys:
  openrouter           set
  openai               not set
  anthropic            set
  nous                 not set
  firecrawl            set
  ...

features:
  toolsets:           all
  mcp_servers:        0
  memory_provider:    built-in
  gateway:            running (systemd)
  platforms:          telegram, discord
  cron_jobs:          3 active / 5 total
  skills:             42

config_overrides:
  agent.max_turns: 250
  compression.threshold: 0.85
  display.streaming: True
--- end dump ---
```

### 何时使用

- 在 GitHub 上报告 Bug — 将 dump 粘贴到 Issue 中
- 在 Discord 中寻求帮助 — 在代码块中分享
- 将你的设置与他人的进行比较
- 当某些功能不正常时的快速自检

:::tip
`hermes dump` 专为分享而设计。如需交互式诊断，请使用 `hermes doctor`。如需可视化概览，请使用 `hermes status`。
:::

## `hermes debug`

```bash
hermes debug share [options]
```

将调试报告（系统信息 + 近期日志）上传到粘贴服务并获取可分享的 URL。适用于快速的支持请求 — 包含帮助者诊断问题所需的一切信息。

| 选项 | 说明 |
|------|------|
| `--lines <N>` | 每个日志文件包含的日志行数（默认：200）。 |
| `--expire <days>` | 粘贴过期天数（默认：7）。 |
| `--local` | 在本地打印报告而非上传。 |

报告包括系统信息（操作系统、Python 版本、Hermes 版本）、近期的 Agent 和网关日志（每个文件 512 KB 限制）以及脱敏的 API 密钥状态。密钥始终被脱敏 — 不会上传任何密钥。

粘贴服务按以下顺序尝试：paste.rs、dpaste.com。

### 示例

```bash
hermes debug share              # 上传调试报告，打印 URL
hermes debug share --lines 500  # 包含更多日志行
hermes debug share --expire 30  # 粘贴保留 30 天
hermes debug share --local      # 打印报告到终端（不上传）
```

## `hermes backup`

```bash
hermes backup [options]
```

将你的 Hermes 配置、Skill、会话和数据创建为 zip 归档。备份排除 hermes-agent 代码库本身。

| 选项 | 说明 |
|------|------|
| `-o`、`--output <path>` | zip 文件的输出路径（默认：`~/hermes-backup-<timestamp>.zip`）。 |
| `-q`、`--quick` | 快速快照：仅包含关键状态文件（config.yaml、state.db、.env、auth、Cron 任务）。比完整备份快得多。 |
| `-l`、`--label <name>` | 快照的标签（仅配合 `--quick` 使用）。 |

备份使用 SQLite 的 `backup()` API 进行安全复制，即使 Hermes 正在运行时也能正常工作（支持 WAL 模式）。

### 示例

```bash
hermes backup                           # 完整备份到 ~/hermes-backup-*.zip
hermes backup -o /tmp/hermes.zip        # 完整备份到指定路径
hermes backup --quick                   # 快速仅状态快照
hermes backup --quick --label "pre-upgrade"  # 带标签的快速快照
```

## `hermes import`

```bash
hermes import <zipfile> [options]
```

将之前创建的 Hermes 备份恢复到 Hermes 主目录。

| 选项 | 说明 |
|------|------|
| `-f`、`--force` | 无需确认即覆盖现有文件。 |

## `hermes logs`

```bash
hermes logs [log_name] [options]
```

查看、跟踪和过滤 Hermes 日志文件。所有日志存储在 `~/.hermes/logs/`（非默认 Profile 则在 `<profile>/logs/`）。

### 日志文件

| 名称 | 文件 | 记录内容 |
|------|------|----------|
| `agent`（默认） | `agent.log` | 所有 Agent 活动 — API 调用、工具分发、会话生命周期（INFO 及以上级别） |
| `errors` | `errors.log` | 仅警告和错误 — agent.log 的过滤子集 |
| `gateway` | `gateway.log` | 消息网关活动 — 平台连接、消息分发、Webhook 事件 |

### 选项

| 选项 | 说明 |
|------|------|
| `log_name` | 要查看的日志：`agent`（默认）、`errors`、`gateway`，或 `list` 显示可用文件及大小。 |
| `-n`、`--lines <N>` | 显示的行数（默认：50）。 |
| `-f`、`--follow` | 实时跟踪日志，类似 `tail -f`。按 Ctrl+C 停止。 |
| `--level <LEVEL>` | 最低日志级别：`DEBUG`、`INFO`、`WARNING`、`ERROR`、`CRITICAL`。 |
| `--session <ID>` | 过滤包含指定会话 ID 子串的行。 |
| `--since <TIME>` | 显示相对时间之前的行：`30m`、`1h`、`2d` 等。支持 `s`（秒）、`m`（分钟）、`h`（小时）、`d`（天）。 |
| `--component <NAME>` | 按组件过滤：`gateway`、`agent`、`tools`、`cli`、`cron`。 |

### 示例

```bash
# 查看 agent.log 的最后 50 行（默认）
hermes logs

# 实时跟踪 agent.log
hermes logs -f

# 查看 gateway.log 的最后 100 行
hermes logs gateway -n 100

# 只显示最近一小时的警告和错误
hermes logs --level WARNING --since 1h

# 按特定会话过滤
hermes logs --session abc123

# 跟踪 errors.log，从 30 分钟前开始
hermes logs errors --since 30m -f

# 列出所有日志文件及其大小
hermes logs list
```

### 过滤

过滤器可以组合使用。当多个过滤器同时启用时，日志行必须通过**所有**过滤器才会显示：

```bash
# 最近 2 小时内包含会话 "tg-12345" 的 WARNING+ 级别日志
hermes logs --level WARNING --since 2h --session tg-12345
```

没有可解析时间戳的行在 `--since` 启用时仍会包含在内（可能是多行日志条目的续行）。没有可检测级别的行在 `--level` 启用时也会包含。

### 日志轮转

Hermes 使用 Python 的 `RotatingFileHandler`。旧日志会自动轮转 — 查找 `agent.log.1`、`agent.log.2` 等。`hermes logs list` 子命令显示所有日志文件，包括已轮转的。

## `hermes config`

```bash
hermes config <subcommand>
```

子命令：

| 子命令 | 说明 |
|--------|------|
| `show` | 显示当前配置值。 |
| `edit` | 在编辑器中打开 `config.yaml`。 |
| `set <key> <value>` | 设置一个配置值。 |
| `path` | 打印配置文件路径。 |
| `env-path` | 打印 `.env` 文件路径。 |
| `check` | 检查缺失或过期的配置。 |
| `migrate` | 交互式添加新引入的配置项。 |

## `hermes pairing`

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| 子命令 | 说明 |
|--------|------|
| `list` | 显示待处理和已批准的用户。 |
| `approve <platform> <code>` | 批准配对码。 |
| `revoke <platform> <user-id>` | 撤销用户访问权限。 |
| `clear-pending` | 清除待处理的配对码。 |

## `hermes skills`

```bash
hermes skills <subcommand>
```

子命令：

| 子命令 | 说明 |
|--------|------|
| `browse` | 分页浏览 Skill 注册中心。 |
| `search` | 搜索 Skill 注册中心。 |
| `install` | 安装 Skill。 |
| `inspect` | 预览 Skill 而不安装。 |
| `list` | 列出已安装的 Skill。 |
| `check` | 检查已安装的 Hub Skill 是否有上游更新。 |
| `update` | 当有上游更改时重新安装 Hub Skill。 |
| `audit` | 重新扫描已安装的 Hub Skill。 |
| `uninstall` | 移除 Hub 安装的 Skill。 |
| `publish` | 将 Skill 发布到注册中心。 |
| `snapshot` | 导出/导入 Skill 配置。 |
| `tap` | 管理自定义 Skill 来源。 |
| `config` | 按平台交互式启用/禁用 Skill 配置。 |

常用示例：

```bash
hermes skills browse
hermes skills browse --source official
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect official/security/1password
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install official/migration/openclaw-migration
hermes skills install skills-sh/anthropics/skills/pdf --force
hermes skills check
hermes skills update
hermes skills config
```

注意：
- `--force` 可以覆盖第三方/社区 Skill 的非危险策略阻止。
- `--force` 不能覆盖 `dangerous` 扫描判定。
- `--source skills-sh` 搜索公共 `skills.sh` 目录。
- `--source well-known` 让你指向暴露 `/.well-known/skills/index.json` 的网站。

## `hermes honcho`

```bash
hermes honcho [--target-profile NAME] <subcommand>
```

管理 Honcho 跨会话记忆集成。此命令由 Honcho 记忆提供商插件提供，仅在配置中 `memory.provider` 设为 `honcho` 时可用。

`--target-profile` 标志允许你管理其他 Profile 的 Honcho 配置而无需切换。

子命令：

| 子命令 | 说明 |
|--------|------|
| `setup` | 重定向到 `hermes memory setup`（统一设置路径）。 |
| `status [--all]` | 显示当前 Honcho 配置和连接状态。`--all` 显示跨 Profile 概览。 |
| `peers` | 显示所有 Profile 的对等身份。 |
| `sessions` | 列出已知的 Honcho 会话映射。 |
| `map [name]` | 将当前目录映射到 Honcho 会话名称。省略 `name` 列出当前映射。 |
| `peer` | 显示或更新对等名称和辩证推理级别。选项：`--user NAME`、`--ai NAME`、`--reasoning LEVEL`。 |
| `mode [mode]` | 显示或设置召回模式：`hybrid`、`context` 或 `tools`。省略显示当前值。 |
| `tokens` | 显示或设置上下文和辩证的 Token 预算。选项：`--context N`、`--dialectic N`。 |
| `identity [file] [--show]` | 种子化或显示 AI 对等身份表示。 |
| `enable` | 为活跃 Profile 启用 Honcho。 |
| `disable` | 为活跃 Profile 禁用 Honcho。 |
| `sync` | 将 Honcho 配置同步到所有现有 Profile（创建缺失的主机块）。 |
| `migrate` | 从 openclaw-honcho 迁移到 Hermes Honcho 的分步指南。 |

## `hermes memory`

```bash
hermes memory <subcommand>
```

设置和管理外部记忆提供商插件。可用提供商：honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory。同时只能激活一个外部提供商。内置记忆（MEMORY.md/USER.md）始终可用。

子命令：

| 子命令 | 说明 |
|--------|------|
| `setup` | 交互式提供商选择和配置。 |
| `status` | 显示当前记忆提供商配置。 |
| `off` | 禁用外部提供商（仅使用内置）。 |

## `hermes acp`

```bash
hermes acp
```

将 Hermes 作为 ACP（Agent Client Protocol）stdio 服务器启动，用于编辑器集成。

相关入口：

```bash
hermes-acp
python -m acp_adapter
```

先安装支持：

```bash
pip install -e '.[acp]'
```

参阅 [ACP 编辑器集成](../user-guide/features/acp.md) 和 [ACP 内部机制](../developer-guide/acp-internals.md)。

## `hermes mcp`

```bash
hermes mcp <subcommand>
```

管理 MCP（Model Context Protocol，模型上下文协议）服务器配置并将 Hermes 作为 MCP 服务器运行。

| 子命令 | 说明 |
|--------|------|
| `serve [-v\|--verbose]` | 将 Hermes 作为 MCP 服务器运行 — 将对话暴露给其他 Agent。 |
| `add <name> [--url URL] [--command CMD] [--args ...] [--auth oauth\|header]` | 添加带自动工具发现的 MCP 服务器。 |
| `remove <name>`（别名：`rm`） | 从配置中移除 MCP 服务器。 |
| `list`（别名：`ls`） | 列出已配置的 MCP 服务器。 |
| `test <name>` | 测试与 MCP 服务器的连接。 |
| `configure <name>`（别名：`config`） | 切换服务器的工具选择。 |

参阅 [MCP 配置参考](./mcp-config-reference.md)、[在 Hermes 中使用 MCP](../guides/use-mcp-with-hermes.md) 和 [MCP 服务器模式](../user-guide/features/mcp.md#running-hermes-as-an-mcp-server)。

## `hermes plugins`

```bash
hermes plugins [subcommand]
```

统一的插件管理 — 通用插件、记忆提供商和上下文引擎集中管理。不带子命令运行 `hermes plugins` 会打开一个包含两个部分的复合交互界面：

- **通用插件** — 多选复选框启用/禁用已安装的插件
- **提供商插件** — 单选配置记忆提供商和上下文引擎。按 ENTER 打开单选选择器。

| 子命令 | 说明 |
|--------|------|
| *（无）* | 复合交互式 UI — 通用插件开关 + 提供商插件配置。 |
| `install <identifier> [--force]` | 从 Git URL 或 `owner/repo` 安装插件。 |
| `update <name>` | 拉取已安装插件的最新更改。 |
| `remove <name>`（别名：`rm`、`uninstall`） | 移除已安装的插件。 |
| `enable <name>` | 启用已禁用的插件。 |
| `disable <name>` | 禁用插件而不移除。 |
| `list`（别名：`ls`） | 列出已安装的插件及其启用/禁用状态。 |

提供商插件选择保存在 `config.yaml` 中：
- `memory.provider` — 活跃的记忆提供商（空 = 仅内置）
- `context.engine` — 活跃的上下文引擎（`"compressor"` = 内置默认）

通用插件的禁用列表存储在 `config.yaml` 的 `plugins.disabled` 下。

参阅[插件](../user-guide/features/plugins.md)和[构建 Hermes 插件](../guides/build-a-hermes-plugin.md)。

## `hermes tools`

```bash
hermes tools [--summary]
```

| 选项 | 说明 |
|------|------|
| `--summary` | 打印当前启用的工具摘要并退出。 |

不带 `--summary` 时，启动交互式按平台工具配置 UI。

## `hermes sessions`

```bash
hermes sessions <subcommand>
```

子命令：

| 子命令 | 说明 |
|--------|------|
| `list` | 列出最近的会话。 |
| `browse` | 带搜索和恢复功能的交互式会话选择器。 |
| `export <output> [--session-id ID]` | 将会话导出为 JSONL。 |
| `delete <session-id>` | 删除一个会话。 |
| `prune` | 删除旧会话。 |
| `stats` | 显示会话存储统计。 |
| `rename <session-id> <title>` | 设置或更改会话标题。 |

## `hermes insights`

```bash
hermes insights [--days N] [--source platform]
```

| 选项 | 说明 |
|------|------|
| `--days <n>` | 分析最近 `n` 天（默认：30）。 |
| `--source <platform>` | 按来源过滤，如 `cli`、`telegram` 或 `discord`。 |

## `hermes claw`

```bash
hermes claw migrate [options]
```

将你的 OpenClaw 配置迁移到 Hermes。从 `~/.openclaw`（或自定义路径）读取并写入 `~/.hermes`。自动检测遗留目录名（`~/.clawdbot`、`~/.moltbot`）和配置文件名（`clawdbot.json`、`moltbot.json`）。

| 选项 | 说明 |
|------|------|
| `--dry-run` | 预览将要迁移的内容而不写入任何文件。 |
| `--preset <name>` | 迁移预设：`full`（默认，包含密钥）或 `user-data`（排除 API 密钥）。 |
| `--overwrite` | 冲突时覆盖现有 Hermes 文件（默认：跳过）。 |
| `--migrate-secrets` | 在迁移中包含 API 密钥（使用 `--preset full` 时默认启用）。 |
| `--source <path>` | 自定义 OpenClaw 目录（默认：`~/.openclaw`）。 |
| `--workspace-target <path>` | 工作区指令（AGENTS.md）的目标目录。 |
| `--skill-conflict <mode>` | 处理 Skill 名称冲突：`skip`（默认）、`overwrite` 或 `rename`。 |
| `--yes` | 跳过确认提示。 |

### 迁移内容

迁移涵盖 30 多个类别，包括人格、记忆、Skill、模型提供商、消息平台、Agent 行为、会话策略、MCP 服务器、TTS 等。项目会被**直接导入**到 Hermes 等效项，或**归档**以供手动审查。

**直接导入：** SOUL.md、MEMORY.md、USER.md、AGENTS.md、Skill（4 个源目录）、默认模型、自定义提供商、MCP 服务器、消息平台令牌和允许列表（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、Agent 默认值（推理力度、压缩、人工延迟、时区、沙箱）、会话重置策略、审批规则、TTS 配置、浏览器设置、工具设置、执行超时、命令允许列表、网关配置和来自 3 个来源的 API 密钥。

**归档供手动审查：** Cron 任务、插件、Hook/Webhook、记忆后端（QMD）、Skill 注册配置、UI/身份、日志、多 Agent 设置、频道绑定、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API 密钥解析**按优先级检查三个来源：配置值 → `~/.openclaw/.env` → `auth-profiles.json`。所有 Token 字段处理纯字符串、环境模板（`${VAR}`）和 SecretRef 对象。

完整的配置键映射、SecretRef 处理详情和迁移后检查清单，请参阅 **[完整迁移指南](../guides/migrate-from-openclaw.md)**。

### 示例

```bash
# 预览将要迁移的内容
hermes claw migrate --dry-run

# 完整迁移，包含 API 密钥
hermes claw migrate --preset full

# 仅迁移用户数据（不含密钥），覆盖冲突
hermes claw migrate --preset user-data --overwrite

# 从自定义 OpenClaw 路径迁移
hermes claw migrate --source /home/user/old-openclaw
```

## `hermes dashboard`

```bash
hermes dashboard [options]
```

启动 Web 仪表盘 — 基于浏览器的 UI，用于管理配置、API 密钥和监控会话。需要 `pip install hermes-agent[web]`（FastAPI + Uvicorn）。完整文档请参阅 [Web 仪表盘](/docs/user-guide/features/web-dashboard)。

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--port` | `9119` | Web 服务器端口 |
| `--host` | `127.0.0.1` | 绑定地址 |
| `--no-open` | — | 不自动打开浏览器 |

```bash
# 默认 — 打开浏览器访问 http://127.0.0.1:9119
hermes dashboard

# 自定义端口，不打开浏览器
hermes dashboard --port 8080 --no-open
```

## `hermes profile`

```bash
hermes profile <subcommand>
```

管理配置文件 — 多个隔离的 Hermes 实例，每个实例拥有独立的配置、会话、Skill 和主目录。

| 子命令 | 说明 |
|--------|------|
| `list` | 列出所有 Profile。 |
| `use <name>` | 设置默认 Profile。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 创建新 Profile。`--clone` 从当前 Profile 复制配置、`.env` 和 `SOUL.md`。`--clone-all` 复制所有状态。`--clone-from` 指定源 Profile。 |
| `delete <name> [-y]` | 删除一个 Profile。 |
| `show <name>` | 显示 Profile 详情（主目录、配置等）。 |
| `alias <name> [--remove] [--name NAME]` | 管理快速访问 Profile 的包装脚本。 |
| `rename <old> <new>` | 重命名 Profile。 |
| `export <name> [-o FILE]` | 将 Profile 导出为 `.tar.gz` 归档。 |
| `import <archive> [--name NAME]` | 从 `.tar.gz` 归档导入 Profile。 |

示例：

```bash
hermes profile list
hermes profile create work --clone
hermes profile use work
hermes profile alias work --name h-work
hermes profile export work -o work-backup.tar.gz
hermes profile import work-backup.tar.gz --name restored
hermes -p work chat -q "Hello from work profile"
```

## `hermes completion`

```bash
hermes completion [bash|zsh]
```

将 Shell 补全脚本打印到标准输出。在你的 Shell 配置文件中 source 输出以实现 Hermes 命令、子命令和 Profile 名称的 Tab 补全。

示例：

```bash
# Bash
hermes completion bash >> ~/.bashrc

# Zsh
hermes completion zsh >> ~/.zshrc
```

## 维护命令

| 命令 | 说明 |
|------|------|
| `hermes version` | 打印版本信息。 |
| `hermes update` | 拉取最新更改并重新安装依赖。 |
| `hermes uninstall [--full] [--yes]` | 移除 Hermes，可选择删除所有配置/数据。 |

## 相关链接

- [斜杠命令参考](./slash-commands.md)
- [CLI 界面](../user-guide/cli.md)
- [会话](../user-guide/sessions.md)
- [Skill 系统](../user-guide/features/skills.md)
- [皮肤与主题](../user-guide/features/skins.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/reference/cli-commands)
