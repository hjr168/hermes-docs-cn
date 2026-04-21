---
sidebar_position: 1
title: "Telegram"
description: "将 Hermes Agent 设置为 Telegram Bot"
---

# Telegram 设置

Hermes Agent 作为功能完整的对话 Bot 与 Telegram 集成。连接后，你可以从任何设备与 Agent 聊天、发送自动转录的语音备忘录、接收定时任务结果，并在群聊中使用 Agent。集成基于 [python-telegram-bot](https://python-telegram-bot.org/) 构建，支持文本、语音、图片和文件附件。

## 第 1 步：通过 BotFather 创建 Bot

每个 Telegram Bot 都需要一个由 [@BotFather](https://t.me/BotFather)（Telegram 官方 Bot 管理工具）颁发的 API Token。

1. 打开 Telegram 搜索 **@BotFather**，或访问 [t.me/BotFather](https://t.me/BotFather)
2. 发送 `/newbot`
3. 选择一个**显示名称**（如 "Hermes Agent"）— 可以是任何内容
4. 选择一个**用户名** — 必须唯一且以 `bot` 结尾（如 `my_hermes_bot`）
5. BotFather 回复你的 **API Token**。格式如下：

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
保管好你的 Bot Token。任何拥有此 Token 的人都可以控制你的 Bot。如果泄露，立即通过 BotFather 的 `/revoke` 撤销。
:::

## 第 2 步：自定义你的 Bot（可选）

这些 BotFather 命令可以改善用户体验。向 @BotFather 发送：

| 命令 | 用途 |
|---------|---------|
| `/setdescription` | 用户开始聊天前显示的"What can this bot do?"文本 |
| `/setabouttext` | Bot 资料页上的简短文本 |
| `/setuserpic` | 为你的 Bot 上传头像 |
| `/setcommands` | 定义命令菜单（聊天中的 `/` 按钮） |
| `/setprivacy` | 控制 Bot 是否能看到所有群消息（见第 3 步） |

:::tip
对于 `/setcommands`，一组实用的起始命令：

```
help - 显示帮助信息
new - 开始新对话
sethome - 将此聊天设为主频道
```
:::

## 第 3 步：隐私模式（群聊关键设置）

Telegram Bot 有一个**隐私模式**，**默认开启**。这是使用 Bot 时最常见的困惑来源。

**隐私模式开启时**，你的 Bot 只能看到：
- 以 `/` 命令开头的消息
- 直接回复 Bot 自己消息的消息
- 服务消息（成员加入/离开、置顶消息等）
- Bot 作为管理员的频道中的消息

**隐私模式关闭时**，Bot 接收群中的每条消息。

### 如何关闭隐私模式

1. 向 **@BotFather** 发送消息
2. 发送 `/mybots`
3. 选择你的 Bot
4. 进入 **Bot Settings → Group Privacy → Turn off**

:::warning
**更改隐私设置后，你必须将 Bot 从群中移除并重新添加。** Telegram 在 Bot 加入群时缓存隐私状态，在移除并重新添加之前不会更新。
:::

:::tip
替代关闭隐私模式的方法：将 Bot 提升为**群管理员**。管理员 Bot 始终接收所有消息，不受隐私设置影响，且无需切换全局隐私模式。
:::

## 第 4 步：查找你的用户 ID

Hermes Agent 使用数字 Telegram 用户 ID 来控制访问。你的用户 ID **不是**你的用户名 — 它是一个类似 `123456789` 的数字。

**方法 1（推荐）：** 向 [@userinfobot](https://t.me/userinfobot) 发送消息 — 它会立即回复你的用户 ID。

**方法 2：** 向 [@get_id_bot](https://t.me/get_id_bot) 发送消息 — 另一个可靠的选项。

保存这个数字，下一步会用到。

## 第 5 步：配置 Hermes

### 方案 A：交互式设置（推荐）

```bash
hermes gateway setup
```

在提示时选择 **Telegram**。向导会询问你的 Bot Token 和允许的用户 ID，然后为你写入配置。

### 方案 B：手动配置

将以下内容添加到 `~/.hermes/.env`：

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USERS=123456789    # 多个用户用逗号分隔
```

### 启动 Gateway

```bash
hermes gateway
```

Bot 应在几秒内上线。在 Telegram 上发送一条消息来验证。

## 从 Docker 终端发送生成的文件

如果你的终端后端是 `docker`，请注意 Telegram 附件由 **Gateway 进程**发送，而非容器内部。这意味着最终的 `MEDIA:/...` 路径必须在运行 Gateway 的主机上可读。

常见陷阱：

- Agent 在 Docker 内将文件写入 `/workspace/report.txt`
- 模型发出 `MEDIA:/workspace/report.txt`
- Telegram 投递失败，因为 `/workspace/report.txt` 仅存在于容器内部，主机上没有

推荐模式：

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

然后：

- 在 Docker 内将文件写入 `/output/...`
- 在 `MEDIA:` 中发出**主机可见的**路径，例如：`MEDIA:/home/user/.hermes/cache/documents/report.txt`

如果你已有 `docker_volumes:` 配置段，将新挂载添加到同一列表中。YAML 重复键会静默覆盖较早的值。

## Webhook 模式

默认情况下，Hermes 使用**长轮询**连接 Telegram — Gateway 向 Telegram 服务器发起出站请求获取新更新。这对本地和持续运行的部署效果良好。

对于**云部署**（Fly.io、Railway、Render 等），**Webhook 模式**更经济。这些平台可以在收到入站 HTTP 流量时自动唤醒挂起的机器，但不能基于出站连接唤醒。由于轮询是出站的，轮询 Bot 永远不能休眠。Webhook 模式翻转了方向 — Telegram 将更新推送到你的 Bot 的 HTTPS URL，实现空闲时休眠部署。

| | 轮询（默认） | Webhook |
|---|---|---|
| 方向 | Gateway → Telegram（出站） | Telegram → Gateway（入站） |
| 适用场景 | 本地、持续运行的服务器 | 支持自动唤醒的云平台 |
| 设置 | 无额外配置 | 设置 `TELEGRAM_WEBHOOK_URL` |
| 空闲费用 | 机器必须持续运行 | 机器可以在消息间休眠 |

### 配置

将以下内容添加到 `~/.hermes/.env`：

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
# TELEGRAM_WEBHOOK_PORT=8443        # 可选，默认 8443
# TELEGRAM_WEBHOOK_SECRET=mysecret  # 可选，推荐
```

| 变量 | 必需 | 说明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | 是 | Telegram 发送更新的公网 HTTPS URL。URL 路径会自动提取（如上例中的 `/telegram`）。 |
| `TELEGRAM_WEBHOOK_PORT` | 否 | Webhook 服务器监听的本地端口（默认：`8443`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | 否 | 用于验证更新确实来自 Telegram 的密钥 Token。**强烈推荐**用于生产部署。 |

设置 `TELEGRAM_WEBHOOK_URL` 后，Gateway 启动 HTTP Webhook 服务器而非轮询。未设置时使用轮询模式 — 与之前版本无行为变化。

### 云部署示例（Fly.io）

1. 将环境变量添加到你的 Fly.io 应用密钥：

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. 在 `fly.toml` 中暴露 Webhook 端口：

```toml
[[services]]
  internal_port = 8443
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

3. 部署：

```bash
fly deploy
```

Gateway 日志应显示：`[telegram] Connected to Telegram (webhook mode)`。

## 代理支持

如果 Telegram API 被阻止或你需要通过代理路由流量，设置 Telegram 专用代理 URL。这优先于通用的 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量。

**方式 1：config.yaml（推荐）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方式 2：环境变量**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

支持的协议：`http://`、`https://`、`socks5://`。

代理适用于主 Telegram 连接和回退 IP 传输。如果没有设置 Telegram 专用代理，Gateway 回退到 `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（或 macOS 系统代理自动检测）。

## 主频道

在任何 Telegram 聊天（私聊或群聊）中使用 `/sethome` 命令将其指定为**主频道**。定时任务（Cron）的结果会投递到此频道。

你也可以在 `~/.hermes/.env` 中手动设置：

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
群聊 ID 是负数（如 `-1001234567890`）。你的个人私聊 ID 与你的用户 ID 相同。
:::

## 语音消息

### 入站语音（语音转文字）

你在 Telegram 上发送的语音消息会被 Hermes 配置的 STT Provider 自动转录，并以文本形式注入对话。

- `local` 使用运行 Hermes 的机器上的 `faster-whisper` — 无需 API Key
- `groq` 使用 Groq Whisper，需要 `GROQ_API_KEY`
- `openai` 使用 OpenAI Whisper，需要 `VOICE_TOOLS_OPENAI_KEY`

### 出站语音（文字转语音）

当 Agent 通过 TTS 生成音频时，以原生 Telegram **语音气泡** — 圆形、可内联播放的样式 — 投递。

- **OpenAI 和 ElevenLabs** 原生生成 Opus — 无需额外设置
- **Edge TTS**（默认免费 Provider）输出 MP3，需要 **ffmpeg** 转换为 Opus：

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

没有 ffmpeg 时，Edge TTS 音频会作为普通音频文件发送（仍可播放，但使用矩形播放器而非语音气泡）。

在 `config.yaml` 的 `tts.provider` 键下配置 TTS Provider。

## 群聊使用

Hermes Agent 在 Telegram 群聊中可以使用，但有一些注意事项：

- **隐私模式**决定了 Bot 能看到哪些消息（见[第 3 步](#step-3-privacy-mode-critical-for-groups)）
- `TELEGRAM_ALLOWED_USERS` 仍然适用 — 只有授权用户可以触发 Bot，即使是在群中
- 你可以通过 `telegram.require_mention: true` 让 Bot 不响应普通群聊消息
- 设置 `telegram.require_mention: true` 后，群消息在以下情况下被接受：
  - 斜杠命令
  - 回复 Bot 消息的消息
  - `@botusername` 提及
  - 匹配你在 `telegram.mention_patterns` 中配置的正则唤醒词
- 使用 `telegram.ignored_threads` 让 Hermes 在特定 Telegram 论坛话题中保持静默，即使群聊本身允许自由响应或提及触发的回复
- 如果 `telegram.require_mention` 未设置或为 false，Hermes 保持之前的开放群组行为，响应它能看到的普通群消息

### 群聊触发配置示例

将以下内容添加到 `~/.hermes/config.yaml`：

```yaml
telegram:
  require_mention: true
  mention_patterns:
    - "^\\s*chompy\\b"
  ignored_threads:
    - 31
    - "42"
```

此示例允许所有常规直接触发，加上以 `chompy` 开头的消息，即使不使用 `@mention`。
Telegram 话题 `31` 和 `42` 中的消息始终被忽略，在提及和自由响应检查之前。

### `mention_patterns` 备注

- 模式使用 Python 正则表达式
- 匹配不区分大小写
- 模式对文本消息和媒体标题都进行检查
- 无效的正则模式会被忽略并在 Gateway 日志中发出警告，而不会导致 Bot 崩溃
- 如果你希望模式仅在消息开头匹配，用 `^` 锚定

## 私聊话题（Bot API 9.4）

Telegram Bot API 9.4（2026 年 2 月）引入了**私聊话题** — Bot 可以直接在 1 对 1 私聊中创建论坛风格的话题线程，无需超级群。这让你可以在与 Hermes 的私聊中运行多个隔离的工作空间。

### 使用场景

如果你同时处理多个长期项目，话题可以保持它们的上下文独立：

- **话题"Website"** — 处理你的生产 Web 服务
- **话题"Research"** — 文献综述和论文探索
- **话题"General"** — 杂项任务和快速问题

每个话题有自己独立的对话会话、历史和上下文 — 完全隔离。

### 配置

:::caution 前提条件
在向配置中添加话题之前，用户必须在与 Bot 的私信聊天中**启用话题模式**：

1. 在 Telegram 中打开与 Hermes Bot 的私聊
2. 点击顶部的 Bot 名称打开聊天信息
3. 启用 **Topics**（将聊天转为论坛的开关）

否则，Hermes 会在启动时记录 `The chat is not a forum` 并跳过话题创建。这是 Telegram 客户端设置 — Bot 无法以编程方式启用。
:::

在 `~/.hermes/config.yaml` 的 `platforms.telegram.extra.dm_topics` 下添加话题：

```yaml
platforms:
  telegram:
    extra:
      dm_topics:
      - chat_id: 123456789        # 你的 Telegram 用户 ID
        topics:
        - name: General
          icon_color: 7322096
        - name: Website
          icon_color: 9367192
        - name: Research
          icon_color: 16766590
          skill: arxiv              # 在此话题中自动加载 Skill
```

**字段：**

| 字段 | 必需 | 说明 |
|-------|----------|-------------|
| `name` | 是 | 话题显示名称 |
| `icon_color` | 否 | Telegram 图标颜色代码（整数） |
| `icon_custom_emoji_id` | 否 | 话题图标的自定义 Emoji ID |
| `skill` | 否 | 在此话题的新会话中自动加载的 Skill |
| `thread_id` | 否 | 话题创建后自动填充 — 不要手动设置 |

### 工作原理

1. Gateway 启动时，Hermes 对每个还没有 `thread_id` 的话题调用 `createForumTopic`
2. `thread_id` 会自动保存回 `config.yaml` — 后续重启跳过 API 调用
3. 每个话题映射到一个隔离的会话键：`agent:main:telegram:dm:{chat_id}:{thread_id}`
4. 每个话题中的消息有自己的对话历史、记忆刷新和上下文窗口

### Skill 绑定

带有 `skill` 字段的话题在新会话开始时自动加载该 Skill。这与在对话开始时输入 `/skill-name` 完全相同 — Skill 内容注入第一条消息，后续消息在对话历史中看到它。

例如，带有 `skill: arxiv` 的话题在其会话重置时（由于空闲超时、每日重置或手动 `/reset`）会预加载 arxiv Skill。

:::tip
在配置之外创建的话题（如通过手动调用 Telegram API）在收到 `forum_topic_created` 服务消息时会被自动发现。你也可以在 Gateway 运行时向配置添加话题 — 它们会在下次缓存未命中时被拾取。
:::

## 群聊论坛话题 Skill 绑定

启用**话题模式**的超级群（也称为"论坛话题"）已经获得按话题隔离会话 — 每个 `thread_id` 映射到自己的对话。但你可能想在特定群话题中收到消息时**自动加载 Skill**，就像私聊话题 Skill 绑定一样。

### 使用场景

一个团队超级群有不同工作流的论坛话题：

- **Engineering** 话题 → 自动加载 `software-development` Skill
- **Research** 话题 → 自动加载 `arxiv` Skill
- **General** 话题 → 无 Skill，通用助手

### 配置

在 `~/.hermes/config.yaml` 的 `platforms.telegram.extra.group_topics` 下添加话题绑定：

```yaml
platforms:
  telegram:
    extra:
      group_topics:
      - chat_id: -1001234567890       # 超级群 ID
        topics:
        - name: Engineering
          thread_id: 5
          skill: software-development
        - name: Research
          thread_id: 12
          skill: arxiv
        - name: General
          thread_id: 1
          # 无 Skill — 通用
```

**字段：**

| 字段 | 必需 | 说明 |
|-------|----------|-------------|
| `chat_id` | 是 | 超级群数字 ID（以 `-100` 开头的负数） |
| `name` | 否 | 话题的可读标签（仅供参考） |
| `thread_id` | 是 | Telegram 论坛话题 ID — 在 `t.me/c/<group_id>/<thread_id>` 链接中可见 |
| `skill` | 否 | 在此话题的新会话中自动加载的 Skill |

### 工作原理

1. 当消息到达已映射的群话题时，Hermes 在 `group_topics` 配置中查找 `chat_id` 和 `thread_id`
2. 如果匹配条目有 `skill` 字段，该 Skill 会为会话自动加载 — 与私聊话题 Skill 绑定相同
3. 没有 `skill` 键的话题仅获得会话隔离（现有行为，不变）
4. 未映射的 `thread_id` 或 `chat_id` 会静默通过 — 无错误，无 Skill

### 与私聊话题的区别

| | 私聊话题 | 群话题 |
|---|---|---|
| 配置键 | `extra.dm_topics` | `extra.group_topics` |
| 话题创建 | Hermes 通过 API 创建话题（如果缺少 `thread_id`） | 管理员在 Telegram UI 中创建话题 |
| `thread_id` | 创建后自动填充 | 必须手动设置 |
| `icon_color` / `icon_custom_emoji_id` | 支持 | 不适用（管理员控制外观） |
| Skill 绑定 | ✓ | ✓ |
| 会话隔离 | ✓ | ✓（论坛话题已内置） |

:::tip
要查找话题的 `thread_id`，在 Telegram Web 或桌面版中打开话题并查看 URL：`https://t.me/c/1234567890/5` — 最后的数字（`5`）就是 `thread_id`。超级群的 `chat_id` 是群 ID 前加 `-100`（如群 `1234567890` 变为 `-1001234567890`）。
:::

## 最新 Bot API 功能

- **Bot API 9.4（2026 年 2 月）：** 私聊话题 — Bot 可以通过 `createForumTopic` 在 1 对 1 私聊中创建论坛话题。参见上方[私聊话题](#private-chat-topics-bot-api-94)。
- **隐私政策：** Telegram 现在要求 Bot 有隐私政策。通过 BotFather 用 `/setprivacy_policy` 设置，否则 Telegram 可能自动生成占位符。如果你的 Bot 面向公众，这尤其重要。
- **消息流式传输：** Bot API 9.x 增加了对流式传输长响应的支持，可以改善冗长 Agent 回复的感知延迟。

## 交互式模型选择器

在 Telegram 聊天中发送不带参数的 `/model` 时，Hermes 显示一个交互式内联键盘用于切换模型：

1. **Provider 选择** — 按钮显示每个可用 Provider 及模型数量（如 "OpenAI (15)"、"✓ Anthropic (12)" 表示当前 Provider）。
2. **模型选择** — 分页模型列表，带 **上一页**/**下一页** 导航、**返回** 按钮回到 Provider 列表，以及 **取消**。

当前模型和 Provider 显示在顶部。所有导航通过就地编辑同一条消息完成（不会产生聊天刷屏）。

:::tip
如果你知道确切的模型名称，直接输入 `/model <name>` 跳过选择器。你也可以输入 `/model <name> --global` 持久化更改到所有会话。
:::

## DNS-over-HTTPS 回退 IP

在某些受限网络中，`api.telegram.org` 可能解析为不可达的 IP。Telegram 适配器包含**回退 IP** 机制，在保留正确的 TLS 主机名和 SNI 的同时，透明地重试连接替代 IP。

### 工作原理

1. 如果设置了 `TELEGRAM_FALLBACK_IPS`，直接使用这些 IP。
2. 否则，适配器自动通过 DNS-over-HTTPS（DoH）查询 **Google DNS** 和 **Cloudflare DNS** 来发现 `api.telegram.org` 的替代 IP。
3. DoH 返回的与系统 DNS 结果不同的 IP 用作回退。
4. 如果 DoH 也被阻止，使用硬编码的种子 IP（`149.154.167.220`）作为最后手段。
5. 一旦回退 IP 成功，它变为"粘性" — 后续请求直接使用它，无需先重试主路径。

### 配置

```bash
# 显式回退 IP（逗号分隔）
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

或在 `~/.hermes/config.yaml` 中：

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
通常不需要手动配置此功能。通过 DoH 的自动发现处理大多数受限网络场景。`TELEGRAM_FALLBACK_IPS` 环境变量仅在你的网络也阻止了 DoH 时才需要。
:::

## 代理支持

如果你的网络需要 HTTP 代理才能访问互联网（企业环境常见），Telegram 适配器会自动读取标准代理环境变量并通过代理路由所有连接。

### 支持的变量

适配器按顺序检查这些环境变量，使用第一个设置的：

1. `HTTPS_PROXY`
2. `HTTP_PROXY`
3. `ALL_PROXY`
4. `https_proxy` / `http_proxy` / `all_proxy`（小写变体）

### 配置

在启动 Gateway 前设置环境中的代理：

```bash
export HTTPS_PROXY=http://proxy.example.com:8080
hermes gateway
```

或添加到 `~/.hermes/.env`：

```bash
HTTPS_PROXY=http://proxy.example.com:8080
```

代理适用于主传输和所有回退 IP 传输。无需额外的 Hermes 配置 — 如果设置了环境变量，会自动使用。

:::note
这涵盖 Hermes 用于 Telegram 连接的自定义回退传输层。其他地方使用的标准 `httpx` 客户端已原生支持代理环境变量。
:::

## 消息反应

Bot 可以在消息上添加 emoji 反应作为视觉处理反馈：

- 👀 当 Bot 开始处理你的消息时
- ✅ 当响应成功投递时
- ❌ 如果处理过程中发生错误

反应**默认禁用**。在 `config.yaml` 中启用：

```yaml
telegram:
  reactions: true
```

或通过环境变量：

```bash
TELEGRAM_REACTIONS=true
```

:::note
与 Discord（反应是累加的）不同，Telegram 的 Bot API 在单次调用中替换所有 Bot 反应。从 👀 到 ✅/❌ 的转换是原子性的 — 你不会同时看到两者。
:::

:::tip
如果 Bot 在群中没有添加反应的权限，反应调用会静默失败，消息处理正常继续。
:::

## 按频道提示

为特定 Telegram 群或论坛话题分配临时系统提示。提示在每轮运行时注入 — 永远不会持久化到对话历史 — 因此更改立即生效。

```yaml
telegram:
  channel_prompts:
    "-1001234567890": |
      你是研究助手。专注于学术来源、引用和简洁的综合。
    "42":  |
      此话题用于创意写作反馈。保持温暖和建设性。
```

键是聊天 ID（群/超级群）或论坛话题 ID。对于论坛群组，话题级提示覆盖群级提示：

- 群 `-1001234567890` 中话题 `42` 的消息 → 使用话题 `42` 的提示
- 群 `-1001234567890` 中话题 `99`（无显式条目）→ 回退到群 `-1001234567890` 的提示
- 无条目的群中的消息 → 不应用频道提示

数字 YAML 键会自动标准化为字符串。

## 故障排除

| 问题 | 解决方案 |
|---------|----------|
| Bot 完全不响应 | 验证 `TELEGRAM_BOT_TOKEN` 是否正确。检查 `hermes gateway` 日志中的错误。 |
| Bot 回复"unauthorized" | 你的用户 ID 不在 `TELEGRAM_ALLOWED_USERS` 中。用 @userinfobot 再次确认。 |
| Bot 忽略群消息 | 隐私模式可能开启。关闭它（第 3 步）或将 Bot 设为群管理员。**记住更改隐私设置后移除并重新添加 Bot。** |
| 语音消息未转录 | 验证 STT 可用：安装 `faster-whisper` 用于本地转录，或在 `~/.hermes/.env` 中设置 `GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY`。 |
| 语音回复是文件而非气泡 | 安装 `ffmpeg`（Edge TTS Opus 转换所需）。 |
| Bot Token 被撤销/无效 | 通过 BotFather 的 `/revoke` 然后用 `/newbot` 或 `/token` 生成新 Token。更新你的 `.env` 文件。 |
| Webhook 未收到更新 | 验证 `TELEGRAM_WEBHOOK_URL` 可从公网访问（用 `curl` 测试）。确保你的平台/反向代理将来自 URL 端口的入站 HTTPS 流量路由到 `TELEGRAM_WEBHOOK_PORT` 配置的本地监听端口（它们不需要是相同的数字）。确保 SSL/TLS 已激活 — Telegram 只发送到 HTTPS URL。检查防火墙规则。 |

## 命令批准

当 Agent 尝试运行潜在危险的命令时，它会在聊天中请求你的批准：

> ⚠️ This command is potentially dangerous (recursive delete). Reply "yes" to approve.

回复 "yes"/"y" 批准或 "no"/"n" 拒绝。

## 安全

:::warning
始终设置 `TELEGRAM_ALLOWED_USERS` 来限制谁可以与你的 Bot 交互。没有它，Gateway 默认拒绝所有用户作为安全措施。
:::

永远不要公开分享你的 Bot Token。如果泄露，立即通过 BotFather 的 `/revoke` 命令撤销。

更多详情，参见[安全文档](/docs/user-guide/security)。你也可以使用 [DM 配对](/docs/user-guide/messaging#dm-pairing-alternative-to-allowlists)实现更动态的用户授权方式。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/telegram)
