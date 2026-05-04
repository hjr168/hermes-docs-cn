---
sidebar_position: 10
title: "钉钉"
description: "将 Hermes Agent 设置为钉钉机器人"
---

# 钉钉设置

Hermes Agent 作为聊天机器人集成到钉钉中，让你可以通过私聊或群聊与 AI 助手对话。Bot 通过钉钉的 Stream 模式（Stream Mode）连接 — 一种长连接 WebSocket 连接，无需公网 URL 或 Webhook 服务器 — 并通过钉钉的会话 Webhook API 回复 Markdown 格式消息。

在开始设置之前，先了解大多数人关心的问题：Hermes 进入你的钉钉工作区后如何运作。

## Hermes 的行为

| 场景 | 行为 |
|------|------|
| **私聊（1:1）** | Hermes 回复每条消息。无需 `@提及`。每个私聊有独立会话。 |
| **群聊** | Hermes 在被 `@提及` 时回复。未被提及时，Hermes 忽略消息。 |
| **多用户共享群** | 默认情况下，Hermes 在群内按用户隔离会话历史。同一群中两人对话不会共享同一转录，除非你明确禁用。 |

### 钉钉中的会话模型

默认情况下：

- 每个私聊获得独立会话
- 共享群聊中每个用户在该群内获得独立会话

这由 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅在你明确希望整个群共享一个对话时设为 `false`：

```yaml
group_sessions_per_user: false
```

本指南将带你完成从创建钉钉 Bot 到发送第一条消息的完整设置流程。

## 前提条件

安装所需的 Python 包：

```bash
pip install "hermes-agent[dingtalk]"
```

或单独安装：

```bash
pip install dingtalk-stream httpx alibabacloud-dingtalk
```

- `dingtalk-stream` — 钉钉官方 Stream 模式 SDK（基于 WebSocket 的实时消息）
- `httpx` — 用于通过会话 Webhook 发送回复的异步 HTTP 客户端
- `alibabacloud-dingtalk` — 钉钉 OpenAPI SDK，用于 AI 卡片、表情回复和媒体下载

## 步骤 1：创建钉钉应用

