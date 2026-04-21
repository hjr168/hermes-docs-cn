---
sidebar_position: 8
title: "Mattermost"
description: "将 Hermes Agent 设置为 Mattermost Bot"
---

# Mattermost 设置

Hermes Agent 作为 Bot 与 Mattermost 集成，让你通过私信或团队频道与 AI 助手聊天。Mattermost 是一个自托管的开源 Slack 替代方案 — 你在自己的基础设施上运行它，完全控制你的数据。Bot 通过 Mattermost 的 REST API（v4）和 WebSocket 连接实时事件，通过 Hermes Agent 管道处理消息（包括工具使用、记忆和推理），并实时响应。它支持文本、文件附件、图片和斜杠命令。

无需外部 Mattermost 库 — 适配器使用 `aiohttp`，它已经是 Hermes 的依赖。

在设置之前，先了解大多数人最关心的部分：Hermes 在你的 Mattermost 实例中的行为。

## Hermes 的行为

| 上下文 | 行为 |
|---------|----------|
| **私信** | Hermes 响应每条消息。无需 `@mention`。每个私信有独立的会话。 |
| **公共/私有频道** | Hermes 在你 `@mention` 它时响应。没有提及，Hermes 忽略消息。 |
| **线程** | 如果设置了 `MATTERMOST_REPLY_MODE=thread`，Hermes 在你的消息下方的线程中回复。线程上下文与父频道隔离。 |
| **多用户共享频道** | 默认情况下，Hermes 在频道内按用户隔离会话历史。两个在同一频道中与 Hermes 交谈的人不会共享一个对话记录，除非你明确禁用此功能。 |

:::tip
如果你希望 Hermes 以线程对话方式回复（嵌套在你的原始消息下），设置 `MATTERMOST_REPLY_MODE=thread`。默认为 `off`，在频道中发送平面消息。
:::

### Mattermost 中的会话模型

默认情况下：

- 每个私信有自己的会话
- 每个线程有自己的会话命名空间
- 共享频道中的每个用户在该频道内有自己的会话

这通过 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅在你明确希望整个频道共享一个对话时设为 `false`：

```yaml
group_sessions_per_user: false
```

共享会话对协作频道有用，但也意味着：

- 用户共享上下文增长和 Token 费用
- 一个人的长时间工具密集任务会膨胀其他所有人的上下文
- 一个人的运行中任务可以中断另一个人的后续消息

本指南将带你完成完整的设置过程 — 从在 Mattermost 上创建 Bot 到发送你的第一条消息。

## 第 1 步：启用 Bot 账户

在创建 Bot 之前，必须在你的 Mattermost 服务器上启用 Bot 账户功能。

1. 以 **System Admin** 身份登录 Mattermost。
2. 进入 **System Console** → **Integrations** → **Bot Accounts**。
3. 将 **Enable Bot Account Creation** 设为 **true**。
4. 点击 **Save**。

:::info
如果你没有 System Admin 权限，请你的 Mattermost 管理员启用 Bot 账户并为你创建一个。
:::

## 第 2 步：创建 Bot 账户

1. 在 Mattermost 中，点击 **☰** 菜单（左上角）→ **Integrations** → **Bot Accounts**。
2. 点击 **Add Bot Account**。
3. 填写详情：
   - **Username**：如 `hermes`
   - **Display Name**：如 `Hermes Agent`
   - **Description**：可选
   - **Role**：`Member` 即可
4. 点击 **Create Bot Account**。
5. Mattermost 会显示 **Bot Token**。**立即复制它。**

:::warning[Token 仅显示一次]
Bot Token 仅在创建 Bot 账户时显示一次。如果丢失，需要从 Bot 账户设置中重新生成。永远不要公开分享你的 Token 或提交到 Git — 拥有此 Token 的人可以完全控制 Bot。
:::

将 Token 存储在安全的地方（如密码管理器）。第 5 步会用到。

:::tip
你也可以使用**个人访问令牌**替代 Bot 账户。进入 **Profile** → **Security** → **Personal Access Tokens** → **Create Token**。这在你希望 Hermes 以你的身份而非独立 Bot 用户发布时有用。
:::

## 第 3 步：将 Bot 添加到频道

Bot 需要成为你希望它响应的任何频道的成员：

