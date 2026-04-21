---
sidebar_position: 3
title: "Agent 循环内部机制"
description: "AIAgent 执行的详细说明：API 模式、工具、回调和回退行为"
---

# Agent 循环内部机制

核心编排引擎是 `run_agent.py` 中的 `AIAgent` 类——约 10,700 行代码，处理从 prompt 组装到工具调度再到 provider 故障转移的所有内容。

## 核心职责

`AIAgent` 负责：

- 通过 `prompt_builder.py` 组装有效的系统提示和工具 schema
- 选择正确的 provider/API 模式（chat\_completions、codex\_responses、anthropic\_messages）
- 执行可中断的模型调用，支持取消
- 执行工具调用（通过线程池顺序或并发执行）
- 以 OpenAI 消息格式维护对话历史
- 处理压缩、重试和回退模型切换
- 跟踪父代理和子代理的迭代预算
- 在上下文丢失前刷新持久化内存

## 两个入口点

```python
# 简单接口 — 返回最终响应字符串
response = agent.chat("修复 main.py 中的 bug")

# 完整接口 — 返回包含消息、元数据、使用统计的字典
result = agent.run_conversation(
    user_message="修复 main.py 中的 bug",
    system_message=None,           # 如果省略则自动构建
    conversation_history=None,      # 如果省略则从会话自动加载
    task_id="task_abc123"
)
```

`chat()` 是 `run_conversation()` 的薄封装，从结果字典中提取 `final_response` 字段。

## API 模式

Hermes 支持三种 API 执行模式，由 provider 选择、显式参数和 base URL 启发式方法解析：

| API 模式 | 用途 | 客户端类型 |
|----------|------|-----------|
| `chat_completions` | OpenAI 兼容端点（OpenRouter、自定义、大多数 provider） | `openai.OpenAI` |
| `codex_responses` | OpenAI Codex / Responses API | `openai.OpenAI`（Responses 格式） |
| `anthropic_messages` | 原生 Anthropic Messages API | `anthropic.Anthropic`（通过 adapter） |

模式决定了消息如何格式化、工具调用如何结构化、响应如何解析，以及缓存/流式传输如何工作。所有三种模式在 API 调用前后都收敛到相同的内部消息格式（OpenAI 风格的 `role`/`content`/`tool_calls` 字典）。

**模式解析优先级：**
1. 显式 `api_mode` 构造参数（最高优先级）
2. Provider 特定检测（如 `anthropic` provider → `anthropic_messages`）
3. Base URL 启发式（如 `api.anthropic.com` → `anthropic_messages`）
4. 默认：`chat_completions`

## Turn 生命周期

Agent 循环的每次迭代遵循以下序列：

```text
run_conversation()
  1. 如果未提供则生成 task_id
  2. 将用户消息追加到对话历史
  3. 构建或复用缓存的系统提示（prompt_builder.py）
  4. 检查是否需要预压缩（>50% 上下文）
  5. 从对话历史构建 API 消息
     - chat_completions: OpenAI 格式原样使用
     - codex_responses: 转换为 Responses API 输入项
     - anthropic_messages: 通过 anthropic_adapter.py 转换
  6. 注入临时提示层（预算警告、上下文压力）
  7. 如果在 Anthropic 上，应用 prompt 缓存标记
  8. 执行可中断的 API 调用（_api_call_with_interrupt）
  9. 解析响应：
     - 如果有 tool_calls: 执行它们，追加结果，回到步骤 5
     - 如果是文本响应: 持久化会话，必要时刷新内存，返回
```

### 消息格式

所有消息在内部使用 OpenAI 兼容格式：

```python
{"role": "system", "content": "..."}
{"role": "user", "content": "..."}
{"role": "assistant", "content": "...", "tool_calls": [...]}
{"role": "tool", "tool_call_id": "...", "content": "..."}
```

推理内容（来自支持扩展思考的模型）存储在 `assistant_msg["reasoning"]` 中，可选地通过 `reasoning_callback` 显示。

### 消息交替规则

Agent 循环强制执行严格的消息角色交替：

- 系统消息之后：`User → Assistant → User → Assistant → ...`
- 工具调用期间：`Assistant（带 tool_calls） → Tool → Tool → ... → Assistant`
- **绝不**连续两个 assistant 消息
- **绝不**连续两个 user 消息
- **只有** `tool` 角色可以有连续条目（并行工具结果）

Provider 会验证这些序列，拒绝格式不正确的历史。

## 可中断的 API 调用

API 请求被包装在 `_api_call_with_interrupt()` 中，它在后台线程中运行实际的 HTTP 调用，同时监控中断事件：

```text
┌────────────────────────────────────────────────────┐
│  主线程                      API 线程              │
│                                                    │
│   等待:                         HTTP POST          │
│    - 响应就绪          ───▶   发送到 provider       │
│    - 中断事件                                      │
│    - 超时                                          │
└────────────────────────────────────────────────────┘
```

当中断发生时（用户发送新消息、`/stop` 命令或信号）：
- API 线程被放弃（响应被丢弃）
- Agent 可以处理新输入或优雅关闭
- 不会有部分响应被注入对话历史

## 工具执行

### 顺序 vs 并发

