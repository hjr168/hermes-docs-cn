---
sidebar_position: 4
title: "MCP（Model Context Protocol，模型上下文协议）"
description: "通过 MCP 将 Hermes Agent 连接到外部工具服务器 — 并精确控制 Hermes 加载哪些 MCP 工具"
---

# MCP（Model Context Protocol，模型上下文协议）

MCP 让 Hermes Agent 连接到外部工具服务器，使 Agent 可以使用 Hermes 自身之外的工具 — GitHub、数据库、文件系统、浏览器栈、内部 API 等等。

如果你曾想让 Hermes 使用某个已经存在于其他地方的工具，MCP 通常是最干净的方式。

## MCP 提供什么

- 无需先编写原生 Hermes 工具即可访问外部工具生态
- 同一配置中支持本地 stdio 服务器和远程 HTTP MCP 服务器
- 启动时自动发现和注册工具
- 当服务器支持时，为 MCP 资源和提示提供实用包装器
- 每服务器过滤，让你只暴露 Hermes 实际需要看到的 MCP 工具

## 快速开始

1. 安装 MCP 支持（如果使用标准安装脚本则已包含）：

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
```

2. 在 `~/.hermes/config.yaml` 中添加 MCP 服务器：

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
```

3. 启动 Hermes：

```bash
hermes chat
```

4. 让 Hermes 使用 MCP 支持的功能。

例如：

```text
列出 /home/user/projects 中的文件并总结仓库结构。
```

Hermes 会发现 MCP 服务器的工具，并像使用其他工具一样使用它们。

## 两种 MCP 服务器

### Stdio 服务器

Stdio 服务器作为本地子进程运行，通过 stdin/stdout 通信。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
```

在以下情况使用 stdio 服务器：
- 服务器已安装在本地
- 你需要低延迟访问本地资源
- 你正在按照 MCP 服务器文档中的 `command`、`args` 和 `env` 说明操作

### HTTP 服务器

HTTP MCP 服务器是 Hermes 直接连接的远程端点。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ***"
```

在以下情况使用 HTTP 服务器：
- MCP 服务器托管在其他地方
- 你的组织暴露内部 MCP 端点
- 你不希望 Hermes 为该集成启动本地子进程

## 基本配置参考

Hermes 从 `~/.hermes/config.yaml` 的 `mcp_servers` 部分读取 MCP 配置。

### 通用键

| 键 | 类型 | 含义 |
|---|---|---|
| `command` | string | Stdio MCP 服务器的可执行文件 |
| `args` | list | Stdio 服务器的参数 |
| `env` | mapping | 传递给 stdio 服务器的环境变量 |
| `url` | string | HTTP MCP 端点 |
| `headers` | mapping | 远程服务器的 HTTP 头 |
| `timeout` | number | 工具调用超时 |
| `connect_timeout` | number | 初始连接超时 |
| `enabled` | bool | 如果为 `false`，Hermes 完全跳过该服务器 |
| `tools` | mapping | 每服务器工具过滤和实用策略 |

### 最简 Stdio 示例

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

### 最简 HTTP 示例

```yaml
mcp_servers:
  company_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
```

## Hermes 如何注册 MCP 工具

Hermes 为 MCP 工具添加前缀以避免与内置名称冲突：

```text
mcp_<服务器名>_<工具名>
```

示例：

| 服务器 | MCP 工具 | 注册名称 |
|---|---|---|
| `filesystem` | `read_file` | `mcp_filesystem_read_file` |
| `github` | `create-issue` | `mcp_github_create_issue` |
| `my-api` | `query.data` | `mcp_my_api_query_data` |

实际上，你通常不需要手动调用带前缀的名称 — Hermes 会看到工具并在正常推理中选择它。

## MCP 实用工具

当服务器支持时，Hermes 还会注册围绕 MCP 资源和提示的实用工具：

- `list_resources`
- `read_resource`
- `list_prompts`
- `get_prompt`

这些按服务器注册，使用相同的前缀模式，例如：

- `mcp_github_list_resources`
- `mcp_github_get_prompt`

### 重要说明

这些实用工具现在是能力感知的：
- Hermes 仅在 MCP 会话实际支持资源操作时才注册资源实用工具
- Hermes 仅在 MCP 会话实际支持提示操作时才注册提示实用工具

所以一个只暴露可调用工具但没有资源/提示的服务器不会获得这些额外的包装器。

## 每服务器过滤

你可以控制每个 MCP 服务器向 Hermes 贡献哪些工具，实现精细的工具命名空间管理。

### 完全禁用服务器

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

如果 `enabled: false`，Hermes 完全跳过该服务器，甚至不尝试连接。