1. 打开你希望 Bot 加入的频道。
2. 点击频道名称 → **Add Members**。
3. 搜索你的 Bot 用户名（如 `hermes`）并添加。

对于私信，只需打开与 Bot 的私信 — 它可以立即响应。

## 第 4 步：查找你的 Mattermost 用户 ID

Hermes Agent 使用你的 Mattermost 用户 ID 来控制谁可以与 Bot 交互。查找方法：

1. 点击你的**头像**（左上角）→ **Profile**。
2. 你的用户 ID 显示在资料对话框中 — 点击它即可复制。

你的用户 ID 是一个 26 字符的字母数字字符串，如 `3uo8dkh1p7g1mfk49ear5fzs5c`。

:::warning
你的用户 ID **不是**你的用户名。用户名是 `@` 后面的内容（如 `@alice`）。用户 ID 是 Mattermost 内部使用的长字母数字标识符。
:::

**替代方案**：你也可以通过 API 获取用户 ID：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-mattermost-server/api/v4/users/me | jq .id
```

:::tip
要获取**频道 ID**：点击频道名称 → **View Info**。频道 ID 显示在信息面板中。如果你想手动设置主频道，会需要这个。
:::

## 第 5 步：配置 Hermes Agent

### 方案 A：交互式设置（推荐）

运行引导设置命令：

```bash
hermes gateway setup
```

在提示时选择 **Mattermost**，然后粘贴你的服务器 URL、Bot Token 和用户 ID。

### 方案 B：手动配置

将以下内容添加到你的 `~/.hermes/.env` 文件：

```bash
# 必需
MATTERMOST_URL=https://mm.example.com
MATTERMOST_TOKEN=***
MATTERMOST_ALLOWED_USERS=3uo8dkh1p7g1mfk49ear5fzs5c

# 多个允许的用户（逗号分隔）
# MATTERMOST_ALLOWED_USERS=3uo8dkh1p7g1mfk49ear5fzs5c,8fk2jd9s0a7bncm1xqw4tp6r3e

# 可选：回复模式（thread 或 off，默认：off）
# MATTERMOST_REPLY_MODE=thread

# 可选：无需 @mention 即可响应（默认：true = 需要提及）
# MATTERMOST_REQUIRE_MENTION=false

# 可选：Bot 无需 @mention 即可响应的频道（逗号分隔的频道 ID）
# MATTERMOST_FREE_RESPONSE_CHANNELS=channel_id_1,channel_id_2
```

在 `~/.hermes/config.yaml` 中的可选行为设置：

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` 保持每个参与者的上下文在共享频道和线程中隔离

### 启动 Gateway

配置完成后，启动 Mattermost Gateway：

```bash
hermes gateway
```

Bot 应该在几秒内连接到你的 Mattermost 服务器。发送一条消息 — 私信或它已被添加的频道中 — 来测试。

:::tip
你可以在后台或作为 systemd 服务运行 `hermes gateway` 以保持持久运行。详见部署文档。
:::

## 主频道

你可以指定一个"主频道"，Bot 在其中发送主动消息（如 Cron 任务输出、提醒和通知）。有两种设置方式：

### 使用斜杠命令

在 Bot 所在的任何 Mattermost 频道中输入 `/sethome`。该频道成为主频道。

### 手动配置

将此添加到 `~/.hermes/.env`：

```bash
MATTERMOST_HOME_CHANNEL=abc123def456ghi789jkl012mn
```

将 ID 替换为实际的频道 ID（点击频道名称 → View Info → 复制 ID）。

## 回复模式

`MATTERMOST_REPLY_MODE` 设置控制 Hermes 如何发布响应：

| 模式 | 行为 |
|------|----------|
| `off`（默认） | Hermes 在频道中发布平面消息，像普通用户一样。 |
| `thread` | Hermes 在你的原始消息下方的线程中回复。在有大量来回对话时保持频道整洁。 |

在 `~/.hermes/.env` 中设置：

```bash
MATTERMOST_REPLY_MODE=thread
```

## 提及行为

默认情况下，Bot 仅在被 `@mentioned` 时响应频道消息。你可以更改此设置：

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `MATTERMOST_REQUIRE_MENTION` | `true` | 设为 `false` 可响应频道中的所有消息（私信始终工作）。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | _（无）_ | Bot 无需 `@mention` 即可响应的频道 ID，逗号分隔，即使 require_mention 为 true。 |

