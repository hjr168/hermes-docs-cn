---
sidebar_position: 9
title: "Matrix"
description: "将 Hermes Agent 设置为 Matrix Bot"
---

# Matrix 设置

Hermes Agent 与 Matrix 集成 — 一个开放的联邦通讯协议。Matrix 让你运行自己的家庭服务器或使用公共服务器如 matrix.org — 无论哪种方式，你都掌控自己的通讯。Bot 通过 `mautrix` Python SDK 连接，通过 Hermes Agent 管道处理消息（包括工具使用、记忆和推理），并实时响应。它支持文本、文件附件、图片、音频、视频以及可选的端到端加密（E2EE）。

Hermes 适用于任何 Matrix 家庭服务器 — Synapse、Conduit、Dendrite 或 matrix.org。

在设置之前，先了解大多数人最关心的部分：Hermes 连接后的行为。

## Hermes 的行为

| 上下文 | 行为 |
|---------|----------|
| **私聊** | Hermes 响应每条消息。无需 `@mention`。每个私聊有独立的会话。设置 `MATRIX_DM_MENTION_THREADS=true` 可在 Bot 在私聊中被 `@mention` 时启动线程。 |
| **房间** | 默认情况下，Hermes 需要 `@mention` 才会响应。设置 `MATRIX_REQUIRE_MENTION=false` 或将房间 ID 添加到 `MATRIX_FREE_RESPONSE_ROOMS` 以启用自由响应房间。房间邀请会被自动接受。 |
| **线程** | Hermes 支持 Matrix 线程（MSC3440）。如果你在线程中回复，Hermes 会将线程上下文与主房间时间线隔离。Bot 已参与的线程不需要 @mention。 |
| **自动线程** | 默认情况下，Hermes 在房间中为每条它响应的消息自动创建线程。这保持对话隔离。设置 `MATRIX_AUTO_THREAD=false` 可禁用。 |
| **多用户共享房间** | 默认情况下，Hermes 在房间内按用户隔离会话历史。两个在同一房间中与 Hermes 交谈的人不会共享一个对话记录，除非你明确禁用此功能。 |

:::tip
Bot 在被邀请时会自动加入房间。只需将 Bot 的 Matrix 用户邀请到任何房间，它就会加入并开始响应。
:::

### Matrix 中的会话模型

默认情况下：

- 每个私聊有自己的会话
- 每个线程有自己的会话命名空间
- 共享房间中的每个用户在该房间内有自己的会话

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

### 提及和线程配置

你可以通过环境变量或 `config.yaml` 配置提及和自动线程行为：

```yaml
matrix:
  require_mention: true           # 房间中需要 @mention（默认：true）
  free_response_rooms:            # 免提及要求的房间
    - "!abc123:matrix.org"
  auto_thread: true               # 自动为响应创建线程（默认：true）
  dm_mention_threads: false       # 私聊中被 @mention 时创建线程（默认：false）
```

或通过环境变量：

```bash
MATRIX_REQUIRE_MENTION=true
MATRIX_FREE_RESPONSE_ROOMS=!abc123:matrix.org,!def456:matrix.org
MATRIX_AUTO_THREAD=true
MATRIX_DM_MENTION_THREADS=false
MATRIX_REACTIONS=true          # 默认：true — 处理期间的 emoji 反应
```

:::tip 禁用反应
`MATRIX_REACTIONS=false` 关闭 Bot 在入站消息上发布的处理生命周期 emoji 反应（👀/✅/❌）。适用于反应事件嘈杂或不被所有参与客户端支持的房间。
:::

:::note
如果你从没有 `MATRIX_REQUIRE_MENTION` 的版本升级，Bot 之前会响应房间中的所有消息。要保留该行为，设置 `MATRIX_REQUIRE_MENTION=false`。
:::

本指南将带你完成完整的设置过程 — 从创建 Bot 账户到发送你的第一条消息。

## 第 1 步：创建 Bot 账户

你需要为 Bot 创建一个 Matrix 用户账户。有几种方式：

### 方案 A：在你的家庭服务器上注册（推荐）

如果你运行自己的家庭服务器（Synapse、Conduit、Dendrite）：

1. 使用管理 API 或注册工具创建新用户：

```bash
# Synapse 示例
register_new_matrix_user -c /etc/synapse/homeserver.yaml http://localhost:8008
```

