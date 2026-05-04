---
sidebar_position: 16
title: "Yuanbao"
description: "将 Hermes Agent 连接到腾讯企业级消息平台 Yuanbao，支持 WebSocket 网关实时消息收发及单聊、群聊。"
---

# Yuanbao

将 Hermes 连接到 [Yuanbao](https://yuanbao.tencent.com/)，腾讯的企业级消息平台。该适配器通过 WebSocket 网关实现实时双向消息收发，支持单聊（C2C）和群聊。

:::info
Yuanbao 是腾讯及企业环境中主要使用的企业消息平台，采用 WebSocket 进行实时通信、基于 HMAC 的认证方式，并支持图片、文件、语音等富媒体消息。
:::

## 前置要求

- 拥有机器人创建权限的 Yuanbao 账号
- Yuanbao APP_ID 和 APP_SECRET（来自平台管理员）
- Python 包：`websockets` 和 `httpx`
- 支持媒体消息需额外安装：`aiofiles`

安装所需依赖：

```bash
pip install websockets httpx aiofiles
```

## 配置

### 1. 在 Yuanbao 中创建机器人

1. 从 [https://yuanbao.tencent.com/](https://yuanbao.tencent.com/) 下载 Yuanbao 应用
2. 在应用中进入 **PAI → 我的机器人**，创建新机器人
3. 机器人创建完成后，复制 **APP_ID** 和 **APP_SECRET**

### 2. 运行配置向导

最简便的配置方式是通过交互式向导：

```bash
hermes gateway setup
```

选择 **Yuanbao** 后，向导将依次要求：

1. 输入 APP_ID
2. 输入 APP_SECRET
3. 自动保存配置

:::tip
WebSocket URL 和 API Domain 已有合理默认值，只需提供 APP_ID 和 APP_SECRET 即可开始使用。
:::

### 3. 配置环境变量

初始配置完成后，在 `~/.hermes/.env` 中确认以下变量：

```bash
# 必填
YUANBAO_APP_ID=your-app-id
YUANBAO_APP_SECRET=***
YUANBAO_WS_URL=wss://api.yuanbao.example.com/ws
YUANBAO_API_DOMAIN=https://api.yuanbao.example.com

# 选填：机器人账号 ID（通常从 sign-token 自动获取）
# YUANBAO_BOT_ID=your-bot-id

# 选填：内部路由环境（如 test/staging/production）
# YUANBAO_ROUTE_ENV=production

# 选填：主页频道，用于 cron/通知投递（格式：direct:<account> 或 group:<group_code>）
YUANBAO_HOME_CHANNEL=direct:bot_account_id
YUANBAO_HOME_CHANNEL_NAME="Bot Notifications"

# 选填：访问限制（传统方式，细粒度访问控制见下文）
YUANBAO_ALLOWED_USERS=user_account_1,user_account_2
```

### 4. 启动网关

```bash
hermes gateway
```

适配器将连接至 Yuanbao WebSocket 网关，使用 HMAC 签名完成认证，然后开始处理消息。

## 功能特性

- **WebSocket 网关** — 实时双向通信
- **HMAC 认证** — 使用 APP_ID/APP_SECRET 进行安全请求签名
- **单聊（C2C）** — 用户与机器人的直接对话
- **群聊消息** — 群组内的多人会话
- **媒体支持** — 图片、文件、语音消息，通过 COS（腾讯云对象存储）
- **Markdown 格式** — 消息自动分块以适应 Yuanbao 的大小限制
- **消息去重** — 防止同一消息的重复处理
- **心跳保活** — 维持 WebSocket 连接稳定
- **正在输入提示** — 代理处理过程中显示"正在输入…"状态
- **自动重连** — 指数退避处理 WebSocket 断开
- **群组信息查询** — 获取群详情和成员列表
- **表情贴纸支持** — 在会话中发送 TIMFaceElem 贴纸和表情
- **自动设为主页** — 第一个向机器人发消息的用户自动成为主页频道所有者
- **慢响应通知** — 代理响应时间过长时发送等待提示

## 配置选项

### 聊天 ID 格式

Yuanbao 根据会话类型使用不同前缀标识符：

| 会话类型 | 格式 | 示例 |
|-----------|--------|---------|
| 单聊（C2C） | `direct:<account>` | `direct:user123` |
| 群聊 | `group:<group_code>` | `group:grp456` |

### 媒体上传

Yuanbao 适配器通过 COS（腾讯云对象存储）自动处理媒体上传：

- **图片**：支持 JPEG、PNG、GIF、WebP
- **文件**：支持所有常见文档类型
- **语音**：支持 WAV、MP3、OGG

媒体 URL 在上传前会自动验证和下载，以防止 SSRF 攻击。

## 主页频道

在任何 Yuanbao 会话（单聊或群聊）中发送 `/sethome` 命令，可将其指定为**主页频道**。定时任务（cron 作业）的结果将投放到此频道。

:::tip 自动设为主页
如果未配置主页频道，第一个向机器人发消息的用户将自动成为主页频道所有者。如果当前主页频道是群聊，则第一个私信将升级为直接会话。
:::

也可以在 `~/.hermes/.env` 中手动设置：

```bash
YUANBAO_HOME_CHANNEL=direct:user_account_id
# 群聊格式：
# YUANBAO_HOME_CHANNEL=group:group_code
YUANBAO_HOME_CHANNEL_NAME="My Bot Updates"
```

### 示例：设置主页频道

1. 在 Yuanbao 中开始与机器人的对话
2. 发送命令：`/sethome`
3. 机器人回复："主页频道已设置为 [chat_name]，ID：[chat_id]。定时任务将投放到此位置。"
4. 后续 cron 作业和通知将发送到此频道

### 示例：定时任务投递

创建 cron 任务：

```bash
/cron "0 9 * * *" Check server status
```

每天早上 9 点，定时输出将投递到您的 Yuanbao 主页频道。

## 使用技巧

### 开始对话

向机器人发送任意消息即可：

```
hello
```

机器人将在同一会话线程中回复。

### 可用命令

所有标准 Hermes 命令在 Yuanbao 上均可用：

| 命令 | 说明 |
|---------|-------------|
| `/new` | 开始新的对话 |
| `/model [provider:model]` | 显示或切换模型 |
| `/sethome` | 将此聊天设为主页频道 |
| `/status` | 显示会话信息 |
| `/help` | 显示可用命令 |

### 发送文件

直接在 Yuanbao 聊天中附上文件即可发送给机器人。机器人将自动下载并处理文件附件。

也可以随附件附上消息：

```
请分析这个文档
```

### 接收文件

当您要求机器人创建或导出文件时，它会直接将文件发送到您的 Yuanbao 聊天。

## 故障排除

### 机器人在线但不响应消息

**原因**：WebSocket 握手期间认证失败。

**解决方法**：
1. 确认 APP_ID 和 APP_SECRET 正确
2. 检查 WebSocket URL 是否可访问
3. 确认机器人账号有正确的权限
4. 查看网关日志：`tail -f ~/.hermes/logs/gateway.log`

### 出现"连接被拒绝"错误

**原因**：WebSocket URL 不可达或错误。

**解决方法**：
1. 验证 WebSocket URL 格式（应以 `wss://` 开头）
2. 检查到 Yuanbao API 域的网络连通性
3. 确认防火墙允许 WebSocket 连接
4. 测试 URL：`curl -I https://[YUANBAO_API_DOMAIN]`

### 媒体上传失败

**原因**：COS 凭据无效或媒体服务器不可达。

**解决方法**：
1. 验证 API_DOMAIN 正确
2. 检查机器人的媒体上传权限是否启用
3. 确保媒体文件可访问且未损坏
4. 与平台管理员确认 COS 存储桶配置

### 消息未投递到主页频道

**原因**：主页频道 ID 格式错误或 cron 任务未触发。

**解决方法**：
1. 确认 YUANBAO_HOME_CHANNEL 格式正确
2. 用 `/sethome` 命令自动检测正确格式
3. 用 `/status` 检查 cron 任务调度
4. 确认机器人在目标聊天中有发送权限

### 频繁断开连接

**原因**：WebSocket 连接不稳定或网络不可靠。

**解决方法**：
1. 查看网关日志中的错误模式
2. 在连接设置中增加心跳超时
3. 确保到 Yuanbao API 的网络连接稳定
4. 考虑启用详细日志：`HERMES_LOG_LEVEL=debug hermes gateway`

## 访问控制

Yuanbao 支持对单聊和群聊的细粒度访问控制：

```bash
# 单聊策略：open（默认）| allowlist | disabled
YUANBAO_DM_POLICY=open
# 当 DM_POLICY=allowlist 时，允许向机器人发消息的用户 ID 列表（逗号分隔）
YUANBAO_DM_ALLOW_FROM=user_id_1,user_id_2

# 群聊策略：open（默认）| allowlist | disabled
YUANBAO_GROUP_POLICY=open
# 当 GROUP_POLICY=allowlist 时，允许加入的群组 code 列表（逗号分隔）
YUANBAO_GROUP_ALLOW_FROM=group_code_1,group_code_2
```

这些也可以在 `config.yaml` 中设置：

```yaml
platforms:
  yuanbao:
    extra:
      dm_policy: allowlist
      dm_allow_from: "user1,user2"
      group_policy: open
      group_allow_from: ""
```

## 高级配置

### 消息分块

Yuanbao 有最大消息大小限制。Hermes 自动对大型响应进行分块处理，采用 Markdown 感知的分割方式（尊重代码块、表格和段落边界）。

### 连接参数

以下连接参数内置于适配器中，具有合理的默认值：

| 参数 | 默认值 | 说明 |
|-----------|---------------|-------------|
| WebSocket 连接超时 | 15 秒 | 等待 WS 握手的超时时间 |
| 心跳间隔 | 30 秒 | 保持连接活跃的 ping 频率 |
| 最大重连次数 | 100 | 最大重连尝试次数 |
| 重连退避 | 1s → 60s（指数增长） | 重连尝试之间的等待时间 |
| 回复心跳间隔 | 2 秒 | RUNNING 状态发送频率 |
| 发送超时 | 30 秒 | 出站 WS 消息的超时时间 |

:::note
这些值目前无法通过环境变量配置。它们针对典型的 Yuanbao 部署进行了优化。
:::

### 详细日志

启用调试日志以排除连接问题：

```bash
HERMES_LOG_LEVEL=debug hermes gateway
```

## 与其他功能集成

### 定时任务

在 Yuanbao 上调度定期运行的任务：

```
/cron "0 */4 * * *" Report system health
```

结果将投放到您的主页频道。

### 后台任务

在不阻塞对话的情况下运行长时间操作：

```
/background Analyze all files in the archive
```

### 跨平台消息

从 CLI 向 Yuanbao 发送消息：

```bash
hermes chat -q "Send 'Hello from CLI' to yuanbao:group:group_code"
```

## 相关文档

- [消息网关概述](./index.md)
- [斜杠命令参考](/docs/reference/slash-commands.md)
- [定时任务](/docs/user-guide/features/cron-jobs.md)
- [后台任务](/docs/guides/tips.md#background-tasks)
