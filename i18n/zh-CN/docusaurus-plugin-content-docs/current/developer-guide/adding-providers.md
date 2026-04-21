---
sidebar_position: 5
title: "添加 Provider"
description: "如何为 Hermes Agent 添加新的推理 provider——认证、运行时解析、CLI 流程、适配器、测试和文档"
---

# 添加 Provider

Hermes 已经可以通过自定义 provider 路径与任何 OpenAI 兼容端点通信。除非你想为某个服务提供一流的 UX，否则不要添加内置 provider：

- provider 特定的认证或 token 刷新
- 精选的模型目录
- 设置 / `hermes model` 菜单条目
- `provider:model` 语法的 provider 别名
- 需要 adapter 的非 OpenAI API 格式

如果 provider 只是"另一个 OpenAI 兼容的 base URL 和 API key"，一个命名的自定义 provider 可能就够了。

## 心智模型

一个内置 provider 需要在几个层面上对齐：

1. `hermes_cli/auth.py` 决定如何查找凭证。
2. `hermes_cli/runtime_provider.py` 将其转换为运行时数据：
   - `provider`
   - `api_mode`
   - `base_url`
   - `api_key`
   - `source`
3. `run_agent.py` 使用 `api_mode` 决定如何构建和发送请求。
4. `hermes_cli/models.py` 和 `hermes_cli/main.py` 使 provider 出现在 CLI 中。（`hermes_cli/setup.py` 自动委托给 `main.py`——无需在那里修改。）
5. `agent/auxiliary_client.py` 和 `agent/model_metadata.py` 保持辅助任务和 token 预算正常工作。

重要的抽象是 `api_mode`。

- 大多数 provider 使用 `chat_completions`。
- Codex 使用 `codex_responses`。
- Anthropic 使用 `anthropic_messages`。
- 新的非 OpenAI 协议通常意味着添加新的 adapter 和新的 `api_mode` 分支。

## 先选择实现路径

### 路径 A — OpenAI 兼容 provider

当 provider 接受标准 chat-completions 风格请求时使用此路径。

典型工作：

- 添加认证元数据
- 添加模型目录 / 别名
- 添加运行时解析
- 添加 CLI 菜单接线
- 添加辅助模型默认值
- 添加测试和用户文档

通常不需要新的 adapter 或新的 `api_mode`。

### 路径 B — 原生 provider

当 provider 不像 OpenAI chat completions 那样工作时使用此路径。

目前代码库中的示例：

- `codex_responses`
- `anthropic_messages`

此路径包含路径 A 的所有内容，再加上：

- `agent/` 中的 provider adapter
- `run_agent.py` 中用于请求构建、调度、用量提取、中断处理和响应规范化的分支
- adapter 测试

## 文件检查清单

### 每个内置 provider 必须的

1. `hermes_cli/auth.py`
2. `hermes_cli/models.py`
3. `hermes_cli/runtime_provider.py`
4. `hermes_cli/main.py`
5. `agent/auxiliary_client.py`
6. `agent/model_metadata.py`
7. 测试
8. `website/docs/` 下的用户文档

:::tip
`hermes_cli/setup.py` **不需要**修改。设置向导将 provider/模型选择委托给 `main.py` 中的 `select_provider_and_model()`——在那里添加的任何 provider 会自动在 `hermes setup` 中可用。
:::

### 原生/非 OpenAI provider 额外需要的

10. `agent/<provider>_adapter.py`
11. `run_agent.py`
12. 如果需要 provider SDK，修改 `pyproject.toml`

## 第 1 步：选择一个规范的 provider ID

选择一个唯一的 provider ID，在所有地方一致使用。

代码库中的示例：

- `openai-codex`
- `kimi-coding`
- `minimax-cn`

同一个 ID 应该出现在：

- `hermes_cli/auth.py` 中的 `PROVIDER_REGISTRY`
- `hermes_cli/models.py` 中的 `_PROVIDER_LABELS`
- `hermes_cli/auth.py` 和 `hermes_cli/models.py` 中的 `_PROVIDER_ALIASES`
- `hermes_cli/main.py` 中 CLI `--provider` 选项
- 设置 / 模型选择分支
- 辅助模型默认值
- 测试

如果 ID 在这些文件之间不一致，provider 会感觉只接了一半：认证可能工作，但 `/model`、setup 或运行时解析会静默跳过它。

## 第 2 步：在 `hermes_cli/auth.py` 中添加认证元数据

对于 API key 类型的 provider，在 `PROVIDER_REGISTRY` 中添加一个 `ProviderConfig` 条目，包含：

- `id`
- `name`
- `auth_type="api_key"`
- `inference_base_url`
- `api_key_env_vars`
- 可选的 `base_url_env_var`

同时在 `_PROVIDER_ALIASES` 中添加别名。

使用现有 provider 作为模板：

- 简单 API key 路径：Z.AI、MiniMax
- 带端点检测的 API key 路径：Kimi、Z.AI
- 原生 token 解析：Anthropic
- OAuth / 认证存储路径：Nous、OpenAI Codex

需要回答的问题：

