---
sidebar_position: 15
title: "微信（WeChat）"
description: "通过 iLink Bot API 将 Hermes Agent 连接到个人微信账号"
---

# 微信（WeChat）

将 Hermes 连接到[微信](https://weixin.qq.com/)，腾讯的个人消息平台。适配器使用腾讯的 **iLink Bot API** 连接个人微信账号 — 这与企业微信（WeCom）不同。消息通过长轮询投递，因此不需要公网端点或 Webhook。

:::info
此适配器用于**个人微信账号**。如果你需要企业/公司微信，请参见 [WeCom 适配器](./wecom.md)。
:::

## 前提条件

- 一个个人微信账号
- Python 包：`aiohttp` 和 `cryptography`
- 终端二维码渲染在 Hermes 安装 `messaging` 额外组件时已包含

安装所需依赖：

```bash
pip install aiohttp cryptography
# 可选：用于终端二维码显示
pip install hermes-agent[messaging]
```

## 设置

### 1. 运行设置向导

连接微信账号最简单的方式是通过交互式设置：

```bash
hermes gateway setup
```

在提示时选择 **微信**。向导将会：

1. 从 iLink Bot API 请求二维码
2. 在终端显示二维码（或提供 URL）
3. 等待你用微信移动应用扫描二维码
4. 提示你在手机上确认登录
5. 自动保存账号凭据到 `~/.hermes/weixin/accounts/`

确认后，你会看到类似消息：

```
微信连接成功，account_id=your-account-id
```

向导存储 `account_id`、`token` 和 `base_url`，因此你不需要手动配置。

### 2. 配置环境变量

初始二维码登录后，至少在 `~/.hermes/.env` 中设置账号 ID：

```bash
WEIXIN_ACCOUNT_ID=your-account-id

# 可选：覆盖 token（通常从二维码登录自动保存）
# WEIXIN_TOKEN=your-bot-token

# 可选：限制访问
WEIXIN_DM_POLICY=open
WEIXIN_ALLOWED_USERS=user_id_1,user_id_2

# 可选：恢复旧版多行拆分行为
# WEIXIN_SPLIT_MULTILINE_MESSAGES=true

# 可选：用于 Cron/通知的主频道
WEIXIN_HOME_CHANNEL=chat_id
WEIXIN_HOME_CHANNEL_NAME=Home
```

### 3. 启动网关

```bash
hermes gateway
```

适配器会恢复保存的凭据，连接到 iLink API，并开始长轮询消息。

## 功能

- **长轮询传输** — 无需公网端点、Webhook 或 WebSocket
- **二维码登录** — 通过 `hermes gateway setup` 扫码连接
- **私聊和群消息** — 可配置的访问策略
- **媒体支持** — 图片、视频、文件和语音消息
- **AES-128-ECB 加密 CDN** — 所有媒体传输的自动加密/解密
- **上下文 Token 持久化** — 基于磁盘的跨重启回复连续性
- **Markdown 格式** — 保留 Markdown，包括标题、表格和代码块，使支持 Markdown 的微信客户端可以原生渲染
- **智能消息分块** — 消息在限制内保持为单个气泡；仅超大载荷在逻辑边界处拆分
- **输入指示器** — Agent 处理时在微信客户端显示"正在输入"状态
- **SSRF 防护** — 出站媒体 URL 在下载前验证
- **消息去重** — 5 分钟滑动窗口防止双重处理
- **带退避的自动重试** — 从瞬时 API 错误中恢复

## 配置选项

在 `config.yaml` 的 `platforms.weixin.extra` 中设置：

| 键 | 默认值 | 说明 |
|----|--------|------|
| `account_id` | — | iLink Bot 账号 ID（必需） |
| `token` | — | iLink Bot token（必需，从二维码登录自动保存） |
| `base_url` | `https://ilinkai.weixin.qq.com` | iLink API 基础 URL |
| `cdn_base_url` | `https://novac2c.cdn.weixin.qq.com/c2c` | 媒体传输的 CDN 基础 URL |
| `dm_policy` | `open` | 私聊访问：`open`、`allowlist`、`disabled`、`pairing` |
| `group_policy` | `disabled` | 群访问：`open`、`allowlist`、`disabled` |
| `allow_from` | `[]` | 允许私聊的用户 ID（当 dm_policy=allowlist 时） |
| `group_allow_from` | `[]` | 允许的群 ID（当 group_policy=allowlist 时） |
| `split_multiline_messages` | `false` | 为 `true` 时，将多行回复拆分为多条聊天消息（旧行为）。为 `false` 时，多行回复保持为一条消息，除非超过长度限制。 |

## 访问策略

### 私聊策略

控制谁可以给 Bot 发送私聊消息：

| 值 | 行为 |
|----|------|
| `open` | 任何人都可以私聊 Bot（默认） |
| `allowlist` | 仅 `allow_from` 中的用户 ID 可以私聊 |
| `disabled` | 所有私聊被忽略 |
| `pairing` | 配对模式（用于初始设置） |

```bash
WEIXIN_DM_POLICY=allowlist
WEIXIN_ALLOWED_USERS=user_id_1,user_id_2
```

### 群策略

控制 Bot 在哪些群中响应：

| 值 | 行为 |
|----|------|
| `open` | Bot 在所有群中响应 |
| `allowlist` | Bot 仅在 `group_allow_from` 列出的群 ID 中响应 |
| `disabled` | 所有群消息被忽略（默认） |

```bash
WEIXIN_GROUP_POLICY=allowlist
WEIXIN_GROUP_ALLOWED_USERS=group_id_1,group_id_2
```

:::note
微信的默认群策略是 `disabled`（与 WeCom 默认为 `open` 不同）。这是有意为之的，因为个人微信账号可能在许多群中。
:::

## 媒体支持

### 入站（接收）

适配器接收用户的媒体附件，从微信 CDN 下载、解密并本地缓存以供 Agent 处理：

| 类型 | 处理方式 |
|------|---------| 
| **图片** | 下载、AES 解密并缓存为 JPEG。 |
| **视频** | 下载、AES 解密并缓存为 MP4。 |
| **文件** | 下载、AES 解密并缓存。保留原始文件名。 |
| **语音** | 如果有文本转录可用，提取为文本。否则下载并缓存音频（SILK 格式）。 |

**引用消息：** 引用（回复）消息中的媒体也会被提取，因此 Agent 有用户回复内容的上下文。

### AES-128-ECB 加密 CDN

微信媒体文件通过加密 CDN 传输。适配器透明处理：

- **入站：** 使用 `encrypted_query_param` URL 从 CDN 下载加密媒体，然后使用消息载荷中提供的每文件密钥通过 AES-128-ECB 解密。
- **出站：** 使用随机 AES-128-ECB 密钥在本地加密文件，上传到 CDN，加密引用包含在出站消息中。
- AES 密钥为 16 字节（128 位）。密钥可能以原始 base64 或十六进制编码到达 — 适配器处理两种格式。
- 这需要 `cryptography` Python 包。

无需配置 — 加密和解密自动进行。

### 出站（发送）

| 方法 | 发送内容 |
|------|---------|
| `send` | 带 Markdown 格式的文本消息 | 
| `send_image` / `send_image_file` | 原生图片消息（通过 CDN 上传） |
| `send_document` | 文件附件（通过 CDN 上传） |
| `send_video` | 视频消息（通过 CDN 上传） |

所有出站媒体通过加密 CDN 上传流程：

1. 生成随机 AES-128 密钥
2. 使用 AES-128-ECB + PKCS#7 填充加密文件
3. 从 iLink API 请求上传 URL（`getuploadurl`）
4. 将密文上传到 CDN
5. 发送带加密媒体引用的消息

## 上下文 Token 持久化

iLink Bot API 要求每个对等方的出站消息回传 `context_token`。适配器维护基于磁盘的上下文 Token 存储：

- Token 按账号+对等方保存到 `~/.hermes/weixin/accounts/<account_id>.context-tokens.json`
- 启动时恢复之前保存的 Token
- 每条入站消息更新该发送者的已存储 Token
- 出站消息自动包含最新的上下文 Token

这确保了即使网关重启后的回复连续性。

## Markdown 格式

通过 iLink Bot API 连接的微信客户端可以直接渲染 Markdown，因此适配器保留 Markdown 而非重写：

- **标题** 保持为 Markdown 标题（`#`、`##`、...）
- **表格** 保持为 Markdown 表格
- **代码围栏** 保持为围栏代码块
- **过多空行** 在围栏代码块外折叠为双换行

## 消息分块

消息在平台限制内始终作为单条聊天消息投递。仅超大载荷会拆分投递：

- 最大消息长度：**4000 字符**
- 限制内的消息即使包含多个段落或换行也保持完整
- 超大消息在逻辑边界处拆分（段落、空行、代码围栏）
- 代码围栏尽可能保持完整（除非围栏本身超过限制，否则不在块中间拆分）
- 超大的单个块回退到基础适配器的截断逻辑
- 0.3 秒的块间延迟防止多块发送时触发微信速率限制丢消息

## 输入指示器

适配器在微信客户端显示输入状态：

1. 消息到达时，适配器通过 `getconfig` API 获取 `typing_ticket`
2. 输入票据按用户缓存 10 分钟
3. `send_typing` 发送输入开始信号；`stop_typing` 发送输入停止信号
4. 网关在 Agent 处理消息时自动触发输入指示器

## 长轮询连接

适配器使用 HTTP 长轮询（非 WebSocket）接收消息：

### 工作原理

1. **连接：** 验证凭据并启动轮询循环
2. **轮询：** 以 35 秒超时调用 `getupdates`；服务器持有请求直到消息到达或超时过期
3. **分发：** 入站消息通过 `asyncio.create_task` 并发分发
4. **同步缓冲区：** 持久同步游标（`get_updates_buf`）保存到磁盘，使适配器在重启后从正确位置恢复

### 重试行为

API 错误时，适配器使用简单的重试策略：

| 条件 | 行为 |
|------|------|
| 瞬时错误（第 1-2 次） | 2 秒后重试 |
| 重复错误（第 3+ 次） | 退避 30 秒，然后重置计数器 |
| 会话过期（`errcode=-14`） | 暂停 10 分钟（可能需要重新登录） |
| 超时 | 立即重新轮询（正常长轮询行为） |

### 去重

入站消息使用消息 ID 以 5 分钟窗口去重。这防止网络波动或重叠轮询响应期间的双重处理。

### Token 锁

同一时间只有一个微信网关实例可以使用给定 Token。适配器在启动时获取范围锁并在关闭时释放。如果另一个网关已在使用相同 Token，启动会失败并显示提示性错误消息。

## 所有环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `WEIXIN_ACCOUNT_ID` | ✅ | — | iLink Bot 账号 ID（从二维码登录获取） |
| `WEIXIN_TOKEN` | ✅ | — | iLink Bot token（从二维码登录自动保存） |
| `WEIXIN_BASE_URL` | — | `https://ilinkai.weixin.qq.com` | iLink API 基础 URL |
| `WEIXIN_CDN_BASE_URL` | — | `https://novac2c.cdn.weixin.qq.com/c2c` | 媒体传输的 CDN 基础 URL |
| `WEIXIN_DM_POLICY` | — | `open` | 私聊访问策略：`open`、`allowlist`、`disabled`、`pairing` |
| `WEIXIN_GROUP_POLICY` | — | `disabled` | 群访问策略：`open`、`allowlist`、`disabled` |
| `WEIXIN_ALLOWED_USERS` | — | _(空)_ | 逗号分隔的私聊白名单用户 ID |
| `WEIXIN_GROUP_ALLOWED_USERS` | — | _(空)_ | 逗号分隔的群白名单群 ID |
| `WEIXIN_HOME_CHANNEL` | — | — | 用于 Cron/通知输出的聊天 ID |
| `WEIXIN_HOME_CHANNEL_NAME` | — | `Home` | 主频道的显示名称 |
| `WEIXIN_ALLOW_ALL_USERS` | — | — | 网关级别允许所有用户的标志（由设置向导使用） |

## 故障排除

| 问题 | 修复 |
|------|------|
| `Weixin startup failed: aiohttp and cryptography are required` | 安装两者：`pip install aiohttp cryptography` |
| `Weixin startup failed: WEIXIN_TOKEN is required` | 运行 `hermes gateway setup` 完成二维码登录，或手动设置 `WEIXIN_TOKEN` |
| `Weixin startup failed: WEIXIN_ACCOUNT_ID is required` | 在 `.env` 中设置 `WEIXIN_ACCOUNT_ID` 或运行 `hermes gateway setup` |
| `Another local Hermes gateway is already using this Weixin token` | 先停止另一个网关实例 — 每个 Token 只允许一个轮询器 |
| 会话过期（`errcode=-14`） | 你的登录会话已过期。重新运行 `hermes gateway setup` 扫描新的二维码 |
| 设置时二维码过期 | 二维码自动刷新最多 3 次。如果持续过期，检查网络连接 |
| Bot 不回复私聊 | 检查 `WEIXIN_DM_POLICY` — 如果设为 `allowlist`，发送者必须在 `WEIXIN_ALLOWED_USERS` 中 |
| Bot 忽略群消息 | 群策略默认为 `disabled`。设置 `WEIXIN_GROUP_POLICY=open` 或 `allowlist` |
| 媒体下载/上传失败 | 确保 `cryptography` 已安装。检查到 `novac2c.cdn.weixin.qq.com` 的网络访问 |
| `Blocked unsafe URL (SSRF protection)` | 出站媒体 URL 指向私有/内部地址。仅允许公网 URL |
| 语音消息显示为文本 | 如果微信提供了转录，适配器使用文本。这是预期行为 |
| 消息出现重复 | 适配器按消息 ID 去重。如果你看到重复，检查是否有多个网关实例在运行 |
| `iLink POST ... HTTP 4xx/5xx` | 来自 iLink 服务的 API 错误。检查 Token 有效性和网络连通性 |
| 终端二维码不渲染 | 用 messaging 额外组件重新安装：`pip install hermes-agent[messaging]`。或者打开二维码上方打印的 URL |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/weixin)
