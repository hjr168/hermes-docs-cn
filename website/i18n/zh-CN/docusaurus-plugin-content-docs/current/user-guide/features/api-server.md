---
sidebar_position: 14
title: "API 服务器"
description: "将 hermes-agent 暴露为 OpenAI 兼容的 API 供任何前端使用"
---

# API 服务器

API 服务器将 hermes-agent 暴露为 OpenAI 兼容的 HTTP 端点。任何使用 OpenAI 格式的前端 —— Open WebUI、LobeChat、LibreChat、NextChat、ChatBox 等数百种 —— 都可以连接到 hermes-agent 并将其作为后端使用。

你的 Agent 使用完整工具集（终端、文件操作、网页搜索、记忆、Skill）处理请求并返回最终响应。流式传输时，工具进度指示器内联显示，前端可以展示 Agent 正在做什么。

## 快速开始

### 1. 启用 API 服务器

添加到 `~/.hermes/.env`：

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=change-me-local-dev
# 可选：仅在浏览器需要直接调用 Hermes 时设置
# API_SERVER_CORS_ORIGINS=http://localhost:3000
```

### 2. 启动网关

```bash
hermes gateway
```

你会看到：

```
[API Server] API server listening on http://127.0.0.1:8642
```

### 3. 连接前端

将任何 OpenAI 兼容客户端指向 `http://localhost:8642/v1`：

```bash
# 使用 curl 测试
curl http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer change-me-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model": "hermes-agent", "messages": [{"role": "user", "content": "Hello!"}]}'
```

或连接 Open WebUI、LobeChat 或其他前端 — 参见 [Open WebUI 集成指南](/docs/user-guide/messaging/open-webui) 获取逐步说明。

## 端点

### POST /v1/chat/completions

标准 OpenAI Chat Completions 格式。无状态 — 完整对话通过 `messages` 数组包含在每个请求中。

**请求：**
```json
{
  "model": "hermes-agent",
  "messages": [
    {"role": "system", "content": "You are a Python expert."},
    {"role": "user", "content": "Write a fibonacci function"}
  ],
  "stream": false
}
```