- Hermes 应该检查哪些环境变量，优先级顺序是什么？
- Provider 是否需要 base-URL 覆盖？
- 是否需要端点探测或 token 刷新？
- 凭证缺失时认证错误应该说什么？

如果 provider 需要的不是"查找一个 API key"，添加一个专门的凭证解析器，而不是将逻辑塞入不相关的分支。

## 第 3 步：在 `hermes_cli/models.py` 中添加模型目录和别名

更新 provider 目录，使 provider 在菜单和 `provider:model` 语法中都能工作。

典型编辑：

- `_PROVIDER_MODELS`
- `_PROVIDER_LABELS`
- `_PROVIDER_ALIASES`
- `list_available_providers()` 中的 provider 显示顺序
- 如果 provider 支持实时 `/models` 获取，更新 `provider_model_ids()`

如果 provider 暴露了实时模型列表，优先使用它，将 `_PROVIDER_MODELS` 作为静态回退。

这个文件也使以下输入格式正常工作：

```text
anthropic:claude-sonnet-4-6
kimi:model-name
```

如果这里缺少别名，provider 可能正确认证，但在 `/model` 解析中仍然失败。

## 第 4 步：在 `hermes_cli/runtime_provider.py` 中解析运行时数据

`resolve_runtime_provider()` 是 CLI、gateway、Cron（定时任务）、ACP 和辅助客户端共用的路径。

添加一个分支，至少返回以下内容的字典：

```python
{
    "provider": "your-provider",
    "api_mode": "chat_completions",  # 或你的原生模式
    "base_url": "https://...",
    "api_key": "...",
    "source": "env|portal|auth-store|explicit",
    "requested_provider": requested_provider,
}
```

如果 provider 是 OpenAI 兼容的，`api_mode` 通常应该保持 `chat_completions`。

注意 API key 优先级。Hermes 已经包含避免将 OpenRouter key 泄露到不相关端点的逻辑。新的 provider 应该同样明确哪个 key 对应哪个 base URL。

## 第 5 步：在 `hermes_cli/main.py` 中接线 CLI

Provider 直到出现在交互式 `hermes model` 流程中才可被发现。

在 `hermes_cli/main.py` 中更新：

- `provider_labels` 字典
- `select_provider_and_model()` 中的 `providers` 列表
- provider 调度（`if selected_provider == ...`）
- `--provider` 参数选项
- 如果 provider 支持登录/登出流程，添加相应的选项
- 一个 `_model_flow_<provider>()` 函数，或者如果适合则复用 `_model_flow_api_key_provider()`

:::tip
`hermes_cli/setup.py` 不需要修改——它调用 `main.py` 中的 `select_provider_and_model()`，所以你的新 provider 会自动出现在 `hermes model` 和 `hermes setup` 中。
:::

## 第 6 步：保持辅助调用正常工作

这里有两个重要文件：

### `agent/auxiliary_client.py`

如果这是一个直接的 API key provider，在 `_API_KEY_PROVIDER_AUX_MODELS` 中添加一个经济/快速的默认辅助模型。

辅助任务包括：

- 视觉摘要
- 网页提取摘要
- 上下文压缩摘要
- 会话搜索摘要
- 内存刷新

如果 provider 没有合适的辅助默认值，辅助任务可能会糟糕地回退或意外使用昂贵的主模型。

### `agent/model_metadata.py`

为 provider 的模型添加上下文长度，以便 token 预算、压缩阈值和限制保持合理。

## 第 7 步：如果 provider 是原生的，添加 adapter 和 `run_agent.py` 支持

如果 provider 不是普通的 chat completions，在 `agent/<provider>_adapter.py` 中隔离 provider 特定的逻辑。

保持 `run_agent.py` 专注于编排。它应该调用 adapter 辅助函数，而不是在整个文件中手动构建 provider 负载。

原生 provider 通常需要在这些地方工作：

### 新 adapter 文件

典型职责：

- 构建 SDK / HTTP 客户端
- 解析 token
- 将 OpenAI 风格的对话消息转换为 provider 的请求格式
- 如果需要，转换工具 schema
- 将 provider 响应规范化回 `run_agent.py` 期望的格式
- 提取用量和结束原因数据

### `run_agent.py`

搜索 `api_mode` 并审计每个切换点。至少验证：

- `__init__` 选择了新的 `api_mode`
- provider 的客户端构建正常工作
- `_build_api_kwargs()` 知道如何格式化请求
- `_api_call_with_interrupt()` 调度到正确的客户端调用
- 中断 / 客户端重建路径正常工作
- 响应验证接受 provider 的格式
- 结束原因提取正确
- token 用量提取正确
- 回退模型激活可以干净地切换到新 provider
- 摘要生成和内存刷新路径仍然正常工作

同时在 `run_agent.py` 中搜索 `self.client.`。任何假设标准 OpenAI 客户端存在的代码路径，当原生 provider 使用不同的客户端对象或 `self.client = None` 时可能会出错。

### Prompt 缓存和 provider 特定的请求字段

Prompt 缓存和 provider 特定的旋钮很容易出现回归。

代码库中已有的示例：

