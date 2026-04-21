---
sidebar_position: 6
title: "Event Hooks（事件钩子）"
description: "在关键生命周期节点运行自定义代码 — 记录活动、发送警报、调用 Webhook"
---

# Event Hooks（事件钩子）

Hermes 有两个钩子系统，可在关键生命周期节点运行自定义代码：

| 系统 | 注册方式 | 运行环境 | 使用场景 |
|--------|---------------|---------|----------|
| **[Gateway 钩子](#gateway-event-hooks)** | `~/.hermes/hooks/` 中的 `HOOK.yaml` + `handler.py` | 仅 Gateway | 日志记录、警报、Webhook |
| **[Plugin 钩子](#plugin-hooks)** | [插件](/docs/user-guide/features/plugins)中的 `ctx.register_hook()` | CLI + Gateway | 工具拦截、指标收集、防护栏 |

两个系统都是非阻塞的 — 任何钩子中的错误都会被捕获并记录日志，绝不会导致 Agent 崩溃。

## Gateway Event Hooks

Gateway 钩子在网关运行期间（Telegram、Discord、Slack、WhatsApp）自动触发，不会阻塞主 Agent 管道。

### 创建钩子

每个钩子是 `~/.hermes/hooks/` 下的一个目录，包含两个文件：

```text
~/.hermes/hooks/
└── my-hook/
    ├── HOOK.yaml      # 声明要监听哪些事件
    └── handler.py     # Python 处理函数
```

#### HOOK.yaml

```yaml
name: my-hook
description: 将所有 Agent 活动记录到文件
events:
  - agent:start
  - agent:end
  - agent:step
```

`events` 列表决定哪些事件会触发你的处理函数。你可以订阅任意事件组合，包括通配符如 `command:*`。

#### handler.py

```python
import json
from datetime import datetime
from pathlib import Path

LOG_FILE = Path.home() / ".hermes" / "hooks" / "my-hook" / "activity.log"

async def handle(event_type: str, context: dict):
    """每个订阅事件触发时调用。必须命名为 'handle'。"""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        **context,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

**处理函数规则：**
- 必须命名为 `handle`
- 接收 `event_type`（字符串）和 `context`（字典）
- 可以是 `async def` 或普通 `def` — 两者都可以
- 错误会被捕获并记录日志，绝不会导致 Agent 崩溃

### 可用事件

| 事件 | 何时触发 | 上下文键 |
|-------|---------------|--------------|
| `gateway:startup` | Gateway 进程启动 | `platforms`（活跃平台名称列表） |
| `session:start` | 新的消息会话创建 | `platform`, `user_id`, `session_id`, `session_key` |
| `session:end` | 会话结束（重置前） | `platform`, `user_id`, `session_key` |
| `session:reset` | 用户运行 `/new` 或 `/reset` | `platform`, `user_id`, `session_key` |
| `agent:start` | Agent 开始处理消息 | `platform`, `user_id`, `session_id`, `message` |
| `agent:step` | 工具调用循环的每次迭代 | `platform`, `user_id`, `session_id`, `iteration`, `tool_names` |
| `agent:end` | Agent 完成处理 | `platform`, `user_id`, `session_id`, `message`, `response` |
| `command:*` | 执行任何斜杠命令 | `platform`, `user_id`, `command`, `args` |

#### 通配符匹配

为 `command:*` 注册的处理函数会在任何 `command:` 事件（`command:model`、`command:reset` 等）时触发。通过一次订阅即可监控所有斜杠命令。

### 示例

#### 启动检查清单（BOOT.md）— 内置

Gateway 内置了 `boot-md` 钩子，每次启动时会查找 `~/.hermes/BOOT.md`。如果文件存在，Agent 会在后台会话中执行其指令。无需安装 — 只需创建文件即可。

**创建 `~/.hermes/BOOT.md`：**

```markdown
# 启动检查清单

1. 检查是否有 Cron 任务在夜间失败 — 运行 `hermes cron list`
2. 向 Discord #general 发送消息 "Gateway 已重启，所有系统正常"
3. 检查 /opt/app/deploy.log 中过去 24 小时是否有错误
```

Agent 在后台线程中运行这些指令，因此不会阻塞 Gateway 启动。如果无需关注的事项，Agent 会回复 `[SILENT]`，不投递任何消息。

:::tip
没有 BOOT.md？钩子会静默跳过 — 零开销。需要启动自动化时创建文件，不需要时删除即可。
:::

#### 长任务 Telegram 警报

当 Agent 执行超过 10 步时给自己发送消息：

```yaml
# ~/.hermes/hooks/long-task-alert/HOOK.yaml
name: long-task-alert
description: Agent 运行步数过多时发出警报
events:
  - agent:step
```

```python
# ~/.hermes/hooks/long-task-alert/handler.py
import os
import httpx

THRESHOLD = 10
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_HOME_CHANNEL")

async def handle(event_type: str, context: dict):
    iteration = context.get("iteration", 0)
    if iteration == THRESHOLD and BOT_TOKEN and CHAT_ID:
        tools = ", ".join(context.get("tool_names", []))
        text = f"⚠️ Agent 已运行 {iteration} 步。最近工具: {tools}"
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": CHAT_ID, "text": text},
            )
```

#### 命令使用日志

跟踪哪些斜杠命令被使用：

```yaml
# ~/.hermes/hooks/command-logger/HOOK.yaml
name: command-logger
description: 记录斜杠命令使用情况
events:
  - command:*
```

```python
# ~/.hermes/hooks/command-logger/handler.py
import json
from datetime import datetime
from pathlib import Path

LOG = Path.home() / ".hermes" / "logs" / "command_usage.jsonl"

def handle(event_type: str, context: dict):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": datetime.now().isoformat(),
        "command": context.get("command"),
        "args": context.get("args"),
        "platform": context.get("platform"),
        "user": context.get("user_id"),
    }
    with open(LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

#### 会话启动 Webhook

新会话时 POST 到外部服务：

```yaml
# ~/.hermes/hooks/session-webhook/HOOK.yaml
name: session-webhook
description: 新会话时通知外部服务
events:
  - session:start
  - session:reset
```

```python
# ~/.hermes/hooks/session-webhook/handler.py
import httpx

WEBHOOK_URL = "https://your-service.example.com/hermes-events"

async def handle(event_type: str, context: dict):
    async with httpx.AsyncClient() as client:
        await client.post(WEBHOOK_URL, json={
            "event": event_type,
            **context,
        }, timeout=5)
```

### 工作原理

1. Gateway 启动时，`HookRegistry.discover_and_load()` 扫描 `~/.hermes/hooks/`
2. 每个包含 `HOOK.yaml` + `handler.py` 的子目录被动态加载
3. 处理函数为其声明的事件注册
4. 在每个生命周期节点，`hooks.emit()` 触发所有匹配的处理函数
5. 任何处理函数中的错误都会被捕获并记录 — 损坏的钩子绝不会导致 Agent 崩溃

:::info
Gateway 钩子只在 **Gateway**（Telegram、Discord、Slack、WhatsApp）中触发。CLI 不会加载 Gateway 钩子。要在所有环境都可用的钩子，请使用 [Plugin 钩子](#plugin-hooks)。
:::

## Plugin Hooks

[插件](/docs/user-guide/features/plugins)可以注册在 **CLI 和 Gateway** 会话中都会触发的钩子。这些通过插件 `register()` 函数中的 `ctx.register_hook()` 编程式注册。

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", my_tool_observer)
    ctx.register_hook("post_tool_call", my_tool_logger)
    ctx.register_hook("pre_llm_call", my_memory_callback)
    ctx.register_hook("post_llm_call", my_sync_callback)
    ctx.register_hook("on_session_start", my_init_callback)
    ctx.register_hook("on_session_end", my_cleanup_callback)
```

**所有钩子的通用规则：**

- 回调接收**关键字参数**。始终接受 `**kwargs` 以保持前向兼容 — 未来版本可能添加新参数而不会破坏你的插件。
- 如果回调**崩溃**，会被记录并跳过。其他钩子和 Agent 继续正常运行。行为异常的插件绝不会破坏 Agent。
- 所有钩子都是**即发即弃的观察者**，其返回值被忽略 — 除了 `pre_llm_call`，它可以[注入上下文](#pre_llm_call)。

### 快速参考

| 钩子 | 触发时机 | 返回值 |
|------|-----------|---------|
| [`pre_tool_call`](#pre_tool_call) | 任何工具执行之前 | 忽略 |
| [`post_tool_call`](#post_tool_call) | 任何工具返回之后 | 忽略 |
| [`pre_llm_call`](#pre_llm_call) | 每轮一次，工具调用循环之前 | 上下文注入 |
| [`post_llm_call`](#post_llm_call) | 每轮一次，工具调用循环之后 | 忽略 |
| [`on_session_start`](#on_session_start) | 新会话创建（仅第一轮） | 忽略 |
| [`on_session_end`](#on_session_end) | 会话结束 | 忽略 |
| [`on_session_finalize`](#on_session_finalize) | CLI/Gateway 拆卸活跃会话（刷新、保存、统计） | 忽略 |
| [`on_session_reset`](#on_session_reset) | Gateway 切换新的会话键（如 `/new`、`/reset`） | 忽略 |

---

### `pre_tool_call`

在每个工具执行**之前立即触发** — 包括内置工具和插件工具。

**回调签名：**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `tool_name` | `str` | 即将执行的工具名称（如 `"terminal"`、`"web_search"`、`"read_file"`） |
| `args` | `dict` | 模型传递给工具的参数 |
| `task_id` | `str` | 会话/任务标识符。未设置时为空字符串。 |

**触发位置：** 在 `model_tools.py` 的 `handle_function_call()` 中，工具处理函数运行之前。每次工具调用触发一次 — 如果模型并行调用 3 个工具，则触发 3 次。

**返回值：** 忽略。

**使用场景：** 日志记录、审计追踪、工具调用计数器、阻止危险操作（打印警告）、速率限制。

**示例 — 工具调用审计日志：**

```python
import json, logging
from datetime import datetime

logger = logging.getLogger(__name__)

def audit_tool_call(tool_name, args, task_id, **kwargs):
    logger.info("TOOL_CALL session=%s tool=%s args=%s",
                task_id, tool_name, json.dumps(args)[:200])

def register(ctx):
    ctx.register_hook("pre_tool_call", audit_tool_call)
```

**示例 — 危险工具警告：**

```python
DANGEROUS = {"terminal", "write_file", "patch"}

def warn_dangerous(tool_name, **kwargs):
    if tool_name in DANGEROUS:
        print(f"⚠ 正在执行潜在危险工具: {tool_name}")

def register(ctx):
    ctx.register_hook("pre_tool_call", warn_dangerous)
```

---

### `post_tool_call`

在每个工具执行返回**之后立即触发**。

**回调签名：**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `tool_name` | `str` | 刚执行的工具名称 |
| `args` | `dict` | 模型传递给工具的参数 |
| `result` | `str` | 工具的返回值（始终为 JSON 字符串） |
| `task_id` | `str` | 会话/任务标识符。未设置时为空字符串。 |

**触发位置：** 在 `model_tools.py` 的 `handle_function_call()` 中，工具处理函数返回之后。每次工具调用触发一次。如果工具抛出未处理的异常**不会**触发（错误被捕获并作为错误 JSON 字符串返回，`post_tool_call` 会以该错误字符串作为 `result` 触发）。

**返回值：** 忽略。

**使用场景：** 记录工具结果、指标收集、跟踪工具成功/失败率、特定工具完成时发送通知。

**示例 — 跟踪工具使用指标：**

```python
from collections import Counter
import json

_tool_counts = Counter()
_error_counts = Counter()

def track_metrics(tool_name, result, **kwargs):
    _tool_counts[tool_name] += 1
    try:
        parsed = json.loads(result)
        if "error" in parsed:
            _error_counts[tool_name] += 1
    except (json.JSONDecodeError, TypeError):
        pass

def register(ctx):
    ctx.register_hook("post_tool_call", track_metrics)
```

---

### `pre_llm_call`

**每轮一次**，在工具调用循环开始之前触发。这是**唯一一个返回值被使用的钩子** — 它可以向当前轮次的用户消息注入上下文。

**回调签名：**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `session_id` | `str` | 当前会话的唯一标识符 |
| `user_message` | `str` | 用户本轮的原始消息（在任何 Skill 注入之前） |
| `conversation_history` | `list` | 完整消息列表的副本（OpenAI 格式：`[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 如果是新会话的第一轮则为 `True`，后续轮次为 `False` |
| `model` | `str` | 模型标识符（如 `"anthropic/claude-sonnet-4.6"`） |
| `platform` | `str` | 会话运行位置：`"cli"`、`"telegram"`、`"discord"` 等 |

**触发位置：** 在 `run_agent.py` 的 `run_conversation()` 中，上下文压缩之后、主 `while` 循环之前。每次 `run_conversation()` 调用触发一次（即每个用户轮次一次），而不是工具循环中的每次 API 调用。

**返回值：** 如果回调返回包含 `"context"` 键的字典或普通非空字符串，文本会被追加到当前轮次的用户消息中。返回 `None` 则不注入。

```python
# 注入上下文
return {"context": "召回的记忆:\n- 用户喜欢 Python\n- 正在开发 hermes-agent"}

# 普通字符串（等效）
return "召回的记忆:\n- 用户喜欢 Python"

# 不注入
return None
```

**上下文注入位置：** 始终注入到**用户消息**中，而非系统提示。这保留了提示缓存 — 系统提示在各轮之间保持不变，因此缓存的 Token 可以复用。系统提示是 Hermes 的领域（模型引导、工具执行、个性、Skill）。插件在用户输入旁边贡献上下文。

所有注入的上下文都是**临时的** — 仅在 API 调用时添加。对话历史中的原始用户消息永远不会被修改，也不会有任何内容持久化到会话数据库。

当**多个插件**返回上下文时，它们的输出按插件发现顺序（按目录名字母顺序）以双换行符连接。

**使用场景：** 记忆召回、RAG 上下文注入、防护栏、每轮分析。

**示例 — 记忆召回：**

```python
import httpx

MEMORY_API = "https://your-memory-api.example.com"

def recall(session_id, user_message, is_first_turn, **kwargs):
    try:
        resp = httpx.post(f"{MEMORY_API}/recall", json={
            "session_id": session_id,
            "query": user_message,
        }, timeout=3)
        memories = resp.json().get("results", [])
        if not memories:
            return None
        text = "召回的上下文:\n" + "\n".join(f"- {m['text']}" for m in memories)
        return {"context": text}
    except Exception:
        return None

def register(ctx):
    ctx.register_hook("pre_llm_call", recall)
```

**示例 — 防护栏：**

```python
POLICY = "永远不要在未经用户明确确认的情况下执行删除文件的命令。"

def guardrails(**kwargs):
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", guardrails)
```

---

### `post_llm_call`

**每轮一次**，在工具调用循环完成且 Agent 产生最终响应后触发。仅在**成功**轮次触发 — 如果轮次被中断则不会触发。

**回调签名：**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `session_id` | `str` | 当前会话的唯一标识符 |
| `user_message` | `str` | 用户本轮的原始消息 |
| `assistant_response` | `str` | Agent 本轮的最终文本响应 |
| `conversation_history` | `list` | 轮次完成后的完整消息列表副本 |
| `model` | `str` | 模型标识符 |
| `platform` | `str` | 会话运行位置 |

**触发位置：** 在 `run_agent.py` 的 `run_conversation()` 中，工具循环以最终响应退出后。受 `if final_response and not interrupted` 保护 — 所以当用户在轮次中途中断或 Agent 达到迭代限制而未产生响应时**不会**触发。

**返回值：** 忽略。

**使用场景：** 将对话数据同步到外部记忆系统、计算响应质量指标、记录轮次摘要、触发后续操作。

**示例 — 同步到外部记忆：**

```python
import httpx

MEMORY_API = "https://your-memory-api.example.com"

def sync_memory(session_id, user_message, assistant_response, **kwargs):
    try:
        httpx.post(f"{MEMORY_API}/store", json={
            "session_id": session_id,
            "user": user_message,
            "assistant": assistant_response,
        }, timeout=5)
    except Exception:
        pass  # 尽力而为

def register(ctx):
    ctx.register_hook("post_llm_call", sync_memory)
```

**示例 — 跟踪响应长度：**

```python
import logging
logger = logging.getLogger(__name__)

def log_response_length(session_id, assistant_response, model, **kwargs):
    logger.info("RESPONSE session=%s model=%s chars=%d",
                session_id, model, len(assistant_response or ""))

def register(ctx):
    ctx.register_hook("post_llm_call", log_response_length)
```

---

### `on_session_start`

在全**新**会话创建时触发**一次**。不会在会话继续时触发（用户在现有会话中发送第二条消息）。

**回调签名：**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `session_id` | `str` | 新会话的唯一标识符 |
| `model` | `str` | 模型标识符 |
| `platform` | `str` | 会话运行位置 |

**触发位置：** 在 `run_agent.py` 的 `run_conversation()` 中，新会话的第一轮期间 — 具体来说是在系统提示构建之后、工具循环开始之前。检查条件为 `if not conversation_history`（没有先前消息 = 新会话）。

**返回值：** 忽略。

**使用场景：** 初始化会话范围状态、预热缓存、向外部服务注册会话、记录会话开始。

**示例 — 初始化会话缓存：**

```python
_session_caches = {}

def init_session(session_id, model, platform, **kwargs):
    _session_caches[session_id] = {
        "model": model,
        "platform": platform,
        "tool_calls": 0,
        "started": __import__("datetime").datetime.now().isoformat(),
    }

def register(ctx):
    ctx.register_hook("on_session_start", init_session)
```

---

### `on_session_end`

在每次 `run_conversation()` 调用的**最后**触发，无论结果如何。如果用户在 Agent 处理中途退出，也会从 CLI 的退出处理程序中触发。

**回调签名：**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `session_id` | `str` | 会话的唯一标识符 |
| `completed` | `bool` | Agent 是否产生了最终响应 |
| `interrupted` | `bool` | 轮次是否被中断（用户发送新消息、`/stop` 或退出） |
| `model` | `str` | 模型标识符 |
| `platform` | `str` | 会话运行位置 |

**触发位置：** 两处：
1. **`run_agent.py`** — 每次 `run_conversation()` 调用结束时，所有清理之后。始终触发，即使轮次出错。
2. **`cli.py`** — CLI 的 atexit 处理程序中，但**仅当**退出时 Agent 正在处理（`_agent_running=True`）。这捕获了处理期间的 Ctrl+C 和 `/exit`。此时 `completed=False` 且 `interrupted=True`。

**返回值：** 忽略。

**使用场景：** 刷新缓冲区、关闭连接、持久化会话状态、记录会话持续时间、清理在 `on_session_start` 中初始化的资源。

**示例 — 刷新和清理：**

```python
_session_caches = {}

def cleanup_session(session_id, completed, interrupted, **kwargs):
    cache = _session_caches.pop(session_id, None)
    if cache:
        # 将累积数据刷新到磁盘或外部服务
        status = "completed" if completed else ("interrupted" if interrupted else "failed")
        print(f"会话 {session_id} 结束: {status}, {cache['tool_calls']} 次工具调用")

def register(ctx):
    ctx.register_hook("on_session_end", cleanup_session)
```

**示例 — 会话持续时间跟踪：**

```python
import time, logging
logger = logging.getLogger(__name__)

_start_times = {}

def on_start(session_id, **kwargs):
    _start_times[session_id] = time.time()

def on_end(session_id, completed, interrupted, **kwargs):
    start = _start_times.pop(session_id, None)
    if start:
        duration = time.time() - start
        logger.info("SESSION_DURATION session=%s seconds=%.1f completed=%s interrupted=%s",
                     session_id, duration, completed, interrupted)

def register(ctx):
    ctx.register_hook("on_session_start", on_start)
    ctx.register_hook("on_session_end", on_end)
```

---

### `on_session_finalize`

当 CLI 或 Gateway **拆卸**活跃会话时触发 — 例如用户运行 `/new`、Gateway 回收空闲会话、或 CLI 在有活跃 Agent 时退出。这是在会话身份消失之前刷新与传出会话相关状态的最后机会。

**回调签名：**

```python
def my_callback(session_id: str | None, platform: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `session_id` | `str` 或 `None` | 传出的会话 ID。如果没有活跃会话可能为 `None`。 |
| `platform` | `str` | `"cli"` 或消息平台名称（`"telegram"`、`"discord"` 等）。 |

**触发位置：** 在 `cli.py`（`/new` / CLI 退出时）和 `gateway/run.py`（会话被重置或回收时）。在 Gateway 侧始终与 `on_session_reset` 配对。

**返回值：** 忽略。

**使用场景：** 在会话 ID 被丢弃之前持久化最终会话指标、关闭每会话资源、发送最终遥测事件、排空队列写入。

---

### `on_session_reset`

当 Gateway 为活跃聊天**切换新的会话键**时触发 — 用户调用了 `/new`、`/reset`、`/clear`，或适配器在空闲窗口后选择了新会话。这让插件可以对会话状态被清除这一事实做出反应，而无需等待下一个 `on_session_start`。

**回调签名：**

```python
def my_callback(session_id: str, platform: str, **kwargs):
```

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `session_id` | `str` | 新会话的 ID（已轮换为新值）。 |
| `platform` | `str` | 消息平台名称。 |

**触发位置：** 在 `gateway/run.py` 中，新会话键分配后但在处理下一条入站消息之前。在 Gateway 上的顺序是：`on_session_finalize(old_id)` → 切换 → `on_session_reset(new_id)` → 第一个入站轮次时的 `on_session_start(new_id)`。

**返回值：** 忽略。

**使用场景：** 重置以 `session_id` 为键的每会话缓存、发送"会话已轮换"分析、准备新的状态桶。

---

完整演练参见 **[构建 Plugin 指南](/docs/guides/build-a-hermes-plugin)**，包括工具 Schema、处理函数和高级钩子模式。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/hooks)
