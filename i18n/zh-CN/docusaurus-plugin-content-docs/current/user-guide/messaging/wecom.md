---
sidebar_position: 14
title: "企业微信（WeCom）"
description: "通过 AI Bot WebSocket 网关将 Hermes Agent 连接到企业微信"
---

# 企业微信（WeCom）

将 Hermes 连接到 [企业微信](https://work.weixin.qq.com/)（WeCom），腾讯的企业通讯平台。适配器使用企业微信的 AI Bot WebSocket 网关进行实时双向通信 — 无需公网端点或 Webhook。

## 前提条件

- 企业微信组织账号
- 在企业微信管理后台创建的 AI Bot
- Bot 凭据页面中的 Bot ID 和 Secret
- Python 包：`aiohttp` 和 `httpx`

## 设置

### 1. 创建 AI Bot

1. 登录[企业微信管理后台](https://work.weixin.qq.com/wework_admin/frame)
2. 进入 **应用管理** → **创建应用** → **AI Bot**
3. 配置 Bot 名称和描述
4. 从凭据页面复制 **Bot ID** 和 **Secret**

### 2. 配置 Hermes

运行交互式设置：

```bash
hermes gateway setup
```

选择 **企业微信** 并输入你的 Bot ID 和 Secret。

或在 `~/.hermes/.env` 中设置环境变量：

```bash
WECOM_BOT_ID=your-bot-id
WECOM_SECRET=your-secret

# 可选：限制访问
WECOM_ALLOWED_USERS=user_id_1,user_id_2

# 可选：主频道，用于 Cron 任务/通知
WECOM_HOME_CHANNEL=chat_id
```

### 3. 启动 Gateway

```bash
hermes gateway
```

## 功能特性

- **WebSocket 传输** — 持久连接，无需公网端点
- **私聊和群消息** — 可配置的访问策略
- **按群组发送者白名单** — 精细控制每个群中谁可以与 Bot 交互
- **媒体支持** — 图片、文件、语音、视频上传和下载
- **AES 加密媒体** — 自动解密入站附件
- **引用上下文** — 保留回复线程
- **Markdown 渲染** — 富文本响应
- **回复模式流式传输** — 将响应关联到入站消息上下文
- **自动重连** — 连接断开时指数退避

## 配置选项

在 `config.yaml` 的 `platforms.wecom.extra` 下设置：

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `bot_id` | — | 企业微信 AI Bot ID（必需） |
| `secret` | — | 企业微信 AI Bot Secret（必需） |
| `websocket_url` | `wss://openws.work.weixin.qq.com` | WebSocket 网关 URL |
| `dm_policy` | `open` | 私聊访问：`open`、`allowlist`、`disabled`、`pairing` |
| `group_policy` | `open` | 群聊访问：`open`、`allowlist`、`disabled` |
| `allow_from` | `[]` | 允许私聊的用户 ID（当 dm_policy=allowlist 时） |
| `group_allow_from` | `[]` | 允许的群 ID（当 group_policy=allowlist 时） |
| `groups` | `{}` | 按群组配置（见下文） |

## 访问策略

### 私聊策略

控制谁可以向 Bot 发送私聊消息：

| 值 | 行为 |
|-------|----------|
| `open` | 任何人都可以私聊 Bot（默认） |
| `allowlist` | 只有 `allow_from` 中的用户 ID 可以私聊 |
| `disabled` | 所有私聊被忽略 |
| `pairing` | 配对模式（用于初始设置） |

```bash
WECOM_DM_POLICY=allowlist
```

### 群聊策略

控制 Bot 在哪些群中响应：

| 值 | 行为 |
|-------|----------|
| `open` | Bot 在所有群中响应（默认） |
| `allowlist` | Bot 只在 `group_allow_from` 中列出的群 ID 中响应 |
| `disabled` | 所有群消息被忽略 |

```bash
WECOM_GROUP_POLICY=allowlist
```

### 按群组发送者白名单

要进行更精细的控制，你可以限制特定群内允许哪些用户与 Bot 交互。在 `config.yaml` 中配置：

```yaml
platforms:
  wecom:
    enabled: true
    extra:
      bot_id: "your-bot-id"
      secret: "your-secret"
      group_policy: "allowlist"
      group_allow_from:
        - "group_id_1"
        - "group_id_2"
      groups:
        group_id_1:
          allow_from:
            - "user_alice"
            - "user_bob"
        group_id_2:
          allow_from:
            - "user_charlie"
        "*":
          allow_from:
            - "user_admin"
```

**工作原理：**

1. `group_policy` 和 `group_allow_from` 控制决定群是否被允许。
2. 如果群通过了顶层检查，`groups.<group_id>.allow_from` 列表（如果存在）进一步限制该群内哪些发送者可以与 Bot 交互。
3. 通配符 `"*"` 群条目作为未明确列出的群的默认配置。
4. 白名单条目支持 `*` 通配符以允许所有用户，条目不区分大小写。
5. 条目可以选择使用 `wecom:user:` 或 `wecom:group:` 前缀格式 — 前缀会被自动去除。

如果没有为群配置 `allow_from`，则该群中的所有用户都被允许（假设群本身通过了顶层策略检查）。

## 媒体支持

### 入站（接收）

适配器接收用户的媒体附件并在本地缓存以供 Agent 处理：

| 类型 | 处理方式 |
|------|-----------------|
| **图片** | 下载并本地缓存。支持基于 URL 和 base64 编码的图片。 |
| **文件** | 下载并缓存。文件名从原始消息中保留。 |
| **语音** | 如果可用，提取语音消息文本转录。 |
| **混合消息** | 企业微信混合类型消息（文本 + 图片）会被解析并提取所有组件。 |

**引用消息：** 引用（回复）消息中的媒体也会被提取，因此 Agent 有用户回复内容的上下文。

### AES 加密媒体解密

企业微信使用 AES-256-CBC 加密某些入站媒体附件。适配器自动处理：

- 当入站媒体项包含 `aeskey` 字段时，适配器下载加密字节并使用 AES-256-CBC 和 PKCS#7 填充进行解密。
- AES 密钥是 `aeskey` 字段的 base64 解码值（必须恰好为 32 字节）。
- IV 从密钥的前 16 字节派生。
- 这需要 `cryptography` Python 包（`pip install cryptography`）。

无需配置 — 收到加密媒体时解密自动进行。

### 出站（发送）

| 方法 | 发送内容 | 大小限制 |
|--------|--------------|------------|
| `send` | Markdown 文本消息 | 4000 字符 |
| `send_image` / `send_image_file` | 原生图片消息 | 10 MB |
| `send_document` | 文件附件 | 20 MB |
| `send_voice` | 语音消息（仅 AMR 格式用于原生语音） | 2 MB |
| `send_video` | 视频消息 | 10 MB |

**分块上传：** 文件通过三步协议（初始化 → 分块 → 完成）以 512 KB 块上传。适配器自动处理。

**自动降级：** 当媒体超过原生类型的大小限制但低于绝对 20 MB 文件限制时，会自动作为通用文件附件发送：

- 图片 > 10 MB → 作为文件发送
- 视频 > 10 MB → 作为文件发送
- 语音 > 2 MB → 作为文件发送
- 非 AMR 音频 → 作为文件发送（企业微信仅支持 AMR 用于原生语音）

超过绝对 20 MB 限制的文件会被拒绝，并向聊天发送提示消息。

## 回复模式流式响应

当 Bot 通过企业微信回调收到消息时，适配器会记住入站请求 ID。如果在请求上下文仍然活跃时发送响应，适配器使用企业微信的回复模式（`aibot_respond_msg`）进行流式传输，将响应直接关联到入站消息。这在企业微信客户端中提供更自然的对话体验。

如果入站请求上下文已过期或不可用，适配器回退到通过 `aibot_send_msg` 主动发送消息。

回复模式也适用于媒体：上传的媒体可以作为对原始消息的回复发送。

## 连接和重连

适配器维护到企业微信网关 `wss://openws.work.weixin.qq.com` 的持久 WebSocket 连接。

### 连接生命周期

1. **连接：** 打开 WebSocket 连接并发送包含 bot_id 和 secret 的 `aibot_subscribe` 认证帧。
2. **心跳：** 每 30 秒发送应用层 ping 帧以保持连接活跃。
3. **监听：** 持续读取入站帧并分派消息回调。

### 重连行为

连接丢失时，适配器使用指数退避重连：

| 尝试 | 延迟 |
|---------|-------|
| 第 1 次 | 2 秒 |
| 第 2 次 | 5 秒 |
| 第 3 次 | 10 秒 |
| 第 4 次 | 30 秒 |
| 第 5 次及以后 | 60 秒 |

每次成功重连后，退避计数器重置为零。断开连接时所有待处理的请求 Future 都会失败，避免调用者无限等待。

### 去重

入站消息使用消息 ID 在 5 分钟窗口内去重，最大缓存 1000 条。这防止在重连或网络抖动期间重复处理消息。

## 所有环境变量

| 变量 | 必需 | 默认值 | 说明 |
|----------|----------|---------|-------------|
| `WECOM_BOT_ID` | ✅ | — | 企业微信 AI Bot ID |
| `WECOM_SECRET` | ✅ | — | 企业微信 AI Bot Secret |
| `WECOM_ALLOWED_USERS` | — | _（空）_ | Gateway 级别白名单的用户 ID，逗号分隔 |
| `WECOM_HOME_CHANNEL` | — | — | 用于 Cron/通知输出的聊天 ID |
| `WECOM_WEBSOCKET_URL` | — | `wss://openws.work.weixin.qq.com` | WebSocket 网关 URL |
| `WECOM_DM_POLICY` | — | `open` | 私聊访问策略 |
| `WECOM_GROUP_POLICY` | — | `open` | 群聊访问策略 |

## 故障排除

| 问题 | 解决方案 |
|---------|-----|
| `WECOM_BOT_ID and WECOM_SECRET are required` | 设置两个环境变量或在设置向导中配置 |
| `WeCom startup failed: aiohttp not installed` | 安装 aiohttp：`pip install aiohttp` |
| `WeCom startup failed: httpx not installed` | 安装 httpx：`pip install httpx` |
| `invalid secret (errcode=40013)` | 验证 Secret 与你的 Bot 凭据匹配 |
| `Timed out waiting for subscribe acknowledgement` | 检查到 `openws.work.weixin.qq.com` 的网络连接 |
| Bot 在群中不响应 | 检查 `group_policy` 设置并确保群 ID 在 `group_allow_from` 中 |
| Bot 忽略群中某些用户 | 检查 `groups` 配置部分中的按群 `allow_from` 列表 |
| 媒体解密失败 | 安装 `cryptography`：`pip install cryptography` |
| `cryptography is required for WeCom media decryption` | 入站媒体是 AES 加密的。安装：`pip install cryptography` |
| 语音消息作为文件发送 | 企业微信仅支持 AMR 格式用于原生语音。其他格式自动降级为文件。 |
| `File too large` 错误 | 企业微信对所有文件上传有 20 MB 绝对限制。请压缩或分割文件。 |
| 图片作为文件发送 | 图片 > 10 MB 超过原生图片限制，自动降级为文件附件。 |
| `Timeout sending message to WeCom` | WebSocket 可能已断开连接。查看日志中的重连消息。 |
| `WeCom websocket closed during authentication` | 网络问题或凭据不正确。验证 bot_id 和 secret。 |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/wecom)
