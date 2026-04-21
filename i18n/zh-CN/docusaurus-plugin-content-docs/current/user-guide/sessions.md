---
sidebar_position: 7
title: "会话"
description: "会话持久化、恢复、搜索、管理和按平台会话跟踪"
---

# 会话

Hermes Agent 自动将每次对话保存为会话。会话支持对话恢复、跨会话搜索和完整的对话历史管理。

## 会话的工作原理

每次对话 —— 无论是来自 CLI、Telegram、Discord、Slack、WhatsApp、Signal、Matrix 还是其他消息平台 —— 都作为带有完整消息历史的会话存储。会话通过两个互补的系统跟踪：

1. **SQLite 数据库**（`~/.hermes/state.db`）— 带 FTS5 全文搜索的结构化会话元数据
2. **JSONL 转录文件**（`~/.hermes/sessions/`）— 包含工具调用的原始对话转录（网关）

SQLite 数据库存储：
- 会话 ID、来源平台、用户 ID
- **会话标题**（唯一、人类可读的名称）
- 模型名称和配置
- 系统提示快照
- 完整消息历史（角色、内容、工具调用、工具结果）
- Token 计数（输入/输出）
- 时间戳（started_at、ended_at）
- 父会话 ID（用于压缩触发的会话拆分）

### 会话来源

每个会话标记其来源平台：

| 来源 | 说明 |
|------|------|
| `cli` | 交互式 CLI（`hermes` 或 `hermes chat`） |
| `telegram` | Telegram |
| `discord` | Discord 服务器/私信 |
| `slack` | Slack 工作区 |
| `whatsapp` | WhatsApp |
| `signal` | Signal |
| `matrix` | Matrix 房间和私信 |
| `mattermost` | Mattermost 频道 |
| `email` | Email（IMAP/SMTP） |
| `sms` | 通过 Twilio 的 SMS |
| `dingtalk` | 钉钉 |
| `feishu` | 飞书 |
| `wecom` | 企业微信 |
| `weixin` | 微信（个人） |
| `bluebubbles` | 通过 BlueBubbles macOS 服务器的 Apple iMessage |
| `qqbot` | QQ Bot（腾讯 QQ）官方 API v2 |
| `homeassistant` | Home Assistant 对话 |
| `webhook` | 入站 Webhook |
| `api-server` | API 服务器请求 |
| `acp` | ACP 编辑器集成 |
| `cron` | 定时 Cron 任务 |
| `batch` | 批处理运行 |

## CLI 会话恢复

使用 `--continue` 或 `--resume` 从 CLI 恢复之前的对话：

### 继续上次会话

```bash
# 恢复最近的 CLI 会话
hermes --continue
hermes -c

# 或使用 chat 子命令
hermes chat --continue
hermes chat -c
```

这会从 SQLite 数据库中查找最近的 `cli` 会话并加载其完整对话历史。

### 按名称恢复

