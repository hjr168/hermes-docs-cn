---
sidebar_position: 3
title: "常见问题与故障排除"
description: "Hermes Agent 常见问题解答和常见问题的解决方案"
---

# 常见问题与故障排除

最常见的问题和对应的快速解答与修复方案。

---

## 常见问题

### Hermes 支持哪些 LLM 提供商？

Hermes Agent 兼容任何 OpenAI 兼容的 API。支持的提供商包括：

- **[OpenRouter](https://openrouter.ai/)** — 通过一个 API 密钥访问数百个模型（推荐，灵活性最高）
- **Nous Portal** — Nous Research 自有的推理端点
- **OpenAI** — GPT-4o、o1、o3 等
- **Anthropic** — Claude 模型（通过 OpenRouter 或兼容代理）
- **Google** — Gemini 模型（通过 OpenRouter 或兼容代理）
- **z.ai / ZhipuAI（智谱 AI）** — GLM 模型
- **Kimi / Moonshot AI（月之暗面）** — Kimi 模型
- **MiniMax** — 全球及中国端点
- **本地模型** — 通过 [Ollama](https://ollama.com/)、[vLLM](https://docs.vllm.ai/)、[llama.cpp](https://github.com/ggerganov/llama.cpp)、[SGLang](https://github.com/sgl-project/sglang) 或任何 OpenAI 兼容服务器

使用 `hermes model` 设置提供商，或编辑 `~/.hermes/.env`。请参阅[环境变量](./environment-variables.md)参考文档了解所有提供商密钥。

### 支持 Windows 吗？

**原生不支持。** Hermes Agent 需要 Unix 类环境。在 Windows 上，请安装 [WSL2](https://learn.microsoft.com/zh-cn/windows/wsl/install) 并在 WSL 内运行 Hermes。标准安装命令在 WSL2 中可正常工作：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### 支持 Android / Termux 吗？

支持 — Hermes 现已有经过测试的 Termux 安装方案，适用于 Android 手机。

快速安装：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

完整的安装步骤、支持的可选组件和当前限制，请参阅 [Termux 安装指南](../getting-started/termux.md)。

重要提示：完整的 `.[all]` 可选组件目前不支持 Android，因为 `voice` 组件依赖 `faster-whisper` → `ctranslate2`，而 `ctranslate2` 不发布 Android 的 wheel 包。请使用经过测试的 `.[termux]` 可选组件代替。

### 我的数据会发送到哪里？

API 调用**仅发送到你配置的 LLM 提供商**（例如 OpenRouter、你本地的 Ollama 实例）。Hermes Agent 不收集遥测数据、使用数据或分析数据。你的对话、记忆和 Skill 存储在本地的 `~/.hermes/` 中。

### 可以离线 / 使用本地模型吗？

可以。运行 `hermes model`，选择 **Custom endpoint（自定义端点）**，然后输入你的服务器 URL：

```bash
hermes model
# 选择: Custom endpoint（手动输入 URL）
# API base URL: http://localhost:11434/v1
# API key: ollama
# Model name: qwen3.5:27b
# Context length: 32768   ← 设置为与你服务器实际的上下文窗口一致
```

或者直接在 `config.yaml` 中配置：

```yaml
model:
  default: qwen3.5:27b
  provider: custom
  base_url: http://localhost:11434/v1
```

Hermes 会将端点、提供商和 base URL 持久保存在 `config.yaml` 中，重启后仍然有效。如果你的本地服务器只加载了一个模型，`/model custom` 会自动检测它。你也可以在 config.yaml 中设置 `provider: custom` — 它是一个一等公民提供商，不是其他提供商的别名。

这适用于 Ollama、vLLM、llama.cpp server、SGLang、LocalAI 等。详见[配置指南](../user-guide/configuration.md)。

:::tip Ollama 用户
如果你在 Ollama 中设置了自定义的 `num_ctx`（例如 `ollama run --num_ctx 16384`），请确保在 Hermes 中设置匹配的上下文长度 — Ollama 的 `/api/show` 报告的是模型的*最大*上下文长度，而不是你配置的有效 `num_ctx`。
:::

:::tip 本地模型的超时问题
Hermes 会自动检测本地端点并放宽流式超时（读取超时从 120 秒提高到 1800 秒，禁用过期流检测）。如果你在超大上下文下仍然遇到超时，请在 `.env` 中设置 `HERMES_STREAM_READ_TIMEOUT=1800`。详见[本地 LLM 指南](../guides/local-llm-on-mac.md#timeouts)。
:::

### 费用是多少？

Hermes Agent 本身是**免费且开源的**（MIT 许可证）。你只需为你选择的 LLM 提供商的 API 使用量付费。本地模型完全免费运行。

### 可以多人共用一个实例吗？

可以。[消息网关（Messaging Gateway）](../user-guide/messaging/index.md)允许多个用户通过 Telegram、Discord、Slack、WhatsApp 或 Home Assistant 与同一个 Hermes Agent 实例交互。访问通过允许列表（特定用户 ID）和 DM 配对（第一个发送消息的用户获得访问权）来控制。

### Memory 和 Skill 有什么区别？

- **Memory（记忆）** 存储**事实** — Agent 了解到的关于你、你的项目和偏好的信息。Memory 会根据相关性自动检索。
- **Skill（技能）** 存储**流程** — 如何执行操作的逐步指令。当 Agent 遇到类似任务时会调用 Skill。

两者都会跨会话持久保存。详见 [Memory](../user-guide/features/memory.md) 和 [Skill](../user-guide/features/skills.md)。

### 可以在我自己的 Python 项目中使用吗？

可以。导入 `AIAgent` 类即可编程式使用 Hermes：

```python
from run_agent import AIAgent

agent = AIAgent(model="anthropic/claude-opus-4.7")
response = agent.chat("Explain quantum computing briefly")
```

完整的 API 使用方法请参阅 [Python 库指南](../user-guide/features/code-execution.md)。

---

## 故障排除

### 安装问题

#### 安装后提示 `hermes: command not found`

**原因：** 你的 Shell 还没有重新加载更新后的 PATH。

**解决方案：**
```bash
# 重新加载 Shell 配置
source ~/.bashrc    # bash
source ~/.zshrc     # zsh

# 或者开启一个新的终端会话
```

如果仍然不生效，请确认安装位置：
```bash
which hermes
ls ~/.local/bin/hermes
```

:::tip
安装程序会将 `~/.local/bin` 添加到你的 PATH。如果你使用非标准的 Shell 配置，请手动添加 `export PATH="$HOME/.local/bin:$PATH"`。
:::

#### Python 版本过旧

**原因：** Hermes 需要 Python 3.11 或更高版本。

**解决方案：**
```bash
python3 --version   # 检查当前版本

# 安装更新的 Python
sudo apt install python3.12   # Ubuntu/Debian
brew install python@3.12      # macOS
```

安装程序会自动处理此问题 — 如果在手动安装时遇到此错误，请先升级 Python。

#### `uv: command not found`

**原因：** `uv` 包管理器未安装或不在 PATH 中。

**解决方案：**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

#### 安装时出现 Permission denied 错误

**原因：** 没有安装目录的写入权限。

**解决方案：**
```bash
# 不要使用 sudo 运行安装程序 — 它安装到 ~/.local/bin
# 如果你之前用 sudo 安装过，先清理：
sudo rm /usr/local/bin/hermes
# 然后重新运行标准安装程序
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

---

### 提供商与模型问题

#### `/model` 只显示一个提供商 / 无法切换提供商

**原因：** `/model`（在聊天会话内）只能在**已配置的**提供商之间切换。如果你只设置了 OpenRouter，那 `/model` 就只会显示 OpenRouter。

**解决方案：** 退出会话，在终端中使用 `hermes model` 添加新提供商：

```bash
# 先退出 Hermes 聊天会话（Ctrl+C 或 /quit）

# 运行完整的提供商设置向导
hermes model

# 这允许你：添加提供商、运行 OAuth、输入 API 密钥、配置端点
```

通过 `hermes model` 添加新提供商后，启动新的聊天会话 — `/model` 就会显示所有已配置的提供商。

:::tip 快速参考
| 想要... | 使用命令 |
|-----------|-----|
| 添加新提供商 | `hermes model`（从终端运行） |
| 输入/更改 API 密钥 | `hermes model`（从终端运行） |
| 会话中切换模型 | `/model <名称>`（在会话内） |
| 切换到其他已配置的提供商 | `/model 提供商:模型`（在会话内） |
:::

#### API 密钥无效

**原因：** 密钥缺失、过期、设置错误，或属于错误的提供商。

**解决方案：**
```bash
# 检查配置
hermes config show

# 重新配置提供商
hermes model

# 或直接设置
hermes config set OPENROUTER_API_KEY sk-or-v1-xxxxxxxxxxxx
```

:::warning
确保密钥与提供商匹配。OpenAI 的密钥不能用于 OpenRouter，反之亦然。检查 `~/.hermes/.env` 中是否有冲突的条目。
:::

#### 模型不可用 / 找不到模型

**原因：** 模型标识符不正确或在你使用的提供商上不可用。

**解决方案：**
```bash
# 列出提供商的可用模型
hermes model

# 设置有效模型
hermes config set HERMES_MODEL anthropic/claude-opus-4.7

# 或按会话指定
hermes chat --model openrouter/meta-llama/llama-3.1-70b-instruct
```

#### 频率限制（429 错误）

**原因：** 你已超出提供商的速率限制（Rate Limit）。

**解决方案：** 等待片刻后重试。对于持续使用，可考虑：
- 升级你的提供商计划
- 切换到不同的模型或提供商
- 使用 `hermes chat --provider <备选提供商>` 路由到其他后端

#### 超出上下文长度

**原因：** 对话已经超过了模型的上下文窗口（Context Window）长度，或者 Hermes 检测到了错误的上下文长度。

**解决方案：**
```bash
# 压缩当前会话
/compress

# 或开始一个新会话
hermes chat

# 使用具有更大上下文窗口的模型
hermes chat --model openrouter/google/gemini-3-flash-preview
```

如果在第一次长对话中就出现此问题，Hermes 可能检测到了错误的上下文长度。检查它检测到的值：

查看 CLI 启动行 — 它会显示检测到的上下文长度（例如 `📊 Context limit: 128000 tokens`）。你也可以在会话中使用 `/usage` 查看。

要修复上下文检测问题，请显式设置：

```yaml
# 在 ~/.hermes/config.yaml 中
model:
  default: your-model-name
  context_length: 131072  # 你模型实际的上下文窗口大小
```

对于自定义端点，可以按模型添加：

```yaml
custom_providers:
  - name: "My Server"
    base_url: "http://localhost:11434/v1"
    models:
      qwen3.5:27b:
        context_length: 32768
```

请参阅[上下文长度检测](../integrations/providers.md#context-length-detection)了解自动检测的工作原理和所有覆盖选项。

---

### 终端问题

#### 命令被阻止为危险操作

**原因：** Hermes 检测到潜在的破坏性命令（例如 `rm -rf`、`DROP TABLE`）。这是一项安全功能。

**解决方案：** 在提示时，审查命令并输入 `y` 批准。你也可以：
- 要求 Agent 使用更安全的替代方案
- 在[安全文档](../user-guide/security.md)中查看完整的危险模式列表

:::tip
这是设计如此 — Hermes 绝不会静默运行破坏性命令。审批提示会准确显示将要执行的内容。
:::

#### 通过消息网关使用 `sudo` 不生效

**原因：** 消息网关在没有交互式终端的情况下运行，因此 `sudo` 无法提示输入密码。

**解决方案：**
- 避免在消息中使用 `sudo` — 让 Agent 寻找替代方案
- 如果必须使用 `sudo`，请在 `/etc/sudoers` 中为特定命令配置免密 sudo
- 或者切换到终端界面执行管理任务：`hermes chat`

#### Docker 后端无法连接

**原因：** Docker 守护进程未运行或用户没有权限。

**解决方案：**
```bash
# 检查 Docker 是否在运行
docker info

# 将用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker run hello-world
```

---

### 消息问题

#### Bot 不回复消息

**原因：** Bot 未运行、未授权，或你的用户不在允许列表中。

**解决方案：**
```bash
# 检查网关是否在运行
hermes gateway status

# 启动网关
hermes gateway start

# 检查日志中的错误
cat ~/.hermes/logs/gateway.log | tail -50
```

#### 消息发送失败

**原因：** 网络问题、Bot token 过期或平台 Webhook 配置错误。

**解决方案：**
- 使用 `hermes gateway setup` 验证 Bot token 是否有效
- 检查网关日志：`cat ~/.hermes/logs/gateway.log | tail -50`
- 对于基于 Webhook 的平台（Slack、WhatsApp），确保你的服务器可公网访问

#### 允许列表困惑 — 谁可以和 Bot 对话？

**原因：** 授权模式决定了谁能获得访问权限。

**解决方案：**

| 模式 | 工作方式 |
|------|-------------|
| **Allowlist（允许列表）** | 只有配置中列出的用户 ID 可以交互 |
| **DM pairing（私信配对）** | 第一个在私信中发送消息的用户获得独占访问权 |
| **Open（开放）** | 任何人都可以交互（生产环境不推荐） |

在 `~/.hermes/config.yaml` 中的网关设置下配置。详见[消息文档](../user-guide/messaging/index.md)。

#### 网关无法启动

**原因：** 缺少依赖、端口冲突或 Token 配置错误。

**解决方案：**
```bash
# 安装消息依赖
pip install "hermes-agent[telegram]"   # 或 [discord]、[slack]、[whatsapp]

# 检查端口冲突
lsof -i :8080

# 验证配置
hermes config show
```

#### WSL：网关频繁断开或 `hermes gateway start` 失败

**原因：** WSL 的 systemd 支持不够可靠。许多 WSL2 安装没有启用 systemd，即使启用了，服务也可能在 WSL 重启或 Windows 空闲关机后终止。

**解决方案：** 使用前台模式而非 systemd 服务：

```bash
# 方案 1：直接前台运行（最简单）
hermes gateway run

# 方案 2：通过 tmux 持久运行（关闭终端后继续运行）
tmux new -s hermes 'hermes gateway run'
# 之后重新连接：tmux attach -t hermes

# 方案 3：通过 nohup 后台运行
nohup hermes gateway run > ~/.hermes/logs/gateway.log 2>&1 &
```

如果你仍想尝试 systemd，请确保已启用：

1. 打开 `/etc/wsl.conf`（不存在则创建）
2. 添加：
   ```ini
   [boot]
   systemd=true
   ```
3. 在 PowerShell 中运行：`wsl --shutdown`
4. 重新打开你的 WSL 终端
5. 验证：`systemctl is-system-running` 应显示 "running" 或 "degraded"

:::tip Windows 开机自动启动
要实现可靠的开机自启，使用 Windows 任务计划程序在登录时启动 WSL + 网关：
1. 创建一个运行 `wsl -d Ubuntu -- bash -lc 'hermes gateway run'` 的任务
2. 设置为在用户登录时触发
:::

#### macOS：网关找不到 Node.js / ffmpeg / 其他工具

**原因：** launchd 服务继承的是一个精简的 PATH（`/usr/bin:/bin:/usr/sbin:/sbin`），不包含 Homebrew、nvm、cargo 或其他用户安装的工具目录。这通常会导致 WhatsApp 桥接（`node not found`）或语音转录（`ffmpeg not found`）失败。

**解决方案：** 当你运行 `hermes gateway install` 时，网关会捕获你的 Shell PATH。如果你在设置网关后安装了新工具，请重新运行安装以捕获更新后的 PATH：

```bash
hermes gateway install    # 重新快照当前 PATH
hermes gateway start      # 检测到更新的 plist 并重新加载
```

你可以验证 plist 中的 PATH 是否正确：
```bash
/usr/libexec/PlistBuddy -c "Print :EnvironmentVariables:PATH" \
  ~/Library/LaunchAgents/ai.hermes.gateway.plist
```

---

### 性能问题

#### 响应速度慢

**原因：** 模型太大、API 服务器距离远，或系统提示词过重且工具过多。

**解决方案：**
- 尝试更快/更小的模型：`hermes chat --model openrouter/meta-llama/llama-3.1-8b-instruct`
- 减少活跃的工具集：`hermes chat -t "terminal"`
- 检查到提供商的网络延迟
- 对于本地模型，确保你有足够的 GPU 显存（VRAM）

#### Token 用量过高

**原因：** 对话过长、冗长的系统提示词，或大量工具调用累积了过多上下文。

**解决方案：**
```bash
# 压缩对话以减少 Token
/compress

# 检查会话 Token 用量
/usage
```

:::tip
在长会话中定期使用 `/compress`。它会总结对话历史，在保留上下文的同时显著减少 Token 用量。
:::

#### 会话过长

**原因：** 持续的对话会积累消息和工具输出，接近上下文限制。

**解决方案：**
```bash
# 压缩当前会话（保留关键上下文）
/compress

# 开启新会话
hermes chat

# 之后如果需要，恢复特定会话
hermes chat --continue
```

---

### MCP 问题

#### MCP 服务器无法连接

**原因：** 找不到服务器二进制文件、命令路径错误，或缺少运行时环境。

**解决方案：**
```bash
# 确保 MCP 依赖已安装（标准安装中已包含）
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

# 对于基于 npm 的服务器，确保 Node.js 可用
node --version
npx --version

# 手动测试服务器
npx -y @modelcontextprotocol/server-filesystem /tmp
```

验证你的 `~/.hermes/config.yaml` 中的 MCP 配置：
```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/docs"]
```

#### MCP 服务器的工具未显示

**原因：** 服务器已启动但工具发现失败、工具被配置过滤掉了，或服务器不支持你期望的 MCP 功能。

**解决方案：**
- 检查网关/Agent 日志中的 MCP 连接错误
- 确保服务器响应 `tools/list` RPC 方法
- 检查该服务器下的 `tools.include`、`tools.exclude`、`tools.resources`、`tools.prompts` 或 `enabled` 设置
- 注意：resource/prompt 工具只有在会话实际支持这些功能时才会注册
- 修改配置后使用 `/reload-mcp`

```bash
# 验证 MCP 服务器已配置
hermes config show | grep -A 12 mcp_servers

# 修改配置后重启 Hermes 或重新加载 MCP
hermes chat
```

另请参阅：
- [MCP（Model Context Protocol，模型上下文协议）](/docs/user-guide/features/mcp)
- [在 Hermes 中使用 MCP](/docs/guides/use-mcp-with-hermes)
- [MCP 配置参考](/docs/reference/mcp-config-reference)

#### MCP 超时错误

**原因：** MCP 服务器响应时间过长，或在执行过程中崩溃。

**解决方案：**
- 如果支持，在 MCP 服务器配置中增加超时时间
- 检查 MCP 服务器进程是否仍在运行
- 对于远程 HTTP MCP 服务器，检查网络连接

:::warning
如果 MCP 服务器在请求过程中崩溃，Hermes 会报告超时。请检查服务器自身的日志（不仅仅是 Hermes 日志）来诊断根本原因。
:::

---

## 配置文件（Profile） {#profiles}

### Profile 和手动设置 HERMES_HOME 有什么区别？

Profile 是在 `HERMES_HOME` 之上的一层管理机制。你*可以*在每次命令前手动设置 `HERMES_HOME=/some/path`，但 Profile 为你处理了所有底层工作：创建目录结构、生成 Shell 别名（`hermes-work`）、在 `~/.hermes/active_profile` 中追踪活跃 Profile，以及自动同步所有 Profile 的 Skill 更新。它们还集成了 Tab 补全功能，这样你就不需要记忆路径。

### 两个 Profile 可以共享同一个 Bot Token 吗？

不可以。每个消息平台（Telegram、Discord 等）要求对 Bot Token 的独占访问。如果两个 Profile 同时尝试使用同一个 Token，第二个网关将无法连接。每个 Profile 需要创建单独的 Bot — 对于 Telegram，请联系 [@BotFather](https://t.me/BotFather) 创建额外的 Bot。

### Profile 之间共享 Memory 或会话吗？

不共享。每个 Profile 有自己的 Memory 存储、会话数据库和 Skill 目录，完全隔离。如果你想用已有的 Memory 和会话创建新 Profile，可以使用 `hermes profile create newname --clone-all` 从当前 Profile 复制所有内容。

### 运行 `hermes update` 时会发生什么？

`hermes update` 拉取最新代码并重新安装依赖，**只执行一次**（不是按 Profile 执行）。然后自动将更新的 Skill 同步到所有 Profile。你只需运行一次 `hermes update` — 它会覆盖机器上的所有 Profile。

### 可以将 Profile 迁移到其他机器吗？

可以。将 Profile 导出为便携式归档文件，然后在目标机器上导入：

```bash
# 在源机器上
hermes profile export work ./work-backup.tar.gz

# 将文件复制到目标机器，然后：
hermes profile import ./work-backup.tar.gz work
```

导入的 Profile 将包含导出时的所有配置、Memory、会话和 Skill。如果新机器的配置不同，你可能需要更新路径或重新进行提供商认证。

### 最多可以运行多少个 Profile？

没有硬性限制。每个 Profile 只是 `~/.hermes/profiles/` 下的一个目录。实际限制取决于磁盘空间和你的系统可以同时运行多少个网关（每个网关是一个轻量级 Python 进程）。运行几十个 Profile 完全没问题；空闲的 Profile 不消耗任何资源。

---

## 工作流与模式

### 为不同任务使用不同模型（多模型工作流）

**场景：** 你使用 GPT-5.4 作为日常主力模型，但 Gemini 或 Grok 写社交媒体内容更好。每次手动切换模型很麻烦。

**解决方案：委派配置（Delegation Config）。** Hermes 可以自动将子 Agent 路由到不同的模型。在 `~/.hermes/config.yaml` 中设置：

```yaml
delegation:
  model: "google/gemini-3-flash-preview"   # 子 Agent 使用此模型
  provider: "openrouter"                    # 子 Agent 的提供商
```

现在当你告诉 Hermes "帮我写一个关于 X 的 Twitter 帖子"并且它生成一个 `delegate_task` 子 Agent 时，该子 Agent 会在 Gemini 上运行，而不是你的主模型。你的主对话仍然在 GPT-5.4 上。

你也可以在提示词中明确指定：*"委派一个任务来撰写关于我们产品发布的社交媒体帖子。使用你的子 Agent 来实际撰写。"* Agent 会使用 `delegate_task`，它自动使用委派配置。

对于一次性切换模型而不使用委派，可在 CLI 中使用 `/model`：

```bash
/model google/gemini-3-flash-preview    # 在当前会话中切换
# ... 撰写你的内容 ...
/model openai/gpt-5.4                   # 切换回来
```

请参阅[子 Agent 委派](../user-guide/features/delegation.md)了解更多委派的工作方式。

### 在一个 WhatsApp 号码上运行多个 Agent（按聊天绑定）

**场景：** 在 OpenClaw 中，你有多个独立的 Agent 分别绑定到特定的 WhatsApp 聊天 — 一个用于家庭购物清单群组，另一个用于你的私聊。Hermes 能做到吗？

**当前限制：** Hermes 的每个 Profile 需要独立的 WhatsApp 号码/会话。你无法将多个 Profile 绑定到同一个 WhatsApp 号码的不同聊天 — WhatsApp 桥接（Baileys）每个号码使用一个认证会话。

**替代方案：**

1. **使用单个 Profile 进行人格切换。** 创建不同的 `AGENTS.md` 上下文文件或使用 `/personality` 命令来改变每个聊天的行为。Agent 可以看到它所在的聊天并做出相应调整。

2. **使用 Cron 任务处理专门任务。** 对于购物清单跟踪器，设置一个 Cron 任务来监控特定聊天并管理清单 — 不需要单独的 Agent。

3. **使用不同的号码。** 如果你需要真正独立的 Agent，将每个 Profile 与自己的 WhatsApp 号码配对。Google Voice 等服务的虚拟号码可以用于此目的。

4. **改用 Telegram 或 Discord。** 这些平台更天然地支持按聊天绑定 — 每个 Telegram 群组或 Discord 频道都有自己的会话，你可以在同一个账号上运行多个 Bot Token（每个 Profile 一个）。

请参阅 [Profile](../user-guide/profiles.md) 和 [WhatsApp 设置](../user-guide/messaging/whatsapp.md)了解更多详情。

### 控制 Telegram 中显示的内容（隐藏日志和推理过程）

**场景：** 你在 Telegram 中看到网关执行日志、Hermes 的推理过程和工具调用详情，而不是仅看到最终输出。

**解决方案：** `config.yaml` 中的 `display.tool_progress` 设置控制显示多少工具活动信息：

```yaml
display:
  tool_progress: "off"   # 选项：off、new、all、verbose
```

- **`off`** — 仅显示最终回复。无工具调用、无推理过程、无日志。
- **`new`** — 显示正在发生的新工具调用（简短一行）。
- **`all`** — 显示所有工具活动，包括结果。
- **`verbose`** — 完整详情，包括工具参数和输出。

对于消息平台，通常使用 `off` 或 `new` 即可。修改 `config.yaml` 后，需要重启网关才能生效。

你也可以使用 `/verbose` 命令在每个会话中切换（需先启用）：

```yaml
display:
  tool_progress_command: true   # 在网关中启用 /verbose 命令
```

### 在 Telegram 中管理 Skill（斜杠命令限制）

**场景：** Telegram 有 100 个斜杠命令的限制，而你的 Skill 数量快要超出了。你想在 Telegram 上禁用不需要的 Skill，但 `hermes skills config` 的设置似乎不生效。

**解决方案：** 使用 `hermes skills config` 按平台禁用 Skill。这会写入 `config.yaml`：

```yaml
skills:
  disabled: []                    # 全局禁用的 Skill
  platform_disabled:
    telegram: [skill-a, skill-b]  # 仅在 Telegram 上禁用
```

修改后，**重启网关**（`hermes gateway restart` 或关闭后重新启动）。Telegram Bot 命令菜单会在启动时重新构建。

:::tip
描述过长的 Skill 在 Telegram 菜单中会被截断为 40 个字符，以保持在负载大小限制内。如果 Skill 未显示，可能是总负载大小问题而非 100 个命令数量限制 — 禁用不常用的 Skill 可以同时解决这两个问题。
:::

### 共享线程会话（多用户共享一个对话）

**场景：** 你有一个 Telegram 或 Discord 线程，多个用户在其中 @ Bot。你希望该线程中所有 @ 都属于一个共享对话，而不是按用户分开的会话。

**当前行为：** Hermes 在大多数平台上按用户 ID 创建会话，因此每个人有自己的对话上下文。这是出于隐私和上下文隔离的设计。

**替代方案：**

1. **使用 Slack。** Slack 会话按线程而非用户来区分。同一线程中的多个用户共享一个对话 — 正是你描述的行为。这是最自然的方案。

2. **在群聊中指定一个用户操作。** 如果一个人是指定的"操作员"来转达问题，会话就能保持统一。其他人可以旁观。

3. **使用 Discord 频道。** Discord 会话按频道区分，因此同一频道中的所有用户共享上下文。使用专用频道进行共享对话。

### 将 Hermes 迁移到另一台机器

**场景：** 你在一台机器上积累了 Skill、Cron 任务和 Memory，想将所有内容迁移到一台新的专用 Linux 服务器上。

**解决方案：**

1. 在新机器上安装 Hermes Agent：
   ```bash
   curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
   ```

2. 复制整个 `~/.hermes/` 目录，**但不包括** `hermes-agent` 子目录（那是代码仓库 — 新安装会有自己的）：
   ```bash
   # 在源机器上
   rsync -av --exclude='hermes-agent' ~/.hermes/ newmachine:~/.hermes/
   ```

   或者使用 Profile 导出/导入：
   ```bash
   # 在源机器上
   hermes profile export default ./hermes-backup.tar.gz

   # 在目标机器上
   hermes profile import ./hermes-backup.tar.gz default
   ```

3. 在新机器上运行 `hermes setup`，验证 API 密钥和提供商配置是否正常工作。重新认证所有消息平台（尤其是 WhatsApp，它使用 QR 配对）。

`~/.hermes/` 目录包含所有内容：`config.yaml`、`.env`、`SOUL.md`、`memories/`、`skills/`、`state.db`（会话）、`cron/` 以及任何自定义插件。代码本身存放在 `~/.hermes/hermes-agent/` 中，会全新安装。

### 安装后重新加载 Shell 时出现 Permission denied

**场景：** 运行 Hermes 安装程序后，`source ~/.zshrc` 出现 Permission denied 错误。

**原因：** 这通常发生在 `~/.zshrc`（或 `~/.bashrc`）文件权限不正确时，或安装程序无法干净地写入。这不是 Hermes 特有的问题 — 而是 Shell 配置权限问题。

**解决方案：**
```bash
# 检查权限
ls -la ~/.zshrc

# 如需修复（应为 -rw-r--r-- 或 644）
chmod 644 ~/.zshrc

# 然后重新加载
source ~/.zshrc

# 或者直接打开一个新的终端窗口 — 它会自动获取 PATH 变更
```

如果安装程序添加了 PATH 行但权限有误，你可以手动添加：
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

### 首次运行 Agent 时出现 400 错误

**场景：** 安装完成正常，但第一次聊天尝试失败，出现 HTTP 400。

**原因：** 通常是模型名称不匹配 — 配置的模型在你的提供商上不存在，或 API 密钥没有该模型的访问权限。

**解决方案：**
```bash
# 检查配置的模型和提供商
hermes config show | head -20

# 重新运行模型选择
hermes model

# 或使用已知可用的模型测试
hermes chat -q "hello" --model anthropic/claude-opus-4.7
```

如果使用 OpenRouter，请确保你的 API 密钥有余额。OpenRouter 返回 400 通常意味着该模型需要付费计划或模型 ID 有拼写错误。

---

## 仍然没有解决？

如果你的问题在这里没有找到答案：

1. **搜索已有 Issue：** [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues)
2. **向社区提问：** [Nous Research Discord](https://discord.gg/nousresearch)
3. **提交 Bug 报告：** 请包含你的操作系统、Python 版本（`python3 --version`）、Hermes 版本（`hermes --version`）和完整的错误信息

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/reference/faq)
