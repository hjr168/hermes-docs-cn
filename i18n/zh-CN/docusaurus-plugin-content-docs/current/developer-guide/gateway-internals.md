---
sidebar_position: 7
title: "Gateway 内部机制"
description: "消息 Gateway 如何启动、授权用户、路由会话和投递消息"
---

# Gateway 内部机制

消息 Gateway 是长期运行的进程，通过统一架构将 Hermes 连接到 14+ 个外部消息平台。

## 关键文件

| 文件 | 用途 |
|------|------|
| `gateway/run.py` | `GatewayRunner` — 主循环、斜杠命令、消息分发（约 9,000 行） |
| `gateway/session.py` | `SessionStore` — 对话持久化和会话键构建 |
| `gateway/delivery.py` | 出站消息投递到目标平台/频道 |
| `gateway/pairing.py` | 用户授权的 DM 配对流程 |
| `gateway/channel_directory.py` | 将聊天 ID 映射为人类可读名称用于 Cron 投递 |
| `gateway/hooks.py` | 钩子发现、加载和生命周期事件分发 |
| `gateway/mirror.py` | 用于 `send_message` 的跨会话消息镜像 |
| `gateway/status.py` | 配置文件范围的 Gateway 实例的 Token 锁管理 |
| `gateway/builtin_hooks/` | 始终注册的钩子（如 BOOT.md 系统提示钩子） |
| `gateway/platforms/` | 平台适配器（每个消息平台一个） |

## 架构概览

```text
┌─────────────────────────────────────────────────┐
│                  GatewayRunner                  │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Telegram │  │ Discord  │  │  Slack   │       │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │
│       └─────────────┼─────────────┘             │
│                     ▼                           │
│              _handle_message()                  │
│                     │                           │
│         ┌───────────┼───────────┐               │
│         ▼           ▼           ▼               │
│  Slash command   AIAgent    Queue/BG            │
│    dispatch      creation   sessions            │
│                     │                           │
│                     ▼                           │
│                 SessionStore                    │
│              (SQLite persistence)               │
└─────────────────────────────────────────────────┘
```

## 消息流程

当消息从任何平台到达：

1. **平台适配器**接收原始事件，标准化为 `MessageEvent`
2. **基础适配器**检查活跃会话守卫：
   - 如果该会话有 Agent 正在运行 → 排队消息，设置中断事件
   - 如果是 `/approve`、`/deny`、`/stop` → 绕过守卫（内联分发）
3. **GatewayRunner._handle_message()** 接收事件：
   - 通过 `_session_key_for_source()` 解析会话键（格式：`agent:main:{platform}:{chat_type}:{chat_id}`）
   - 检查授权（见下方授权部分）
   - 检查是否为斜杠命令 → 分发到命令处理器
   - 检查 Agent 是否已在运行 → 拦截 `/stop`、`/status` 等命令
   - 否则 → 创建 `AIAgent` 实例并运行对话
4. **响应**通过平台适配器发送回

### 会话键格式

会话键编码完整的路由上下文：

```
agent:main:{platform}:{chat_type}:{chat_id}
```

例如：`agent:main:telegram:private:123456789`

线程感知平台（Telegram 论坛话题、Discord 线程、Slack 线程）可能在 chat_id 部分包含线程 ID。**永远不要手动构建会话键** — 始终使用 `gateway/session.py` 中的 `build_session_key()`。

### 两级消息守卫

当 Agent 正在活跃运行时，传入消息通过两个顺序守卫：

1. **第 1 级 — 基础适配器**（`gateway/platforms/base.py`）：检查 `_active_sessions`。如果会话活跃，将消息排队到 `_pending_messages` 并设置中断事件。这在消息*到达* Gateway Runner 之前捕获消息。

2. **第 2 级 — Gateway Runner**（`gateway/run.py`）：检查 `_running_agents`。拦截特定命令（`/stop`、`/new`、`/queue`、`/status`、`/approve`、`/deny`）并适当路由。其他一切触发 `running_agent.interrupt()`。

