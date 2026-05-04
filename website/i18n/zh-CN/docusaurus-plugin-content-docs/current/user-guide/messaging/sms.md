---
sidebar_position: 8
sidebar_label: "短信（Twilio）"
title: "短信（Twilio）"
description: "通过 Twilio 将 Hermes Agent 设置为短信聊天机器人"
---

# 短信设置（Twilio）

Hermes 通过 [Twilio](https://www.twilio.com/) API 连接到短信服务。人们向你的 Twilio 电话号码发送短信即可获得 AI 回复 —— 与 Telegram 或 Discord 相同的对话体验，但通过标准短信传输。

:::info 共享凭据
短信网关与可选的[电话技能](/docs/reference/skills-catalog)共享凭据。如果你已经为语音通话或一次性短信设置了 Twilio，网关可以使用相同的 `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_PHONE_NUMBER`。
:::

---

## 前提条件

- **Twilio 账号** — [在 twilio.com 注册](https://www.twilio.com/try-twilio)（有免费试用）
- **一个支持短信功能的 Twilio 电话号码**
- **一个公网可访问的服务器** — Twilio 在收到短信时向你的服务器发送 Webhook（网络钩子）
- **aiohttp** — `pip install 'hermes-agent[sms]'`

---

## 第 1 步：获取你的 Twilio 凭据

1. 前往 [Twilio 控制台](https://console.twilio.com/)
2. 从仪表板复制你的 **Account SID** 和 **Auth Token**
3. 前往 **Phone Numbers → Manage → Active Numbers** — 记下你的电话号码（E.164 格式，例如 `+15551234567`）

---

## 第 2 步：配置 Hermes

### 交互式设置（推荐）

```bash
hermes gateway setup
```

从平台列表中选择 **SMS (Twilio)**。向导会提示你输入凭据。

### 手动设置

添加到 `~/.hermes/.env`：

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=你的认证令牌
TWILIO_PHONE_NUMBER=+15551234567

# 安全设置：限制特定电话号码（推荐）
SMS_ALLOWED_USERS=+15559876543,+15551112222

# 可选：设置 Cron（定时任务）投递的主频道
SMS_HOME_CHANNEL=+15559876543
```

---

## 第 3 步：配置 Twilio Webhook

Twilio 需要知道将收到的消息发送到哪里。在 [Twilio 控制台](https://console.twilio.com/)中：

1. 前往 **Phone Numbers → Manage → Active Numbers**
2. 点击你的电话号码
3. 在 **Messaging → A MESSAGE COMES IN** 下，设置：
   - **Webhook**：`https://your-server:8080/webhooks/twilio`
   - **HTTP Method**：`POST`

:::tip 暴露你的 Webhook
如果你在本地运行 Hermes，可以使用隧道来暴露 Webhook：

```bash
# 使用 cloudflared
cloudflared tunnel --url http://localhost:8080

# 使用 ngrok
ngrok http 8080
```

将生成的公网 URL 设置为你的 Twilio Webhook。
:::

**将 `SMS_WEBHOOK_URL` 设置为与你在 Twilio 中配置的相同 URL。** 这是 Twilio 签名验证所必需的 —— 没有它适配器将拒绝启动：

```bash
# 必须与你在 Twilio 控制台中配置的 Webhook URL 匹配
SMS_WEBHOOK_URL=https://your-server:8080/webhooks/twilio
```

Webhook 端口默认为 `8080`。可通过以下方式覆盖：

```bash
SMS_WEBHOOK_PORT=3000
```

---

## 第 4 步：启动网关

```bash
hermes gateway
```

你应该看到：

```
[sms] Twilio webhook server listening on 0.0.0.0:8080, from: +1555***4567
```

如果你看到 `Refusing to start: SMS_WEBHOOK_URL is required`，请将 `SMS_WEBHOOK_URL` 设置为你在 Twilio 控制台中配置的公网 URL（参见第 3 步）。

向你的 Twilio 号码发送短信 —— Hermes 会通过短信回复。

---

## 环境变量

| 变量 | 必填 | 描述 |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | 是 | Twilio Account SID（以 `AC` 开头） |
| `TWILIO_AUTH_TOKEN` | 是 | Twilio Auth Token（也用于 Webhook 签名验证） |
| `TWILIO_PHONE_NUMBER` | 是 | 你的 Twilio 电话号码（E.164 格式） |
| `SMS_WEBHOOK_URL` | 是 | 用于 Twilio 签名验证的公网 URL —— 必须与 Twilio 控制台中的 Webhook URL 匹配 |
| `SMS_WEBHOOK_PORT` | 否 | Webhook 监听器端口（默认：`8080`） |
| `SMS_WEBHOOK_HOST` | 否 | Webhook 绑定地址（默认：`0.0.0.0`） |
| `SMS_INSECURE_NO_SIGNATURE` | 否 | 设为 `true` 禁用签名验证（仅限本地开发 —— **不可用于生产环境**） |
| `SMS_ALLOWED_USERS` | 否 | 逗号分隔的 E.164 格式电话号码，允许与之聊天 |
| `SMS_ALLOW_ALL_USERS` | 否 | 设为 `true` 允许任何人（不推荐） |
| `SMS_HOME_CHANNEL` | 否 | 用于 Cron（定时任务）/通知推送的电话号码 |
| `SMS_HOME_CHANNEL_NAME` | 否 | 主频道的显示名称（默认：`Home`） |

---

## 短信特有行为

- **仅纯文本** — Markdown 会被自动清除，因为短信会将其作为字面字符渲染
- **1600 字符限制** — 较长的回复会在自然边界处（换行符，然后是空格）分割为多条消息
- **回声防护** — 来自你自己 Twilio 号码的消息会被忽略，以防止循环
- **电话号码脱敏** — 电话号码在日志中会被脱敏处理以保护隐私

---

## 安全

### Webhook 签名验证

Hermes 通过验证 `X-Twilio-Signature` 头部（HMAC-SHA1）来确认入站 Webhook 确实来自 Twilio。这可以防止攻击者注入伪造消息。

**`SMS_WEBHOOK_URL` 是必需的。** 将其设置为你 Twilio 控制台中配置的公网 URL。没有它适配器将拒绝启动。

对于没有公网 URL 的本地开发，你可以禁用验证：

```bash
# 仅限本地开发 —— 不可用于生产环境
SMS_INSECURE_NO_SIGNATURE=true
```

### 用户白名单

**网关默认拒绝所有用户。** 请配置白名单：

```bash
# 推荐：限制特定电话号码
SMS_ALLOWED_USERS=+15559876543,+15551112222

# 或允许所有人（对于拥有终端访问权限的 Bot 不推荐）
SMS_ALLOW_ALL_USERS=true
```

:::warning
短信没有内置加密。除非你了解安全影响，否则不要使用短信进行敏感操作。对于敏感用例，建议使用 Signal 或 Telegram。
:::

---

## 故障排除

### 消息未到达

1. 检查你的 Twilio Webhook URL 是否正确且可公网访问
2. 验证 `TWILIO_ACCOUNT_SID` 和 `TWILIO_AUTH_TOKEN` 是否正确
3. 检查 Twilio 控制台 → **Monitor → Logs → Messaging** 中的投递错误
4. 确保你的电话号码在 `SMS_ALLOWED_USERS` 中（或设置 `SMS_ALLOW_ALL_USERS=true`）

### 回复发送失败

1. 检查 `TWILIO_PHONE_NUMBER` 是否设置正确（E.164 格式，带 `+` 前缀）
2. 验证你的 Twilio 账号是否有支持短信的号码
3. 检查 Hermes 网关日志中的 Twilio API 错误

### Webhook 端口冲突

如果端口 8080 已被占用，请更改：

```bash
SMS_WEBHOOK_PORT=3001
```

并更新 Twilio 控制台中的 Webhook URL 以匹配。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/sms)
