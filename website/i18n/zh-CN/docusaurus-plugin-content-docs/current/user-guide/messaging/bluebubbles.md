# BlueBubbles（iMessage）

通过 [BlueBubbles](https://bluebubbles.app/) 将 Hermes 连接到 Apple iMessage —— BlueBubbles 是一个免费、开源的 macOS 服务器，可将 iMessage 桥接到任何设备。

## 前提条件

- 一台**Mac**（始终在线），运行 [BlueBubbles Server](https://bluebubbles.app/)
- 该 Mac 上的 Messages.app 已登录 Apple ID
- BlueBubbles Server v1.0.0+（Webhook 需要此版本）
- Hermes 与 BlueBubbles 服务器之间的网络连通性

## 设置

### 1. 安装 BlueBubbles Server

从 [bluebubbles.app](https://bluebubbles.app/) 下载并安装。完成设置向导 —— 使用你的 Apple ID 登录并配置连接方式（局域网、Ngrok、Cloudflare 或动态 DNS）。

### 2. 获取服务器 URL 和密码

在 BlueBubbles Server 中进入 **Settings → API**，记下：
- **Server URL**（服务器地址，例如 `http://192.168.1.10:1234`）
- **Server Password**（服务器密码）

### 3. 配置 Hermes

运行设置向导：

```bash
hermes gateway setup
```

选择 **BlueBubbles (iMessage)**，输入你的服务器 URL 和密码。

或者直接在 `~/.hermes/.env` 中设置环境变量：

```bash
BLUEBUBBLES_SERVER_URL=http://192.168.1.10:1234
BLUEBUBBLES_PASSWORD=你的服务器密码
```

### 4. 授权用户

选择一种方式：

**私聊配对（推荐）：**
当有人向你的 iMessage 发送消息时，Hermes 会自动发送配对码。使用以下命令批准：
```bash
hermes pairing approve bluebubbles <CODE>
```
使用 `hermes pairing list` 查看待处理的配对码和已批准的用户。

**预授权特定用户**（在 `~/.hermes/.env` 中）：
```bash
BLUEBUBBLES_ALLOWED_USERS=user@icloud.com,+15551234567
```

**开放访问**（在 `~/.hermes/.env` 中）：
```bash
BLUEBUBBLES_ALLOW_ALL_USERS=true
```

### 5. 启动网关

```bash
hermes gateway run
```

Hermes 将连接到你的 BlueBubbles 服务器，注册一个 Webhook（网络钩子），并开始监听 iMessage 消息。

## 工作原理

```
iMessage → Messages.app → BlueBubbles Server → Webhook → Hermes
Hermes → BlueBubbles REST API → Messages.app → iMessage
```

- **入站：** BlueBubbles 在收到新消息时向本地监听器发送 Webhook 事件。无需轮询 —— 即时送达。
- **出站：** Hermes 通过 BlueBubbles REST API 发送消息。
- **媒体：** 双向支持图片、语音消息、视频和文档。入站附件会被下载并本地缓存，供 Agent 处理。

## 环境变量

| 变量 | 必填 | 默认值 | 描述 |
|----------|----------|---------|-------------|
| `BLUEBUBBLES_SERVER_URL` | 是 | — | BlueBubbles 服务器 URL |
| `BLUEBUBBLES_PASSWORD` | 是 | — | 服务器密码 |
| `BLUEBUBBLES_WEBHOOK_HOST` | 否 | `127.0.0.1` | Webhook 监听器绑定地址 |
| `BLUEBUBBLES_WEBHOOK_PORT` | 否 | `8645` | Webhook 监听器端口 |
| `BLUEBUBBLES_WEBHOOK_PATH` | 否 | `/bluebubbles-webhook` | Webhook URL 路径 |
| `BLUEBUBBLES_HOME_CHANNEL` | 否 | — | 用于 Cron（定时任务）推送的电话号码/邮箱 |
| `BLUEBUBBLES_ALLOWED_USERS` | 否 | — | 逗号分隔的授权用户 |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | 否 | `false` | 允许所有用户 |
| `BLUEBUBBLES_SEND_READ_RECEIPTS` | 否 | `true` | 自动标记消息为已读 |

## 功能特性

### 文本消息
发送和接收 iMessage。Markdown 会被自动清除，以干净的纯文本形式发送。

### 富媒体
- **图片：** 照片在 iMessage 对话中原生显示
- **语音消息：** 音频文件以 iMessage 语音消息形式发送
- **视频：** 视频附件
- **文档：** 文件以 iMessage 附件形式发送

### Tapback 回应
爱心、点赞、踩、哈哈、强调和问号回应。需要安装 BlueBubbles [Private API helper（私有 API 助手）](https://docs.bluebubbles.app/helper-bundle/installation)。

### 正在输入指示器
在 Agent 处理消息期间，iMessage 对话中会显示"正在输入..."。需要 Private API。

### 已读回执
处理完成后自动将消息标记为已读。需要 Private API。

### 聊天地址
你可以通过邮箱或电话号码指定聊天对象 —— Hermes 会自动将它们解析为 BlueBubbles 的聊天 GUID。无需使用原始 GUID 格式。

## Private API（私有 API）

部分功能需要安装 BlueBubbles [Private API helper（私有 API 助手）](https://docs.bluebubbles.app/helper-bundle/installation)：
- Tapback 回应
- 正在输入指示器
- 已读回执
- 通过地址创建新聊天

没有 Private API，基本文本消息和媒体功能仍然可用。

## 故障排除

### "无法连接到服务器"
- 验证服务器 URL 是否正确，Mac 是否已开机
- 检查 BlueBubbles Server 是否正在运行
- 确保网络连通性（防火墙、端口转发）

### 消息未到达
- 检查 Webhook 是否已在 BlueBubbles Server → Settings → API → Webhooks 中注册
- 验证 Webhook URL 是否可从 Mac 访问
- 检查 `hermes logs gateway` 中的 Webhook 错误（或使用 `hermes logs -f` 实时跟踪）

### "Private API helper 未连接"
- 安装 Private API helper：[docs.bluebubbles.app](https://docs.bluebubbles.app/helper-bundle/installation)
- 没有它基本消息功能仍然可用 —— 只有回应、输入指示和已读回执需要它

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/bluebubbles)