如果你给会话设置了标题（见下方[会话命名](#session-naming)），可以按名称恢复：

```bash
# 恢复命名的会话
hermes -c "my project"

# 如果有系列变体（my project、my project #2、my project #3），
# 这会自动恢复最近的一个
hermes -c "my project"   # → 恢复 "my project #3"
```

### 恢复指定会话

```bash
# 通过 ID 恢复指定会话
hermes --resume 20250305_091523_a1b2c3d4
hermes -r 20250305_091523_a1b2c3d4

# 通过标题恢复
hermes --resume "refactoring auth"

# 或使用 chat 子命令
hermes chat --resume 20250305_091523_a1b2c3d4
```

会话 ID 在退出 CLI 会话时显示，也可通过 `hermes sessions list` 查找。

### 恢复时的对话回顾 {#conversation-recap-on-resume}

恢复会话时，Hermes 在输入提示前显示一个样式化面板，展示之前对话的紧凑回顾：

<img className="docs-terminal-figure" src="/img/docs/session-recap.svg" alt="恢复 Hermes 会话时显示的之前对话回顾面板预览。" />
<p className="docs-figure-caption">恢复模式显示一个紧凑的回顾面板，包含最近的用户和助手轮次，然后返回实时提示符。</p>

回顾：
- 显示**用户消息**（金色 `●`）和**助手响应**（绿色 `◆`）
- **截断**长消息（用户 300 字符，助手 200 字符 / 3 行）
- **折叠**工具调用为计数加工具名（如 `[3 tool calls: terminal, web_search]`）
- **隐藏**系统消息、工具结果和内部推理
- **上限**为最近 10 次交互，带 "... N earlier messages ..." 指示器
- 使用**暗淡样式**与活跃对话区分

要禁用回顾并保持最小化的一行行为，在 `~/.hermes/config.yaml` 中设置：

```yaml
display:
  resume_display: minimal   # 默认：full
```

:::tip
会话 ID 遵循 `YYYYMMDD_HHMMSS_<8位十六进制>` 格式，如 `20250305_091523_a1b2c3d4`。你可以通过 ID 或标题恢复 —— `-c` 和 `-r` 都支持。
:::

## 会话命名 {#session-naming}

给会话人类可读的标题，方便查找和恢复。

### 自动生成标题

Hermes 在第一次交互后自动为每个会话生成简短描述性标题（3-7 个词）。这使用快速辅助模型在后台线程中运行，不增加延迟。使用 `hermes sessions list` 或 `hermes sessions browse` 浏览会话时会看到自动生成的标题。

自动命名每个会话只触发一次，如果你已经手动设置了标题则跳过。

### 手动设置标题

在任何聊天会话（CLI 或网关）中使用 `/title` 斜杠命令：

```
/title my research project
```

标题立即应用。如果会话尚未在数据库中创建（例如在发送第一条消息前运行 `/title`），它会排队等待会话开始后应用。

你也可以从命令行重命名现有会话：

```bash
hermes sessions rename 20250305_091523_a1b2c3d4 "refactoring auth module"
```

### 标题规则

- **唯一** — 没有两个会话可以共享相同标题
- **最多 100 字符** — 保持列表输出整洁
- **净化** — 控制字符、零宽字符和 RTL 覆盖会自动剥离
- **普通 Unicode 可以使用** — 表情符号、CJK、带重音字符均可

### 压缩时的自动系列化

当会话的上下文被压缩时（通过 `/compress` 手动或自动），Hermes 创建一个新的延续会话。如果原始会话有标题，新会话自动获得编号标题：

```
"my project" → "my project #2" → "my project #3"
```

按名称恢复时（`hermes -c "my project"`），自动选择系列中最近的会话。

### 消息平台中的 /title

`/title` 命令在所有网关平台（Telegram、Discord、Slack、WhatsApp）中可用：

- `/title My Research` — 设置会话标题
- `/title` — 显示当前标题

## 会话管理命令

Hermes 通过 `hermes sessions` 提供完整的会话管理命令集：

### 列出会话

```bash
# 列出最近的会话（默认：最近 20 个）
hermes sessions list

# 按平台过滤
hermes sessions list --source telegram

# 显示更多会话
hermes sessions list --limit 50
```

当会话有标题时，输出显示标题、预览和相对时间戳：

```
Title                  Preview                                  Last Active   ID
────────────────────────────────────────────────────────────────────────────────────────────────
refactoring auth       Help me refactor the auth module please   2h ago        20250305_091523_a
my project #3          Can you check the test failures?          yesterday     20250304_143022_e
—                      What's the weather in Las Vegas?          3d ago        20250303_101500_f
```

当没有会话有标题时，使用更简单的格式：

```
Preview                                            Last Active   Src    ID
──────────────────────────────────────────────────────────────────────────────────────
Help me refactor the auth module please             2h ago        cli    20250305_091523_a
What's the weather in Las Vegas?                    3d ago        tele   20250303_101500_f
```

### 导出会话

```bash
# 导出所有会话到 JSONL 文件
hermes sessions export backup.jsonl

# 导出特定平台的会话
hermes sessions export telegram-history.jsonl --source telegram

# 导出单个会话
hermes sessions export session.jsonl --session-id 20250305_091523_a1b2c3d4
```

导出文件每行一个 JSON 对象，包含完整会话元数据和所有消息。

### 删除会话

```bash
# 删除指定会话（带确认）
hermes sessions delete 20250305_091523_a1b2c3d4

# 删除无需确认
hermes sessions delete 20250305_091523_a1b2c3d4 --yes
```

### 重命名会话

```bash
# 设置或更改会话标题
hermes sessions rename 20250305_091523_a1b2c3d4 "debugging auth flow"

# 多词标题在 CLI 中不需要引号
hermes sessions rename 20250305_091523_a1b2c3d4 debugging auth flow
```

如果标题已被其他会话使用，会显示错误。

### 清理旧会话

```bash
# 删除 90 天前已结束的会话（默认）
hermes sessions prune

# 自定义年龄阈值
hermes sessions prune --older-than 30

# 仅清理特定平台
hermes sessions prune --source telegram --older-than 60

# 跳过确认
hermes sessions prune --older-than 30 --yes
```

:::info
清理仅删除**已结束**的会话（已显式结束或自动重置的会话）。活跃会话永远不会被清理。
:::

### 会话统计

```bash
hermes sessions stats
```

输出：

```
Total sessions: 142
Total messages: 3847
  cli: 89 sessions
  telegram: 38 sessions
  discord: 15 sessions
Database size: 12.4 MB
```

更深入的分析 —— Token 使用、费用估算、工具分类和活动模式 —— 使用 [`hermes insights`](/docs/reference/cli-commands#hermes-insights)。

## 会话搜索工具

Agent 有内置的 `session_search` 工具，使用 SQLite 的 FTS5 引擎对所有历史对话进行全文搜索。

### 工作原理

1. FTS5 搜索匹配的消息，按相关性排名
2. 按会话分组，取前 N 个唯一会话（默认 3 个）
3. 加载每个会话的对话，截断到匹配点附近约 100K 字符
4. 发送到快速摘要模型获取聚焦摘要
5. 返回每个会话的摘要，附带元数据和周围上下文

### FTS5 查询语法

搜索支持标准 FTS5 查询语法：

- 简单关键词：`docker deployment`
- 短语：`"exact phrase"`
- 布尔：`docker OR kubernetes`、`python NOT java`
- 前缀：`deploy*`

### 何时使用

Agent 被提示自动使用会话搜索：

> *"当用户引用过去对话中的内容，或你怀疑存在相关的先前上下文时，使用 session_search 在要求用户重复之前将其召回。"*

## 按平台会话跟踪

### 网关会话

在消息平台上，会话通过从消息源构建的确定性会话键来标识：

| 聊天类型 | 默认键格式 | 行为 |
|---------|-----------|------|
| Telegram 私信 | `agent:main:telegram:dm:<chat_id>` | 每个私聊一个会话 |
| Discord 私信 | `agent:main:discord:dm:<chat_id>` | 每个私聊一个会话 |
| WhatsApp 私信 | `agent:main:whatsapp:dm:<chat_id>` | 每个私聊一个会话 |
| 群聊 | `agent:main:<platform>:group:<chat_id>:<user_id>` | 当平台提供用户 ID 时，群内按用户隔离 |
| 群组线程/话题 | `agent:main:<platform>:group:<chat_id>:<thread_id>` | 所有线程参与者的共享会话（默认）。设置 `thread_sessions_per_user: true` 可按用户隔离。 |
| 频道 | `agent:main:<platform>:channel:<chat_id>:<user_id>` | 当平台提供用户 ID 时，频道内按用户隔离 |

当 Hermes 无法获取共享聊天的参与者标识时，回退到该房间的一个共享会话。

### 共享 vs 隔离群组会话

默认情况下，Hermes 使用 `group_sessions_per_user: true`。这意味着：

- Alice 和 Bob 可以在同一个 Discord 频道中与 Hermes 对话，不共享转录历史
- 一个用户的长工具密集任务不会污染另一个用户的上下文窗口
- 中断处理也按用户隔离，因为运行中的 Agent 键匹配隔离的会话键

如果你想要一个共享的"房间大脑"，设置：

```yaml
group_sessions_per_user: false
```

这会将群组/频道恢复为每个房间一个共享会话，保留共享的对话上下文，但也共享 Token 费用、中断状态和上下文增长。

### 会话重置策略

网关会话根据可配置的策略自动重置：

- **idle** — 不活跃 N 分钟后重置
- **daily** — 每天在特定时间重置
- **both** — 以先触发的为准（空闲或每日）
- **none** — 从不自动重置

会话自动重置前，Agent 会有一次机会保存对话中的重要记忆或 Skill。

有**活跃后台进程**的会话永远不会自动重置，无论策略如何。

## 存储位置

| 内容 | 路径 | 说明 |
|------|------|------|
| SQLite 数据库 | `~/.hermes/state.db` | 所有会话元数据 + 带 FTS5 的消息 |
| 网关转录 | `~/.hermes/sessions/` | 每个会话的 JSONL 转录 + sessions.json 索引 |
| 网关索引 | `~/.hermes/sessions/sessions.json` | 会话键到活跃会话 ID 的映射 |

SQLite 数据库使用 WAL 模式支持并发读取和单一写入，适合网关的多平台架构。

### 数据库模式

`state.db` 中的关键表：

- **sessions** — 会话元数据（id、source、user_id、model、title、timestamps、token counts）。标题有唯一索引（允许 NULL 标题，仅非 NULL 必须唯一）。
- **messages** — 完整消息历史（role、content、tool_calls、tool_name、token_count）
- **messages_fts** — 用于消息内容全文搜索的 FTS5 虚拟表

## 会话过期与清理

### 自动清理

- 网关会话根据配置的重置策略自动重置
- 重置前，Agent 保存即将过期会话中的记忆和 Skill
- 已结束的会话保留在数据库中直到被清理

### 手动清理

```bash
# 清理 90 天前的会话
hermes sessions prune

# 删除指定会话
hermes sessions delete <session_id>

# 清理前导出（备份）
hermes sessions export backup.jsonl
hermes sessions prune --older-than 30 --yes
```

:::tip
数据库增长缓慢（典型：数百个会话占用 10-15 MB）。清理主要用于移除你不再需要用于搜索回溯的旧对话。
:::

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/sessions)
