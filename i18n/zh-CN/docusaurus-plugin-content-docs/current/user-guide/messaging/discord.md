---
sidebar_position: 3
title: "Discord"
description: "将 Hermes Agent 设置为 Discord Bot"
---

# Discord 设置

Hermes Agent 作为 Bot 与 Discord 集成，让你通过私信或服务器频道与 AI 助手聊天。Bot 接收你的消息，通过 Hermes Agent 管道处理（包括工具使用、记忆和推理），并实时响应。它支持文本、语音消息、文件附件和斜杠命令。

在设置之前，先了解大多数人最关心的部分：Hermes 在你的服务器中的行为。

## Hermes 的行为

| 上下文 | 行为 |
|---------|----------|
| **私信** | Hermes 响应每条消息。无需 `@mention`。每个私信有独立的会话。 |
| **服务器频道** | 默认情况下，Hermes 只在你 `@mention` 它时响应。如果你在频道中发消息而不提及它，Hermes 忽略该消息。 |
| **自由响应频道** | 你可以通过 `DISCORD_FREE_RESPONSE_CHANNELS` 让特定频道免提及，或通过 `DISCORD_REQUIRE_MENTION=false` 全局禁用提及要求。这些频道中的消息以内联方式回复 — 跳过自动线程创建，保持频道为轻量级聊天。 |
| **线程** | Hermes 在同一线程中回复。提及规则仍然适用，除非该线程或其父频道被配置为自由响应。线程的会话历史与父频道隔离。 |
| **多用户共享频道** | 默认情况下，Hermes 在频道内按用户隔离会话历史，以确保安全和清晰。两个在同一频道中与 Hermes 交谈的人不会共享一个对话记录，除非你明确禁用此功能。 |
| **提及其他用户的消息** | 当 `DISCORD_IGNORE_NO_MENTION` 为 `true`（默认）时，如果一条消息 @提及了其他用户但**未**提及 Bot，Hermes 保持沉默。这防止 Bot 跳入针对其他人的对话。设为 `false` 可让 Bot 响应所有消息，无论提及了谁。这仅适用于服务器频道，不适用于私信。 |

:::tip
如果你想要一个正常的 Bot 帮助频道，让人们无需每次都标记 Hermes 就能与之交谈，将该频道添加到 `DISCORD_FREE_RESPONSE_CHANNELS`。
:::

### Discord Gateway 模型

Discord 上的 Hermes 不是一个无状态回复的 Webhook。它通过完整的消息 Gateway 运行，这意味着每条入站消息都经过：

1. 授权（`DISCORD_ALLOWED_USERS`）
2. 提及 / 自由响应检查
3. 会话查找
4. 会话对话记录加载
5. 正常的 Hermes Agent 执行，包括工具、记忆和斜杠命令
6. 响应投递回 Discord

这很重要，因为在繁忙的服务器中，行为取决于 Discord 路由和 Hermes 会话策略两者。

### Discord 中的会话模型

默认情况下：

- 每个私信有自己的会话
- 每个服务器线程有自己的会话命名空间
- 共享频道中的每个用户在该频道内有自己的会话

所以如果 Alice 和 Bob 都在 `#research` 中与 Hermes 交谈，Hermes 默认将它们视为独立的对话，即使它们使用的是同一个可见的 Discord 频道。

这通过 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅在你明确希望整个房间共享一个对话时设为 `false`：

```yaml
group_sessions_per_user: false
```

共享会话对协作房间有用，但也意味着：

- 用户共享上下文增长和 Token 费用
- 一个人的长时间工具密集任务会膨胀其他所有人的上下文
- 一个人的运行中任务可以中断另一个人的后续消息

### 中断和并发

Hermes 按会话键跟踪运行中的 Agent。

使用默认的 `group_sessions_per_user: true`：

- Alice 中断自己运行中的请求只影响 Alice 在该频道的会话
- Bob 可以在同一频道继续交谈，而不会继承 Alice 的历史或中断 Alice 的运行

使用 `group_sessions_per_user: false`：

- 整个房间共享一个运行中 Agent 槽位
- 不同人的后续消息可以相互中断或排队等待

