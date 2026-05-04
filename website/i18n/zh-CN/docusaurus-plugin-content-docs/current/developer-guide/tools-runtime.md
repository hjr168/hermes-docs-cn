---
sidebar_position: 9
title: "工具运行时"
description: "工具注册表、工具集、分发和终端环境的运行时行为"
---

# 工具运行时

Hermes 工具是自注册函数，按工具集分组，通过中心注册表/分发系统执行。

主要文件：

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- `tools/terminal_tool.py`
- `tools/environments/*`

## 工具注册模型

每个工具模块在导入时调用 `registry.register(...)`。

`model_tools.py` 负责导入/发现工具模块并构建模型使用的 Schema 列表。

### `registry.register()` 的工作方式

`tools/` 中的每个工具文件在模块级调用 `registry.register()` 声明自己。函数签名：

```python
registry.register(
    name="terminal",               # 唯一工具名（在 API Schema 中使用）
    toolset="terminal",            # 此工具所属的工具集
    schema={...},                  # OpenAI function-calling Schema（描述、参数）
    handler=handle_terminal,       # 工具调用时执行的函数
    check_fn=check_terminal,       # 可选：返回 True/False 表示可用性
    requires_env=["SOME_VAR"],     # 可选：需要的环境变量（用于 UI 显示）
    is_async=False,                # 处理器是否为异步协程
    description="Run commands",    # 人类可读的描述
    emoji="💻",                    # 旋转器/进度显示的 emoji
)
```

每次调用创建一个 `ToolEntry`，存储在单例 `ToolRegistry._tools` 字典中，以工具名为键。如果跨工具集出现名称冲突，会记录警告，后注册的优先。

### 发现：`discover_builtin_tools()`

当 `model_tools.py` 被导入时，它从 `tools/registry.py` 调用 `discover_builtin_tools()`。此函数使用 AST 解析扫描每个 `tools/*.py` 文件，查找包含顶层 `registry.register()` 调用的模块，然后导入它们：

```python
# tools/registry.py（简化版）
def discover_builtin_tools(tools_dir=None):
    tools_path = Path(tools_dir) if tools_dir else Path(__file__).parent
    for path in sorted(tools_path.glob("*.py")):
        if path.name in {"__init__.py", "registry.py", "mcp_tool.py"}:
            continue
        if _module_registers_tools(path):  # AST 检查顶层 registry.register()
            importlib.import_module(f"tools.{path.stem}")
```

这种自动发现意味着新工具文件会自动被识别 — 无需维护手动列表。AST 检查只匹配顶层的 `registry.register()` 调用（不匹配函数内的调用），因此 `tools/` 中的辅助模块不会被导入。

每次导入触发模块的 `registry.register()` 调用。可选工具中的错误（如图片生成缺少 `fal_client`）会被捕获并记录 — 它们不会阻止其他工具加载。

核心工具发现后，MCP 工具和插件工具也被发现：

1. **MCP 工具** — `tools.mcp_tool.discover_mcp_tools()` 读取 MCP 服务器配置并从外部服务器注册工具。
2. **插件工具** — `hermes_cli.plugins.discover_plugins()` 加载用户/项目/pip 插件，可能注册额外工具。

## 工具可用性检查（`check_fn`）

每个工具可以可选地提供 `check_fn` — 一个返回 `True`（可用）或 `False`（不可用）的可调用对象。典型检查包括：

- **API 密钥存在** — 如 Web 搜索的 `lambda: bool(os.environ.get("SERP_API_KEY"))`
- **服务运行中** — 如检查 Honcho 服务器是否已配置
- **二进制已安装** — 如验证浏览器工具的 `playwright` 是否可用

当 `registry.get_definitions()` 为模型构建 Schema 列表时，它运行每个工具的 `check_fn()`：

```python
# 简化自 registry.py
if entry.check_fn:
    try:
        available = bool(entry.check_fn())
    except Exception:
        available = False   # 异常 = 不可用
    if not available:
        continue            # 跳过此工具
```

关键行为：
- 检查结果**每次调用缓存** — 如果多个工具共享同一 `check_fn`，它只运行一次。
- `check_fn()` 中的异常被视为"不可用"（故障安全）。
- `is_toolset_available()` 方法检查工具集的 `check_fn` 是否通过，用于 UI 显示和工具集解析。

## 工具集解析

工具集是命名的工具捆绑。Hermes 通过以下方式解析它们：

- 显式的启用/禁用工具集列表
- 平台预设（`hermes-cli`、`hermes-telegram` 等）
- 动态 MCP 工具集
- 策划的专用集合如 `hermes-acp`

### `get_tool_definitions()` 如何过滤工具

主入口点是 `model_tools.get_tool_definitions(enabled_toolsets, disabled_toolsets, quiet_mode)`：

1. **如果提供了 `enabled_toolsets`** — 仅包含这些工具集中的工具。每个工具集名称通过 `resolve_toolset()` 解析，将复合工具集展开为单个工具名。

2. **如果提供了 `disabled_toolsets`** — 从所有工具集开始，然后减去禁用的。