1. 前往[钉钉开发者后台](https://open-dev.dingtalk.com/)。
2. 使用钉钉管理员账号登录。
3. 点击 **应用开发** → **定制应用** → **通过 H5 微应用创建应用**（或 **机器人**，取决于你的控制台版本）。
4. 填写：
   - **应用名称**：如 `Hermes Agent`
   - **描述**：可选
5. 创建后，导航到 **凭证与基础信息** 找到你的 **Client ID**（AppKey）和 **Client Secret**（AppSecret）。复制两者。

:::warning[凭据仅显示一次]
Client Secret 仅在创建应用时显示一次。如果丢失，需要重新生成。切勿公开分享这些凭据或提交到 Git。
:::

## 步骤 2：启用机器人能力

1. 在应用设置页面，进入 **添加能力** → **机器人**。
2. 启用机器人能力。
3. 在 **消息接收模式** 下，选择 **Stream 模式**（推荐 — 无需公网 URL）。

:::tip
Stream 模式是推荐的设置方式。它使用从你的机器发起的长连接 WebSocket，因此你不需要公网 IP、域名或 Webhook 端点。这适用于 NAT、防火墙和本地机器。
:::

## 步骤 3：查找你的钉钉用户 ID

Hermes Agent 使用你的钉钉用户 ID 控制谁可以与 Bot 交互。钉钉用户 ID 是由组织管理员设置的字母数字字符串。

查找方法：

1. 向你的钉钉组织管理员询问 — 用户 ID 在钉钉管理后台的 **通讯录** → **成员** 中配置。
2. 或者，Bot 会记录每条传入消息的 `sender_id`。启动网关，给 Bot 发一条消息，然后在日志中查看你的 ID。

## 步骤 4：配置 Hermes Agent

### 选项 A：交互式设置（推荐）

运行引导设置命令：

```bash
hermes gateway setup
```

在提示时选择 **钉钉**。设置向导可以通过以下两种路径之一授权：

- **二维码设备流（推荐）**。用钉钉移动应用扫描终端中打印的二维码 — 你的 Client ID 和 Client Secret 会自动返回并写入 `~/.hermes/.env`。无需访问开发者控制台。
- **手动粘贴**。如果你已有凭据（或二维码扫描不便），在提示时粘贴你的 Client ID、Client Secret 和允许的用户 ID。

:::note openClaw 品牌披露
由于钉钉的 `verification_uri_complete` 在 API 层硬编码为 openClaw 身份，二维码当前以 `openClaw` 源字符串授权，直到阿里巴巴/DingTalk-Real-AI 注册 Hermes 专属的服务端模板。这纯粹是钉钉展示同意屏幕的方式 — 你创建的 Bot 完全属于你，对你的租户是私有的。
:::

### 选项 B：手动配置

在 `~/.hermes/.env` 文件中添加：

```bash
# 必需
DINGTALK_CLIENT_ID=your-app-key
DINGTALK_CLIENT_SECRET=your-app-secret

# 安全：限制谁可以与 Bot 交互
DINGTALK_ALLOWED_USERS=user-id-1

# 多个允许的用户（逗号分隔）
# DINGTALK_ALLOWED_USERS=user-id-1,user-id-2
```

`~/.hermes/config.yaml` 中的可选行为设置：

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` 保持每个参与者的上下文在共享群聊中隔离

### 启动网关

配置完成后，启动钉钉网关：

```bash
hermes gateway
```

Bot 应在几秒内连接到钉钉的 Stream 模式。发送一条消息测试 — 私聊或在已添加 Bot 的群中均可。

:::tip
你可以在后台运行 `hermes gateway` 或作为 systemd 服务实现持久运行。详见部署文档。
:::

## 功能

### AI 卡片

Hermes 可以使用钉钉 AI 卡片而非纯 Markdown 消息回复。卡片提供更丰富、更结构化的显示，并支持 Agent 生成响应时的流式更新。

要启用 AI 卡片，在 `config.yaml` 中配置卡片模板 ID：

```yaml
platforms:
  dingtalk:
    enabled: true
    extra:
      card_template_id: "your-card-template-id"
```

你可以在钉钉开发者后台的应用 AI 卡片设置中找到卡片模板 ID。启用 AI 卡片后，所有回复都会以带流式文本更新的卡片形式发送。

### 表情回复

Hermes 自动给你的消息添加表情回复以显示处理状态：

- 🤔思考中 — Bot 开始处理你的消息时添加
- 🥳完成 — 响应完成时添加（替换思考中表情）

这些回复在私聊和群聊中均可工作。

### 显示设置

你可以独立于其他平台自定义钉钉的显示行为：

```yaml
display:
  platforms:
    dingtalk:
      show_reasoning: false   # 在回复中显示模型推理/思考
      streaming: true         # 启用流式响应（与 AI 卡片配合）
      tool_progress: all      # 显示工具执行进度（all/new/off）
      interim_assistant_messages: true  # 显示中间评论消息
```

要禁用工具进度和中间消息以获得更简洁的体验：

```yaml
display:
  platforms:
    dingtalk:
      tool_progress: off
      interim_assistant_messages: false
```

## 故障排除

### Bot 不回复消息

**原因**：机器人能力未启用，或 `DINGTALK_ALLOWED_USERS` 不包含你的用户 ID。

**修复**：验证机器人能力在应用设置中已启用且选择了 Stream 模式。检查你的用户 ID 是否在 `DINGTALK_ALLOWED_USERS` 中。重启网关。

### "dingtalk-stream not installed" 错误

**原因**：`dingtalk-stream` Python 包未安装。

**修复**：安装：

```bash
pip install dingtalk-stream httpx
```

### "DINGTALK_CLIENT_ID and DINGTALK_CLIENT_SECRET required"

**原因**：凭据未设置在环境变量或 `.env` 文件中。

**修复**：验证 `DINGTALK_CLIENT_ID` 和 `DINGTALK_CLIENT_SECRET` 在 `~/.hermes/.env` 中正确设置。Client ID 是你的 AppKey，Client Secret 是钉钉开发者后台的 AppSecret。

### Stream 断线 / 重连循环

**原因**：网络不稳定、钉钉平台维护或凭据问题。

**修复**：适配器自动以指数退避重连（2秒 → 5秒 → 10秒 → 30秒 → 60秒）。检查凭据是否有效且应用未被停用。验证你的网络允许出站 WebSocket 连接。

### Bot 离线

**原因**：Hermes 网关未运行或连接失败。

**修复**：检查 `hermes gateway` 是否在运行。查看终端输出的错误信息。常见问题：凭据错误、应用被停用、`dingtalk-stream` 或 `httpx` 未安装。

### "No session_webhook available"

**原因**：Bot 尝试回复但没有会话 Webhook URL。这通常发生在 Webhook 过期或 Bot 在收到消息和发送回复之间被重启时。

**修复**：给 Bot 发送新消息 — 每条传入消息都提供一个新的会话 Webhook 用于回复。这是钉钉的正常限制；Bot 只能回复最近收到的消息。

## 安全

:::warning
始终设置 `DINGTALK_ALLOWED_USERS` 限制谁可以与 Bot 交互。不设置时，网关默认拒绝所有用户作为安全措施。只添加你信任的人的用户 ID — 授权用户拥有 Agent 能力的完全访问权限，包括工具使用和系统访问。
:::

关于保护 Hermes Agent 部署的更多信息，参见[安全指南](../security.md)。

## 备注

- **Stream 模式**：无需公网 URL、域名或 Webhook 服务器。连接从你的机器通过 WebSocket 发起，因此适用于 NAT 和防火墙之后。
- **AI 卡片**：可选使用富文本 AI 卡片而非纯 Markdown 回复。通过 `card_template_id` 配置。
- **表情回复**：自动 🤔思考中/🥳完成反应显示处理状态。
- **Markdown 响应**：回复以钉钉的 Markdown 格式格式化以显示富文本。
- **媒体支持**：传入消息中的图片和文件会自动解析，可由视觉工具处理。
- **消息去重**：适配器以 5 分钟窗口去重消息，防止同一消息被处理两次。
- **自动重连**：如果 Stream 连接断开，适配器自动以指数退避重连。
- **消息长度限制**：响应上限为每条消息 20,000 字符。超出部分会被截断。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/dingtalk)
