---
sidebar_position: 11
title: "ACP 编辑器集成"
description: "在 ACP 兼容编辑器（如 VS Code、Zed、JetBrains）中使用 Hermes Agent"
---

# ACP 编辑器集成

Hermes Agent 可以作为 ACP 服务器运行，让 ACP 兼容编辑器通过 stdio 与 Hermes 通信并渲染：

- 聊天消息
- 工具活动
- 文件差异
- 终端命令
- 审批提示
- 流式思考 / 响应块

当你希望 Hermes 像编辑器原生编程 Agent 而非独立 CLI 或消息 Bot 一样工作时，ACP 是很好的选择。

## Hermes 在 ACP 模式下暴露什么

Hermes 使用精选的 `hermes-acp` 工具集运行，专为编辑器工作流设计。包括：

- 文件工具：`read_file`、`write_file`、`patch`、`search_files`
- 终端工具：`terminal`、`process`
- Web/浏览器工具
- 记忆、待办、会话搜索
- Skill
- execute_code 和 delegate_task
- 视觉

它有意排除了不适合典型编辑器 UX 的内容，如消息投递和 Cron 任务管理。

## 安装

正常安装 Hermes，然后添加 ACP 额外组件：

```bash
pip install -e '.[acp]'
```

这会安装 `agent-client-protocol` 依赖并启用：

- `hermes acp`
- `hermes-acp`
- `python -m acp_adapter`

## 启动 ACP 服务器

以下任一命令会以 ACP 模式启动 Hermes：

```bash
hermes acp
```

```bash
hermes-acp
```

```bash
python -m acp_adapter
```

Hermes 记录日志到 stderr，因此 stdout 保留给 ACP JSON-RPC 流量。

## 编辑器设置

### VS Code

安装 ACP 客户端扩展，然后将其指向仓库的 `acp_registry/` 目录。

示例配置：

```json
{
  "acpClient.agents": [
    {
      "name": "hermes-agent",
      "registryDir": "/path/to/hermes-agent/acp_registry"
    }
  ]
}
```

### Zed

示例配置：

```json
{
  "agent_servers": {
    "hermes-agent": {
      "type": "custom",
      "command": "hermes",
      "args": ["acp"],
    },
  },
}
```

### JetBrains

使用 ACP 兼容插件并指向：

```text
/path/to/hermes-agent/acp_registry
```

## 注册表清单

ACP 注册表清单位于：

```text
acp_registry/agent.json
```

它声明了一个基于命令的 Agent，启动命令为：

```text
hermes acp
```

## 配置与凭据

ACP 模式使用与 CLI 相同的 Hermes 配置：

- `~/.hermes/.env`
- `~/.hermes/config.yaml`
- `~/.hermes/skills/`
- `~/.hermes/state.db`

Provider 解析使用 Hermes 的正常运行时解析器，因此 ACP 继承当前配置的 Provider 和凭据。

## 会话行为

ACP 会话由 ACP 适配器的内存会话管理器在服务器运行期间跟踪。

每个会话存储：

- 会话 ID
- 工作目录
- 选定的模型
- 当前对话历史
- 取消事件

底层 `AIAgent` 仍使用 Hermes 的正常持久化/日志路径，但 ACP 的 `list/load/resume/fork` 仅限于当前运行的 ACP 服务器进程。

## 工作目录行为

ACP 会话将编辑器的当前工作目录绑定到 Hermes 任务 ID，使文件和终端工具相对于编辑器工作区而非服务器进程的工作目录运行。

## 审批

危险的终端命令可以作为审批提示路由回编辑器。ACP 审批选项比 CLI 流程更简单：

- 允许一次
- 始终允许
- 拒绝

超时或错误时，审批桥接拒绝请求。

## 故障排除

### ACP Agent 未在编辑器中出现

检查：

- 编辑器指向了正确的 `acp_registry/` 路径
- Hermes 已安装并在 PATH 上
- ACP 额外组件已安装（`pip install -e '.[acp]'`）

### ACP 启动但立即报错

尝试以下检查：

```bash
hermes doctor
hermes status
hermes acp
```

### 缺少凭据

ACP 模式没有自己的登录流程。它使用 Hermes 现有的 Provider 设置。通过以下方式配置凭据：

```bash
hermes model
```

或编辑 `~/.hermes/.env`。

## 另见

- [ACP 内部机制](../../developer-guide/acp-internals.md)
- [Provider 运行时解析](../../developer-guide/provider-runtime.md)
- [工具运行时](../../developer-guide/tools-runtime.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/acp)