在 Mattermost 中查找频道 ID：打开频道，点击频道名称标题，在 URL 或频道详情中查找 ID。

当 Bot 被 `@mentioned` 时，提及会在处理前从消息中自动去除。

## 故障排除

### Bot 不响应消息

**原因**：Bot 不是频道的成员，或 `MATTERMOST_ALLOWED_USERS` 未包含你的用户 ID。

**解决方案**：将 Bot 添加到频道（频道名称 → Add Members → 搜索 Bot）。验证你的用户 ID 在 `MATTERMOST_ALLOWED_USERS` 中。重启 Gateway。

### 403 Forbidden 错误

**原因**：Bot Token 无效，或 Bot 没有在频道中发消息的权限。

**解决方案**：检查 `.env` 文件中的 `MATTERMOST_TOKEN` 是否正确。确保 Bot 账户未被停用。验证 Bot 已被添加到频道。如果使用个人访问令牌，确保你的账户有所需权限。

### WebSocket 断开 / 重连循环

**原因**：网络不稳定、Mattermost 服务器重启或防火墙/代理的 WebSocket 连接问题。

**解决方案**：适配器使用指数退避自动重连（2s → 60s）。检查服务器的 WebSocket 配置 — 反向代理（nginx、Apache）需要配置 WebSocket 升级头。验证没有防火墙阻止你 Mattermost 服务器上的 WebSocket 连接。

对于 nginx，确保配置包含：

```nginx
location /api/v4/websocket {
    proxy_pass http://mattermost-backend;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 600s;
}
```

### 启动时"Failed to authenticate"

**原因**：Token 或服务器 URL 不正确。

**解决方案**：验证 `MATTERMOST_URL` 指向你的 Mattermost 服务器（包含 `https://`，无尾部斜杠）。检查 `MATTERMOST_TOKEN` 是否有效 — 用 curl 测试：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/api/v4/users/me
```

如果返回你的 Bot 用户信息，Token 有效。如果返回错误，重新生成 Token。

### Bot 离线

**原因**：Hermes Gateway 未运行，或连接失败。

**解决方案**：检查 `hermes gateway` 是否在运行。查看终端输出中的错误消息。常见问题：错误的 URL、过期的 Token、Mattermost 服务器不可达。

### "User not allowed" / Bot 忽略你

**原因**：你的用户 ID 不在 `MATTERMOST_ALLOWED_USERS` 中。

**解决方案**：在 `~/.hermes/.env` 中将你的用户 ID 添加到 `MATTERMOST_ALLOWED_USERS` 并重启 Gateway。记住：用户 ID 是一个 26 字符的字母数字字符串，不是你的 `@username`。

## 按频道提示

为特定 Mattermost 频道分配临时系统提示。提示在每轮运行时注入 — 永远不会持久化到对话历史 — 因此更改立即生效。

```yaml
mattermost:
  channel_prompts:
    "channel_id_abc123": |
      你是研究助手。专注于学术来源、引用和简洁的综合。
    "channel_id_def456": |
      代码审查模式。精确处理边界情况和性能影响。
```

键是 Mattermost 频道 ID（在频道 URL 中或通过 API 查找）。匹配频道中的所有消息都会获得提示作为临时系统指令注入。

## 安全

:::warning
始终设置 `MATTERMOST_ALLOWED_USERS` 来限制谁可以与 Bot 交互。没有它，Gateway 默认拒绝所有用户作为安全措施。只添加你信任的人的用户 ID — 授权用户拥有 Agent 功能的完全访问权限，包括工具使用和系统访问。
:::

有关保护 Hermes Agent 部署的更多信息，参见[安全指南](../security.md)。

## 备注

- **自托管友好**：适用于任何自托管的 Mattermost 实例。无需 Mattermost Cloud 账户或订阅。
- **无额外依赖**：适配器使用 `aiohttp` 进行 HTTP 和 WebSocket 通信，已包含在 Hermes Agent 中。
- **Team Edition 兼容**：同时支持 Mattermost Team Edition（免费）和 Enterprise Edition。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/mattermost)