当模型返回工具调用时：

- **单个工具调用** → 直接在主线程中执行
- **多个工具调用** → 通过 `ThreadPoolExecutor` 并发执行
  - 例外：标记为交互式的工具（如 `clarify`）强制顺序执行
  - 结果按原始工具调用顺序重新插入，不考虑完成顺序

### 执行流程

```text
对于 response.tool_calls 中的每个 tool_call:
    1. 从 tools/registry.py 解析处理函数
    2. 触发 pre_tool_call 插件钩子
    3. 检查是否为危险命令（tools/approval.py）
       - 如果危险: 调用 approval_callback，等待用户确认
    4. 使用 args + task_id 执行处理函数
    5. 触发 post_tool_call 插件钩子
    6. 将 {"role": "tool", "content": result} 追加到历史
```

### Agent 级别工具

一些工具在到达 `handle_function_call()` 之前被 `run_agent.py` *拦截*：

| 工具 | 拦截原因 |
|------|---------|
| `todo` | 读写 agent 局部的任务状态 |
| `memory` | 写入带有字符限制的持久化内存文件 |
| `session_search` | 通过 agent 的会话数据库查询会话历史 |
| `delegate_task` | 生成具有隔离上下文的子代理 |

这些工具直接修改 agent 状态并返回合成工具结果，不经过 registry。

## 回调接口

`AIAgent` 支持平台特定的回调，实现 CLI、gateway 和 ACP 集成中的实时进度：

| 回调 | 触发时机 | 使用者 |
|------|---------|--------|
| `tool_progress_callback` | 每次工具执行前后 | CLI 加载动画、gateway 进度消息 |
| `thinking_callback` | 模型开始/停止思考时 | CLI"思考中..."指示器 |
| `reasoning_callback` | 模型返回推理内容时 | CLI 推理显示、gateway 推理块 |
| `clarify_callback` | 调用 `clarify` 工具时 | CLI 输入提示、gateway 交互消息 |
| `step_callback` | 每次完整 agent turn 后 | Gateway 步骤跟踪、ACP 进度 |
| `stream_delta_callback` | 每个流式 token（启用时） | CLI 流式显示 |
| `tool_gen_callback` | 从流中解析出工具调用时 | CLI 加载动画中的工具预览 |
| `status_callback` | 状态变更（思考中、执行中等） | ACP 状态更新 |

## 预算和回退行为

### 迭代预算

Agent 通过 `IterationBudget` 跟踪迭代：

- 默认：90 次迭代（可通过 `agent.max_turns` 配置）
- 每个 agent 有自己的预算。子代理获得独立预算，上限为 `delegation.max_iterations`（默认 50）——父代理 + 子代理的总迭代次数可以超过父代理的上限
- 达到 100% 时，agent 停止并返回已完成工作的摘要

### 回退模型

当主模型失败时（429 限速、5xx 服务器错误、401/403 认证错误）：

1. 检查配置中的 `fallback_providers` 列表
2. 按顺序尝试每个回退
3. 成功后，使用新 provider 继续对话
4. 遇到 401/403 时，在故障转移前尝试凭证刷新

回退系统也独立覆盖辅助任务——视觉、压缩、网页提取和会话搜索各自有独立的回退链，可通过 `auxiliary.*` 配置节配置。

## 压缩和持久化

### 压缩触发时机

- **预压缩**（API 调用前）：对话超过模型上下文窗口的 50%
- **Gateway 自动压缩**：对话超过 85%（更激进，在 turn 之间运行）

### 压缩时发生什么

1. 首先将内存刷新到磁盘（防止数据丢失）
2. 中间对话 turn 被摘要为紧凑的摘要
3. 最后 N 条消息完整保留（`compression.protect_last_n`，默认：20）
4. 工具调用/结果消息对保持在一起（永不拆分）
5. 生成新的会话血统 ID（压缩创建一个"子"会话）

### 会话持久化

每次 turn 后：
- 消息保存到会话存储（通过 `hermes_state.py` 的 SQLite）
- 内存变更刷新到 `MEMORY.md` / `USER.md`
- 会话可以稍后通过 `/resume` 或 `hermes chat --resume` 恢复

## 关键源文件

| 文件 | 用途 |
|------|------|
| `run_agent.py` | AIAgent 类——完整的 agent 循环（约 10,700 行） |
| `agent/prompt_builder.py` | 从内存、技能、上下文文件、个性构建系统提示 |
| `agent/context_engine.py` | ContextEngine ABC——可插拔的上下文管理 |
| `agent/context_compressor.py` | 默认引擎——有损摘要算法 |
| `agent/prompt_caching.py` | Anthropic prompt 缓存标记和缓存指标 |
| `agent/auxiliary_client.py` | 辅助 LLM 客户端，用于辅助任务（视觉、摘要） |
| `model_tools.py` | 工具 schema 收集、`handle_function_call()` 调度 |

## 相关文档

- [Provider 运行时解析](./provider-runtime.md)
- [Prompt 组装](./prompt-assembly.md)
- [上下文压缩与 Prompt 缓存](./context-compression-and-caching.md)
- [工具运行时](./tools-runtime.md)
- [架构概览](./architecture.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/agent-loop)