### 白名单服务器工具

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [create_issue, list_issues]
```

只有那些 MCP 服务器工具会被注册。

### 黑名单服务器工具

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    tools:
      exclude: [delete_customer]
```

注册所有服务器工具，除了被排除的。

### 优先级规则

如果两者同时存在：

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

`include` 优先。

### 同时过滤实用工具

你也可以单独禁用 Hermes 添加的实用包装器：

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

这意味着：
- `tools.resources: false` 禁用 `list_resources` 和 `read_resource`
- `tools.prompts: false` 禁用 `list_prompts` 和 `get_prompt`

### 完整示例

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [create_issue, list_issues, search_code]
      prompts: false

  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer]
      resources: false

  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

## 如果所有工具都被过滤掉了会怎样？

如果你的配置过滤掉了所有可调用工具并禁用或省略了所有支持的实用工具，Hermes 不会为该服务器创建空运行时 MCP 工具集。

这保持了工具列表的整洁。

## 运行时行为

### 发现时间

Hermes 在启动时发现 MCP 服务器并将其工具注册到正常工具注册表中。

### 动态工具发现

MCP 服务器可以在运行时通过发送 `notifications/tools/list_changed` 通知来告知 Hermes 其可用工具已更改。当 Hermes 收到此通知时，会自动重新获取服务器的工具列表并更新注册表 — 无需手动 `/reload-mcp`。

这对于能力动态变化的 MCP 服务器很有用（例如，加载新数据库 Schema 时添加工具，或服务下线时移除工具）。

刷新操作有锁保护，因此来自同一服务器的密集通知不会导致重叠刷新。提示和资源变更通知（`prompts/list_changed`、`resources/list_changed`）会被接收但尚未处理。

### 重新加载

如果你更改了 MCP 配置，使用：

```text
/reload-mcp
```

这会从配置重新加载 MCP 服务器并刷新可用工具列表。对于服务器自身推送的运行时工具变更，参见上方[动态工具发现](#动态工具发现)。

### 工具集

每个配置的 MCP 服务器在至少贡献一个注册工具时也会创建一个运行时工具集：

```text
mcp-<服务器>
```

这让 MCP 服务器在工具集层面更容易管理。

## 安全模型

### Stdio 环境过滤

对于 stdio 服务器，Hermes 不会盲目传递你的完整 shell 环境。

只有显式配置的 `env` 加上一个安全基线会被传递。这减少了意外的密钥泄露。

### 配置级暴露控制

新的过滤支持也是一种安全控制：
- 禁用你不希望模型看到的危险工具
- 为敏感服务器只暴露最小白名单
- 在不希望暴露该功能面时禁用资源/提示包装器

## 示例用例

### GitHub 服务器，最小 Issue 管理面

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue]
      prompts: false
      resources: false
```

使用示例：

```text
显示标记为 bug 的未解决 Issue，然后为不稳定的 MCP 重连行为起草一个新 Issue。
```

### Stripe 服务器，移除危险操作

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

使用示例：

```text
查找最近 10 笔失败的支付并总结常见失败原因。
```

### 单项目根目录的文件系统服务器

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

使用示例：

```text
检查项目根目录并解释目录结构。
```

## 故障排除

### MCP 服务器未连接

检查：

```bash
# 验证 MCP 依赖已安装（标准安装中已包含）
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

node --version
npx --version
```

然后验证配置并重启 Hermes。

### 工具未出现

可能的原因：
- 服务器连接失败
- 发现失败
- 你的过滤配置排除了这些工具
- 该服务器上不存在该实用能力
- 服务器被 `enabled: false` 禁用

如果你是有意过滤，这是预期行为。

### 为什么没有出现资源或提示实用工具？

因为 Hermes 现在只在两个条件都满足时才注册这些包装器：
1. 你的配置允许
2. 服务器会话实际支持该能力

这是有意为之的，保持了工具列表的诚实性。

## MCP Sampling 支持

MCP 服务器可以通过 `sampling/createMessage` 协议向 Hermes 请求 LLM 推理。这允许 MCP 服务器请求 Hermes 代其生成文本 — 对于需要 LLM 能力但没有自己模型访问权限的服务器很有用。

Sampling 默认为所有 MCP 服务器**启用**（当 MCP SDK 支持时）。在每服务器的 `sampling` 键下配置：

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    sampling:
      enabled: true            # 启用 sampling（默认：true）
      model: "openai/gpt-4o"  # 覆盖 sampling 请求的模型（可选）
      max_tokens_cap: 4096     # 每次 sampling 响应的最大 Token 数（默认：4096）
      timeout: 30              # 每请求超时秒数（默认：30）
      max_rpm: 10              # 速率限制：每分钟最大请求数（默认：10）
      max_tool_rounds: 5       # Sampling 循环中最大工具调用轮数（默认：5）
      allowed_models: []       # 服务器可请求的模型白名单（空 = 任意）
      log_level: "info"        # 审计日志级别：debug、info 或 warning（默认：info）
```