- Anthropic 有原生的 prompt 缓存路径
- OpenRouter 获取 provider 路由字段
- 不是每个 provider 都应该接收每个请求端选项

添加原生 provider 时，仔细检查 Hermes 只发送该 provider 实际理解的字段。

## 第 8 步：测试

至少触及保护 provider 接线的测试。

常见位置：

- `tests/test_runtime_provider_resolution.py`
- `tests/test_cli_provider_resolution.py`
- `tests/test_cli_model_command.py`
- `tests/test_setup_model_selection.py`
- `tests/test_provider_parity.py`
- `tests/test_run_agent.py`
- 对于原生 provider：`tests/test_<provider>_adapter.py`

对于仅文档的示例，具体文件集可能不同。重点覆盖：

- 认证解析
- CLI 菜单 / provider 选择
- 运行时 provider 解析
- Agent 执行路径
- `provider:model` 解析
- 任何 adapter 特定的消息转换

禁用 xdist 运行测试：

```bash
source venv/bin/activate
python -m pytest tests/test_runtime_provider_resolution.py tests/test_cli_provider_resolution.py tests/test_cli_model_command.py tests/test_setup_model_selection.py -n0 -q
```

对于更深层的修改，在推送前运行完整测试套件：

```bash
source venv/bin/activate
python -m pytest tests/ -n0 -q
```

## 第 9 步：实时验证

测试之后，运行真实的冒烟测试。

```bash
source venv/bin/activate
python -m hermes_cli.main chat -q "Say hello" --provider your-provider --model your-model
```

如果修改了菜单，也测试交互流程：

```bash
source venv/bin/activate
python -m hermes_cli.main model
python -m hermes_cli.main setup
```

对于原生 provider，至少验证一次工具调用，而不仅仅是纯文本响应。

## 第 10 步：更新用户文档

如果 provider 被设计为一流选项，也要更新用户文档：

- `website/docs/getting-started/quickstart.md`
- `website/docs/user-guide/configuration.md`
- `website/docs/reference/environment-variables.md`

开发者可能完美地接好了 provider，但仍然让用户无法发现所需的环境变量或设置流程。

## OpenAI 兼容 provider 检查清单

当 provider 使用标准 chat completions 时使用此清单。

- [ ] 在 `hermes_cli/auth.py` 中添加了 `ProviderConfig`
- [ ] 在 `hermes_cli/auth.py` 和 `hermes_cli/models.py` 中添加了别名
- [ ] 在 `hermes_cli/models.py` 中添加了模型目录
- [ ] 在 `hermes_cli/runtime_provider.py` 中添加了运行时分支
- [ ] 在 `hermes_cli/main.py` 中添加了 CLI 接线（setup.py 自动继承）
- [ ] 在 `agent/auxiliary_client.py` 中添加了辅助模型
- [ ] 在 `agent/model_metadata.py` 中添加了上下文长度
- [ ] 更新了运行时 / CLI 测试
- [ ] 更新了用户文档

## 原生 provider 检查清单

当 provider 需要新的协议路径时使用此清单。

- [ ] OpenAI 兼容检查清单中的所有内容
- [ ] 在 `agent/<provider>_adapter.py` 中添加了 adapter
- [ ] 在 `run_agent.py` 中支持了新的 `api_mode`
- [ ] 中断 / 重建路径正常工作
- [ ] 用量和结束原因提取正常工作
- [ ] 回退路径正常工作
- [ ] 添加了 adapter 测试
- [ ] 实时冒烟测试通过

## 常见陷阱

### 1. 添加了 provider 到认证但未添加到模型解析

这导致凭证正确解析，但 `/model` 和 `provider:model` 输入失败。

### 2. 忘记 `config["model"]` 可以是字符串或字典

很多 provider 选择代码需要规范化这两种形式。

### 3. 假设需要内置 provider

如果服务只是 OpenAI 兼容的，自定义 provider 可能已经能以更少的维护解决用户问题。

### 4. 忘记辅助路径

主聊天路径可以正常工作，但摘要、内存刷新或视觉辅助可能因为辅助路由从未更新而失败。

### 5. 原生 provider 分支隐藏在 `run_agent.py` 中

搜索 `api_mode` 和 `self.client.`。不要假设显而易见的请求路径是唯一的。

### 6. 将 OpenRouter 专用旋钮发送给其他 provider

诸如 provider 路由之类的字段只属于支持它们的 provider。

### 7. 更新了 `hermes model` 但未更新 `hermes setup`

两个流程都需要知道这个 provider。

## 实现时的好搜索目标

如果你在寻找 provider 触及的所有位置，搜索这些符号：

- `PROVIDER_REGISTRY`
- `_PROVIDER_ALIASES`
- `_PROVIDER_MODELS`
- `resolve_runtime_provider`
- `_model_flow_`
- `select_provider_and_model`
- `api_mode`
- `_API_KEY_PROVIDER_AUX_MODELS`
- `self.client.`

## 相关文档

- [Provider 运行时解析](./provider-runtime.md)
- [架构](./architecture.md)
- [贡献](./contributing.md)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/adding-providers)
