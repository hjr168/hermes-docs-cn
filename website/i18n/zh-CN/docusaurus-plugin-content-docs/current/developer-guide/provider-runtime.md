---
sidebar_position: 4
title: "提供商运行时解析"
description: "Hermes 如何在运行时解析提供商、凭证、API 模式和辅助模型"
---

# 提供商运行时解析

Hermes 有一个跨以下组件共享的提供商运行时解析器：

- CLI
- Gateway
- Cron 任务
- ACP
- 辅助模型调用

主要实现：

- `hermes_cli/runtime_provider.py` — 凭证解析，`_resolve_custom_runtime()`
- `hermes_cli/auth.py` — 提供商注册表，`resolve_provider()`
- `hermes_cli/model_switch.py` — 共享的 `/model` 切换管道（CLI + Gateway）
- `agent/auxiliary_client.py` — 辅助模型路由

如果你要添加新的一等推理提供商，请同时阅读[添加提供商](./adding-providers.md)。

## 解析优先级

高层来看，提供商解析使用：

1. 显式的 CLI/运行时请求
2. `config.yaml` 模型/提供商配置
3. 环境变量
4. 提供商特定的默认值或自动解析

这个顺序很重要，因为 Hermes 将保存的模型/提供商选择视为正常运行的真相来源。这防止过期的 Shell 导出静默覆盖用户上次在 `hermes model` 中选择的端点。

## 提供商

当前提供商系列包括：

- AI Gateway（Vercel）
- OpenRouter
- Nous Portal
- OpenAI Codex
- Copilot / Copilot ACP
- Anthropic（原生）
- Google / Gemini
- Alibaba / DashScope
- DeepSeek
- Z.AI
- Kimi / Moonshot
- MiniMax
- MiniMax China
- Kilo Code
- Hugging Face
- OpenCode Zen / OpenCode Go
- Custom（`provider: custom`）— 任何 OpenAI 兼容端点的一等提供商
- 命名自定义提供商（`config.yaml` 中的 `custom_providers` 列表）

## 运行时解析的输出

运行时解析器返回的数据包括：

- `provider`
- `api_mode`
- `base_url`
- `api_key`
- `source`
- 提供商特定的元数据，如过期/刷新信息

## 为什么这很重要

这个解析器是 Hermes 能在以下场景共享认证/运行时逻辑的主要原因：

- `hermes chat`
- Gateway 消息处理
- 在全新会话中运行的 Cron 任务
- ACP 编辑器会话
- 辅助模型任务

## AI Gateway

在 `~/.hermes/.env` 中设置 `AI_GATEWAY_API_KEY`，使用 `--provider ai-gateway` 运行。Hermes 从 Gateway 的 `/models` 端点获取可用模型，筛选支持工具使用的语言模型。

## OpenRouter、AI Gateway 和自定义 OpenAI 兼容 Base URL

Hermes 包含逻辑，在存在多个提供商密钥（如 `OPENROUTER_API_KEY`、`AI_GATEWAY_API_KEY` 和 `OPENAI_API_KEY`）时，避免将错误的 API 密钥泄漏到自定义端点。

每个提供商的 API 密钥仅限于其自己的 Base URL：

- `OPENROUTER_API_KEY` 仅发送到 `openrouter.ai` 端点
- `AI_GATEWAY_API_KEY` 仅发送到 `ai-gateway.vercel.sh` 端点
- `OPENAI_API_KEY` 用于自定义端点并作为回退

Hermes 还区分：

- 用户选择的真正自定义端点
- 未配置自定义端点时使用的 OpenRouter 回退路径

这个区分特别重要对于：

- 本地模型服务器
- 非 OpenRouter/非 AI Gateway 的 OpenAI 兼容 API
- 无需重新运行 setup 即可切换提供商
- 通过配置保存的自定义端点，即使当前 Shell 中没有导出 `OPENAI_BASE_URL` 也应该继续工作

## 原生 Anthropic 路径

Anthropic 不再只是"通过 OpenRouter"了。

当提供商解析选择 `anthropic` 时，Hermes 使用：