本指南将带你完成完整的设置过程 — 从在 Discord 开发者门户创建 Bot 到发送你的第一条消息。

## 第 1 步：创建 Discord 应用

1. 前往 [Discord 开发者门户](https://discord.com/developers/applications) 并使用你的 Discord 账户登录。
2. 点击右上角的 **New Application**。
3. 输入应用名称（如 "Hermes Agent"）并接受开发者服务条款。
4. 点击 **Create**。

你将进入 **General Information** 页面。记下 **Application ID** — 稍后构建邀请链接时需要。

## 第 2 步：创建 Bot

1. 在左侧边栏中，点击 **Bot**。
2. Discord 自动为你的应用创建 Bot 用户。你可以自定义 Bot 的用户名。
3. 在 **Authorization Flow** 下：
   - 将 **Public Bot** 设为 **ON** — 使用 Discord 提供的邀请链接所必需（推荐）。这允许 Installation 标签页生成默认授权 URL。
   - 保持 **Require OAuth2 Code Grant** 设为 **OFF**。

:::tip
你可以在此页面为 Bot 设置自定义头像和横幅。这是用户在 Discord 中看到的内容。
:::

:::info[私有 Bot 替代方案]
如果你希望保持 Bot 私有（Public Bot = OFF），你**必须**在第 5 步中使用 **手动 URL** 方式而非 Installation 标签页。Discord 提供的链接需要 Public Bot 开启。
:::

## 第 3 步：启用特权 Gateway Intent

这是整个设置中最关键的步骤。没有正确的 Intent，你的 Bot 会连接到 Discord 但**无法读取消息内容**。

在 **Bot** 页面，向下滚动到 **Privileged Gateway Intents**。你会看到三个开关：

| Intent | 用途 | 必需？ |
|--------|---------|-----------| 
| **Presence Intent** | 查看用户在线/离线状态 | 可选 |
| **Server Members Intent** | 访问成员列表、解析用户名 | **必需** |
| **Message Content Intent** | 读取消息的文本内容 | **必需** |

**启用 Server Members Intent 和 Message Content Intent** — 将它们切换为 **ON**。

- 没有 **Message Content Intent**，你的 Bot 接收消息事件但消息文本为空 — Bot 无法看到你输入的内容。
- 没有 **Server Members Intent**，Bot 无法解析允许用户列表中的用户名，可能无法识别谁在发送消息。

:::warning[这是 Discord Bot 不工作的第一大原因]
如果你的 Bot 在线但从不响应消息，**Message Content Intent** 几乎可以确定被禁用了。回到[开发者门户](https://discord.com/developers/applications)，选择你的应用 → Bot → Privileged Gateway Intents，确保 **Message Content Intent** 已切换为 ON。点击 **Save Changes**。
:::

**关于服务器数量：**
- 如果你的 Bot 在**少于 100 个服务器**中，你可以自由开关 Intent。
- 如果你的 Bot 在 **100 个或更多服务器**中，Discord 要求你提交验证申请才能使用特权 Intent。对于个人使用，这不是问题。

点击页面底部的 **Save Changes**。

## 第 4 步：获取 Bot Token

Bot Token 是 Hermes Agent 用以登录你的 Bot 的凭据。仍在 **Bot** 页面：

1. 在 **Token** 部分，点击 **Reset Token**。
2. 如果你的 Discord 账户启用了双因素认证，输入 2FA 代码。
3. Discord 会显示你的新 Token。**立即复制它。**

:::warning[Token 仅显示一次]
Token 只显示一次。如果你丢失它，需要重置并生成新的。永远不要公开分享你的 Token 或提交到 Git — 拥有此 Token 的人可以完全控制你的 Bot。
:::

将 Token 存储在安全的地方（如密码管理器）。第 8 步会用到。

## 第 5 步：生成邀请 URL

你需要一个 OAuth2 URL 来邀请 Bot 到你的服务器。有两种方式：

### 方案 A：使用 Installation 标签页（推荐）

:::note[需要 Public Bot]
此方法需要第 2 步中将 **Public Bot** 设为 **ON**。如果你将 Public Bot 设为 OFF，请改用手动 URL 方式。
:::

1. 在左侧边栏中，点击 **Installation**。
2. 在 **Installation Contexts** 下，启用 **Guild Install**。
3. 对于 **Install Link**，选择 **Discord Provided Link**。
4. 在 Guild Install 的 **Default Install Settings** 下：
   - **Scopes**：选择 `bot` 和 `applications.commands`
   - **Permissions**：选择下面列出的权限。

### 方案 B：手动 URL

你可以直接使用此格式构建邀请 URL：

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

将 `YOUR_APP_ID` 替换为第 1 步中的 Application ID。

### 必需权限

你的 Bot 需要的最低权限：

- **View Channels** — 查看它可以访问的频道
- **Send Messages** — 回复你的消息
- **Embed Links** — 格式化富文本响应
- **Attach Files** — 发送图片、音频和文件输出
- **Read Message History** — 维护对话上下文

### 推荐额外权限

- **Send Messages in Threads** — 在线程对话中回复
- **Add Reactions** — 对消息添加反应以确认

### 权限整数

| 级别 | 权限整数 | 包含内容 |
|-------|-------------------|-----------------|
| 最低 | `117760` | 查看频道、发送消息、读取历史、附件 |
| 推荐 | `274878286912` | 以上全部 + 嵌入链接、线程中发送消息、添加反应 |

## 第 6 步：邀请到你的服务器

1. 在浏览器中打开邀请 URL（来自 Installation 标签页或你构建的手动 URL）。
2. 在 **Add to Server** 下拉框中，选择你的服务器。
3. 点击 **Continue**，然后 **Authorize**。
4. 如有提示，完成 CAPTCHA。

:::info
你需要 Discord 服务器上的 **Manage Server** 权限才能邀请 Bot。如果你在下拉框中看不到你的服务器，请服务器管理员使用邀请链接。
:::

授权后，Bot 将出现在你服务器的成员列表中（在你启动 Hermes Gateway 之前会显示为离线）。

## 第 7 步：查找你的 Discord 用户 ID

Hermes Agent 使用你的 Discord 用户 ID 来控制谁可以与 Bot 交互。查找方法：

1. 打开 Discord（桌面版或 Web 版）。
2. 进入 **Settings** → **Advanced** → 将 **Developer Mode** 切换为 **ON**。
3. 关闭设置。
4. 右键点击你自己的用户名（在消息、成员列表或你的资料中）→ **Copy User ID**。

你的用户 ID 是一个长数字，如 `284102345871466496`。

:::tip
Developer Mode 还可以让你复制 **频道 ID** 和 **服务器 ID** — 右键点击频道或服务器名称并选择 Copy ID。如果你想手动设置主频道，会需要频道 ID。
:::

## 第 8 步：配置 Hermes Agent

### 方案 A：交互式设置（推荐）

运行引导设置命令：

```bash
hermes gateway setup
```

在提示时选择 **Discord**，然后粘贴你的 Bot Token 和用户 ID。

### 方案 B：手动配置

将以下内容添加到你的 `~/.hermes/.env` 文件：

```bash
# 必需
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=284102345871466496

# 多个允许的用户（逗号分隔）
# DISCORD_ALLOWED_USERS=284102345871466496,198765432109876543
```

然后启动 Gateway：

```bash
hermes gateway
```

Bot 应该在几秒内在 Discord 上线。发送一条消息 — 私信或它能看到的消息 — 来测试。

:::tip
你可以在后台或作为 systemd 服务运行 `hermes gateway` 以保持持久运行。详见部署文档。
:::

## 配置参考

Discord 行为通过两个文件控制：**`~/.hermes/.env`** 用于凭据和环境级开关，**`~/.hermes/config.yaml`** 用于结构化设置。环境变量在两者都设置时始终优先。

### 环境变量（`.env`）

| 变量 | 必需 | 默认值 | 说明 |
|----------|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | **是** | — | 来自 [Discord 开发者门户](https://discord.com/developers/applications) 的 Bot Token。 |
| `DISCORD_ALLOWED_USERS` | **是** | — | 允许与 Bot 交互的 Discord 用户 ID，逗号分隔。没有此设置**或** `DISCORD_ALLOWED_ROLES`，Gateway 拒绝所有用户。 |
| `DISCORD_ALLOWED_ROLES` | 否 | — | Discord 角色 ID，逗号分隔。拥有任一角色的成员被授权 — 与 `DISCORD_ALLOWED_USERS` 为 OR 关系。连接时自动启用 **Server Members Intent**。适用于管理团队变动的场景：新管理员一旦被授予角色就获得访问权限，无需更改配置。 |
| `DISCORD_HOME_CHANNEL` | 否 | — | Bot 发送主动消息（Cron 输出、提醒、通知）的频道 ID。 |
| `DISCORD_HOME_CHANNEL_NAME` | 否 | `"Home"` | 主频道在日志和状态输出中的显示名称。 |
| `DISCORD_COMMAND_SYNC_POLICY` | 否 | `"safe"` | 控制原生斜杠命令启动同步。`"safe"` 差异对比现有全局命令，仅更新有变化的部分，当 Discord 元数据变更无法通过补丁应用时重新创建命令。`"bulk"` 保留旧的 `tree.sync()` 行为。`"off"` 完全跳过启动同步。 |
| `DISCORD_REQUIRE_MENTION` | 否 | `true` | 为 `true` 时，Bot 仅在被 `@mentioned` 时响应服务器频道。设为 `false` 可响应每个频道的所有消息。 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | 否 | — | Bot 无需 `@mention` 即可响应的频道 ID，逗号分隔，即使 `DISCORD_REQUIRE_MENTION` 为 `true`。 |
| `DISCORD_IGNORE_NO_MENTION` | 否 | `true` | 为 `true` 时，如果一条消息 `@mentions` 了其他用户但**未**提及 Bot，Bot 保持沉默。防止 Bot 跳入针对其他人的对话。仅适用于服务器频道，不适用于私信。 |
| `DISCORD_AUTO_THREAD` | 否 | `true` | 为 `true` 时，自动为文字频道中的每个 `@mention` 创建新线程，使每个对话隔离（类似 Slack 行为）。已有线程或私信中的消息不受影响。 |
| `DISCORD_ALLOW_BOTS` | 否 | `"none"` | 控制 Bot 如何处理来自其他 Discord Bot 的消息。`"none"` — 忽略所有其他 Bot。`"mentions"` — 仅接受 `@mention` Hermes 的 Bot 消息。`"all"` — 接受所有 Bot 消息。 |
| `DISCORD_REACTIONS` | 否 | `true` | 为 `true` 时，Bot 在处理过程中对消息添加 emoji 反应（👀 开始、✅ 成功、❌ 错误）。设为 `false` 完全禁用反应。 |
| `DISCORD_IGNORED_CHANNELS` | 否 | — | Bot **从不**响应的频道 ID，逗号分隔，即使被 `@mentioned`。优先于所有其他频道设置。 |
| `DISCORD_ALLOWED_CHANNELS` | 否 | — | 频道 ID，逗号分隔。设置后，Bot **仅**在这些频道中响应（加上允许的私信）。覆盖 `config.yaml` 中的 `discord.allowed_channels`。与 `DISCORD_IGNORED_CHANNELS` 组合使用可表达允许/拒绝规则。 |
| `DISCORD_NO_THREAD_CHANNELS` | 否 | — | Bot 直接在频道中响应而非创建线程的频道 ID，逗号分隔。仅在 `DISCORD_AUTO_THREAD` 为 `true` 时相关。 |
| `DISCORD_REPLY_TO_MODE` | 否 | `"first"` | 控制回复引用行为：`"off"` — 从不回复原始消息，`"first"` — 仅在第一条消息块上回复引用（默认），`"all"` — 在每个块上回复引用。 |
| `DISCORD_ALLOW_MENTION_EVERYONE` | 否 | `false` | 为 `false`（默认）时，Bot 不能 ping `@everyone` 或 `@here`，即使其响应包含这些 Token。设为 `true` 可重新启用。参见下方[提及控制](#mention-control)。 |
| `DISCORD_ALLOW_MENTION_ROLES` | 否 | `false` | 为 `false`（默认）时，Bot 不能 ping `@role` 提及。设为 `true` 允许。 |
| `DISCORD_ALLOW_MENTION_USERS` | 否 | `true` | 为 `true`（默认）时，Bot 可以按 ID ping 个别用户。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | 否 | `true` | 为 `true`（默认）时，回复消息会 ping 原始作者。 |
| `DISCORD_PROXY` | 否 | — | Discord 连接（HTTP、WebSocket、REST）的代理 URL。覆盖 `HTTPS_PROXY`/`ALL_PROXY`。支持 `http://`、`https://` 和 `socks5://` 协议。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | 否 | `0.6` | 适配器在刷新排队文本块之前等待的宽限窗口。用于平滑流式输出。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | 否 | `0.1` | 单条消息超过 Discord 长度限制时，分块之间的延迟。 |

### 配置文件（`config.yaml`）

`~/.hermes/config.yaml` 中的 `discord` 部分与上述环境变量对应。config.yaml 设置作为默认值 — 如果等效环境变量已设置，环境变量优先。

```yaml
# Discord 专用设置
discord:
  require_mention: true           # 服务器频道中需要 @mention
  free_response_channels: ""      # 逗号分隔的频道 ID（或 YAML 列表）
  auto_thread: true               # @mention 时自动创建线程
  reactions: true                 # 处理期间添加 emoji 反应
  ignored_channels: []            # Bot 从不响应的频道 ID
  no_thread_channels: []          # Bot 不使用线程直接回复的频道 ID
  channel_prompts: {}             # 按频道临时系统提示
  allow_mentions:                 # Bot 允许 ping 的内容（安全默认值）
    everyone: false               # @everyone / @here pings（默认：false）
    roles: false                  # @role pings（默认：false）
    users: true                   # @user pings（默认：true）
    replied_user: true            # 回复引用 ping 作者（默认：true）

# 会话隔离（适用于所有 Gateway 平台，不仅限于 Discord）
group_sessions_per_user: true     # 在共享频道中按用户隔离会话
```

#### `discord.require_mention`

**类型：** 布尔值 — **默认：** `true`

启用后，Bot 仅在被直接 `@mentioned` 时响应服务器频道。私信始终响应，不受此设置影响。

#### `discord.free_response_channels`

**类型：** 字符串或列表 — **默认：** `""`

Bot 无需 `@mention` 即可响应所有消息的频道 ID。接受逗号分隔的字符串或 YAML 列表：

```yaml
# 字符串格式
discord:
  free_response_channels: "1234567890,9876543210"

# 列表格式
discord:
  free_response_channels:
    - 1234567890
    - 9876543210
```

如果线程的父频道在此列表中，该线程也变为免提及。

自由响应频道还会**跳过自动线程创建** — Bot 直接内联回复而不是为每条消息创建新线程。这保持频道作为轻量级聊天界面可用。如果你想要线程行为，不要将频道列为自由响应（改用普通的 `@mention` 流程）。

#### `discord.auto_thread`

**类型：** 布尔值 — **默认：** `true`

启用后，普通文字频道中的每个 `@mention` 会自动为对话创建新线程。这保持主频道整洁，并给每个对话独立的会话历史。线程创建后，该线程中的后续消息不需要 `@mention` — Bot 知道它已参与。

已有线程或私信中的消息不受此设置影响。列在 `discord.free_response_channels` 或 `discord.no_thread_channels` 中的频道也会跳过自动线程创建，改为内联回复。

#### `discord.reactions`

**类型：** 布尔值 — **默认：** `true`

控制 Bot 是否在消息上添加 emoji 反应作为视觉反馈：
- 👀 Bot 开始处理你的消息时添加
- ✅ 响应成功投递时添加
- ❌ 处理过程中发生错误时添加

如果你觉得反应干扰或 Bot 的角色没有 **Add Reactions** 权限，禁用此设置。

#### `discord.ignored_channels`

**类型：** 字符串或列表 — **默认：** `[]`

Bot **从不**响应的频道 ID，即使被直接 `@mentioned`。这具有最高优先级 — 如果频道在此列表中，Bot 静默忽略所有消息，不受 `require_mention`、`free_response_channels` 或任何其他设置影响。

```yaml
# 字符串格式
discord:
  ignored_channels: "1234567890,9876543210"

# 列表格式
discord:
  ignored_channels:
    - 1234567890
    - 9876543210
```

如果线程的父频道在此列表中，该线程中的消息也会被忽略。

#### `discord.no_thread_channels`

**类型：** 字符串或列表 — **默认：** `[]`

Bot 直接在频道中响应而非自动创建线程的频道 ID。仅在 `auto_thread` 为 `true`（默认）时有效。在这些频道中，Bot 像普通消息一样内联回复而非生成新线程。

```yaml
discord:
  no_thread_channels:
    - 1234567890  # Bot 在此处内联回复
```

适用于专门用于 Bot 交互的频道，线程会增加不必要的噪音。

#### `discord.channel_prompts`

**类型：** 映射 — **默认：** `{}`

按频道临时系统提示，在匹配的 Discord 频道或线程的每轮中注入，不会持久化到对话历史。

```yaml
discord:
  channel_prompts:
    "1234567890": |
      此频道用于研究任务。偏好深度比较、引用和简洁的综合。
    "9876543210": |
      此论坛用于心理治疗风格的支持。保持温暖、踏实和非评判性。
```

行为：
- 精确的线程/频道 ID 匹配优先。
- 如果消息到达线程或论坛帖子中，且该线程没有显式条目，Hermes 回退到父频道/论坛 ID。
- 提示在运行时临时应用，因此更改会立即影响后续轮次，不会重写过去的会话历史。

#### `group_sessions_per_user`

**类型：** 布尔值 — **默认：** `true`

这是一个全局 Gateway 设置（非 Discord 专用），控制同一频道中的用户是否获得隔离的会话历史。

为 `true` 时：Alice 和 Bob 在 `#research` 中与 Hermes 交谈，各自有独立的对话。为 `false` 时：整个频道共享一个对话记录和一个运行中 Agent 槽位。

```yaml
group_sessions_per_user: true
```

参见上方[会话模型](#session-model-in-discord)部分了解每种模式的完整影响。

#### `display.tool_progress`

**类型：** 字符串 — **默认：** `"all"` — **值：** `off`、`new`、`all`、`verbose`

控制 Bot 在处理时是否在聊天中发送进度消息（如 "Reading file..."、"Running terminal command..."）。这是适用于所有平台的全局 Gateway 设置。

```yaml
display:
  tool_progress: "all"    # off | new | all | verbose
```

- `off` — 无进度消息
- `new` — 仅显示每轮的第一个工具调用
- `all` — 显示所有工具调用（在 Gateway 消息中截断至 40 字符）
- `verbose` — 显示完整工具调用详情（可能产生较长消息）

#### `display.tool_progress_command`

**类型：** 布尔值 — **默认：** `false`

启用后，使 `/verbose` 斜杠命令在 Gateway 中可用，让你可以在工具进度模式间切换（`off → new → all → verbose → off`），无需编辑 config.yaml。

```yaml
display:
  tool_progress_command: true
```

## 交互式模型选择器

在 Discord 频道中发送不带参数的 `/model` 打开下拉式模型选择器：

1. **Provider 选择** — 显示可用 Provider 的 Select 下拉框（最多 25 个）。
2. **模型选择** — 第二个下拉框显示所选 Provider 的模型（最多 25 个）。

选择器在 120 秒后超时。只有授权用户（在 `DISCORD_ALLOWED_USERS` 中）可以交互。如果你知道模型名称，直接输入 `/model <name>`。

## Skill 的原生斜杠命令

Hermes 自动将已安装的 Skill 注册为**原生 Discord Application Commands**。这意味着 Skill 出现在 Discord 的自动补全 `/` 菜单中，与内置命令并列。

- 每个 Skill 成为 Discord 斜杠命令（如 `/code-review`、`/ascii-art`）
- Skill 接受可选的 `args` 字符串参数
- Discord 每个 Bot 限制 100 个应用命令 — 如果你安装的 Skill 超过可用槽位，额外的 Skill 会被跳过并在日志中发出警告
- Skill 在 Bot 启动时与 `/model`、`/reset`、`/background` 等内置命令一起注册

无需额外配置 — 任何通过 `hermes skills install` 安装的 Skill 会在下次 Gateway 重启时自动注册为 Discord 斜杠命令。

## 主频道

你可以指定一个"主频道"，Bot 在其中发送主动消息（如 Cron 任务输出、提醒和通知）。有两种设置方式：

### 使用斜杠命令

在 Bot 所在的任何 Discord 频道中输入 `/sethome`。该频道成为主频道。

### 手动配置

将这些添加到 `~/.hermes/.env`：

```bash
DISCORD_HOME_CHANNEL=123456789012345678
DISCORD_HOME_CHANNEL_NAME="#bot-updates"
```

将 ID 替换为实际的频道 ID（右键 → Copy Channel ID，需开启 Developer Mode）。

## 语音消息

Hermes Agent 支持 Discord 语音消息：

- **入站语音消息**使用配置的 STT Provider 自动转录：本地 `faster-whisper`（无需 Key）、Groq Whisper（`GROQ_API_KEY`）或 OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）。
- **文字转语音**：使用 `/voice tts` 让 Bot 在文本回复旁发送语音音频响应。
- **Discord 语音频道**：Hermes 还可以加入语音频道，听取用户说话并在频道中语音回复。

完整的设置和操作指南，参见：
- [语音模式](/docs/user-guide/features/voice-mode)
- [使用语音模式与 Hermes](/docs/guides/use-voice-mode-with-hermes)

## 论坛频道

Discord 论坛频道（类型 15）不接受直接消息 — 论坛中的每个帖子必须是一个线程。Hermes 自动检测论坛频道并在需要发送时创建新的线程帖子，因此 `send_message`、TTS、图片、语音消息和文件附件都无需特殊处理即可工作。

- **线程名称**从消息的第一行派生（去除 Markdown 标题前缀，上限 100 字符）。当消息仅包含附件时，使用文件名作为后备线程名称。
- **附件**随新线程的起始消息一起发送 — 无需单独上传步骤，无部分发送。
- **一次调用，一个线程**：每次论坛发送创建一个新线程。因此连续发送到同一论坛会产生独立的线程。
- **检测是三层的**：频道目录缓存优先，进程本地探测缓存其次，最后是实时的 `GET /channels/{id}` 探测（其结果随后在进程生命周期内被缓存）。

刷新目录（支持的平台上的 `/channels refresh`，或 Gateway 重启）会用 Bot 启动后创建的任何论坛频道填充缓存。

## 故障排除

### Bot 在线但不响应消息

**原因**：Message Content Intent 被禁用。

**解决方案**：前往[开发者门户](https://discord.com/developers/applications) → 你的应用 → Bot → Privileged Gateway Intents → 启用 **Message Content Intent** → Save Changes。重启 Gateway。

### 启动时"Disallowed Intents"错误

**原因**：你的代码请求了在开发者门户中未启用的 Intent。

**解决方案**：在 Bot 设置中启用所有三个 Privileged Gateway Intents（Presence、Server Members、Message Content），然后重启。

### Bot 无法看到特定频道中的消息

**原因**：Bot 的角色没有查看该频道的权限。

**解决方案**：在 Discord 中，进入频道的设置 → Permissions → 添加 Bot 的角色并启用 **View Channel** 和 **Read Message History**。

### 403 Forbidden 错误

**原因**：Bot 缺少必需权限。

**解决方案**：使用第 5 步中的 URL 以正确权限重新邀请 Bot，或在 Server Settings → Roles 中手动调整 Bot 的角色权限。

### Bot 离线

**原因**：Hermes Gateway 未运行，或 Token 不正确。

**解决方案**：检查 `hermes gateway` 是否在运行。验证 `.env` 文件中的 `DISCORD_BOT_TOKEN`。如果你最近重置了 Token，更新它。

### "User not allowed" / Bot 忽略你

**原因**：你的用户 ID 不在 `DISCORD_ALLOWED_USERS` 中。

**解决方案**：在 `~/.hermes/.env` 中将你的用户 ID 添加到 `DISCORD_ALLOWED_USERS` 并重启 Gateway。

### 同一频道的人意外共享上下文

**原因**：`group_sessions_per_user` 被禁用，或平台无法在该上下文中提供用户 ID。

**解决方案**：在 `~/.hermes/config.yaml` 中设置并重启 Gateway：

```yaml
group_sessions_per_user: true
```

如果你有意使用共享房间对话，保持关闭即可 — 只是预期共享对话历史和共享中断行为。

## 安全

:::warning
始终设置 `DISCORD_ALLOWED_USERS`（或 `DISCORD_ALLOWED_ROLES`）来限制谁可以与 Bot 交互。没有两者之一，Gateway 默认拒绝所有用户作为安全措施。只授权你信任的人 — 授权用户拥有 Agent 功能的完全访问权限，包括工具使用和系统访问。
:::

### 基于角色的访问控制

对于通过角色而非个人用户列表管理访问的服务器（管理员团队、支持人员、内部工具），使用 `DISCORD_ALLOWED_ROLES` — 逗号分隔的角色 ID 列表。拥有任一角色的成员被授权。

```bash
# ~/.hermes/.env — 与 DISCORD_ALLOWED_USERS 并用或替代
DISCORD_ALLOWED_ROLES=987654321098765432,876543210987654321
```

语义：

- **与用户白名单为 OR 关系。** 如果用户的 ID 在 `DISCORD_ALLOWED_USERS` 中**或**拥有 `DISCORD_ALLOWED_ROLES` 中的任一角色，即被授权。
- **自动启用 Server Members Intent。** 当设置 `DISCORD_ALLOWED_ROLES` 时，Bot 在连接时启用 Members Intent — Discord 发送成员记录中的角色信息需要此 Intent。
- **角色 ID，非名称。** 从 Discord 获取：**User Settings → Advanced → Developer Mode ON**，然后右键点击任何角色 → **Copy Role ID**。
- **私聊回退。** 在私聊中，角色检查扫描共同服务器；在任一共享服务器中拥有允许角色的用户在私聊中也被授权。

这是管理团队变动时的首选模式 — 新管理员在被授予角色时即刻获得访问权限，无需编辑 `.env` 或重启 Gateway。

### 提及控制

默认情况下，Hermes 阻止 Bot ping `@everyone`、`@here` 和角色提及，即使其回复包含这些 Token。这防止措辞不当的提示或回显的用户内容向整个服务器发送垃圾通知。个别 `@user` ping 和回复引用 ping（小的"replying to…"标签）保持启用，以便正常对话仍然有效。

你可以通过环境变量或 `config.yaml` 放宽这些默认值：

```yaml
# ~/.hermes/config.yaml
discord:
  allow_mentions:
    everyone: false      # 允许 Bot ping @everyone / @here
    roles: false         # 允许 Bot ping @role 提及
    users: true          # 允许 Bot ping 个别 @users
    replied_user: true   # 回复消息时 ping 作者
```

```bash
# ~/.hermes/.env — 环境变量优先于 config.yaml
DISCORD_ALLOW_MENTION_EVERYONE=false
DISCORD_ALLOW_MENTION_ROLES=false
DISCORD_ALLOW_MENTION_USERS=true
DISCORD_ALLOW_MENTION_REPLIED_USER=true
```

:::tip
除非你确切知道为什么需要，否则将 `everyone` 和 `roles` 保持在 `false`。LLM 很容易在看起来正常的响应中产生字符串 `@everyone`；没有此保护，那将通知你服务器的所有成员。
:::

有关保护 Hermes Agent 部署的更多信息，参见[安全指南](../security.md)。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/discord)