必须在 Agent 阻塞时到达 Runner 的命令（如 `/approve`）通过 `await self._message_handler(event)` **内联**分发 — 它们绕过后台任务系统以避免竞态条件。

## 授权

Gateway 使用多层授权检查，按顺序评估：

1. **每平台允许所有标志**（如 `TELEGRAM_ALLOW_ALL_USERS`）— 如果设置，该平台所有用户都被授权
2. **平台白名单**（如 `TELEGRAM_ALLOWED_USERS`）— 逗号分隔的用户 ID
3. **DM 配对** — 已认证用户可以通过配对码配对新用户
4. **全局允许所有**（`GATEWAY_ALLOW_ALL_USERS`）— 如果设置，所有平台的所有用户都被授权
5. **默认：拒绝** — 未授权用户被拒绝

### DM 配对流程

```text
Admin: /pair
Gateway: "Pairing code: ABC123. Share with the user."
New user: ABC123
Gateway: "Paired! You're now authorized."
```

配对状态在 `gateway/pairing.py` 中持久化，重启后保留。

## 斜杠命令分发

Gateway 中所有斜杠命令通过相同的解析管道：

1. `hermes_cli/commands.py` 中的 `resolve_command()` 将输入映射到规范名称（处理别名、前缀匹配）
2. 规范名称与 `GATEWAY_KNOWN_COMMANDS` 对比检查
3. `_handle_message()` 中的处理器根据规范名称分发
4. 某些命令有配置门控（`CommandDef` 上的 `gateway_config_gate`）

### 运行中 Agent 守卫

在 Agent 处理时不得执行的命令会被提前拒绝：

```python
if _quick_key in self._running_agents:
    if canonical == "model":
        return "⏳ Agent is running — wait for it to finish or /stop first."
```

绕过命令（`/stop`、`/new`、`/approve`、`/deny`、`/queue`、`/status`）有特殊处理。

## 配置来源

Gateway 从多个来源读取配置：

| 来源 | 提供的内容 |
|------|-----------|
| `~/.hermes/.env` | API 密钥、Bot Token、平台凭证 |
| `~/.hermes/config.yaml` | 模型设置、工具配置、显示选项 |
| 环境变量 | 覆盖以上任何内容 |

与 CLI（使用带硬编码默认值的 `load_cli_config()`）不同，Gateway 通过 YAML 加载器直接读取 `config.yaml`。这意味着在 CLI 的默认值字典中存在但用户配置文件中不存在的配置键，在 CLI 和 Gateway 之间可能有不同行为。

## 平台适配器

每个消息平台在 `gateway/platforms/` 中有一个适配器：

```text
gateway/platforms/
├── base.py              # BaseAdapter — 所有平台共享逻辑
├── telegram.py          # Telegram Bot API（长轮询或 Webhook）
├── discord.py           # Discord bot 通过 discord.py
├── slack.py             # Slack Socket Mode
├── whatsapp.py          # WhatsApp Business Cloud API
├── signal.py            # Signal 通过 signal-cli REST API
├── matrix.py            # Matrix 通过 mautrix（可选 E2EE）
├── mattermost.py        # Mattermost WebSocket API
├── email.py             # Email 通过 IMAP/SMTP
├── sms.py               # SMS 通过 Twilio
├── dingtalk.py          # 钉钉 WebSocket
├── feishu.py            # 飞书/Lark WebSocket 或 Webhook
├── wecom.py             # 企业微信回调
├── weixin.py            # 微信（个人）通过 iLink Bot API
├── bluebubbles.py       # Apple iMessage 通过 BlueBubbles macOS 服务器
├── qqbot.py             # QQ Bot（腾讯 QQ）通过官方 API v2
├── webhook.py           # 入站/出站 Webhook 适配器
├── api_server.py        # REST API 服务器适配器
└── homeassistant.py     # Home Assistant 对话集成
```