**响应：**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "hermes-agent",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Here's a fibonacci function..."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 50, "completion_tokens": 200, "total_tokens": 250}
}
```

**流式传输**（`"stream": true`）：返回 Server-Sent Events（SSE），包含逐 Token 的响应块。对于 **Chat Completions**，流使用标准 `chat.completion.chunk` 事件加 Hermes 自定义的 `hermes.tool.progress` 事件提供工具启动 UX。对于 **Responses**，流使用 OpenAI Responses 事件类型如 `response.created`、`response.output_text.delta`、`response.output_item.added`、`response.output_item.done` 和 `response.completed`。

**内联图片输入：** 用户消息可以将 `content` 作为 `text` 和 `image_url` 部分的数组发送。远程 `http(s)` URL 和 `data:image/...` URL 均支持：

```json
{
  "model": "hermes-agent",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "图片中是什么？"},
        {"type": "image_url", "image_url": {"url": "https://example.com/cat.png", "detail": "high"}}
      ]
    }
  ]
}
```

上传的文件（`file` / `input_file` / `file_id`）和非图片的 `data:` URL 返回 `400 unsupported_content_type`。

**流中的工具进度**：
- **Chat Completions**：Hermes 发出 `event: hermes.tool.progress` 提供工具启动可见性，不污染持久化的助手文本。
- **Responses**：Hermes 在 SSE 流中发出规范原生的 `function_call` 和 `function_call_output` 输出项，客户端可以实时渲染结构化工具 UI。

### POST /v1/responses

OpenAI Responses API 格式。通过 `previous_response_id` 支持服务端对话状态 — 服务器存储完整对话历史（包括工具调用和结果），多轮上下文得以保留，无需客户端管理。

**请求：**
```json
{
  "model": "hermes-agent",
  "input": "What files are in my project?",
  "instructions": "You are a helpful coding assistant.",
  "store": true
}
```

**响应：**
```json
{
  "id": "resp_abc123",
  "object": "response",
  "status": "completed",
  "model": "hermes-agent",
  "output": [
    {"type": "function_call", "name": "terminal", "arguments": "{\"command\": \"ls\"}", "call_id": "call_1"},
    {"type": "function_call_output", "call_id": "call_1", "output": "README.md src/ tests/"},
    {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "Your project has..."}]}
  ],
  "usage": {"input_tokens": 50, "output_tokens": 200, "total_tokens": 250}
}
```

#### 使用 previous_response_id 进行多轮对话

链接响应以在轮次间保持完整上下文（包括工具调用）：

```json
{
  "input": "Now show me the README",
  "previous_response_id": "resp_abc123"
}
```

服务器从存储的响应链重建完整对话 — 所有之前的工具调用和结果都被保留。链接请求也共享同一会话，因此多轮对话在 Dashboard 和会话历史中显示为单一条目。

#### 命名对话

使用 `conversation` 参数代替跟踪响应 ID：

```json
{"input": "Hello", "conversation": "my-project"}
{"input": "What's in src/?", "conversation": "my-project"}
{"input": "Run the tests", "conversation": "my-project"}
```

服务器自动链接到该对话中的最新响应。类似于网关会话的 `/title` 命令。

### GET /v1/responses/\{id\}

通过 ID 检索之前存储的响应。

### DELETE /v1/responses/\{id\}

删除存储的响应。

### GET /v1/models

将 Agent 列为可用模型。公布的模型名称默认为 [Profile](/docs/user-guide/profiles) 名称（默认 Profile 为 `hermes-agent`）。大多数前端需要此端点进行模型发现。

### GET /health

健康检查。返回 `{"status": "ok"}`。也可通过 **GET /v1/health** 访问，适用于期望 `/v1/` 前缀的 OpenAI 兼容客户端。

### GET /health/detailed

扩展健康检查，还报告活跃会话、运行中的 Agent 和资源使用情况。适用于监控/可观测性工具。

## Runs API（流式友好替代方案）

除了 `/v1/chat/completions` 和 `/v1/responses`，服务器还暴露一个 **runs** API，用于客户端希望订阅进度事件而非自行管理流式传输的长会话场景。

### POST /v1/runs

创建新的 Agent 运行。返回可用于订阅进度事件的 `run_id`。

### GET /v1/runs/\{run_id\}/events

运行的工具调用进度、Token 增量和生命周期事件的 Server-Sent Events 流。专为希望附加/分离而不丢失状态的 Dashboard 和富客户端设计。

## Jobs API（后台计划任务）

服务器暴露轻量级 Jobs CRUD 接口，用于从远程客户端管理计划/后台 Agent 运行。所有端点都使用相同的 Bearer 认证。

### GET /api/jobs

列出所有计划任务。

### POST /api/jobs

创建新的计划任务。请求体接受与 `hermes cron` 相同的结构 — 提示、计划、Skill、Provider 覆盖、投递目标。

### GET /api/jobs/\{job_id\}

获取单个任务的定义和上次运行状态。

### PATCH /api/jobs/\{job_id\}

更新现有任务的字段（提示、计划等）。部分更新会合并。

### DELETE /api/jobs/\{job_id\}

移除任务。同时取消任何进行中的运行。

### POST /api/jobs/\{job_id\}/pause

暂停任务而不删除。下次计划运行时间戳在恢复前暂停。

### POST /api/jobs/\{job_id\}/resume

恢复之前暂停的任务。

### POST /api/jobs/\{job_id\}/run

触发任务立即运行，脱离计划。

## 系统提示处理

当前端发送 `system` 消息（Chat Completions）或 `instructions` 字段（Responses API）时，hermes-agent 将其**叠加在**核心系统提示之上。你的 Agent 保留所有工具、记忆和 Skill — 前端的系统提示添加额外指令。

这意味着你可以按前端自定义行为而不丢失功能：
- Open WebUI 系统提示："You are a Python expert. Always include type hints."
- Agent 仍然拥有终端、文件工具、网页搜索、记忆等。

## 认证

通过 `Authorization` 头的 Bearer Token 认证：

```
Authorization: Bearer ***
```

通过 `API_SERVER_KEY` 环境变量配置密钥。如果需要浏览器直接调用 Hermes，还需设置 `API_SERVER_CORS_ORIGINS` 为显式允许列表。

:::warning 安全
API 服务器提供对 hermes-agent 工具集的完全访问，**包括终端命令**。当绑定到非回环地址如 `0.0.0.0` 时，`API_SERVER_KEY` 是**必需的**。同时保持 `API_SERVER_CORS_ORIGINS` 狭窄以控制浏览器访问。

默认绑定地址（`127.0.0.1`）仅用于本地。浏览器访问默认禁用；仅对显式信任的来源启用。
:::

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_SERVER_ENABLED` | `false` | 启用 API 服务器 |
| `API_SERVER_PORT` | `8642` | HTTP 服务器端口 |
| `API_SERVER_HOST` | `127.0.0.1` | 绑定地址（默认仅本地） |
| `API_SERVER_KEY` | _（无）_ | Bearer Token 认证 |
| `API_SERVER_CORS_ORIGINS` | _（无）_ | 逗号分隔的允许浏览器来源 |
| `API_SERVER_MODEL_NAME` | _（Profile 名称）_ | `/v1/models` 上的模型名称。默认为 Profile 名称，默认 Profile 为 `hermes-agent`。 |

