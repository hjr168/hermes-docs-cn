---
sidebar_position: 4
title: "教程：团队 Telegram 助手"
description: "一步步设置一个整个团队都能使用的 Telegram Bot，用于代码帮助、研究、系统管理等"
---

# 设置团队 Telegram 助手

本教程带你设置一个由 Hermes Agent 驱动的 Telegram Bot，多个团队成员可以使用。完成后，你的团队将拥有一个共享的 AI 助手，可以发消息寻求代码帮助、研究、系统管理等 — 并通过用户授权保护安全。

## 我们要构建什么

一个 Telegram Bot，具备以下特性：

- **任何授权的团队成员**都可以私信求助 — 代码审查、研究、Shell 命令、调试
- **运行在你的服务器上**，拥有完整工具访问 — 终端、文件编辑、Web 搜索、代码执行
- **每用户独立会话** — 每个人有自己的对话上下文
- **默认安全** — 只有批准的用户可以交互，提供两种授权方式
- **定时任务** — 每日站会、健康检查和提醒投递到团队频道

---

## 前提条件

开始之前，确保你有：

- **已安装 Hermes Agent** 在服务器或 VPS 上（不是你的笔记本电脑 — Bot 需要持续运行）。如果还没安装，参见[安装指南](/docs/getting-started/installation)。
- **一个 Telegram 账号**（Bot 所有者）
- **已配置 LLM 提供商** — 至少在 `~/.hermes/.env` 中设置 OpenAI、Anthropic 或其他支持的提供商的 API 密钥

:::tip
每月 5 美元的 VPS 就足够运行 Gateway。Hermes 本身很轻量 — LLM API 调用才是花钱的地方，而且那些在远端执行。
:::

---

## 第 1 步：创建 Telegram Bot

每个 Telegram Bot 都从 **@BotFather** 开始 — Telegram 创建 Bot 的官方工具。

