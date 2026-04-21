---
sidebar_position: 6
title: "在 Hermes 中使用 MCP"
description: "将 MCP 服务器连接到 Hermes Agent 的实用指南 — 工具过滤、安全使用和真实工作流"
---

# 在 Hermes 中使用 MCP

本指南展示如何在日常工作中实际使用 MCP 与 Hermes Agent。

功能页面解释了 MCP 是什么，本指南关注如何快速、安全地从中获得价值。

## 什么时候应该使用 MCP？

使用 MCP 当：
- 某个工具已经以 MCP 形式存在，你不想构建原生 Hermes 工具
- 你想让 Hermes 通过干净的 RPC 层操作本地或远程系统
- 你想要精细的每服务器暴露控制
- 你想让 Hermes 连接内部 API、数据库或公司系统，而不修改 Hermes 核心

不使用 MCP 当：
- 内置 Hermes 工具已经能很好地解决问题
- 服务器暴露大量危险工具表面，你还没准备好过滤
- 你只需要一个非常窄的集成，原生工具更简单更安全

## 心智模型

把 MCP 想象成一个适配层：

- Hermes 保持为 Agent
- MCP 服务器贡献工具
- Hermes 在启动或重载时发现这些工具
- 模型可以像使用普通工具一样使用它们
- 你控制每个服务器有多少可见

最后一点很重要。好的 MCP 使用不是"连接一切"，而是"连接正确的东西，用最小的有用表面"。

## 第 1 步：安装 MCP 支持

如果你使用标准安装脚本安装了 Hermes，MCP 支持已经包含在内（安装器运行 `uv pip install -e ".[all]"`）。

如果你安装时没有包含附加功能，需要单独添加 MCP：

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
```

对于基于 npm 的服务器，确保 Node.js 和 `npx` 可用。

对于许多 Python MCP 服务器，`uvx` 是一个不错的默认选择。

## 第 2 步：先添加一个服务器

从一个单一的、安全的服务器开始。

示例：仅限一个项目目录的文件系统访问。

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

然后启动 Hermes：

```bash
hermes chat
```

现在问一些具体的问题：

```text
检查这个项目并总结仓库布局。
```

## 第 3 步：验证 MCP 已加载

你可以通过几种方式验证 MCP：
- Hermes 横幅/状态在配置后应显示 MCP 集成
- 问 Hermes 它有哪些可用工具
- 配置更改后使用 `/reload-mcp`
- 如果服务器连接失败，检查日志

一个实用的测试提示：

```text
告诉我现在有哪些 MCP 支持的工具可用。
```

## 第 4 步：立即开始过滤

如果服务器暴露大量工具，不要等到以后再过滤。

### 示例：仅白名单你需要的

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, search_code]
```

这通常是敏感系统的最佳默认设置。

### 示例：黑名单危险操作

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

### 示例：也禁用工具包装器

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

## 过滤实际影响什么？

Hermes 中有两类 MCP 暴露的功能：

1. 服务器原生 MCP 工具
- 过滤方式：
  - `tools.include`
  - `tools.exclude`

2. Hermes 添加的工具包装器
- 过滤方式：
  - `tools.resources`
  - `tools.prompts`

### 你可能看到的工具包装器

资源（Resources）：
- `list_resources`
- `read_resource`

提示（Prompts）：
- `list_prompts`
- `get_prompt`

这些包装器仅在以下情况出现：
- 你的配置允许它们，且
- MCP 服务器会话实际支持这些能力

所以如果服务器不支持资源/提示，Hermes 不会假装它支持。

## 常见模式

### 模式 1：本地项目助手

当你想让 Hermes 在有界工作空间上推理时，使用 MCP 进行仓库本地文件系统或 Git 服务器操作。

```yaml
mcp_servers:
  fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/project"]

  git:
    command: "uvx"
    args: ["mcp-server-git", "--repository", "/home/user/project"]
```

好的提示：

```text
审查项目结构，找出配置文件在哪里。
```

```text
检查本地 Git 状态，总结最近的变更。
```

