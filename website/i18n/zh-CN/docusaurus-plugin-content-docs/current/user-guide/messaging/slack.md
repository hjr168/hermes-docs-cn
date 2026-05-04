---
sidebar_position: 4
title: "Slack"
description: "使用 Socket Mode 将 Hermes Agent 设置为 Slack Bot"
---

# Slack 设置

使用 Socket Mode 将 Hermes Agent 作为 Bot 连接到 Slack。Socket Mode 使用 WebSocket 而非公网 HTTP 端点，因此你的 Hermes 实例不需要公开访问 — 它可以在防火墙后、你的笔记本上或私有服务器上工作。

:::warning 经典 Slack 应用已弃用
经典 Slack 应用（使用 RTM API）已于 **2025 年 3 月完全弃用**。Hermes 使用现代 Bolt SDK 和 Socket Mode。如果你有旧的经典应用，必须按照以下步骤创建新应用。
:::

## 概览

| 组件 | 值 |
|-----------|-------|
| **库** | `slack-bolt` / `slack_sdk` for Python（Socket Mode） |
| **连接** | WebSocket — 无需公网 URL |
| **认证令牌** | Bot Token（`xoxb-`）+ App-Level Token（`xapp-`） |
| **用户识别** | Slack Member ID（如 `U01ABC2DEF3`） |

---

## 第 1 步：创建 Slack 应用

