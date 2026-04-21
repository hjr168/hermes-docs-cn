---
sidebar_position: 11
title: "飞书 / Lark"
description: "将 Hermes Agent 设置为飞书或 Lark Bot"
---

# 飞书 / Lark 设置

Hermes Agent 作为功能完整的 Bot 集成到飞书和 Lark。连接后，你可以在私聊或群聊中与 Agent 对话，在主聊天中接收 Cron 任务结果，并通过正常的网关流程发送文本、图片、音频和文件附件。

集成支持两种连接模式：

- `websocket` — 推荐；Hermes 发起出站连接，你不需要公网 Webhook 端点
- `webhook` — 适用于你希望飞书/Lark 通过 HTTP 将事件推送到你的网关时

## Hermes 的行为

| 场景 | 行为 |
|------|------|
| 私聊 | Hermes 回复每条消息。 |
| 群聊 | Hermes 仅在 Bot 在聊天中被 @提及时回复。 |
| 共享群聊 | 默认情况下，共享聊天中每个用户的会话历史是隔离的。 |

此共享聊天行为由 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅在你明确希望每个聊天共享一个对话时设为 `false`。

## 步骤 1：创建飞书 / Lark 应用

### 推荐：扫码创建（一条命令）

```bash
hermes gateway setup
```

选择 **飞书 / Lark** 并用飞书或 Lark 移动应用扫描二维码。Hermes 会自动创建具有正确权限的 Bot 应用并保存凭据。

### 替代方案：手动设置

如果扫码创建不可用，向导会回退到手动输入：