- `api_mode = anthropic_messages`
- 原生 Anthropic Messages API
- `agent/anthropic_adapter.py` 进行翻译

原生 Anthropic 的凭证解析现在在有刷新能力的 Claude Code 凭证和复制的环境 Token 同时存在时，优先使用可刷新的 Claude Code 凭证。实际效果是：

- Claude Code 凭证文件在包含可刷新认证时被视为首选来源
- 手动的 `ANTHROPIC_TOKEN` / `CLAUDE_CODE_OAUTH_TOKEN` 值仍然可以作为显式覆盖
- Hermes 在原生 Messages API 调用前会预检 Anthropic 凭证刷新
- Hermes 仍然会在 401 错误后重建 Anthropic 客户端后重试一次，作为回退路径

## OpenAI Codex 路径

Codex 使用独立的 Responses API 路径：

- `api_mode = codex_responses`
- 专用凭证解析和认证存储支持

## 辅助模型路由

辅助任务如：

- 视觉
- Web 提取摘要
- 上下文压缩摘要
- 会话搜索摘要
- Skill Hub 操作
- MCP 辅助操作
- 记忆刷新

可以使用自己的提供商/模型路由，而非主对话模型。

当辅助任务配置了 provider `main` 时，Hermes 通过与正常聊天相同的共享运行时路径解析。实际效果是：

- 环境变量驱动的自定义端点仍然工作
- 通过 `hermes model` / `config.yaml` 保存的自定义端点也工作
- 辅助路由可以区分真正保存的自定义端点和 OpenRouter 回退

## 回退模型

Hermes 支持配置的回退模型/提供商对，允许在主模型遇到错误时运行时故障转移。

### 内部工作原理

1. **存储**：`AIAgent.__init__` 存储 `fallback_model` 字典并设置 `_fallback_activated = False`。

2. **触发点**：`_try_activate_fallback()` 从 `run_agent.py` 主重试循环的三个位置调用：
   - 无效 API 响应（None choices、缺失内容）达到最大重试后
   - 非可重试的客户端错误（HTTP 401、403、404）
   - 瞬时错误（HTTP 429、500、502、503）达到最大重试后

3. **激活流程**（`_try_activate_fallback`）：
   - 如果已激活或未配置，立即返回 `False`
   - 从 `auxiliary_client.py` 调用 `resolve_provider_client()` 构建带正确认证的新客户端
   - 确定 `api_mode`：openai-codex 用 `codex_responses`，anthropic 用 `anthropic_messages`，其他用 `chat_completions`
   - 就地替换：`self.model`、`self.provider`、`self.base_url`、`self.api_mode`、`self.client`、`self._client_kwargs`
   - 对于 Anthropic 回退：构建原生 Anthropic 客户端而非 OpenAI 兼容客户端
   - 重新评估提示缓存（在 OpenRouter 上的 Claude 模型启用）
   - 设置 `_fallback_activated = True` — 防止再次触发
   - 重置重试计数为 0 并继续循环

4. **配置流程**：
   - CLI：`cli.py` 读取 `CLI_CONFIG["fallback_model"]` → 传给 `AIAgent(fallback_model=...)`
   - Gateway：`gateway/run.py._load_fallback_model()` 读取 `config.yaml` → 传给 `AIAgent`
   - 验证：`provider` 和 `model` 键都必须非空，否则禁用回退

### 不支持回退的场景

- **子 Agent 委托**（`tools/delegate_tool.py`）：子 Agent 继承父 Agent 的提供商但不继承回退配置
- **Cron 任务**（`cron/`）：使用固定提供商运行，无回退机制
- **辅助任务**：使用自己独立的提供商自动检测链（参见上方辅助模型路由）

### 测试覆盖

参见 `tests/test_fallback_model.py` 了解覆盖所有支持提供商、一次性语义和边界情况的全面测试。

## 相关文档

- [Agent 循环内部机制](./agent-loop.md)
- [ACP 内部机制](./acp-internals.md)
- [上下文压缩与提示缓存](./context-compression-and-caching.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/provider-runtime)