适配器实现通用接口：
- `connect()` / `disconnect()` — 生命周期管理
- `send_message()` — 出站消息投递
- `on_message()` — 入站消息标准化 → `MessageEvent`

### Token 锁

使用唯一凭证连接的适配器在 `connect()` 中调用 `acquire_scoped_lock()`，在 `disconnect()` 中调用 `release_scoped_lock()`。这防止两个配置文件同时使用相同的 Bot Token。

## 投递路径

出站投递（`gateway/delivery.py`）处理：

- **直接回复** — 将响应发送回原始聊天
- **主频道投递** — 将 Cron 任务输出和后台结果路由到配置的主频道
- **显式目标投递** — `send_message` 工具指定 `telegram:-1001234567890`
- **跨平台投递** — 投递到与原始消息不同的平台

Cron 任务投递**不会**镜像到 Gateway 会话历史 — 它们仅存在于自己的 Cron 会话中。这是一个刻意的设计选择，避免消息交替违规。

## 钩子

Gateway 钩子是响应生命周期事件的 Python 模块：

### Gateway 钩子事件

| 事件 | 触发时机 |
|------|----------|
| `gateway:startup` | Gateway 进程启动 |
| `session:start` | 新对话会话开始 |
| `session:end` | 会话完成或超时 |
| `session:reset` | 用户用 `/new` 重置会话 |
| `agent:start` | Agent 开始处理消息 |
| `agent:step` | Agent 完成一次工具调用迭代 |
| `agent:end` | Agent 完成并返回响应 |
| `command:*` | 执行任何斜杠命令 |

钩子从 `gateway/builtin_hooks/`（始终活跃）和 `~/.hermes/hooks/`（用户安装）发现。每个钩子是一个包含 `HOOK.yaml` 清单和 `handler.py` 的目录。

## 记忆提供商集成

当记忆提供商插件（如 Honcho）启用时：

1. Gateway 为每条消息创建带会话 ID 的 `AIAgent`
2. `MemoryManager` 用会话上下文初始化提供商
3. 提供商工具（如 `honcho_profile`、`viking_search`）通过以下路由：

```text
AIAgent._invoke_tool()
  → self._memory_manager.handle_tool_call(name, args)
    → provider.handle_tool_call(name, args)
```

4. 在会话结束/重置时，`on_session_end()` 触发清理和最终数据刷新

### 记忆刷新生命周期

当会话被重置、恢复或过期：
1. 内置记忆刷新到磁盘
2. 记忆提供商的 `on_session_end()` 钩子触发
3. 一个临时 `AIAgent` 运行仅记忆的对话轮次
4. 上下文随后被丢弃或归档

## 后台维护

Gateway 在消息处理旁运行定期维护：

- **Cron 推进** — 检查任务计划并触发到期任务
- **会话过期** — 超时后清理废弃会话
- **记忆刷新** — 在会话过期前主动刷新记忆
- **缓存刷新** — 刷新模型列表和提供商状态

## 进程管理

Gateway 作为长期运行的进程运行，通过以下方式管理：

- `hermes gateway start` / `hermes gateway stop` — 手动控制
- `systemctl`（Linux）或 `launchctl`（macOS）— 服务管理
- `~/.hermes/gateway.pid` 的 PID 文件 — 配置文件范围的进程跟踪

**配置文件范围 vs 全局**：`start_gateway()` 使用配置文件范围的 PID 文件。`hermes gateway stop` 只停止当前配置文件的 Gateway。`hermes gateway stop --all` 使用全局 `ps aux` 扫描杀死所有 Gateway 进程（更新期间使用）。

## 相关文档

- [会话存储](./session-storage.md)
- [Cron 内部机制](./cron-internals.md)
- [ACP 内部机制](./acp-internals.md)
- [Agent 循环内部机制](./agent-loop.md)
- [消息 Gateway（用户指南）](/docs/user-guide/messaging)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/gateway-internals)