1. **打开 Telegram**，搜索 `@BotFather`，或访问 [t.me/BotFather](https://t.me/BotFather)

2. **发送 `/newbot`** — BotFather 会问你两件事：
   - **显示名称** — 用户看到的名称（如 `Team Hermes Assistant`）
   - **用户名** — 必须以 `bot` 结尾（如 `myteam_hermes_bot`）

3. **复制 Bot Token** — BotFather 会回复类似这样的内容：
   ```
   Use this token to access the HTTP API:
   7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikp...
   ```
   保存这个 Token — 下一步需要用到。

4. **设置描述**（可选但推荐）：
   ```
   /setdescription
   ```
   选择你的 Bot，然后输入类似：
   ```
   由 Hermes Agent 驱动的团队 AI 助手。私信我获取代码帮助、研究、调试等。
   ```

5. **设置 Bot 命令**（可选 — 给用户一个命令菜单）：
   ```
   /setcommands
   ```
   选择你的 Bot，然后粘贴：
   ```
   new - 开始新对话
   model - 显示或切换 AI 模型
   status - 显示会话信息
   help - 显示可用命令
   stop - 停止当前任务
   ```

:::warning
保密你的 Bot Token。任何拥有 Token 的人都可以控制 Bot。如果泄露，在 BotFather 中使用 `/revoke` 生成新的。
:::

---

## 第 2 步：配置 Gateway

你有两种选择：交互式设置向导（推荐）或手动配置。

### 方案 A：交互式设置（推荐）

```bash
hermes gateway setup
```

这会通过方向键选择引导你完成所有配置。选择 **Telegram**，粘贴你的 Bot Token，在提示时输入你的用户 ID。

### 方案 B：手动配置

将以下内容添加到 `~/.hermes/.env`：

```bash
# 来自 BotFather 的 Telegram Bot Token
TELEGRAM_BOT_TOKEN=7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikp...

# 你的 Telegram 用户 ID（数字）
TELEGRAM_ALLOWED_USERS=123456789
```

### 查找你的用户 ID

你的 Telegram 用户 ID 是一个数字值（不是你的用户名）。要找到它：

1. 在 Telegram 上给 [@userinfobot](https://t.me/userinfobot) 发消息
2. 它会立即回复你的数字用户 ID
3. 将该数字复制到 `TELEGRAM_ALLOWED_USERS`

:::info
Telegram 用户 ID 是永久数字，如 `123456789`。它们与你的 `@username` 不同，用户名可以更改。始终使用数字 ID 作为白名单。
:::

---

## 第 3 步：启动 Gateway

### 快速测试

先在前台运行 Gateway，确保一切正常：

```bash
hermes gateway
```

你应该看到类似输出：

```
[Gateway] Starting Hermes Gateway...
[Gateway] Telegram adapter connected
[Gateway] Cron scheduler started (tick every 60s)
```

打开 Telegram，找到你的 Bot，发送消息。如果它回复了，就大功告成了。按 `Ctrl+C` 停止。

### 生产环境：安装为服务

要实现重启后仍能运行的持久部署：

```bash
hermes gateway install
sudo hermes gateway install --system   # 仅 Linux：开机系统服务
```

这会创建一个后台服务：Linux 上默认是用户级 **systemd** 服务，macOS 上是 **launchd** 服务，传入 `--system` 则是 Linux 开机系统服务。

```bash
# Linux — 管理默认用户服务
hermes gateway start
hermes gateway stop
hermes gateway status

# 查看实时日志
journalctl --user -u hermes-gateway -f

# SSH 登出后保持运行
sudo loginctl enable-linger $USER

# Linux 服务器 — 显式系统服务命令
sudo hermes gateway start --system
sudo hermes gateway status --system
journalctl -u hermes-gateway -f
```

```bash
# macOS — 管理服务
hermes gateway start
hermes gateway stop
tail -f ~/.hermes/logs/gateway.log
```

:::tip macOS PATH
launchd plist 在安装时捕获你的 Shell PATH，这样 Gateway 子进程可以找到 Node.js 和 ffmpeg 等工具。如果之后安装了新工具，重新运行 `hermes gateway install` 更新 plist。
:::

### 验证运行

```bash
hermes gateway status
```

然后在 Telegram 上给你的 Bot 发送测试消息。你应该在几秒内收到回复。

---

## 第 4 步：设置团队访问

现在让队友也能访问。有两种方式。

### 方式 A：静态白名单

收集每个团队成员的 Telegram 用户 ID（让他们给 [@userinfobot](https://t.me/userinfobot) 发消息），以逗号分隔列表添加：

```bash
# 在 ~/.hermes/.env 中
TELEGRAM_ALLOWED_USERS=123456789,987654321,555555555
```

修改后重启 Gateway：

```bash
hermes gateway stop && hermes gateway start
```

### 方式 B：DM 配对（推荐用于团队）

DM 配对更灵活 — 你不需要提前收集用户 ID。工作流程如下：

1. **队友私信 Bot** — 因为他们不在白名单中，Bot 会回复一个一次性配对码：
   ```
   🔐 配对码: XKGH5N7P
   将此码发给 Bot 所有者以获取批准。
   ```

2. **队友把配对码发给你**（通过任何渠道 — Slack、邮件、当面）

3. **你在服务器上批准**：
   ```bash
   hermes pairing approve telegram XKGH5N7P
   ```

4. **完成** — Bot 立即开始响应他们的消息

**管理已配对用户：**

```bash
# 查看所有待处理和已批准用户
hermes pairing list

# 撤销某人访问权限
hermes pairing revoke telegram 987654321

# 清除过期的待处理配对码
hermes pairing clear-pending
```

:::tip
DM 配对非常适合团队，因为添加新用户时不需要重启 Gateway。批准立即生效。
:::

### 安全注意事项

- **永远不要在有终端访问的 Bot 上设置 `GATEWAY_ALLOW_ALL_USERS=true`** — 任何找到你 Bot 的人都可能在你的服务器上执行命令
- 配对码 **1 小时**后过期，使用加密随机性生成
- 速率限制防止暴力攻击：每用户每 10 分钟 1 次请求，每个平台最多 3 个待处理配对码
- 5 次失败的批准尝试后，该平台进入 1 小时锁定
- 所有配对数据以 `chmod 0600` 权限存储

---

## 第 5 步：配置 Bot

### 设置主频道

**主频道**是 Bot 投递 Cron 任务结果和主动消息的地方。没有主频道，定时任务无处发送输出。

**选项 1：** 在 Bot 所在的任何 Telegram 群组或聊天中使用 `/sethome` 命令。

**选项 2：** 在 `~/.hermes/.env` 中手动设置：

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="团队动态"
```

要找到频道 ID，将 [@userinfobot](https://t.me/userinfobot) 添加到群组 — 它会报告群组的聊天 ID。

### 配置工具进度显示

控制 Bot 使用工具时显示多少细节。在 `~/.hermes/config.yaml` 中：

```yaml
display:
  tool_progress: new    # off | new | all | verbose
```

| 模式 | 你看到的 |
|------|---------|
| `off` | 仅干净回复 — 不显示工具活动 |
| `new` | 每个新工具调用的简要状态（推荐用于消息场景） |
| `all` | 每个工具调用及详情 |
| `verbose` | 完整工具输出包括命令结果 |

用户也可以在聊天中使用 `/verbose` 命令按会话更改。

### 使用 SOUL.md 设置人格

通过编辑 `~/.hermes/SOUL.md` 自定义 Bot 的沟通方式。

完整指南参见[使用 SOUL.md 塑造 Agent 人格](/docs/guides/use-soul-with-hermes)。

```markdown
# 灵魂
你是一个有帮助的团队助手。简洁且技术化。
对任何代码使用代码块。跳过客套 — 团队
重视直接。调试时，始终先要求错误日志，
再猜测解决方案。
```

### 添加项目上下文

如果你的团队处理特定项目，创建上下文文件让 Bot 了解你的技术栈：

```markdown
<!-- ~/.hermes/AGENTS.md -->
# 团队上下文
- 我们使用 Python 3.12 + FastAPI + SQLAlchemy
- 前端是 React + TypeScript
- CI/CD 在 GitHub Actions 上运行
- 生产环境部署到 AWS ECS
- 对新代码始终建议编写测试
```

:::info
上下文文件注入到每个会话的系统提示中。保持简洁 — 每个字符都计入你的 Token 预算。
:::

---

## 第 6 步：设置定时任务

Gateway 运行后，你可以安排定期任务并将结果投递到团队频道。

### 每日站会摘要

在 Telegram 上给 Bot 发消息：

```
每个工作日上午 9 点，检查 GitHub 仓库
github.com/myorg/myproject 的：
1. 过去 24 小时内打开/合并的 Pull Request
2. 创建或关闭的 Issue
3. 主分支上的任何 CI/CD 失败
格式化为简短的站会风格摘要。
```

Agent 会自动创建 Cron 任务并将结果投递到你提问的聊天（或主频道）。

### 服务器健康检查

```
每 6 小时，用 'df -h' 检查磁盘使用、'free -h' 检查内存、
'docker ps' 检查 Docker 容器状态。报告任何异常 —
分区超过 80%、容器重启、或高内存使用。
```

### 管理定时任务

```bash
# 从 CLI
hermes cron list          # 查看所有计划任务
hermes cron status        # 检查调度器是否运行

# 从 Telegram 聊天
/cron list                # 查看任务
/cron remove <job_id>     # 移除任务
```

:::warning
Cron 任务提示在全新的会话中运行，没有之前对话的记忆。确保每个提示包含 Agent 需要的**所有**上下文 — 文件路径、URL、服务器地址和清晰指令。
:::

---

## 生产环境技巧

### 使用 Docker 保证安全

在共享团队 Bot 上，使用 Docker 作为终端后端，让 Agent 命令在容器中而非宿主机上运行：

```bash
# 在 ~/.hermes/.env 中
TERMINAL_BACKEND=docker
TERMINAL_DOCKER_IMAGE=nikolaik/python-nodejs:python3.11-nodejs20
```

或在 `~/.hermes/config.yaml` 中：

```yaml
terminal:
  backend: docker
  container_cpu: 1
  container_memory: 5120
  container_persistent: true
```

这样即使有人让 Bot 运行破坏性操作，你的宿主系统也受到保护。

### 监控 Gateway

```bash
# 检查 Gateway 是否运行
hermes gateway status

# 查看实时日志（Linux）
journalctl --user -u hermes-gateway -f

# 查看实时日志（macOS）
tail -f ~/.hermes/logs/gateway.log
```

### 保持 Hermes 更新

从 Telegram 发送 `/update` 给 Bot — 它会拉取最新版本并重启。或从服务器：

```bash
hermes update
hermes gateway stop && hermes gateway start
```

### 日志位置

| 内容 | 位置 |
|------|------|
| Gateway 日志 | `journalctl --user -u hermes-gateway`（Linux）或 `~/.hermes/logs/gateway.log`（macOS） |
| Cron 任务输出 | `~/.hermes/cron/output/{job_id}/{timestamp}.md` |
| Cron 任务定义 | `~/.hermes/cron/jobs.json` |
| 配对数据 | `~/.hermes/pairing/` |
| 会话历史 | `~/.hermes/sessions/` |

---

## 进一步探索

你已经拥有了一个可工作的团队 Telegram 助手。以下是一些可以探索的方向：

- **[安全指南](/docs/user-guide/security)** — 深入了解授权、容器隔离和命令审批
- **[消息 Gateway](/docs/user-guide/messaging)** — Gateway 架构、会话管理和聊天命令的完整参考
- **[Telegram 设置](/docs/user-guide/messaging/telegram)** — 平台特定详情，包括语音消息和 TTS
- **[定时任务](/docs/user-guide/features/cron)** — 高级 Cron 调度，包括投递选项和 Cron 表达式
- **[上下文文件](/docs/user-guide/features/context-files)** — AGENTS.md、SOUL.md 和 .cursorrules 项目知识
- **[人格](/docs/user-guide/features/personality)** — 内置人格预设和自定义人设定
- **添加更多平台** — 同一个 Gateway 可以同时运行 [Discord](/docs/user-guide/messaging/discord)、[Slack](/docs/user-guide/messaging/slack) 和 [WhatsApp](/docs/user-guide/messaging/whatsapp)

---

*有问题或建议？在 GitHub 上开 Issue — 欢迎贡献。*

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/team-telegram-assistant)