### 模式 2：GitHub 分类助手

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      prompts: false
      resources: false
```

好的提示：

```text
列出关于 MCP 的开放 Issue，按主题聚类，然后为最常见的 bug 起草一个高质量的 Issue。
```

```text
在仓库中搜索 _discover_and_register_server 的使用，解释 MCP 工具是如何注册的。
```

### 模式 3：内部 API 助手

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      include: [list_customers, get_customer, list_invoices]
      resources: false
      prompts: false
```

好的提示：

```text
查找客户 ACME Corp，总结最近的发票活动。
```

这是严格白名单远优于排除列表的场景。

### 模式 4：文档/知识服务器

某些 MCP 服务器暴露的提示或资源更像是共享知识资产，而非直接操作。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: true
      resources: true
```

好的提示：

```text
列出文档服务器上可用的 MCP 资源，然后阅读入门指南并总结。
```

```text
列出文档服务器暴露的提示，告诉我哪些有助于事件响应。
```

## 教程：带过滤的端到端设置

以下是一个实际的进阶过程。

### 阶段 1：添加 GitHub MCP 并设置严格白名单

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, search_code]
      prompts: false
      resources: false
```

启动 Hermes 并提问：

```text
在代码库中搜索 MCP 的引用，总结主要集成点。
```

### 阶段 2：仅在需要时扩展

如果后来也需要 Issue 更新：

```yaml
tools:
  include: [list_issues, create_issue, update_issue, search_code]
```

然后重载：

```text
/reload-mcp
```

### 阶段 3：添加第二个服务器，使用不同策略

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      prompts: false
      resources: false

  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/project"]
```

现在 Hermes 可以组合使用它们：

```text
检查本地项目文件，然后创建一个 GitHub Issue 总结你发现的 bug。
```

这就是 MCP 的强大之处：多系统工作流，无需更改 Hermes 核心。

## 安全使用建议

### 对危险系统优先使用白名单

对于任何金融、面向客户或有破坏性的系统：
- 使用 `tools.include`
- 从尽可能小的集合开始

### 禁用未使用的工具

如果你不想让模型浏览服务器提供的资源/提示，关闭它们：

```yaml
tools:
  resources: false
  prompts: false
```

### 保持服务器范围窄

示例：
- 文件系统服务器仅限一个项目目录，而不是整个主目录
- Git 服务器指向一个仓库
- 内部 API 服务器默认以只读工具暴露为主

### 配置更改后重载

```text
/reload-mcp
```

在更改以下内容后执行：
- include/exclude 列表
- 启用标志
- resources/prompts 开关
- 认证头 / 环境变量

## 按症状故障排除

### "服务器连接了但我期望的工具不见了"

可能原因：
- 被 `tools.include` 过滤了
- 被 `tools.exclude` 排除了
- 工具包装器通过 `resources: false` 或 `prompts: false` 禁用了
- 服务器实际上不支持资源/提示

### "服务器已配置但没有加载"

检查：
- 配置中没有留下 `enabled: false`
- command/runtime 存在（`npx`、`uvx` 等）
- HTTP 端点可达
- 认证环境变量或请求头正确

### "为什么我看到的工具比 MCP 服务器宣传的少？"

因为 Hermes 现在遵循你的每服务器策略和感知能力的注册。这是预期的，通常是理想的。

### "如何在不删除配置的情况下移除 MCP 服务器？"

使用：

```yaml
enabled: false
```

这保留配置但阻止连接和注册。

## 推荐的首个 MCP 设置

大多数用户的好选择：
- filesystem
- git
- GitHub
- fetch / 文档 MCP 服务器
- 一个窄范围的内部 API

不太好的选择：
- 带有大量破坏性操作且没有过滤的巨型业务系统
- 任何你不够了解以至于无法约束的东西

## 相关文档

- [MCP（Model Context Protocol）](/docs/user-guide/features/mcp)
- [常见问题](/docs/reference/faq)
- [斜杠命令](/docs/reference/slash-commands)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/use-mcp-with-hermes)