2. 选择一个用户名如 `hermes` — 完整用户 ID 将是 `@hermes:your-server.org`。

### 方案 B：使用 matrix.org 或其他公共家庭服务器

1. 访问 [Element Web](https://app.element.io) 创建新账户。
2. 为你的 Bot 选择一个用户名（如 `hermes-bot`）。

### 方案 C：使用你自己的账户

你也可以用自己的账户运行 Hermes。这意味着 Bot 以你的身份发布 — 适合个人助手。

## 第 2 步：获取访问令牌

Hermes 需要访问令牌来与家庭服务器认证。你有两个选择：

### 方案 A：访问令牌（推荐）

获取令牌最可靠的方式：

**通过 Element：**
1. 用 Bot 账户登录 [Element](https://app.element.io)。
2. 进入 **Settings** → **Help & About**。
3. 向下滚动并展开 **Advanced** — 访问令牌就在那里显示。
4. **立即复制它。**

**通过 API：**

```bash
curl -X POST https://your-server/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "@hermes:your-server.org",
    "password": "your-password"
  }'
```

响应包含 `access_token` 字段 — 复制它。

:::warning[保管好你的访问令牌]
访问令牌拥有 Bot 的 Matrix 账户的完全访问权限。永远不要公开分享或提交到 Git。如果泄露，通过登出该用户的所有会话来撤销它。
:::

### 方案 B：密码登录

除了提供访问令牌，你还可以给 Hermes 提供 Bot 的用户 ID 和密码。Hermes 会在启动时自动登录。这更简单但意味着密码存储在你的 `.env` 文件中。

```bash
MATRIX_USER_ID=@hermes:your-server.org
MATRIX_PASSWORD=your-password
```

## 第 3 步：查找你的 Matrix 用户 ID

Hermes Agent 使用你的 Matrix 用户 ID 来控制谁可以与 Bot 交互。Matrix 用户 ID 格式为 `@username:server`。

查找你的用户 ID：

1. 打开 [Element](https://app.element.io)（或你偏好的 Matrix 客户端）。
2. 点击你的头像 → **Settings**。
3. 你的用户 ID 显示在资料顶部（如 `@alice:matrix.org`）。

:::tip
Matrix 用户 ID 总是以 `@` 开头并包含 `:` 后跟服务器名称。例如：`@alice:matrix.org`、`@bob:your-server.com`。
:::

## 第 4 步：配置 Hermes Agent

### 方案 A：交互式设置（推荐）

运行引导设置命令：

```bash
hermes gateway setup
```

在提示时选择 **Matrix**，然后提供你的家庭服务器 URL、访问令牌（或用户 ID + 密码）和允许的用户 ID。

### 方案 B：手动配置

将以下内容添加到你的 `~/.hermes/.env` 文件：

**使用访问令牌：**

```bash
# 必需
MATRIX_HOMESERVER=https://matrix.example.org
MATRIX_ACCESS_TOKEN=***

# 可选：用户 ID（如果省略则从令牌自动检测）
# MATRIX_USER_ID=@hermes:matrix.example.org

# 安全：限制谁可以与 Bot 交互
MATRIX_ALLOWED_USERS=@alice:matrix.example.org

# 多个允许的用户（逗号分隔）
# MATRIX_ALLOWED_USERS=@alice:matrix.example.org,@bob:matrix.example.org
```

**使用密码登录：**

```bash
# 必需
MATRIX_HOMESERVER=https://matrix.example.org
MATRIX_USER_ID=@hermes:matrix.example.org
MATRIX_PASSWORD=***

# 安全
MATRIX_ALLOWED_USERS=@alice:matrix.example.org
```

在 `~/.hermes/config.yaml` 中的可选行为设置：

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` 保持每个参与者的上下文在共享房间内隔离

### 启动 Gateway

配置完成后，启动 Matrix Gateway：

```bash
hermes gateway
```

Bot 应该在几秒内连接到你的家庭服务器并开始同步。发送一条消息 — 私聊或它已加入的房间中 — 来测试。

:::tip
你可以在后台或作为 systemd 服务运行 `hermes gateway` 以保持持久运行。详见部署文档。
:::

## 端到端加密（E2EE）

Hermes 支持 Matrix 端到端加密，因此你可以在加密房间中与 Bot 聊天。

### 要求

E2EE 需要 `mautrix` 库的加密扩展和 `libolm` C 库：

```bash
# 安装 mautrix 的 E2EE 支持
pip install 'mautrix[encryption]'

# 或使用 hermes 扩展安装
pip install 'hermes-agent[matrix]'
```

你还需要系统上安装 `libolm`：

```bash
# Debian/Ubuntu
sudo apt install libolm-dev

# macOS
brew install libolm

# Fedora
sudo dnf install libolm-devel
```

### 启用 E2EE

添加到你的 `~/.hermes/.env`：

```bash
MATRIX_ENCRYPTION=true
```

启用 E2EE 后，Hermes 会：

- 将加密密钥存储在 `~/.hermes/platforms/matrix/store/`（旧安装：`~/.hermes/matrix/store/`）
- 首次连接时上传设备密钥
- 自动解密入站消息并加密出站消息
- 被邀请时自动加入加密房间

### 交叉签名验证（推荐）

如果你的 Matrix 账户启用了交叉签名（Element 中的默认设置），设置恢复密钥以便 Bot 可以在启动时自签其设备。没有这个，其他 Matrix 客户端可能在设备密钥轮换后拒绝与 Bot 共享加密会话。

```bash
MATRIX_RECOVERY_KEY=EsT... 你的恢复密钥
```

**在哪里找到它：** 在 Element 中，进入 **Settings** → **Security & Privacy** → **Encryption** → 你的恢复密钥（也称为"Security Key"）。这是你在首次设置交叉签名时被要求保存的密钥。

每次启动时，如果设置了 `MATRIX_RECOVERY_KEY`，Hermes 会从家庭服务器的安全秘密存储导入交叉签名密钥并签名当前设备。这是幂等的，可以安全地永久启用。

:::warning[删除加密存储]
如果你删除 `~/.hermes/platforms/matrix/store/crypto.db`，Bot 会失去加密身份。仅用相同设备 ID 重启**不会**完全恢复 — 家庭服务器仍然持有用旧身份密钥签名的一次性密钥，对等方无法建立新的 Olm 会话。

Hermes 会在启动时检测此情况并拒绝启用 E2EE，日志显示：`device XXXX has stale one-time keys on the server signed with a previous identity key`。

**最简单的恢复方式：生成新的访问令牌**（获取一个没有陈旧密钥历史的新设备 ID）。参见下方"从先前版本升级"部分。这是最可靠的路径，避免触碰家庭服务器数据库。

**手动恢复**（高级 — 保留相同设备 ID）：

1. 停止 Synapse 并从其数据库中删除旧设备：
   ```bash
   sudo systemctl stop matrix-synapse
   sudo sqlite3 /var/lib/matrix-synapse/homeserver.db "
     DELETE FROM e2e_device_keys_json WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
     DELETE FROM e2e_one_time_keys_json WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
     DELETE FROM e2e_fallback_keys_json WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
     DELETE FROM devices WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
   "
   sudo systemctl start matrix-synapse
   ```
   或通过 Synapse 管理 API（注意 URL 编码的用户 ID）：
   ```bash
   curl -X DELETE -H "Authorization: Bearer ADMIN_TOKEN" \
     'https://your-server/_synapse/admin/v2/users/%40hermes%3Ayour-server/devices/DEVICE_ID'
   ```
   注意：通过管理 API 删除设备可能也会使关联的访问令牌失效。之后可能需要生成新令牌。

2. 删除本地加密存储并重启 Hermes：
   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db*
   # 重启 hermes
   ```

其他 Matrix 客户端（Element、matrix-commander）可能缓存了旧设备密钥。恢复后，在 Element 中输入 `/discardsession` 强制与 Bot 建立新的加密会话。
:::

:::info
如果未安装 `mautrix[encryption]` 或缺少 `libolm`，Bot 会自动回退到普通（未加密）客户端。你会在日志中看到警告。
:::

## 主房间

你可以指定一个"主房间"，Bot 在其中发送主动消息（如 Cron 任务输出、提醒和通知）。有两种设置方式：

### 使用斜杠命令

在 Bot 所在的任何 Matrix 房间中输入 `/sethome`。该房间成为主房间。

### 手动配置

将此添加到 `~/.hermes/.env`：

```bash
MATRIX_HOME_ROOM=!abc123def456:matrix.example.org
```

:::tip
要查找房间 ID：在 Element 中，进入房间 → **Settings** → **Advanced** — **Internal room ID** 就在那里显示（以 `!` 开头）。
:::

## 故障排除

### Bot 不响应消息

**原因**：Bot 未加入房间，或 `MATRIX_ALLOWED_USERS` 未包含你的用户 ID。

**解决方案**：邀请 Bot 到房间 — 它会自动加入。验证你的用户 ID 在 `MATRIX_ALLOWED_USERS` 中（使用完整的 `@user:server` 格式）。重启 Gateway。

### 启动时"Failed to authenticate" / "whoami failed"

**原因**：访问令牌或家庭服务器 URL 不正确。

**解决方案**：验证 `MATRIX_HOMESERVER` 指向你的家庭服务器（包含 `https://`，无尾部斜杠）。检查 `MATRIX_ACCESS_TOKEN` 是否有效 — 用 curl 测试：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/_matrix/client/v3/account/whoami
```

如果返回你的用户信息，令牌有效。如果返回错误，生成新令牌。

### "mautrix not installed" 错误

**原因**：未安装 `mautrix` Python 包。

**解决方案**：安装它：

```bash
pip install 'mautrix[encryption]'
```

或使用 Hermes 扩展：

```bash
pip install 'hermes-agent[matrix]'
```

### 加密错误 / "could not decrypt event"

**原因**：缺少加密密钥、未安装 `libolm` 或 Bot 的设备不受信任。

**解决方案**：
1. 验证系统上安装了 `libolm`（参见上方 E2EE 部分）。
2. 确保在 `.env` 中设置了 `MATRIX_ENCRYPTION=true`。
3. 在你的 Matrix 客户端（Element）中，进入 Bot 的资料 → Sessions → 验证/信任 Bot 的设备。
4. 如果 Bot 刚加入加密房间，它只能解密加入**之后**发送的消息。更早的消息无法访问。

### 从先前版本升级（带 E2EE）

:::tip
如果你还手动删除了 `crypto.db`，参见上方 E2EE 部分中的"删除加密存储"警告 — 有额外的步骤需要清理家庭服务器中的陈旧一次性密钥。
:::

如果你之前使用 `MATRIX_ENCRYPTION=true` 并升级到使用新 SQLite 加密存储的版本，Bot 的加密身份已更改。你的 Matrix 客户端（Element）可能缓存了旧设备密钥并拒绝与 Bot 共享加密会话。

**症状**：Bot 连接并在日志中显示"E2EE enabled"，但所有消息显示"could not decrypt event"且 Bot 从不响应。

**原因**：旧的加密状态（来自先前的 `matrix-nio` 或基于序列化的 `mautrix` 后端）与新 SQLite 加密存储不兼容。Bot 创建了新的加密身份，但你的 Matrix 客户端仍然缓存了旧密钥且不会与密钥已更改的设备共享房间的加密会话。这是 Matrix 安全特性 — 客户端将同一设备的身份密钥更改视为可疑。

**修复**（一次性迁移）：

1. **生成新的访问令牌**以获取新的设备 ID。最简单的方式：

   ```bash
   curl -X POST https://your-server/_matrix/client/v3/login \
     -H "Content-Type: application/json" \
     -d '{
       "type": "m.login.password",
       "identifier": {"type": "m.id.user", "user": "@hermes:your-server.org"},
       "password": "***",
       "initial_device_display_name": "Hermes Agent"
     }'
   ```

   复制新的 `access_token` 并更新 `~/.hermes/.env` 中的 `MATRIX_ACCESS_TOKEN`。

2. **删除旧加密状态**：

   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db
   rm -f ~/.hermes/platforms/matrix/store/crypto_store.*
   ```

3. **设置你的恢复密钥**（如果你使用交叉签名 — 大多数 Element 用户都使用）。添加到 `~/.hermes/.env`：

   ```bash
   MATRIX_RECOVERY_KEY=EsT... 你的恢复密钥
   ```

   这让 Bot 在启动时可以用交叉签名密钥自签，这样 Element 会立即信任新设备。没有这个，Element 可能将新设备视为未验证并拒绝共享加密会话。在 Element 中的 **Settings** → **Security & Privacy** → **Encryption** 下找到你的恢复密钥。

4. **强制你的 Matrix 客户端轮换加密会话**。在 Element 中，打开与 Bot 的私聊房间并输入 `/discardsession`。这强制 Element 创建新的加密会话并与 Bot 的新设备共享。

5. **重启 Gateway**：

   ```bash
   hermes gateway run
   ```

   如果设置了 `MATRIX_RECOVERY_KEY`，你应该在日志中看到 `Matrix: cross-signing verified via recovery key`。

6. **发送新消息**。Bot 应该正常解密并响应。

:::note
迁移后，升级**之前**发送的消息无法解密 — 旧的加密密钥已丢失。这仅影响过渡期；新消息正常工作。
:::

:::tip
**新安装不受影响。** 此迁移仅在之前有工作正常的 E2EE 设置并升级 Hermes 版本时才需要。

**为什么需要新访问令牌？** 每个 Matrix 访问令牌绑定到特定设备 ID。用新加密密钥重用同一设备 ID 会导致其他 Matrix 客户端不信任该设备（它们将身份密钥更改视为潜在安全漏洞）。新访问令牌获取一个没有陈旧密钥历史的新设备 ID，因此其他客户端立即信任它。
:::

## 代理模式（macOS 上的 E2EE）

Matrix E2EE 需要 `libolm`，它在 macOS ARM64（Apple Silicon）上无法编译。`hermes-agent[matrix]` 扩展仅限 Linux。如果你使用 macOS，代理模式让你在 Linux VM 上的 Docker 容器中运行 E2EE，而实际 Agent 在 macOS 上原生运行，拥有完整的本地文件、记忆和 Skill 访问。

### 工作原理

```
macOS（主机）:
  └─ hermes gateway
       ├─ api_server 适配器 ← 监听 0.0.0.0:8642
       ├─ AIAgent ← 唯一真相来源
       ├─ 会话、记忆、Skill
       └─ 本地文件访问（Obsidian、项目等）

Linux VM（Docker）:
  └─ hermes gateway（代理模式）
       ├─ Matrix 适配器 ← E2EE 解密/加密
       └─ HTTP 转发 → macOS:8642/v1/chat/completions
           （无 LLM API 密钥，无 Agent，无推理）
```

Docker 容器仅处理 Matrix 协议 + E2EE。当消息到达时，它解密并通过标准 HTTP 请求将文本转发到主机。主机运行 Agent、调用工具、生成响应并流式传输回来。容器将响应加密并发送到 Matrix。所有会话统一 — CLI、Matrix、Telegram 和任何其他平台共享相同的记忆和对话历史。

### 第 1 步：配置主机（macOS）

启用 API Server 以便主机接受来自 Docker 容器的传入请求。

添加到 `~/.hermes/.env`：

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-key-here
API_SERVER_HOST=0.0.0.0
```

- `API_SERVER_HOST=0.0.0.0` 绑定到所有接口以便 Docker 容器可以访问。
- `API_SERVER_KEY` 是非回环绑定所必需的。选择一个强随机字符串。
- API Server 默认运行在端口 8642（如需要可用 `API_SERVER_PORT` 更改）。

启动 Gateway：

```bash
hermes gateway
```

你应该看到 API Server 与你配置的其他平台一起启动。从 VM 验证它是否可达：

```bash
# 从 Linux VM
curl http://<mac-ip>:8642/health
```

### 第 2 步：配置 Docker 容器（Linux VM）

容器需要 Matrix 凭据和代理 URL。它不需要 LLM API 密钥。

**`docker-compose.yml`：**

```yaml
services:
  hermes-matrix:
    build: .
    environment:
      # Matrix 凭据
      MATRIX_HOMESERVER: "https://matrix.example.org"
      MATRIX_ACCESS_TOKEN: "syt_..."
      MATRIX_ALLOWED_USERS: "@you:matrix.example.org"
      MATRIX_ENCRYPTION: "true"
      MATRIX_DEVICE_ID: "HERMES_BOT"

      # 代理模式 — 转发到主机 Agent
      GATEWAY_PROXY_URL: "http://192.168.1.100:8642"
      GATEWAY_PROXY_KEY: "your-secret-key-here"
    volumes:
      - ./matrix-store:/root/.hermes/platforms/matrix/store
```

**`Dockerfile`：**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y libolm-dev && rm -rf /var/lib/apt/lists/*
RUN pip install 'hermes-agent[matrix]'

CMD ["hermes", "gateway"]
```

这就是整个容器。没有 OpenRouter、Anthropic 或任何推理 Provider 的 API 密钥。

### 第 3 步：启动两者

1. 先启动主机 Gateway：
   ```bash
   hermes gateway
   ```

2. 启动 Docker 容器：
   ```bash
   docker compose up -d
   ```

3. 在加密的 Matrix 房间中发送一条消息。容器解密它，转发到主机，并流式传输响应回来。

### 配置参考

代理模式在**容器侧**（瘦 Gateway）配置：

| 设置 | 说明 |
|---------|-------------|
| `GATEWAY_PROXY_URL` | 远程 Hermes API Server 的 URL（如 `http://192.168.1.100:8642`） |
| `GATEWAY_PROXY_KEY` | 用于认证的 Bearer Token（必须与主机上的 `API_SERVER_KEY` 匹配） |
| `gateway.proxy_url` | 与 `GATEWAY_PROXY_URL` 相同但在 `config.yaml` 中 |

主机侧需要：

| 设置 | 说明 |
|---------|-------------|
| `API_SERVER_ENABLED` | 设为 `true` |
| `API_SERVER_KEY` | Bearer Token（与容器共享） |
| `API_SERVER_HOST` | 设为 `0.0.0.0` 以允许网络访问 |
| `API_SERVER_PORT` | 端口号（默认：`8642`） |

### 适用于任何平台

代理模式不限于 Matrix。任何平台适配器都可以使用它 — 在任何 Gateway 实例上设置 `GATEWAY_PROXY_URL`，它会转发到远程 Agent 而不是本地运行。这适用于平台适配器需要在与 Agent 不同环境中运行的任何部署（网络隔离、E2EE 要求、资源限制）。

:::tip
会话连续性通过 `X-Hermes-Session-Id` 头维持。主机的 API Server 通过此 ID 跟踪会话，因此对话跨消息持久化，就像本地 Agent 一样。
:::

:::note
**限制（v1）：** 来自远程 Agent 的工具进度消息不会中继回来 — 用户只看到流式传输的最终响应，而不是单个工具调用。危险命令批准提示在主机侧处理，不会中继到 Matrix 用户。这些可以在未来更新中解决。
:::

### 同步问题 / Bot 落后

**原因**：长时间运行的工具执行可能延迟同步循环，或家庭服务器响应慢。

**解决方案**：同步循环在出错时每 5 秒自动重试。检查 Hermes 日志中的同步相关警告。如果 Bot 持续落后，确保你的家庭服务器有足够资源。

### Bot 离线

**原因**：Hermes Gateway 未运行，或连接失败。

**解决方案**：检查 `hermes gateway` 是否在运行。查看终端输出中的错误消息。常见问题：错误的家庭服务器 URL、过期的访问令牌、家庭服务器不可达。

### "User not allowed" / Bot 忽略你

**原因**：你的用户 ID 不在 `MATRIX_ALLOWED_USERS` 中。

**解决方案**：在 `~/.hermes/.env` 中将你的用户 ID 添加到 `MATRIX_ALLOWED_USERS` 并重启 Gateway。使用完整的 `@user:server` 格式。

## 安全

:::warning
始终设置 `MATRIX_ALLOWED_USERS` 来限制谁可以与 Bot 交互。没有它，Gateway 默认拒绝所有用户作为安全措施。只添加你信任的人的用户 ID — 授权用户拥有 Agent 功能的完全访问权限，包括工具使用和系统访问。
:::

有关保护 Hermes Agent 部署的更多信息，参见[安全指南](../security.md)。

## 备注

- **任何家庭服务器**：适用于 Synapse、Conduit、Dendrite、matrix.org 或任何符合规范的 Matrix 家庭服务器。不需要特定的家庭服务器软件。
- **联邦**：如果你在联邦家庭服务器上，Bot 可以与其他服务器的用户通讯 — 只需将他们的完整 `@user:server` ID 添加到 `MATRIX_ALLOWED_USERS`。
- **自动加入**：Bot 自动接受房间邀请并加入。加入后立即开始响应。
- **媒体支持**：Hermes 可以发送和接收图片、音频、视频和文件附件。媒体使用 Matrix 内容仓库 API 上传到你的家庭服务器。
- **原生语音消息（MSC3245）**：Matrix 适配器自动为出站语音消息标记 `org.matrix.msc3245.voice` 标志。这意味着 TTS 响应和语音音频在 Element 和其他支持 MSC3245 的客户端中渲染为**原生语音气泡**，而非通用音频文件附件。带有 MSC3245 标志的入站语音消息也会被正确识别并路由到语音转文字转录。无需配置 — 自动工作。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/matrix)