### config.yaml

```yaml
# 尚不支持 — 使用环境变量。
# config.yaml 支持将在未来版本中提供。
```

## 安全头

所有响应包含安全头：
- `X-Content-Type-Options: nosniff` — 防止 MIME 类型嗅探
- `Referrer-Policy: no-referrer` — 防止 Referer 泄露

## CORS

API 服务器默认**不**启用浏览器 CORS。

直接浏览器访问时，设置显式允许列表：

```bash
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

CORS 启用时：
- **预检响应**包含 `Access-Control-Max-Age: 600`（10 分钟缓存）
- **SSE 流式响应**包含 CORS 头，浏览器 EventSource 客户端可正常工作
- **`Idempotency-Key`** 是允许的请求头 — 客户端可发送用于去重（响应按键缓存 5 分钟）

大多数文档化的前端如 Open WebUI 以服务器到服务器方式连接，不需要 CORS。

## 兼容前端

任何支持 OpenAI API 格式的前端都可用。已测试/文档化的集成：

| 前端 | Stars | 连接方式 |
|------|-------|---------|
| [Open WebUI](/docs/user-guide/messaging/open-webui) | 126k | 完整指南可用 |
| LobeChat | 73k | 自定义 Provider 端点 |
| LibreChat | 34k | librechat.yaml 中的自定义端点 |
| AnythingLLM | 56k | 通用 OpenAI Provider |
| NextChat | 87k | BASE_URL 环境变量 |
| ChatBox | 39k | API Host 设置 |
| Jan | 26k | 远程模型配置 |
| HF Chat-UI | 8k | OPENAI_BASE_URL |
| big-AGI | 7k | 自定义端点 |
| OpenAI Python SDK | — | `OpenAI(base_url="http://localhost:8642/v1")` |
| curl | — | 直接 HTTP 请求 |

## 使用 Profile 的多用户设置

要为多个用户提供各自隔离的 Hermes 实例（独立配置、记忆、Skill），使用 [Profile](/docs/user-guide/profiles)：

```bash
# 为每个用户创建 Profile
hermes profile create alice
hermes profile create bob

# 为每个 Profile 配置不同端口的 API 服务器
hermes -p alice config set API_SERVER_ENABLED true
hermes -p alice config set API_SERVER_PORT 8643
hermes -p alice config set API_SERVER_KEY alice-secret

hermes -p bob config set API_SERVER_ENABLED true
hermes -p bob config set API_SERVER_PORT 8644
hermes -p bob config set API_SERVER_KEY bob-secret

# 启动每个 Profile 的网关
hermes -p alice gateway &
hermes -p bob gateway &
```

每个 Profile 的 API 服务器自动以 Profile 名称作为模型 ID：

- `http://localhost:8643/v1/models` → 模型 `alice`
- `http://localhost:8644/v1/models` → 模型 `bob`

在 Open WebUI 中，添加每个作为单独连接。模型下拉菜单显示 `alice` 和 `bob` 作为不同模型，每个背后是完全隔离的 Hermes 实例。详见 [Open WebUI 指南](/docs/user-guide/messaging/open-webui#multi-user-setup-with-profiles)。

## 限制

- **响应存储** — 存储的响应（用于 `previous_response_id`）持久化在 SQLite 中，网关重启后保留。最多 100 个存储响应（LRU 淘汰）。
- **无文件上传** — `/v1/chat/completions` 和 `/v1/responses` 均支持内联图片，但上传的文件（`file`、`input_file`、`file_id`）和非图片文档输入尚不支持通过 API。
- **模型字段仅为外观** — 请求中的 `model` 字段被接受，但实际使用的 LLM 模型在服务端 config.yaml 中配置。

## 代理模式

API 服务器还作为**网关代理模式**的后端。当另一个 Hermes 网关实例配置了 `GATEWAY_PROXY_URL` 指向此 API 服务器时，它将所有消息转发到这里而非运行自己的 Agent。这支持分离式部署 — 例如，一个处理 Matrix E2EE 的 Docker 容器中继到宿主机端的 Agent。

参见 [Matrix 代理模式](/docs/user-guide/messaging/matrix#proxy-mode-e2ee-on-macos) 获取完整设置指南。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/api-server)
