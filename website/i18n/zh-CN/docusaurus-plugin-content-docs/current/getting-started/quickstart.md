---
sidebar_position: 1
title: "快速入门"
description: "你与 Hermes Agent 的第一次对话 — 从安装到聊天只需不到 5 分钟"
---

# 快速入门

本指南带你从零开始，搭建一个能经受实际使用的 Hermes 环境。安装、选择提供商、验证聊天可用，并确切知道出问题时该怎么办。

## 本指南适合谁

- 全新用户，想要最短的路径搭好环境
- 正在切换提供商，不想因配置错误浪费时间
- 要为团队、Bot 或常驻工作流搭建 Hermes
- 受够了"装好了，但还是什么都不能做"

## 最快路径

选择与你的目标匹配的行：

| 目标 | 先做这个 | 然后做这个 |
|---|---|---|
| 我只想在本机上用 Hermes | `hermes setup` | 运行一次真实聊天，确认它能回复 |
| 我已经知道要用哪个提供商 | `hermes model` | 保存配置，然后开始聊天 |
| 我想要 Bot 或常驻服务 | CLI 能用后再运行 `hermes gateway setup` | 连接 Telegram、Discord、Slack 或其他平台 |
| 我想要本地或自托管模型 | `hermes model` → 自定义端点 | 验证端点地址、模型名称和上下文长度 |
| 我想要多提供商路由 | 先用 `hermes model` 设置主提供商 | 基础聊天能用了再添加路由和 Fallback |

**经验法则：** 如果 Hermes 还不能完成一次正常聊天，不要添加更多功能。先把一次干净的对话跑通，然后再叠加 Gateway、Cron、Skill、语音或路由。

---

## 1. 安装 Hermes Agent

运行一行安装命令：

