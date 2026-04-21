---
title: 提供商路由
description: 配置 OpenRouter 提供商偏好，优化成本、速度或质量。
sidebar_label: 提供商路由
sidebar_position: 7
---

# 提供商路由

当使用 [OpenRouter](https://openrouter.ai) 作为 LLM（大语言模型）提供商时，Hermes Agent 支持**提供商路由（Provider Routing）**——精细控制哪些底层 AI 提供商处理你的请求以及它们的优先级。

OpenRouter 将请求路由到多个提供商（如 Anthropic、Google、AWS Bedrock、Together AI）。提供商路由允许你针对成本、速度、质量进行优化，或强制执行特定的提供商要求。

## 配置

在 `~/.hermes/config.yaml` 中添加 `provider_routing` 部分：

```yaml
provider_routing:
  sort: "price"           # 如何对提供商排序
  only: []                # 白名单：仅使用这些提供商
  ignore: []              # 黑名单：从不使用这些提供商
  order: []               # 显式提供商优先级顺序
  require_parameters: false  # 仅使用支持所有参数的提供商
  data_collection: null   # 控制数据收集（"allow" 或 "deny"）
```

:::info
提供商路由仅在使用 OpenRouter 时生效。对直接提供商连接（例如直接连接 Anthropic API）没有影响。
:::

## 选项

### `sort`

控制 OpenRouter 如何为你的请求对可用提供商排序。

| 值 | 说明 |
|-------|-------------|
| `"price"` | 最便宜的提供商优先 |
| `"throughput"` | 每秒令牌数最快者优先 |
| `"latency"` | 首个令牌延迟最低者优先 |

```yaml
provider_routing:
  sort: "price"
```

### `only`

提供商名称白名单。设置后，**仅**使用这些提供商。其他所有提供商都被排除。

```yaml
provider_routing:
  only:
    - "Anthropic"
    - "Google"
```

### `ignore`

提供商名称黑名单。这些提供商**永远不会**被使用，即使它们提供最便宜或最快的选项。

```yaml
provider_routing:
  ignore:
    - "Together"
    - "DeepInfra"
```

### `order`

显式优先级顺序。排在前面的提供商优先。未列出的提供商作为备用。

```yaml
provider_routing:
  order:
    - "Anthropic"
    - "Google"
    - "AWS Bedrock"
```

### `require_parameters`

设为 `true` 时，OpenRouter 仅路由到支持请求中**所有**参数的提供商（如 `temperature`、`top_p`、`tools` 等）。这可以避免参数被静默忽略。

```yaml
provider_routing:
  require_parameters: true
```

### `data_collection`

控制提供商是否可以使用你的提示进行训练。选项为 `"allow"` 或 `"deny"`。

```yaml
provider_routing:
  data_collection: "deny"
```

## 实用示例

### 优化成本

路由到最便宜的可用提供商。适合高量使用和开发场景：

```yaml
provider_routing:
  sort: "price"
```

### 优化速度

优先选择低延迟提供商，适合交互式使用：

```yaml
provider_routing:
  sort: "latency"
```

### 优化吞吐量

适合每秒令牌数很重要的长文本生成场景：

```yaml
provider_routing:
  sort: "throughput"
```

### 锁定特定提供商

确保所有请求通过特定提供商以保证一致性：

```yaml
provider_routing:
  only:
    - "Anthropic"
```

### 避免特定提供商

排除你不想使用的提供商（例如出于数据隐私考虑）：

```yaml
provider_routing:
  ignore:
    - "Together"
    - "Lepton"
  data_collection: "deny"
```

### 带备用的优先顺序

先尝试你偏好的提供商，不可用时回退到其他：

```yaml
provider_routing:
  order:
    - "Anthropic"
    - "Google"
  require_parameters: true
```

## 工作原理

提供商路由偏好通过 `extra_body.provider` 字段传递给 OpenRouter API，应用于每次 API 调用。这适用于：

- **CLI 模式** — 在 `~/.hermes/config.yaml` 中配置，启动时加载
- **网关模式** — 同一配置文件，网关启动时加载

路由配置从 `config.yaml` 读取，并在创建 `AIAgent` 时作为参数传递：

```
providers_allowed  ← 来自 provider_routing.only
providers_ignored  ← 来自 provider_routing.ignore
providers_order    ← 来自 provider_routing.order
provider_sort      ← 来自 provider_routing.sort
provider_require_parameters ← 来自 provider_routing.require_parameters
provider_data_collection    ← 来自 provider_routing.data_collection
```

:::tip
你可以组合多个选项。例如，按价格排序但排除某些提供商并要求参数支持：

```yaml
provider_routing:
  sort: "price"
  ignore: ["Together"]
  require_parameters: true
  data_collection: "deny"
```
:::

## 默认行为

当没有配置 `provider_routing` 部分（默认情况）时，OpenRouter 使用其自身的默认路由逻辑，通常会自动平衡成本和可用性。

:::tip 提供商路由与备用模型的区别
提供商路由控制 OpenRouter **内部哪些子提供商**处理你的请求。要实现当主模型失败时自动切换到完全不同的提供商，请参阅[备用提供商](/docs/user-guide/features/fallback-providers)。
:::

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/provider-routing)