1. 打开飞书或 Lark 开发者控制台：
   - 飞书：[https://open.feishu.cn/](https://open.feishu.cn/)
   - Lark：[https://open.larksuite.com/](https://open.larksuite.com/)
2. 创建新应用。
3. 在 **凭证与基础信息** 中，复制 **App ID** 和 **App Secret**。
4. 为应用启用 **机器人** 能力。
5. 运行 `hermes gateway setup`，选择 **飞书 / Lark**，在提示时输入凭据。

:::warning
保护 App Secret 不被泄露。拥有它的人可以冒充你的应用。
:::

## 步骤 2：选择连接模式

### 推荐：WebSocket 模式

当 Hermes 运行在你的笔记本、工作站或私有服务器上时使用 WebSocket 模式。不需要公网 URL。官方 Lark SDK 开启并维护持久出站 WebSocket 连接，支持自动重连。

```bash
FEISHU_CONNECTION_MODE=websocket
```

**要求：** 必须安装 `websockets` Python 包。SDK 内部处理连接生命周期、心跳和自动重连。

**工作原理：** 适配器在后台执行线程中运行 Lark SDK 的 WebSocket 客户端。入站事件（消息、回复、卡片操作）被分发到主 asyncio 循环。断线时，SDK 会自动尝试重连。

### 可选：Webhook 模式

仅当你已在可达的 HTTP 端点后运行 Hermes 时使用 Webhook 模式。

```bash
FEISHU_CONNECTION_MODE=webhook
```

在 Webhook 模式下，Hermes 启动 HTTP 服务器（通过 `aiohttp`）并在以下路径提供飞书端点：

```text
/feishu/webhook
```

**要求：** 必须安装 `aiohttp` Python 包。

你可以自定义 Webhook 服务器绑定地址和路径：

```bash
FEISHU_WEBHOOK_HOST=127.0.0.1   # 默认：127.0.0.1
FEISHU_WEBHOOK_PORT=8765         # 默认：8765
FEISHU_WEBHOOK_PATH=/feishu/webhook  # 默认：/feishu/webhook
```

当飞书发送 URL 验证挑战（`type: url_verification`）时，Webhook 会自动响应，这样你可以在飞书开发者控制台完成订阅设置。

## 步骤 3：配置 Hermes

### 选项 A：交互式设置

```bash
hermes gateway setup
```

选择 **飞书 / Lark** 并填写提示。

### 选项 B：手动配置

在 `~/.hermes/.env` 中添加：

```bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=secret_xxx
FEISHU_DOMAIN=feishu
FEISHU_CONNECTION_MODE=websocket

# 可选但强烈推荐
FEISHU_ALLOWED_USERS=ou_xxx,ou_yyy
FEISHU_HOME_CHANNEL=oc_xxx
```

`FEISHU_DOMAIN` 接受：

- `feishu` 用于飞书（中国）
- `lark` 用于 Lark（国际版）

## 步骤 4：启动网关

```bash
hermes gateway
```

然后从飞书/Lark 给 Bot 发消息确认连接正常。

## 主聊天

在飞书/Lark 聊天中使用 `/set-home` 将其标记为 Cron 任务结果和跨平台通知的主频道。

你也可以预先配置：

```bash
FEISHU_HOME_CHANNEL=oc_xxx
```

## 安全

### 用户白名单

生产环境请设置飞书 Open ID 白名单：

```bash
FEISHU_ALLOWED_USERS=ou_xxx,ou_yyy
```

如果白名单为空，任何能访问 Bot 的人可能都可以使用它。在群聊中，白名单会在消息处理前对照发送者的 open_id 进行检查。

### Webhook 加密密钥

在 Webhook 模式下运行时，设置加密密钥以启用入站 Webhook 载荷的签名验证：

```bash
FEISHU_ENCRYPT_KEY=your-encrypt-key
```

此密钥在飞书应用配置的 **事件订阅** 部分找到。设置后，适配器使用签名算法验证每个 Webhook 请求：

```
SHA256(timestamp + nonce + encrypt_key + body)
```

计算出的哈希与 `x-lark-signature` 头使用时间安全比较进行对比。签名无效或缺失的请求会被拒绝（HTTP 401）。

:::tip
在 WebSocket 模式下，签名验证由 SDK 自身处理，因此 `FEISHU_ENCRYPT_KEY` 是可选的。在 Webhook 模式下，生产环境强烈推荐设置。
:::

### 验证 Token

额外的认证层，检查 Webhook 载荷中的 `token` 字段：

```bash
FEISHU_VERIFICATION_TOKEN=your-verification-token
```

此 Token 也在飞书应用的 **事件订阅** 部分找到。设置后，每个入站 Webhook 载荷的 `header` 对象中必须包含匹配的 `token`。不匹配的 Token 会被拒绝（HTTP 401）。

`FEISHU_ENCRYPT_KEY` 和 `FEISHU_VERIFICATION_TOKEN` 可以同时使用以实现纵深防御。

## 群消息策略

`FEISHU_GROUP_POLICY` 环境变量控制 Hermes 是否以及如何响应群聊消息：

```bash
FEISHU_GROUP_POLICY=allowlist   # 默认
```

| 值 | 行为 |
|----|------|
| `open` | Hermes 响应任何群中任何用户的 @提及。 |
| `allowlist` | Hermes 仅响应 `FEISHU_ALLOWED_USERS` 中列出的用户的 @提及。 |
| `disabled` | Hermes 完全忽略所有群消息。 |

在所有模式下，Bot 必须在群中被明确 @提及（或 @所有人）后消息才会被处理。私聊不受此限制。

### @提及检测的 Bot 身份

为了精确检测群中的 @提及，适配器需要知道 Bot 的身份。可以明确提供：

```bash
FEISHU_BOT_OPEN_ID=ou_xxx
FEISHU_BOT_USER_ID=xxx
FEISHU_BOT_NAME=MyBot
```

如果这些都未设置，适配器会在启动时尝试通过 Application Info API 自动发现 Bot 名称。为此，需要授予 `admin:app.info:readonly` 或 `application:application:self_manage` 权限范围。

## 交互式卡片操作

当用户点击 Bot 发送的交互式卡片上的按钮或与卡片交互时，适配器将这些作为合成的 `/card` 命令事件路由：

- 按钮点击变为：`/card button {"key": "value", ...}`
- 卡片定义中的操作 `value` 载荷以 JSON 形式包含。
- 卡片操作以 15 分钟窗口去重以防止双重处理。

卡片操作事件以 `MessageType.COMMAND` 分发，因此它们通过正常的命令处理管道。

这也是**命令审批**的工作方式 — 当 Agent 需要运行危险命令时，它发送一个带"允许一次 / 会话 / 始终允许 / 拒绝"按钮的交互式卡片。用户点击按钮，卡片操作回调将审批决定传回给 Agent。

### 飞书应用配置要求

交互式卡片需要在飞书开发者控制台完成**三项**配置。缺少任何一项都会导致用户点击卡片按钮时出现错误 **200340**。

1. **订阅卡片操作事件：**
   在 **事件订阅** 中，将 `card.action.trigger` 添加到已订阅的事件。

2. **启用交互式卡片能力：**
   在 **应用能力 > 机器人** 中，确保 **交互式卡片** 开关已启用。这告诉飞书你的应用可以接收卡片操作回调。

3. **配置卡片请求 URL（仅 Webhook 模式）：**
   在 **应用能力 > 机器人 > 消息卡片请求网址** 中，将 URL 设置为与事件 Webhook 相同的端点（如 `https://your-server:8765/feishu/webhook`）。在 WebSocket 模式下，这由 SDK 自动处理。

:::warning
没有全部三步，飞书会成功*发送*交互式卡片（发送仅需 `im:message:send` 权限），但点击任何按钮会返回错误 200340。卡片看起来正常工作 — 错误仅在用户与之交互时才出现。
:::

## 文档评论智能回复

除了聊天，适配器还可以回答飞书/Lark **文档**上留下的 `@` 提及。当用户评论文档（选区评论或全文评论）并 @提及 Bot 时，Hermes 读取文档及周围评论线程，并在评论线程中内联发布 LLM 回复。

由 `drive.notice.comment_add_v1` 事件驱动，处理器：

- 并行获取文档内容和评论时间线（全文线程 20 条消息，选区线程 12 条）。
- 使用限定在该单次评论会话的 `feishu_doc` + `feishu_drive` 工具集运行 Agent。
- 以 4000 字符分块回复，并作为线程回复发布。
- 按文档缓存会话 1 小时，上限 50 条消息，使同一文档上的后续评论保持上下文。

### 三级访问控制

文档评论回复是**仅显式授权** — 没有隐式允许所有模式。权限按以下顺序解析（首次匹配生效，按字段）：

1. **精确文档** — 限定到特定文档 Token 的规则。
2. **通配符** — 匹配文档模式的规则。
3. **顶层** — 工作区的默认规则。

每条规则有两种策略：

- **`allowlist`** — 静态用户/租户列表。
- **`pairing`** — 静态列表 ∪ 运行时批准存储。适用于主持人可以实时授权的推广场景。

规则存储在 `~/.hermes/feishu_comment_rules.json`（配对授权在 `~/.hermes/feishu_comment_pairing.json`）中，带 mtime 缓存的热重载 — 编辑在下一个评论事件时生效，无需重启网关。

CLI：

```bash
# 检查当前规则和配对状态
python -m gateway.platforms.feishu_comment_rules status

# 模拟特定文档 + 用户的访问检查
python -m gateway.platforms.feishu_comment_rules check <fileType:fileToken> <user_open_id>

# 运行时管理配对授权
python -m gateway.platforms.feishu_comment_rules pairing list
python -m gateway.platforms.feishu_comment_rules pairing add <user_open_id>
python -m gateway.platforms.feishu_comment_rules pairing remove <user_open_id>
```

### 飞书应用配置要求

在已授予的聊天/卡片权限之上，添加 Drive 评论事件：

- 在 **事件订阅** 中订阅 `drive.notice.comment_add_v1`。
- 授予 `docs:doc:readonly` 和 `drive:drive:readonly` 范围，以便处理器可以读取文档内容。

## 媒体支持

### 入站（接收）

适配器接收并缓存用户发送的以下媒体类型：

| 类型 | 扩展名 | 处理方式 |
|------|--------|---------|
| **图片** | .jpg, .jpeg, .png, .gif, .webp, .bmp | 通过飞书 API 下载并本地缓存 |
| **音频** | .ogg, .mp3, .wav, .m4a, .aac, .flac, .opus, .webm | 下载并缓存；小文本文件自动提取 |
| **视频** | .mp4, .mov, .avi, .mkv, .webm, .m4v, .3gp | 下载并作为文档缓存 |
| **文件** | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx 等 | 下载并作为文档缓存 |

富文本（帖子）消息中的媒体，包括内联图片和文件附件，也会被提取和缓存。

对于小型文本文档（.txt, .md），文件内容会自动注入到消息文本中，以便 Agent 可以直接读取，无需工具。

### 出站（发送）

| 方法 | 发送内容 |
|------|---------|
| `send` | 文本或富文本帖子消息（根据 Markdown 内容自动检测） |
| `send_image` / `send_image_file` | 上传图片到飞书，然后作为原生图片气泡发送（可选标题） |
| `send_document` | 上传文件到飞书 API，然后作为文件附件发送 |
| `send_voice` | 上传音频文件作为飞书文件附件 |
| `send_video` | 上传视频并作为原生媒体消息发送 |
| `send_animation` | GIF 降级为文件附件（飞书没有原生 GIF 气泡） |

文件上传路由基于扩展名自动选择：

- `.ogg`, `.opus` → 作为 `opus` 音频上传
- `.mp4`, `.mov`, `.avi`, `.m4v` → 作为 `mp4` 媒体上传
- `.pdf`, `.doc(x)`, `.xls(x)`, `.ppt(x)` → 以其文档类型上传
- 其他 → 作为通用流文件上传

## Markdown 渲染和帖子回退

当出站文本包含 Markdown 格式（标题、粗体、列表、代码块、链接等）时，适配器会自动将其作为飞书**帖子**消息发送，内嵌 `md` 标签而非纯文本。这使得飞书客户端能够富文本渲染。

如果飞书 API 拒绝帖子载荷（例如，由于不支持的 Markdown 构造），适配器会自动回退为剥离 Markdown 的纯文本发送。这种两阶段回退确保消息始终被投递。

纯文本消息（未检测到 Markdown）以简单的 `text` 消息类型发送。

## 处理状态回复

当 Agent 正在处理时，Bot 会在你的消息上显示 `Typing` 回复。回复到达时清除，处理失败时替换为 `CrossMark`。

设置 `FEISHU_REACTIONS=false` 可关闭此功能。

## 突发保护和批量处理

适配器包含对快速消息突发的去抖处理，避免 Agent 被压垮：

### 文本批量处理

当用户快速连续发送多条文本消息时，它们会在分发前合并为单个事件：

| 设置 | 环境变量 | 默认值 |
|------|---------|--------|
| 静默期 | `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` | 0.6秒 |
| 每批最大消息数 | `HERMES_FEISHU_TEXT_BATCH_MAX_MESSAGES` | 8 |
| 每批最大字符数 | `HERMES_FEISHU_TEXT_BATCH_MAX_CHARS` | 4000 |

### 媒体批量处理

快速连续发送的多个媒体附件（如拖拽多张图片）会合并为单个事件：

| 设置 | 环境变量 | 默认值 |
|------|---------|--------|
| 静默期 | `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | 0.8秒 |

### 按聊天串行化

同一聊天内的消息串行处理（一次一条）以保持对话一致性。每个聊天有自己的锁，因此不同聊天的消息可以并发处理。

## 速率限制（Webhook 模式）

在 Webhook 模式下，适配器执行按 IP 的速率限制以防止滥用：

- **窗口：** 60 秒滑动窗口
- **限制：** 每个窗口每个 (app_id, path, IP) 三元组 120 个请求
- **跟踪上限：** 最多跟踪 4096 个唯一键（防止无限内存增长）

超过限制的请求收到 HTTP 429（请求过多）。

### Webhook 异常跟踪

适配器按 IP 地址跟踪连续错误响应。同一 IP 在 6 小时窗口内连续 25 次错误后会记录警告。这有助于检测配置错误的客户端或探测尝试。

额外的 Webhook 保护：
- **请求体大小限制：** 最大 1 MB
- **请求体读取超时：** 30 秒
- **Content-Type 强制：** 仅接受 `application/json`

## WebSocket 调优

使用 `websocket` 模式时，你可以自定义重连和心跳行为：

```yaml
platforms:
  feishu:
    extra:
      ws_reconnect_interval: 120   # 重连尝试之间的秒数（默认：120）
      ws_ping_interval: 30         # WebSocket 心跳之间的秒数（可选；未设置时使用 SDK 默认值）
```

| 设置 | 配置键 | 默认值 | 说明 |
|------|--------|--------|------|
| 重连间隔 | `ws_reconnect_interval` | 120秒 | 重连尝试之间的等待时间 |
| 心跳间隔 | `ws_ping_interval` | _(SDK 默认)_ | WebSocket 保活心跳的频率 |

## 按群访问控制

除了全局 `FEISHU_GROUP_POLICY`，你可以在 config.yaml 中使用 `group_rules` 为每个群聊设置细粒度规则：

```yaml
platforms:
  feishu:
    extra:
      default_group_policy: "open"     # 不在 group_rules 中的群的默认策略
      admins:                          # 可以管理 Bot 设置的用户
        - "ou_admin_open_id"
      group_rules:
        "oc_group_chat_id_1":
          policy: "allowlist"          # open | allowlist | blacklist | admin_only | disabled
          allowlist:
            - "ou_user_open_id_1"
            - "ou_user_open_id_2"
        "oc_group_chat_id_2":
          policy: "admin_only"
        "oc_group_chat_id_3":
          policy: "blacklist"
          blacklist:
            - "ou_blocked_user"
```

| 策略 | 说明 |
|------|------|
| `open` | 群中任何人都可以使用 Bot |
| `allowlist` | 仅群 `allowlist` 中的用户可以使用 Bot |
| `blacklist` | 除 `blacklist` 中的用户外，所有人都可以使用 Bot |
| `admin_only` | 仅全局 `admins` 列表中的用户可以在此群使用 Bot |
| `disabled` | Bot 忽略此群的所有消息 |

未在 `group_rules` 中列出的群回退到 `default_group_policy`（默认为 `FEISHU_GROUP_POLICY` 的值）。

## 去重

入站消息使用消息 ID 以 24 小时 TTL 进行去重。去重状态在重启后持久化到 `~/.hermes/feishu_seen_message_ids.json`。

| 设置 | 环境变量 | 默认值 |
|------|---------|--------|
| 缓存大小 | `HERMES_FEISHU_DEDUP_CACHE_SIZE` | 2048 条 |

## 所有环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `FEISHU_APP_ID` | ✅ | — | 飞书/Lark App ID |
| `FEISHU_APP_SECRET` | ✅ | — | 飞书/Lark App Secret |
| `FEISHU_DOMAIN` | — | `feishu` | `feishu`（中国）或 `lark`（国际版） |
| `FEISHU_CONNECTION_MODE` | — | `websocket` | `websocket` 或 `webhook` |
| `FEISHU_ALLOWED_USERS` | — | _(空)_ | 逗号分隔的 open_id 用户白名单 |
| `FEISHU_HOME_CHANNEL` | — | — | 用于 Cron/通知输出的聊天 ID |
| `FEISHU_ENCRYPT_KEY` | — | _(空)_ | Webhook 签名验证的加密密钥 |
| `FEISHU_VERIFICATION_TOKEN` | — | _(空)_ | Webhook 载荷认证的验证 Token |
| `FEISHU_GROUP_POLICY` | — | `allowlist` | 群消息策略：`open`、`allowlist`、`disabled` |
| `FEISHU_BOT_OPEN_ID` | — | _(空)_ | Bot 的 open_id（用于 @提及检测） |
| `FEISHU_BOT_USER_ID` | — | _(空)_ | Bot 的 user_id（用于 @提及检测） |
| `FEISHU_BOT_NAME` | — | _(空)_ | Bot 的显示名称（用于 @提及检测） |
| `FEISHU_WEBHOOK_HOST` | — | `127.0.0.1` | Webhook 服务器绑定地址 |
| `FEISHU_WEBHOOK_PORT` | — | `8765` | Webhook 服务器端口 |
| `FEISHU_WEBHOOK_PATH` | — | `/feishu/webhook` | Webhook 端点路径 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | — | `2048` | 最大去重消息 ID 跟踪数 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` | — | `0.6` | 文本突发去抖静默期 |
| `HERMES_FEISHU_TEXT_BATCH_MAX_MESSAGES` | — | `8` | 每次文本批量合并的最大消息数 |
| `HERMES_FEISHU_TEXT_BATCH_MAX_CHARS` | — | `4000` | 每次文本批量合并的最大字符数 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | — | `0.8` | 媒体突发去抖静默期 |

WebSocket 和按群 ACL 设置通过 `config.yaml` 的 `platforms.feishu.extra` 配置（见上方 [WebSocket 调优](#websocket-tuning) 和 [按群访问控制](#per-group-access-control)）。

## 故障排除

| 问题 | 修复 |
|------|------|
| `lark-oapi not installed` | 安装 SDK：`pip install lark-oapi` |
| `websockets not installed; websocket mode unavailable` | 安装 websockets：`pip install websockets` |
| `aiohttp not installed; webhook mode unavailable` | 安装 aiohttp：`pip install aiohttp` |
| `FEISHU_APP_ID or FEISHU_APP_SECRET not set` | 设置两个环境变量或通过 `hermes gateway setup` 配置 |
| `Another local Hermes gateway is already using this Feishu app_id` | 同一 app_id 同时只能有一个 Hermes 实例使用。先停止另一个网关。 |
| Bot 在群中不回复 | 确保 Bot 被 @提及，检查 `FEISHU_GROUP_POLICY`，如果策略为 `allowlist` 验证发送者在 `FEISHU_ALLOWED_USERS` 中 |
| `Webhook rejected: invalid verification token` | 确保 `FEISHU_VERIFICATION_TOKEN` 与飞书应用事件订阅配置中的 Token 匹配 |
| `Webhook rejected: invalid signature` | 确保 `FEISHU_ENCRYPT_KEY` 与飞书应用配置中的加密密钥匹配 |
| 帖子消息显示为纯文本 | 飞书 API 拒绝了帖子载荷；这是正常的回退行为。查看日志了解详情。 |
| Bot 未收到图片/文件 | 授予 `im:message` 和 `im:resource` 权限范围给你的飞书应用 |
| Bot 身份未自动检测 | 授予 `admin:app.info:readonly` 范围，或手动设置 `FEISHU_BOT_OPEN_ID` / `FEISHU_BOT_NAME` |
| 点击审批按钮时出现错误 200340 | 在飞书开发者控制台启用 **交互式卡片** 能力并配置 **卡片请求网址**。见上方 [飞书应用配置要求](#required-feishu-app-configuration)。 |
| `Webhook rate limit exceeded` | 同一 IP 超过 120 请求/分钟。通常是配置错误或循环。 |

## 工具集

飞书 / Lark 使用 `hermes-feishu` 平台预设，包含与 Telegram 和其他基于网关的消息平台相同的核心工具。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/feishu)
