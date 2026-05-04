---
sidebar_position: 2
title: "ACP 内部机制"
description: "ACP 适配器的工作原理：生命周期、会话、事件桥接、审批和工具渲染"
---

# ACP 内部机制

ACP（Agent Communication Protocol，代理通信协议）适配器将 Hermes 的同步 `AIAgent` 封装为异步 JSON-RPC stdio 服务器。

关键实现文件：

- `acp_adapter/entry.py`
- `acp_adapter/server.py`
- `acp_adapter/session.py`
- `acp_adapter/events.py`
- `acp_adapter/permissions.py`
- `acp_adapter/tools.py`
- `acp_adapter/auth.py`
- `acp_registry/agent.json`

## 启动流程

```text
hermes acp / hermes-acp / python -m acp_adapter
  -> acp_adapter.entry.main()
  -> 加载 ~/.hermes/.env
  -> 配置 stderr 日志
  -> 构造 HermesACPAgent
  -> acp.run_agent(agent)
```

stdout 保留给 ACP JSON-RPC 传输使用。人类可读的日志输出到 stderr。

## 主要组件

### `HermesACPAgent`

`acp_adapter/server.py` 实现了 ACP 代理协议。

职责：

- 初始化 / 认证
- 新建/加载/恢复/分叉/列出/取消 会话方法
- prompt 执行
- 会话模型切换
- 将同步 AIAgent 回调桥接到 ACP 异步通知

### `SessionManager`

`acp_adapter/session.py` 跟踪活跃的 ACP 会话。

每个会话存储：

- `session_id`
- `agent`
- `cwd`
- `model`
- `history`
- `cancel_event`

管理器是线程安全的，支持：

- 创建
- 获取
- 移除
- 分叉
- 列出
- 清理
- cwd 更新

### 事件桥接

`acp_adapter/events.py` 将 AIAgent 回调转换为 ACP `session_update` 事件。

桥接的回调：

- `tool_progress_callback`
- `thinking_callback`
- `step_callback`
- `message_callback`

由于 `AIAgent` 在工作线程中运行，而 ACP I/O 在主事件循环上，桥接使用：

```python
asyncio.run_coroutine_threadsafe(...)
```

### 权限桥接

`acp_adapter/permissions.py` 将危险的终端审批提示适配为 ACP 权限请求。

映射关系：

- `allow_once` -> Hermes `once`
- `allow_always` -> Hermes `always`
- 拒绝选项 -> Hermes `deny`

超时和桥接失败默认拒绝。

### 工具渲染辅助

`acp_adapter/tools.py` 将 Hermes 工具映射到 ACP 工具类型，并构建面向编辑器的内容。

示例：

- `patch` / `write_file` -> 文件差异
- `terminal` -> shell 命令文本
- `read_file` / `search_files` -> 文本预览
- 大型结果 -> 截断的文本块，确保 UI 安全

## 会话生命周期

```text
new_session(cwd)
  -> 创建 SessionState
  -> 创建 AIAgent(platform="acp", enabled_toolsets=["hermes-acp"])
  -> 将 task_id/session_id 绑定到 cwd 覆盖

prompt(..., session_id)
  -> 从 ACP 内容块中提取文本
  -> 重置取消事件
  -> 安装回调 + 审批桥接
  -> 在 ThreadPoolExecutor 中运行 AIAgent
  -> 更新会话历史
  -> 发出最终的代理消息块
```

### 取消操作

`cancel(session_id)`:

- 设置会话取消事件
- 可用时调用 `agent.interrupt()`
- 导致 prompt 响应返回 `stop_reason="cancelled"`

### 分叉

`fork_session()` 将消息历史深拷贝到一个新的活跃会话中，保留对话状态，同时为分叉分配独立的会话 ID 和 cwd。

## Provider/Auth 行为

ACP 不实现自己的认证存储。

它复用 Hermes 的运行时解析器：

- `acp_adapter/auth.py`
- `hermes_cli/runtime_provider.py`

因此 ACP 广告并使用当前配置的 Hermes provider/凭证。

## 工作目录绑定

ACP 会话携带编辑器的 cwd。

会话管理器通过任务作用域的终端/文件覆盖，将该 cwd 绑定到 ACP 会话 ID，因此文件和终端工具相对于编辑器工作区运行。

## 重复同名工具调用

事件桥接按工具名称以 FIFO（先进先出）方式跟踪工具 ID，而不仅仅是每个名称一个 ID。这对以下场景很重要：

- 并行的同名调用
- 单个步骤中重复的同名调用

如果没有 FIFO 队列，完成事件会附加到错误的工具调用上。

## 审批回调恢复

ACP 在 prompt 执行期间临时在终端工具上安装审批回调，之后恢复之前的回调。这避免了将 ACP 会话特定的审批处理程序永久全局安装。

## 当前限制

- ACP 会话从 ACP 服务器角度看是进程局部的
- 请求文本提取目前忽略非文本 prompt 块
- 编辑器特定的用户体验因 ACP 客户端实现而异

## 相关文件

- `tests/acp/` — ACP 测试套件
- `toolsets.py` — `hermes-acp` 工具集定义
- `hermes_cli/main.py` — `hermes acp` CLI 子命令
- `pyproject.toml` — `[acp]` 可选依赖 + `hermes-acp` 脚本

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/acp-internals)
