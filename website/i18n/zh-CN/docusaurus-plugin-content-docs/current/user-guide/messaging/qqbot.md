# QQ Bot

通过**官方 QQ Bot API（v2）**将 Hermes 连接到 QQ —— 支持私聊（C2C）、群 @提及、频道和直接消息，以及语音转文字功能。

## 概述

QQ Bot 适配器使用[官方 QQ Bot API](https://bot.q.qq.com/wiki/develop/api-v2/) 实现：

- 通过持久的 **WebSocket（全双工通信协议）** 连接到 QQ 网关接收消息
- 通过 **REST API** 发送文本和 Markdown 回复
- 下载并处理图片、语音消息和文件附件
- 使用腾讯内置的 ASR（自动语音识别）或可配置的 STT（语音转文字）服务转录语音消息

## 前提条件

1. **QQ Bot 应用** — 在 [q.qq.com](https://q.qq.com) 注册：
   - 创建新应用，记下你的 **App ID** 和 **App Secret**
   - 启用所需的意图（Intents）：C2C 消息、群 @消息、频道消息
   - 在沙箱模式下配置你的机器人进行测试，或发布到生产环境

2. **依赖** — 适配器需要 `aiohttp` 和 `httpx`：
   ```bash
   pip install aiohttp httpx
   ```

## 配置

### 交互式设置

```bash
hermes gateway setup
```

从平台列表中选择 **QQ Bot**，然后按照提示操作。

### 手动配置

在 `~/.hermes/.env` 中设置所需的环境变量：

```bash
QQ_APP_ID=你的应用ID
QQ_CLIENT_SECRET=你的应用密钥
```

## 环境变量

| 变量 | 描述 | 默认值 |
|---|---|---|
| `QQ_APP_ID` | QQ Bot App ID（必填） | — |
| `QQ_CLIENT_SECRET` | QQ Bot App Secret（必填） | — |
| `QQBOT_HOME_CHANNEL` | 用于 Cron（定时任务）/通知推送的 OpenID | — |
| `QQBOT_HOME_CHANNEL_NAME` | 主频道的显示名称 | `Home` |
| `QQ_ALLOWED_USERS` | 逗号分隔的用户 OpenID，用于私聊访问控制 | 开放（所有用户） |
| `QQ_ALLOW_ALL_USERS` | 设为 `true` 允许所有私聊 | `false` |
| `QQ_SANDBOX` | 将请求路由到 QQ 沙箱网关，用于开发测试 | `false` |
| `QQ_STT_API_KEY` | 语音转文字服务的 API 密钥 | — |
| `QQ_STT_BASE_URL` | STT 服务的 Base URL | `https://open.bigmodel.cn/api/coding/paas/v4` |
| `QQ_STT_MODEL` | STT 模型名称 | `glm-asr` |

## 高级配置

如需更精细的控制，可在 `~/.hermes/config.yaml` 中添加平台设置：

```yaml
platforms:
  qq:
    enabled: true
    extra:
      app_id: "你的应用ID"
      client_secret: "你的密钥"
      markdown_support: true       # 启用 QQ Markdown（msg_type 2）。仅配置文件设置；无对应环境变量
      dm_policy: "open"          # open | allowlist | disabled
      allow_from:
        - "user_openid_1"
      group_policy: "open"       # open | allowlist | disabled
      group_allow_from:
        - "group_openid_1"
      stt:
        provider: "zai"          # zai（GLM-ASR），openai（Whisper）等
        baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4"
        apiKey: "你的STT密钥"
        model: "glm-asr"
```

## 语音消息（STT）

语音转文字分两个阶段工作：

1. **QQ 内置 ASR**（免费，始终优先尝试）— QQ 在语音消息附件中提供 `asr_refer_text`，使用腾讯自有的语音识别
2. **配置的 STT 服务**（备选方案）— 如果 QQ 的 ASR 未返回文本，适配器会调用 OpenAI 兼容的 STT API：

   - **智谱/GLM（zai）**：默认服务，使用 `glm-asr` 模型
   - **OpenAI Whisper**：设置 `QQ_STT_BASE_URL` 和 `QQ_STT_MODEL`
   - 任何 OpenAI 兼容的 STT 端点

## 故障排除

### 机器人立即断开连接（快速断连）

通常意味着：
- **无效的 App ID / Secret** — 在 q.qq.com 上仔细检查你的凭据
- **缺少权限** — 确保机器人已启用所需的意图
- **仅沙箱模式** — 如果机器人处于沙箱模式，它只能接收来自 QQ 沙箱测试频道的消息

### 语音消息未转录

1. 检查 QQ 内置的 `asr_refer_text` 是否存在于附件数据中
2. 如果使用自定义 STT 服务，请验证 `QQ_STT_API_KEY` 设置正确
3. 检查网关日志中的 STT 错误消息

### 消息未送达

- 验证机器人的**意图**已在 q.qq.com 上启用
- 如果私聊访问受限，请检查 `QQ_ALLOWED_USERS`
- 对于群消息，确保机器人被 **@提及**（群策略可能需要白名单）
- 检查 `QQBOT_HOME_CHANNEL` 用于 Cron（定时任务）/通知推送

### 连接错误

- 确保 `aiohttp` 和 `httpx` 已安装：`pip install aiohttp httpx`
- 检查到 `api.sgroup.qq.com` 和 WebSocket 网关的网络连通性
- 查看网关日志以获取详细的错误消息和重连行为

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/qqbot)
