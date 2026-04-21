---
sidebar_position: 99
title: "Honcho 记忆"
description: "通过 Honcho 实现 AI 原生持久化记忆 — 辩证推理、多 Agent 用户建模和深度个性化"
---

# Honcho 记忆

[Honcho](https://github.com/plastic-labs/honcho) 是一个 AI 原生的记忆后端，在 Hermes 内置记忆系统之上增加了辩证推理（Dialectic Reasoning）和深度用户建模。不同于简单的键值存储，Honcho 通过在对话发生后进行推理，持续构建关于用户的认知模型 — 包括偏好、沟通风格、目标和行为模式。

:::info Honcho 是一个记忆提供商插件
Honcho 已集成到[记忆提供商](./memory-providers.md)系统中。以下所有功能都通过统一的记忆提供商接口使用。
:::

## Honcho 增加了什么

| 能力 | 内置记忆 | Honcho |
|-----------|----------------|--------|
| 跨会话持久化 | ✔ 基于文件的 MEMORY.md/USER.md | ✔ 通过 API 的服务端存储 |
| 用户档案 | ✔ Agent 手动管理 | ✔ 自动辩证推理 |
| 会话摘要 | — | ✔ 会话级上下文注入 |
| 多 Agent 隔离 | — | ✔ 按 peer 的档案分离 |
| 观察模式 | — | ✔ 统一或方向性观察 |
| 结论（衍生洞察） | — | ✔ 关于模式的服务端推理 |
| 跨历史搜索 | ✔ FTS5 会话搜索 | ✔ 对结论的语义搜索 |

**辩证推理**：在每次对话轮次后（由 `dialecticCadence` 控制），Honcho 会分析交互并推导出关于用户偏好、习惯和目标的洞察。这些洞察随时间累积，使 Agent 对用户的理解不断深化，超越用户明确表达的内容。辩证支持多轮深度（1-3 轮），并自动选择冷/热提示策略 — 冷启动查询聚焦于一般用户事实，而热查询优先考虑会话级上下文。

**会话级上下文**：基础上下文现在包含会话摘要，以及用户表示和 peer 卡片。这让 Agent 了解当前会话中已经讨论过的内容，减少重复并实现连续性。

**多 Agent 档案**：当多个 Hermes 实例与同一用户对话时（例如编程助手和个人助手），Honcho 维护独立的 "peer" 档案。每个 peer 只能看到自己的观察和结论，防止上下文交叉污染。

## 设置

```bash
hermes memory setup    # 从提供商列表中选择 "honcho"
```

或手动配置：

```yaml
# ~/.hermes/config.yaml
memory:
  provider: honcho
```

```bash
echo "HONCHO_API_KEY=*** >> ~/.hermes/.env
```

在 [honcho.dev](https://honcho.dev) 获取 API 密钥。

## 架构

### 双层上下文注入

每一轮（在 `hybrid` 或 `context` 模式下），Honcho 组装两层上下文注入到系统提示词中：

1. **基础上下文** — 会话摘要、用户表示、用户 peer 卡片、AI 自我表示和 AI 身份卡。在 `contextCadence` 周期刷新。这是"用户是谁"层。
2. **辩证补充** — LLM 合成的关于用户当前状态和需求的推理。在 `dialecticCadence` 周期刷新。这是"现在什么最重要"层。

两层内容拼接后截断至 `contextTokens` 预算（如已设置）。

### 冷/热提示选择

辩证推理自动在两种提示策略间选择：

- **冷启动**（尚无基础上下文）：一般查询 — "这个人是谁？他们的偏好、目标和工作风格是什么？"
- **热会话**（已存在基础上下文）：会话级查询 — "考虑到本次会话已讨论的内容，关于该用户的哪些上下文最相关？"

此过程基于基础上下文是否已填充而自动进行。

### 三个正交配置旋钮

成本和深度由三个独立的旋钮控制：

| 旋钮 | 控制 | 默认值 |
|------|----------|---------|
| `contextCadence` | `context()` API 调用之间的轮次数（基础层刷新） | `1` |
| `dialecticCadence` | `peer.chat()` LLM 调用之间的轮次数（辩证层刷新） | `3` |
| `dialecticDepth` | 每次辩证调用的 `.chat()` 轮数（1-3） | `1` |

这些是正交的 — 你可以频繁刷新上下文但不频繁运行辩证，或者以低频率运行深度多轮辩证。例如：`contextCadence: 1, dialecticCadence: 5, dialecticDepth: 2` 每轮刷新基础上下文，每 5 轮运行一次辩证，每次辩证运行 2 轮。

### 辩证深度（多轮）

当 `dialecticDepth` > 1 时，每次辩证调用运行多轮 `.chat()`：

- **第 0 轮**：冷或热提示（见上文）
- **第 1 轮**：自审计 — 识别初始评估中的差距并从近期会话中综合证据
- **第 2 轮**：协调 — 检查前几轮之间的矛盾并产生最终综合

每轮使用按比例的推理级别（早期轮次更轻量，主轮次使用基础级别）。可通过 `dialecticDepthLevels` 按轮次覆盖级别 — 例如 `["minimal", "medium", "high"]` 用于深度为 3 的运行。

如果前一轮返回了强信号（长且结构化的输出），后续轮次会提前退出，因此深度 3 并不总是意味着 3 次 LLM 调用。

## 配置选项

Honcho 在 `~/.honcho/config.json`（全局）或 `$HERMES_HOME/honcho.json`（配置文件本地）中配置。设置向导会为你处理这些。

### 完整配置参考

| 键 | 默认值 | 描述 |
|-----|---------|-------------|
| `contextTokens` | `null`（无上限） | 每轮自动注入上下文的 Token 预算。设置为整数（如 1200）来限制。在词边界处截断 |
| `contextCadence` | `1` | `context()` API 调用之间的最少轮次数（基础层刷新） |
| `dialecticCadence` | `3` | `peer.chat()` LLM 调用之间的最少轮次数（辩证层）。在 `tools` 模式下无关 — 模型显式调用 |
| `dialecticDepth` | `1` | 每次辩证调用的 `.chat()` 轮数。限制在 1-3 |
| `dialecticDepthLevels` | `null` | 可选的按轮次推理级别数组，如 `["minimal", "low", "medium"]`。覆盖按比例的默认值 |
| `dialecticReasoningLevel` | `'low'` | 基础推理级别：`minimal`、`low`、`medium`、`high`、`max` |
| `dialecticDynamic` | `true` | 为 `true` 时，模型可通过工具参数按调用覆盖推理级别 |
| `dialecticMaxChars` | `600` | 注入到系统提示词中的辩证结果最大字符数 |
| `recallMode` | `'hybrid'` | `hybrid`（自动注入 + 工具）、`context`（仅注入）、`tools`（仅工具） |
| `writeFrequency` | `'async'` | 何时刷新消息：`async`（后台线程）、`turn`（同步）、`session`（结束时批量）或整数 N |
| `saveMessages` | `true` | 是否将消息持久化到 Honcho API |
| `observationMode` | `'directional'` | `directional`（全部开启）或 `unified`（共享池）。使用 `observation` 对象进行细粒度控制 |
| `messageMaxChars` | `25000` | 通过 `add_messages()` 发送的每条消息最大字符数。超出则分块 |
| `dialecticMaxInputChars` | `10000` | `peer.chat()` 辩证查询输入的最大字符数 |
| `sessionStrategy` | `'per-directory'` | `per-directory`、`per-repo`、`per-session` 或 `global` |

**会话策略** 控制 Honcho 会话如何映射到你的工作：
- `per-session` — 每次 `hermes` 运行获取新会话。干净启动，通过工具使用记忆。推荐新用户使用。
- `per-directory` — 每个工作目录一个 Honcho 会话。上下文跨运行累积。
- `per-repo` — 每个 git 仓库一个会话。
- `global` — 跨所有目录的单一会话。

**召回模式** 控制记忆如何流入对话：
- `hybrid` — 上下文自动注入到系统提示词，且工具可用（模型决定何时查询）。
- `context` — 仅自动注入，工具隐藏。
- `tools` — 仅工具，无自动注入。Agent 必须显式调用 `honcho_reasoning`、`honcho_search` 等。

**各召回模式的设置：**

| 设置 | `hybrid` | `context` | `tools` |
|---------|----------|-----------|---------|
| `writeFrequency` | 刷新消息 | 刷新消息 | 刷新消息 |
| `contextCadence` | 控制基础上下文刷新 | 控制基础上下文刷新 | 无关 — 无注入 |
| `dialecticCadence` | 控制自动 LLM 调用 | 控制自动 LLM 调用 | 无关 — 模型显式调用 |
| `dialecticDepth` | 每次调用的多轮推理 | 每次调用的多轮推理 | 无关 — 模型显式调用 |
| `contextTokens` | 限制注入量 | 限制注入量 | 无关 — 无注入 |
| `dialecticDynamic` | 控制模型覆盖 | 不适用（无工具） | 控制模型覆盖 |

在 `tools` 模式下，模型完全掌控 — 它在需要时调用 `honcho_reasoning`，使用它选择的 `reasoning_level`。节奏和预算设置仅适用于带有自动注入的模式（`hybrid` 和 `context`）。

## 工具

当 Honcho 作为记忆提供商激活时，会启用五个工具：

| 工具 | 用途 |
|------|---------|
| `honcho_profile` | 读取或更新 peer 卡片 — 传入 `card`（事实列表）来更新，省略则读取 |
| `honcho_search` | 对上下文进行语义搜索 — 原始摘录，无 LLM 综合 |
| `honcho_context` | 完整会话上下文 — 摘要、表示、卡片、近期消息 |
| `honcho_reasoning` | 来自 Honcho LLM 的综合回答 — 传入 `reasoning_level`（minimal/low/medium/high/max）控制深度 |
| `honcho_conclude` | 创建或删除结论 — 传入 `conclusion` 来创建，`delete_id` 来删除（仅限 PII） |

## CLI 命令

```bash
hermes honcho status          # 连接状态、配置和关键设置
hermes honcho setup           # 交互式设置向导
hermes honcho strategy        # 显示或设置会话策略
hermes honcho peer            # 更新多 Agent 设置的 peer 名称
hermes honcho mode            # 显示或设置召回模式
hermes honcho tokens          # 显示或设置上下文 Token 预算
hermes honcho identity        # 显示 Honcho peer 身份
hermes honcho sync            # 同步所有配置文件的 host blocks
hermes honcho enable          # 启用 Honcho
hermes honcho disable         # 禁用 Honcho
```

## 从 `hermes honcho` 迁移

如果你之前使用了独立的 `hermes honcho setup`：

1. 你现有的配置（`honcho.json` 或 `~/.honcho/config.json`）会被保留
2. 你服务端的数据（记忆、结论、用户档案）完好无损
3. 在 config.yaml 中设置 `memory.provider: honcho` 来重新激活

无需重新登录或重新设置。运行 `hermes memory setup` 并选择 "honcho" — 向导会检测你现有的配置。

## 完整文档

参见[记忆提供商 — Honcho](./memory-providers.md#honcho) 获取完整参考。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/honcho)