Sampling 处理程序包括滑动窗口速率限制器、每请求超时和工具循环深度限制以防止失控使用。指标（请求计数、错误、使用的 Token）按服务器实例跟踪。

要禁用特定服务器的 Sampling：

```yaml
mcp_servers:
  untrusted_server:
    url: "https://mcp.example.com"
    sampling:
      enabled: false
```

## 将 Hermes 作为 MCP 服务器运行

除了连接**到** MCP 服务器，Hermes 还可以**作为** MCP 服务器。这让其他支持 MCP 的 Agent（Claude Code、Cursor、Codex 或任何 MCP 客户端）可以使用 Hermes 的消息功能 — 列出对话、读取消息历史、跨所有已连接平台发送消息。

### 何时使用

- 你想让 Claude Code、Cursor 或其他编码 Agent 通过 Hermes 发送和读取 Telegram/Discord/Slack 消息
- 你想要一个同时桥接到 Hermes 所有已连接消息平台的单一 MCP 服务器
- 你已经有一个运行中的 Hermes Gateway 和已连接的平台

### 快速开始

```bash
hermes mcp serve
```

这启动一个 stdio MCP 服务器。MCP 客户端（而不是你）管理进程生命周期。

### MCP 客户端配置

将 Hermes 添加到你的 MCP 客户端配置。例如，在 Claude Code 的 `~/.claude/claude_desktop_config.json` 中：

```json
{
  "mcpServers": {
    "hermes": {
      "command": "hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

或者如果你将 Hermes 安装在特定位置：

```json
{
  "mcpServers": {
    "hermes": {
      "command": "/home/user/.hermes/hermes-agent/venv/bin/hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

### 可用工具

MCP 服务器暴露 10 个工具，匹配 OpenClaw 的频道桥接面加上 Hermes 特有的频道浏览器：

| 工具 | 说明 |
|------|-------------|
| `conversations_list` | 列出活跃的消息对话。可按平台过滤或按名称搜索。 |
| `conversation_get` | 通过会话键获取一个对话的详细信息。 |
| `messages_read` | 读取对话的最近消息历史。 |
| `attachments_fetch` | 从特定消息中提取非文本附件（图片、媒体）。 |
| `events_poll` | 从游标位置轮询新的对话事件。 |
| `events_wait` | 长轮询/阻塞直到下一个事件到达（近实时）。 |
| `messages_send` | 通过平台发送消息（如 `telegram:123456`、`discord:#general`）。 |
| `channels_list` | 列出所有平台可用的消息目标。 |
| `permissions_list_open` | 列出在此桥接会话期间观察到的待批准请求。 |
| `permissions_respond` | 允许或拒绝待处理的批准请求。 |

### 事件系统

MCP 服务器包含一个实时事件桥，轮询 Hermes 的会话数据库获取新消息。这让 MCP 客户端近实时感知传入的对话：

```
# 轮询新事件（非阻塞）
events_poll(after_cursor=0)

# 等待下一个事件（阻塞直到超时）
events_wait(after_cursor=42, timeout_ms=30000)
```

事件类型：`message`、`approval_requested`、`approval_resolved`

事件队列在内存中，在桥接连接时启动。旧消息可以通过 `messages_read` 获取。

### 选项

```bash
hermes mcp serve              # 正常模式
hermes mcp serve --verbose    # 在 stderr 上输出调试日志
```

### 工作原理

MCP 服务器直接从 Hermes 的会话存储（`~/.hermes/sessions/sessions.json` 和 SQLite 数据库）读取对话数据。后台线程轮询数据库获取新消息并维护内存中的事件队列。发送消息时，使用与 Hermes Agent 本身相同的 `send_message` 基础设施。

读操作（列出对话、读取历史、轮询事件）**不需要** Gateway 运行。发送操作**需要** Gateway 运行，因为平台适配器需要活跃的连接。

### 当前限制

- 仅支持 Stdio 传输（尚无 HTTP MCP 传输）
- 事件轮询间隔约 200ms，通过 mtime 优化的数据库轮询（文件未更改时跳过工作）
- 尚无 `claude/channel` 推送通知协议
- 仅文本发送（通过 `messages_send` 无法发送媒体/附件）

## 相关文档

- [使用 MCP 与 Hermes](/docs/guides/use-mcp-with-hermes)
- [CLI 命令](/docs/reference/cli-commands)
- [斜杠命令](/docs/reference/slash-commands)
- [常见问题](/docs/reference/faq)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/mcp)
