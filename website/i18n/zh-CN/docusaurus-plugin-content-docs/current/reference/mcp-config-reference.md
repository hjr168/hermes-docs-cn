---
sidebar_position: 8
title: "MCP 配置参考"
description: "Hermes Agent MCP 配置键、过滤语义和工具策略的参考文档"
---

# MCP 配置参考

本页面是主要 MCP 文档的精简参考手册。

如需概念性指导，请参阅：
- [MCP（Model Context Protocol，模型上下文协议）](/docs/user-guide/features/mcp)
- [使用 MCP 连接 Hermes](/docs/guides/use-mcp-with-hermes)

## 根配置结构

```yaml
mcp_servers:
  <server_name>:
    command: "..."      # stdio 服务器
    args: []
    env: {}

    # 或
    url: "..."          # HTTP 服务器
    headers: {}

    enabled: true
    timeout: 120
    connect_timeout: 60
    tools:
      include: []
      exclude: []
      resources: true
      prompts: true
```

## 服务器配置键

| 键 | 类型 | 适用对象 | 含义 |
|---|---|---|---|
| `command` | string | stdio | 要启动的可执行文件 |
| `args` | list | stdio | 子进程的参数列表 |
| `env` | mapping | stdio | 传递给子进程的环境变量 |
| `url` | string | HTTP | 远程 MCP 端点 |
| `headers` | mapping | HTTP | 远程服务器请求的请求头 |
| `enabled` | bool | both | 设为 false 时跳过该服务器 |
| `timeout` | number | both | 工具调用超时时间 |
| `connect_timeout` | number | both | 初始连接超时时间 |
| `tools` | mapping | both | 过滤和工具策略配置 |
| `auth` | string | HTTP | 认证方式。设为 `oauth` 可启用 OAuth 2.1 with PKCE |
| `sampling` | mapping | both | 服务器发起的 LLM 请求策略（参见 MCP 指南） |

## `tools` 策略键

| 键 | 类型 | 含义 |
|---|---|---|
| `include` | string 或 list | 白名单：允许的服务器原生 MCP 工具 |
| `exclude` | string 或 list | 黑名单：排除的服务器原生 MCP 工具 |
| `resources` | bool-like | 启用/禁用 `list_resources` + `read_resource` |
| `prompts` | bool-like | 启用/禁用 `list_prompts` + `get_prompt` |

## 过滤语义

### `include`

如果设置了 `include`，则仅注册指定的服务器原生 MCP 工具。

```yaml
tools:
  include: [create_issue, list_issues]
```

### `exclude`

如果设置了 `exclude` 且未设置 `include`，则注册除指定名称之外的所有服务器原生 MCP 工具。

```yaml
tools:
  exclude: [delete_customer]
```

### 优先级

如果两者同时设置，`include` 优先。

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

结果：
- `create_issue` 仍然被允许
- `delete_issue` 被忽略，因为 `include` 优先

## 工具策略

Hermes 会为每个 MCP 服务器注册以下工具包装器：

Resources（资源）：
- `list_resources`
- `read_resource`

Prompts（提示）：
- `list_prompts`
- `get_prompt`

### 禁用 resources

```yaml
tools:
  resources: false
```

### 禁用 prompts

```yaml
tools:
  prompts: false
```

### 基于能力的注册

即使设置了 `resources: true` 或 `prompts: true`，Hermes 也只会在 MCP 会话实际暴露相应能力时才注册这些工具。

所以以下情况是正常的：
- 你启用了 prompts
- 但没有出现任何提示工具
- 因为该服务器不支持 prompts

## `enabled: false`

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

行为：
- 不尝试连接
- 不进行发现
- 不注册工具
- 配置保留在原位，供后续复用

## 空结果行为

如果过滤后移除了所有服务器原生工具，且没有注册任何工具，Hermes 不会为该服务器创建空的 MCP 运行时工具集。

## 配置示例

### 安全的 GitHub 白名单

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      resources: false
      prompts: false
```

### Stripe 黑名单

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

### 仅资源的文档服务器

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      include: []
      resources: true
      prompts: false
```

## 重新加载配置

修改 MCP 配置后，使用以下命令重新加载服务器：

```text
/reload-mcp
```

## 工具命名

服务器原生的 MCP 工具变为：

```text
mcp_<server>_<tool>
```

示例：
- `mcp_github_create_issue`
- `mcp_filesystem_read_file`
- `mcp_my_api_query_data`

工具遵循相同的前缀模式：
- `mcp_<server>_list_resources`
- `mcp_<server>_read_resource`
- `mcp_<server>_list_prompts`
- `mcp_<server>_get_prompt`

### 名称清理

服务器名称和工具名称中的连字符（`-`）和点号（`.`）在注册前会被替换为下划线。这确保了工具名称对于 LLM 函数调用 API（Function Calling API）来说是有效的标识符。

例如，一个名为 `my-api` 的服务器暴露了一个名为 `list-items.v2` 的工具，将变为：

```text
mcp_my_api_list_items_v2
```

在编写 `include` / `exclude` 过滤器时请记住这一点 — 使用**原始**的 MCP 工具名称（包含连字符/点号），而不是清理后的版本。

## OAuth 2.1 认证

对于需要 OAuth 的 HTTP 服务器，在服务器条目上设置 `auth: oauth`：

```yaml
mcp_servers:
  protected_api:
    url: "https://mcp.example.com/mcp"
    auth: oauth
```

行为：
- Hermes 使用 MCP SDK 的 OAuth 2.1 PKCE 流程（元数据发现、动态客户端注册、令牌交换和刷新）
- 首次连接时，会打开浏览器窗口进行授权
- 令牌持久化到 `~/.hermes/mcp-tokens/<server>.json`，并在多个会话之间复用
- 令牌刷新是自动的；仅在刷新失败时才需要重新授权
- 仅适用于 HTTP/StreamableHTTP 传输（基于 `url` 的服务器）

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/mcp-config-reference)