1. 前往 [https://api.slack.com/apps](https://api.slack.com/apps)
2. 点击 **Create New App**
3. 选择 **From scratch**
4. 输入应用名称（如 "Hermes Agent"）并选择你的工作空间
5. 点击 **Create App**

你将进入应用的 **Basic Information** 页面。

---

## 第 2 步：配置 Bot Token Scopes

在侧边栏中进入 **Features → OAuth & Permissions**。滚动到 **Scopes → Bot Token Scopes** 并添加以下内容：

| Scope | 用途 |
|-------|---------|
| `chat:write` | 以 Bot 身份发送消息 |
| `app_mentions:read` | 检测频道中的 @mention |
| `channels:history` | 读取 Bot 所在公共频道中的消息 |
| `channels:read` | 列出和获取公共频道信息 |
| `groups:history` | 读取 Bot 被邀请的私有频道中的消息 |
| `im:history` | 读取私信历史 |
| `im:read` | 查看基本私信信息 |
| `im:write` | 打开和管理私信 |
| `users:read` | 查找用户信息 |
| `files:read` | 读取和下载附件文件，包括语音备忘录/音频 |
| `files:write` | 上传文件（图片、音频、文档） |

:::caution 缺少 Scope = 缺少功能
没有 `channels:history` 和 `groups:history`，Bot **将不会接收频道中的消息** — 它只能在私信中工作。这是最常遗漏的 Scope。
:::

**可选 Scope：**

| Scope | 用途 |
|-------|---------|
| `groups:read` | 列出和获取私有频道信息 |

---

## 第 3 步：启用 Socket Mode

Socket Mode 让 Bot 通过 WebSocket 连接，而不需要公网 URL。

1. 在侧边栏中，进入 **Settings → Socket Mode**
2. 将 **Enable Socket Mode** 切换为 ON
3. 你将被提示创建一个 **App-Level Token**：
   - 命名为类似 `hermes-socket` 的名称（名称不重要）
   - 添加 **`connections:write`** Scope
   - 点击 **Generate**
4. **复制 Token** — 它以 `xapp-` 开头。这是你的 `SLACK_APP_TOKEN`

:::tip
你始终可以在 **Settings → Basic Information → App-Level Tokens** 下找到或重新生成应用级 Token。
:::

---

## 第 4 步：订阅事件

此步骤至关重要 — 它控制 Bot 能看到哪些消息。

1. 在侧边栏中，进入 **Features → Event Subscriptions**
2. 将 **Enable Events** 切换为 ON
3. 展开 **Subscribe to bot events** 并添加：

| 事件 | 必需？ | 用途 |
|-------|-----------|---------|
| `message.im` | **是** | Bot 接收私信 |
| `message.channels` | **是** | Bot 接收已添加到的**公共**频道中的消息 |
| `message.groups` | **推荐** | Bot 接收被邀请到的**私有**频道中的消息 |
| `app_mention` | **是** | 防止 Bot 被 @mention 时 Bolt SDK 报错 |

4. 点击页面底部的 **Save Changes**

:::danger 缺少事件订阅是第 1 大设置问题
如果 Bot 在私信中工作但**不在频道中**，你几乎肯定忘记添加 `message.channels`（公共频道）和/或 `message.groups`（私有频道）。没有这些事件，Slack 根本不会将频道消息投递给 Bot。
:::

---

## 第 5 步：启用 Messages 标签页

此步骤启用向 Bot 发送私信。没有它，用户尝试私信 Bot 时会看到 **"Sending messages to this app has been turned off"**。

1. 在侧边栏中，进入 **Features → App Home**
2. 滚动到 **Show Tabs**
3. 将 **Messages Tab** 切换为 ON
4. 勾选 **"Allow users to send Slash commands and messages from the messages tab"**

:::danger 没有此步骤，私信完全被阻止
即使有所有正确的 Scope 和事件订阅，Slack 也不允许用户向 Bot 发送私信，除非启用了 Messages Tab。这是 Slack 平台要求，不是 Hermes 配置问题。
:::

---

## 第 6 步：安装应用到工作空间

1. 在侧边栏中，进入 **Settings → Install App**
2. 点击 **Install to Workspace**
3. 审查权限并点击 **Allow**
4. 授权后，你将看到一个以 `xoxb-` 开头的 **Bot User OAuth Token**
5. **复制此 Token** — 这是你的 `SLACK_BOT_TOKEN`

:::tip
如果你之后更改 Scope 或事件订阅，你**必须重新安装应用**才能使更改生效。Install App 页面会显示提示横幅。
:::

---

## 第 7 步：查找白名单用户 ID

Hermes 使用 Slack **Member ID**（非用户名或显示名称）作为白名单。

查找 Member ID：

1. 在 Slack 中，点击用户的名称或头像
2. 点击 **View full profile**
3. 点击 **⋮**（更多）按钮
4. 选择 **Copy member ID**

Member ID 类似 `U01ABC2DEF3`。你至少需要你自己的 Member ID。

---

## 第 8 步：配置 Hermes

将以下内容添加到你的 `~/.hermes/.env` 文件：

```bash
# 必需
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_ALLOWED_USERS=U01ABC2DEF3              # 逗号分隔的 Member ID

# 可选
SLACK_HOME_CHANNEL=C01234567890              # Cron/定时消息的默认频道
SLACK_HOME_CHANNEL_NAME=general              # 主频道的人类可读名称（可选）
```

或运行交互式设置：

```bash
hermes gateway setup    # 在提示时选择 Slack
```

然后启动 Gateway：

```bash
hermes gateway              # 前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅 Linux：开机系统服务
```

---

## 第 9 步：邀请 Bot 到频道

启动 Gateway 后，你需要**邀请 Bot** 到任何你希望它响应的频道：

```
/invite @Hermes Agent
```

Bot**不会**自动加入频道。你必须逐个邀请到每个频道。

---

## Bot 如何响应

理解 Hermes 在不同上下文中的行为：

| 上下文 | 行为 |
|---------|----------|
| **私信** | Bot 响应每条消息 — 无需 @mention |
| **频道** | Bot **仅在被 @mentioned 时响应**（如 `@Hermes Agent what time is it?`）。在频道中，Hermes 在该消息的线程中回复。 |
| **线程** | 如果你在线程内 @mention Hermes，它会在同一线程中回复。一旦 Bot 在线程中有活跃会话，**该线程中的后续回复不需要 @mention** — Bot 自然地跟随对话。 |

:::tip
在频道中，始终 @mention Bot 开始对话。一旦 Bot 在线程中活跃，你可以在线程中回复而无需提及。在线程之外，没有 @mention 的消息会被忽略，以防止繁忙频道中的噪音。
:::

---

## 配置选项

除了第 8 步的必需环境变量外，你还可以通过 `~/.hermes/config.yaml` 自定义 Slack Bot 行为。

### 线程和回复行为

```yaml
platforms:
  slack:
    # 控制多部分响应如何线程化
    # "off"   — 从不将回复线程化到原始消息
    # "first" — 第一个块线程化到用户消息（默认）
    # "all"   — 所有块线程化到用户消息
    reply_to_mode: "first"

    extra:
      # 是否在线程中回复（默认：true）。
      # 为 false 时，频道消息直接回复而非线程。
      # 已有线程中的消息仍然在线程内回复。
      reply_in_thread: true

      # 同时将线程回复发送到主频道
      #（Slack 的"Also send to channel"功能）。
      # 仅第一条回复的第一个块会广播。
      reply_broadcast: false
```

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `platforms.slack.reply_to_mode` | `"first"` | 多部分消息的线程模式：`"off"`、`"first"` 或 `"all"` |
| `platforms.slack.extra.reply_in_thread` | `true` | 为 `false` 时，频道消息获得直接回复而非线程。已有线程中的消息仍然在线程内回复。 |
| `platforms.slack.extra.reply_broadcast` | `false` | 为 `true` 时，线程回复也发送到主频道。仅第一个块会广播。 |

### 会话隔离

```yaml
# 全局设置 — 适用于 Slack 和所有其他平台
group_sessions_per_user: true
```

为 `true`（默认）时，共享频道中的每个用户获得自己隔离的对话会话。两个在 `#general` 中与 Hermes 交谈的人会有独立的历史和上下文。

设为 `false` 如果你想用协作模式，整个频道共享一个对话会话。注意这意味着用户共享上下文增长和 Token 费用，且一个用户的 `/reset` 会清除所有人的会话。

### 提及和触发行为

```yaml
slack:
  # 频道中需要 @mention（这是默认行为；
  # Slack 适配器在频道中始终强制 @mention 控制，
  # 但你可以显式设置以与其他平台保持一致）
  require_mention: true

  # 触发 Bot 的自定义提及模式
  #（除了默认的 @mention 检测之外）
  mention_patterns:
    - "hey hermes"
    - "hermes,"

  # 每条出站消息前添加的文本
  reply_prefix: ""
```

:::info
Slack 支持两种模式：默认需要 `@mention` 才能开始对话，但你可以通过 `SLACK_FREE_RESPONSE_CHANNELS`（逗号分隔的频道 ID）或 `config.yaml` 中的 `slack.free_response_channels` 让特定频道退出。一旦 Bot 在线程中有活跃会话，后续线程回复不需要提及。在私信中 Bot 始终响应，无需提及。
:::

### 未授权用户处理

```yaml
slack:
  # 未授权用户（不在 SLACK_ALLOWED_USERS 中）私信 Bot 时发生什么
  # "pair"   — 提示他们输入配对码（默认）
  # "ignore" — 静默丢弃消息
  unauthorized_dm_behavior: "pair"
```

你也可以全局设置所有平台：

```yaml
unauthorized_dm_behavior: "pair"
```

`slack:` 下的平台特定设置优先于全局设置。

### 语音转录

```yaml
# 全局设置 — 启用/禁用入站语音消息的自动转录
stt_enabled: true
```

为 `true`（默认）时，入站音频消息在 Agent 处理前使用配置的 STT Provider 自动转录。

### 完整示例

```yaml
# 全局 Gateway 设置
group_sessions_per_user: true
unauthorized_dm_behavior: "pair"
stt_enabled: true

# Slack 专用设置
slack:
  require_mention: true
  unauthorized_dm_behavior: "pair"

# 平台配置
platforms:
  slack:
    reply_to_mode: "first"
    extra:
      reply_in_thread: true
      reply_broadcast: false
```

---

## 主频道

设置 `SLACK_HOME_CHANNEL` 为 Hermes 投递定时消息、Cron 任务结果和其他主动通知的频道 ID。查找频道 ID：

1. 在 Slack 中右键点击频道名称
2. 点击 **View channel details**
3. 滚动到底部 — Channel ID 显示在那里

```bash
SLACK_HOME_CHANNEL=C01234567890
```

确保 Bot 已被**邀请到该频道**（`/invite @Hermes Agent`）。

---

## 多工作空间支持

Hermes 可以使用单个 Gateway 实例同时连接到**多个 Slack 工作空间**。每个工作空间独立认证，有自己的 Bot 用户 ID。

### 配置

在 `SLACK_BOT_TOKEN` 中以**逗号分隔列表**提供多个 Bot Token：

```bash
# 多个 Bot Token — 每个工作空间一个
SLACK_BOT_TOKEN=xoxb-workspace1-token,xoxb-workspace2-token,xoxb-workspace3-token

# 仍然使用单个应用级 Token 用于 Socket Mode
SLACK_APP_TOKEN=xapp-your-app-token
```

或在 `~/.hermes/config.yaml` 中：

```yaml
platforms:
  slack:
    token: "xoxb-workspace1-token,xoxb-workspace2-token"
```

### OAuth Token 文件

除了环境或配置中的 Token，Hermes 还从 **OAuth Token 文件**加载 Token：

```
~/.hermes/slack_tokens.json
```

此文件是一个将团队 ID 映射到 Token 条目的 JSON 对象：

```json
{
  "T01ABC2DEF3": {
    "token": "xoxb-workspace-token-here",
    "team_name": "My Workspace"
  }
}
```

此文件中的 Token 与 `SLACK_BOT_TOKEN` 指定的任何 Token 合并。重复 Token 自动去重。

### 工作原理

- 列表中的**第一个 Token** 是主 Token，用于 Socket Mode 连接（AsyncApp）。
- 每个 Token 在启动时通过 `auth.test` 认证。Gateway 将每个 `team_id` 映射到自己的 `WebClient` 和 `bot_user_id`。
- 当消息到达时，Hermes 使用正确的工作空间特定客户端响应。
- 主 `bot_user_id`（来自第一个 Token）用于期望单一 Bot 身份的功能的向后兼容。

---

## 语音消息

Hermes 在 Slack 上支持语音：

- **入站：** 语音/音频消息使用配置的 STT Provider 自动转录：本地 `faster-whisper`、Groq Whisper（`GROQ_API_KEY`）或 OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）
- **出站：** TTS 响应作为音频文件附件发送

---

## 按频道提示

为特定 Slack 频道分配临时系统提示。提示在每轮运行时注入 — 永远不会持久化到对话历史 — 因此更改立即生效。

```yaml
slack:
  channel_prompts:
    "C01RESEARCH": |
      你是研究助手。专注于学术来源、引用和简洁的综合。
    "C02ENGINEERING": |
      代码审查模式。精确处理边界情况和性能影响。
```

键是 Slack 频道 ID（通过频道详情 → "About" → 滚动到底部查找）。匹配频道中的所有消息都会获得提示作为临时系统指令注入。

## 故障排除

| 问题 | 解决方案 |
|---------|----------|
| Bot 不响应私信 | 验证 `message.im` 在事件订阅中且应用已重新安装 |
| Bot 在私信中工作但不在频道中 | **最常见问题。** 将 `message.channels` 和 `message.groups` 添加到事件订阅，重新安装应用，并用 `/invite @Hermes Agent` 邀请 Bot 到频道 |
| Bot 不响应频道中的 @mention | 1) 检查已订阅 `message.channels` 事件。2) Bot 必须被邀请到频道。3) 确保已添加 `channels:history` Scope。4) Scope/事件更改后重新安装应用 |
| Bot 忽略私有频道中的消息 | 同时添加 `message.groups` 事件订阅和 `groups:history` Scope，然后重新安装应用并 `/invite` Bot |
| 私信中显示"Sending messages to this app has been turned off" | 在 App Home 设置中启用 **Messages Tab**（见第 5 步） |
| "not_authed" 或 "invalid_auth" 错误 | 重新生成你的 Bot Token 和 App Token，更新 `.env` |
| Bot 响应但无法在频道中发消息 | 用 `/invite @Hermes Agent` 邀请 Bot 到频道 |
| "missing_scope" 错误 | 在 OAuth & Permissions 中添加所需的 Scope，然后**重新安装**应用 |
| Socket 频繁断开 | 检查你的网络；Bolt 自动重连但不稳定的连接会导致延迟 |
| 更改了 Scope/事件但没有任何变化 | 任何 Scope 或事件订阅更改后你**必须重新安装**应用到工作空间 |

### 快速检查清单

如果 Bot 在频道中不工作，验证**以下所有项**：

1. ✅ 已订阅 `message.channels` 事件（公共频道）
2. ✅ 已订阅 `message.groups` 事件（私有频道）
3. ✅ 已订阅 `app_mention` 事件
4. ✅ 已添加 `channels:history` Scope（公共频道）
5. ✅ 已添加 `groups:history` Scope（私有频道）
6. ✅ 添加 Scope/事件后已**重新安装**应用
7. ✅ 已**邀请** Bot 到频道（`/invite @Hermes Agent`）
8. ✅ 你在消息中**@mention** 了 Bot

---

## 安全

:::warning
**始终设置 `SLACK_ALLOWED_USERS`** 并填入授权用户的 Member ID。没有此设置，Gateway 默认**拒绝所有消息**作为安全措施。永远不要分享你的 Bot Token — 像对待密码一样对待它们。
:::

- Token 应存储在 `~/.hermes/.env` 中（文件权限 `600`）
- 定期通过 Slack 应用设置轮换 Token
- 审计谁有你的 Hermes 配置目录的访问权限
- Socket Mode 意味着没有公开的端点暴露 — 减少一个攻击面

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/slack)