3. **如果都没提供** — 包含所有已知工具集。

4. **注册表过滤** — 解析后的工具名集合传递给 `registry.get_definitions()`，后者应用 `check_fn` 过滤并返回 OpenAI 格式的 Schema。

5. **动态 Schema 修补** — 过滤后，`execute_code` 和 `browser_navigate` 的 Schema 被动态调整，仅引用实际通过过滤的工具（防止模型幻觉使用不可用的工具）。

### 旧版工具集名称

带 `_tools` 后缀的旧工具集名称（如 `web_tools`、`terminal_tools`）通过 `_LEGACY_TOOLSET_MAP` 映射到现代工具名以保持向后兼容。

## 分发

运行时，工具通过中心注册表分发，一些 Agent 级工具（如 memory/todo/session-search 处理）有 Agent 循环例外。

### 分发流程：模型 tool_call → 处理器执行

当模型返回 `tool_call` 时，流程如下：

```
模型响应包含 tool_call
    ↓
run_agent.py Agent 循环
    ↓
model_tools.handle_function_call(name, args, task_id, user_task)
    ↓
[Agent 循环工具？] → 由 Agent 循环直接处理（todo、memory、session_search、delegate_task）
    ↓
[插件前置钩子] → invoke_hook("pre_tool_call", ...)
    ↓
registry.dispatch(name, args, **kwargs)
    ↓
按名称查找 ToolEntry
    ↓
[异步处理器？] → 通过 _run_async() 桥接
[同步处理器？]  → 直接调用
    ↓
返回结果字符串（或 JSON 错误）
    ↓
[插件后置钩子] → invoke_hook("post_tool_call", ...)
```

### 错误包装

所有工具执行在两层级别进行错误处理包装：

1. **`registry.dispatch()`** — 捕获处理器的任何异常并返回 `{"error": "Tool execution failed: ExceptionType: message"}` 作为 JSON。

2. **`handle_function_call()`** — 在二级 try/except 中包装整个分发，返回 `{"error": "Error executing tool_name: message"}`。

这确保模型始终收到格式良好的 JSON 字符串，永远不会收到未处理的异常。

### Agent 循环工具

四个工具在注册表分发前被拦截，因为它们需要 Agent 级状态（TodoStore、MemoryStore 等）：

- `todo` — 规划/任务跟踪
- `memory` — 持久记忆写入
- `session_search` — 跨会话召回
- `delegate_task` — 生成子 Agent 会话

这些工具的 Schema 仍然在注册表中注册（用于 `get_tool_definitions`），但如果分发以某种方式直接到达它们，其处理器返回桩错误。

### 异步桥接

当工具处理器是异步的，`_run_async()` 将其桥接到同步分发路径：

- **CLI 路径（无运行循环）** — 使用持久事件循环保持缓存的异步客户端存活
- **Gateway 路径（运行循环）** — 用 `asyncio.run()` 启动一次性线程
- **工作线程（并行工具）** — 使用存储在线程本地存储中的每线程持久循环

## DANGEROUS_PATTERNS 审批流程

终端工具集成了 `tools/approval.py` 中定义的危险命令审批系统：

1. **模式检测** — `DANGEROUS_PATTERNS` 是 `(regex, description)` 元组列表，覆盖破坏性操作：
   - 递归删除（`rm -rf`）
   - 文件系统格式化（`mkfs`、`dd`）
   - SQL 破坏性操作（无 `WHERE` 的 `DROP TABLE`、`DELETE FROM`）
   - 系统配置覆盖（`> /etc/`）
   - 服务操作（`systemctl stop`）
   - 远程代码执行（`curl | sh`）
   - Fork 炸弹、进程杀死等

2. **检测** — 在执行任何终端命令之前，`detect_dangerous_command(command)` 检查所有模式。

3. **审批提示** — 如果找到匹配：
   - **CLI 模式** — 交互式提示要求用户批准、拒绝或永久允许
   - **Gateway 模式** — 异步审批回调将请求发送到消息平台
   - **智能审批** — 可选地，辅助 LLM 可以自动批准匹配模式但低风险的命令（如 `rm -rf node_modules/` 是安全的但匹配"递归删除"）

4. **会话状态** — 审批按会话跟踪。一旦你在会话中批准了"递归删除"，后续的 `rm -rf` 命令不会再提示。

5. **永久白名单** — "永久允许"选项将模式写入 `config.yaml` 的 `command_allowlist`，跨会话持久化。

## 终端/运行时环境

终端系统支持多个后端：

- local
- docker
- ssh
- singularity
- modal
- daytona

它还支持：

- 每任务工作目录覆盖
- 后台进程管理
- PTY 模式
- 危险命令审批回调

## 并发

工具调用可能顺序或并发执行，取决于工具组合和交互需求。

## 相关文档

- [工具集参考](../reference/toolsets-reference.md)
- [内置工具参考](../reference/tools-reference.md)
- [Agent 循环内部机制](./agent-loop.md)
- [ACP 内部机制](./acp-internals.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/tools-runtime)