```bash
# Linux / macOS / WSL2 / Android (Termux)
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

:::tip Android / Termux
如果你在手机上安装，请参阅专门的 [Termux 指南](./termux.md)，了解经过测试的手动安装路径、支持的额外组件和当前 Android 特定限制。
:::

:::tip Windows 用户
先安装 [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)，然后在 WSL2 终端中运行上面的命令。
:::

安装完成后，重新加载你的 Shell：

```bash
source ~/.bashrc   # 或 source ~/.zshrc
```

关于详细的安装选项、前提条件和故障排除，参见[安装指南](./installation.md)。

## 2. 选择提供商

最重要的一个设置步骤。使用 `hermes model` 交互式地完成选择：

```bash
hermes model
```

好的默认选择：

| 场景 | 推荐路径 |
|---|---|
| 最省事 | Nous Portal 或 OpenRouter |
| 你已有 Claude 或 Codex 认证 | Anthropic 或 OpenAI Codex |
| 你想要本地/私有推理 | Ollama 或任何自定义 OpenAI 兼容端点 |
| 你想要多提供商路由 | OpenRouter |
| 你有自己的 GPU 服务器 | vLLM、SGLang、LiteLLM 或任何 OpenAI 兼容端点 |

大多数首次使用的用户：选择一个提供商，除非你知道为什么要改，否则接受默认值。完整的提供商目录（含环境变量和设置步骤）在 [Provider（提供商）](../integrations/providers.md) 页面。

:::caution 最低上下文：64K Token
Hermes Agent 要求模型至少有 **64,000 Token** 的上下文窗口。更小窗口的模型无法为多步骤工具调用工作流维护足够的工作记忆，会在启动时被拒绝。大多数托管模型（Claude、GPT、Gemini、Qwen、DeepSeek）都轻松满足。如果你在运行本地模型，将其上下文大小设为至少 64K（如 llama.cpp 用 `--ctx-size 65536`，Ollama 用 `-c 65536`）。
:::

:::tip
你可以随时用 `hermes model` 切换提供商 — 没有锁定。所有支持的提供商和设置详情，参见 [AI Provider（提供商）](../integrations/providers.md)。
:::

### 设置的存储方式

Hermes 将密钥和普通配置分开存储：

- **密钥和 Token** → `~/.hermes/.env`
- **非密钥设置** → `~/.hermes/config.yaml`

设置值最简单的方式是通过 CLI：

```bash
hermes config set model anthropic/claude-opus-4.6
hermes config set terminal.backend docker
hermes config set OPENROUTER_API_KEY sk-or-...
```

值会自动存到正确的文件中。

## 3. 运行你的第一次聊天

```bash
hermes            # 经典 CLI
hermes --tui      # 现代 TUI（推荐）
```

你会看到一个欢迎横幅，显示你的模型、可用工具和 Skill。使用一个具体且容易验证的提示：

:::tip 选择你的界面
Hermes 附带两个终端界面：经典的 `prompt_toolkit` CLI 和更新的 [TUI](../user-guide/tui.md)（支持模态叠加、鼠标选择和非阻塞输入）。两者共享相同的会话、斜杠命令和配置 — 试试 `hermes` 和 `hermes --tui` 各一个。
:::

```
Summarize this repo in 5 bullets and tell me what the main entrypoint is.
```

```
Check my current directory and tell me what looks like the main project file.
```

```
Help me set up a clean GitHub PR workflow for this codebase.
```

**成功的标志：**

- 横幅显示你选择的模型/提供商
- Hermes 无错误地回复
- 它能在需要时使用工具（terminal、file read、web search）
- 对话能正常进行多轮

如果这能工作，最难的部分就已经过去了。

## 4. 验证会话恢复

在继续之前，确保恢复功能正常：

```bash
hermes --continue    # 恢复最近的会话
hermes -c            # 简写形式
```

这应该能把你带回刚才的会话。如果不能，检查你是否在同一个 Profile 中，以及会话是否真的保存了。这在以后管理多个设置或机器时很重要。

## 5. 试试核心功能

### 使用终端

```
❯ What's my disk usage? Show the top 5 largest directories.
```

Agent 会代表你运行终端命令并显示结果。

### 斜杠命令

输入 `/` 查看所有命令的自动补全下拉列表：

| 命令 | 功能 |
|------|------|
| `/help` | 显示所有可用命令 |
| `/tools` | 列出可用工具 |
| `/model` | 交互式切换模型 |
| `/personality pirate` | 试试有趣的人格 |
| `/save` | 保存对话 |

### 多行输入

按 `Alt+Enter` 或 `Ctrl+J` 添加新行。适合粘贴代码或编写详细提示。

### 中断 Agent

如果 Agent 花了太长时间，输入新消息并按回车 — 它会中断当前任务并切换到你的新指令。`Ctrl+C` 也可以。

## 6. 添加下一层

只在基础聊天能用之后。按需选择：

### Bot 或共享助手

```bash
hermes gateway setup    # 交互式平台配置
```

连接 [Telegram](/docs/user-guide/messaging/telegram)、[Discord](/docs/user-guide/messaging/discord)、[Slack](/docs/user-guide/messaging/slack)、[WhatsApp](/docs/user-guide/messaging/whatsapp)、[Signal](/docs/user-guide/messaging/signal)、[Email](/docs/user-guide/messaging/email) 或 [Home Assistant](/docs/user-guide/messaging/homeassistant)。

### 自动化和工具

- `hermes tools` — 按平台调整工具访问
- `hermes skills` — 浏览和安装可复用的工作流
- Cron — 只在 Bot 或 CLI 设置稳定后再配置

### 沙盒终端

为了安全，在 Docker 容器或远程服务器中运行 Agent：

```bash
hermes config set terminal.backend docker    # Docker 隔离
hermes config set terminal.backend ssh       # 远程服务器
```

### 语音模式

```bash
pip install "hermes-agent[voice]"
# 包含 faster-whisper，提供免费的本地语音转文字
```

然后在 CLI 中：`/voice on`。按 `Ctrl+B` 开始录音。参见[语音模式](../user-guide/features/voice-mode.md)。

### Skill

```bash
hermes skills search kubernetes
hermes skills install openai/skills/k8s
```

或在聊天会话中使用 `/skills`。

### MCP Server

```yaml
# 添加到 ~/.hermes/config.yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx"
```

### 编辑器集成（ACP）

```bash
pip install -e '.[acp]'
hermes acp
```

参见 [ACP 编辑器集成](../user-guide/features/acp.md)。

---

## 常见故障模式

这些是浪费最多时间的问题：

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| Hermes 启动但返回空或乱码的回复 | 提供商认证或模型选择有误 | 重新运行 `hermes model`，确认提供商、模型和认证 |
| 自定义端点"能用"但返回垃圾 | 错误的 base URL、模型名称，或不是真正的 OpenAI 兼容 | 先用单独的客户端验证端点 |
| Gateway 启动了但没人能发消息 | Bot Token、白名单或平台设置不完整 | 重新运行 `hermes gateway setup` 并检查 `hermes gateway status` |
| `hermes --continue` 找不到旧会话 | 切换了 Profile 或会话未保存 | 检查 `hermes sessions list`，确认你在正确的 Profile 中 |
| 模型不可用或奇怪的 Fallback 行为 | 提供商路由或 Fallback 设置过于激进 | 在基础提供商稳定之前保持路由关闭 |
| `hermes doctor` 报告配置问题 | 配置值缺失或过期 | 修复配置，在添加功能前重新测试普通聊天 |

## 恢复工具包

感觉不对时，按这个顺序排查：

1. `hermes doctor`
2. `hermes model`
3. `hermes setup`
4. `hermes sessions list`
5. `hermes --continue`
6. `hermes gateway status`

这个序列能让你从"感觉坏了"快速回到已知正常状态。

---

## 快速参考

| 命令 | 描述 |
|------|------|
| `hermes` | 开始聊天 |
| `hermes model` | 选择你的 LLM 提供商和模型 |
| `hermes tools` | 配置每个平台启用的工具 |
| `hermes setup` | 完整设置向导（一次配置所有内容） |
| `hermes doctor` | 诊断问题 |
| `hermes update` | 更新到最新版本 |
| `hermes gateway` | 启动消息 Gateway |
| `hermes --continue` | 恢复上次会话 |

## 下一步

- **[CLI 指南](../user-guide/cli.md)** — 掌握终端界面
- **[配置](../user-guide/configuration.md)** — 自定义你的设置
- **[消息 Gateway](../user-guide/messaging/index.md)** — 连接 Telegram、Discord、Slack、WhatsApp、Signal、Email 或 Home Assistant
- **[工具和工具集](../user-guide/features/tools.md)** — 探索可用能力
- **[AI Provider](../integrations/providers.md)** — 完整提供商列表和设置详情
- **[Skill 系统](../user-guide/features/skills.md)** — 可复用的工作流和知识
- **[技巧和最佳实践](../guides/tips.md)** — 高级用户技巧

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/getting-started/quickstart)
