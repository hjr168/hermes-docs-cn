# 上下文压缩与缓存

Hermes Agent 使用双重压缩系统和 Anthropic prompt 缓存来高效管理长对话中的上下文窗口使用。

源文件：`agent/context_engine.py`（ABC）、`agent/context_compressor.py`（默认引擎）、`agent/prompt_caching.py`、`gateway/run.py`（会话清理）、`run_agent.py`（搜索 `_compress_context`）


## 可插拔的上下文引擎

上下文管理建立在 `ContextEngine` ABC（`agent/context_engine.py`）之上。内置的 `ContextCompressor` 是默认实现，但插件可以用替代引擎替换它（例如 Lossless Context Management）。

```yaml
context:
  engine: "compressor"    # 默认 — 内置有损摘要
  engine: "lcm"           # 示例 — 提供无损上下文的插件
```

引擎负责：
- 决定何时触发压缩（`should_compress()`）
- 执行压缩（`compress()`）
- 可选地暴露 agent 可以调用的工具（如 `lcm_grep`）
- 跟踪 API 响应的 token 使用

通过 `config.yaml` 中的 `context.engine` 进行配置驱动选择。解析顺序：
1. 检查 `plugins/context_engine/<name>/` 目录
2. 检查通用插件系统（`register_context_engine()`）
3. 回退到内置的 `ContextCompressor`

插件引擎**永远不会自动激活**——用户必须显式设置 `context.engine` 为插件的名称。默认的 `"compressor"` 始终使用内置引擎。

通过 `hermes plugins` → Provider Plugins → Context Engine 配置，或直接编辑 `config.yaml`。

构建上下文引擎插件的详细说明，请参阅[上下文引擎插件](/docs/developer-guide/context-engine-plugin)。

## 双重压缩系统

Hermes 有两个独立的压缩层，各自独立运行：

```
                     ┌──────────────────────────┐
  入站消息           │   网关会话清理             │  在上下文 85% 时触发
  ─────────────────► │   （agent 前，粗略估算）   │  大型会话的安全网
                     └─────────────┬────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │   Agent ContextCompressor │  在上下文 50% 时触发（默认）
                     │   （循环内，真实 token）   │  正常的上下文管理
                     └──────────────────────────┘
```

### 1. 网关会话清理（85% 阈值）

位于 `gateway/run.py`（搜索 `Session hygiene: auto-compress`）。这是一个**安全网**，在 agent 处理消息之前运行。防止 turn 之间会话增长过大导致 API 失败（例如 Telegram/Discord 中的隔夜积累）。

- **阈值**：固定为模型上下文长度的 85%
- **Token 来源**：优先使用上次 turn 的实际 API 报告 token；回退到基于字符的粗略估算（`estimate_messages_tokens_rough`）
- **触发条件**：仅当 `len(history) >= 4` 且启用了压缩时
- **目的**：捕获逃脱了 agent 自身压缩器的会话

网关清理阈值有意高于 agent 的压缩器。
设置为 50%（与 agent 相同）会导致长 gateway 会话中每 turn 都过早压缩。

### 2. Agent ContextCompressor（50% 阈值，可配置）

位于 `agent/context_compressor.py`。这是**主要压缩系统**，在 agent 的工具循环内运行，可以访问准确的、API 报告的 token 计数。


## 配置

所有压缩设置从 `config.yaml` 的 `compression` 键读取：

```yaml
compression:
  enabled: true              # 启用/禁用压缩（默认：true）
  threshold: 0.50            # 上下文窗口的比例（默认：0.50 = 50%）
  target_ratio: 0.20         # 作为尾部保留的阈值比例（默认：0.20）
  protect_last_n: 20         # 最少保护的尾部消息数（默认：20）

# 摘要模型/provider 在 auxiliary 下配置：
auxiliary:
  compression:
    model: null              # 覆盖摘要使用的模型（默认：自动检测）
    provider: auto           # Provider："auto"、"openrouter"、"nous"、"main" 等
    base_url: null           # 自定义 OpenAI 兼容端点
```

### 参数详情

| 参数 | 默认值 | 范围 | 描述 |
|------|--------|------|------|
| `threshold` | `0.50` | 0.0-1.0 | 当 prompt token >= `threshold × context_length` 时触发压缩 |
| `target_ratio` | `0.20` | 0.10-0.80 | 控制尾部保护的 token 预算：`threshold_tokens × target_ratio` |
| `protect_last_n` | `20` | >=1 | 始终保留的最近消息的最小数量 |
| `protect_first_n` | `3` | （硬编码）| 系统提示 + 首次交换始终保留 |

### 计算示例（200K 上下文模型，默认值）

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```


## 压缩算法

`ContextCompressor.compress()` 方法遵循 4 阶段算法：

### 阶段 1：修剪旧工具结果（低成本，无 LLM 调用）

受保护尾部之外的旧工具结果（>200 字符）被替换为：
```
[旧工具输出已清除以节省上下文空间]
```

这是一个低成本的预扫描，从冗长的工具输出（文件内容、终端输出、搜索结果）中节省大量 token。

### 阶段 2：确定边界

```
┌─────────────────────────────────────────────────────────────┐
│  消息列表                                                   │
│                                                             │
│  [0..2]  ← protect_first_n（系统 + 首次交换）               │
│  [3..N]  ← 中间 turn → 摘要化                               │
│  [N..end] ← 尾部（按 token 预算或 protect_last_n）          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

尾部保护是**基于 token 预算**的：从末尾向前遍历，累计 token 直到预算耗尽。如果预算保护的消息少于 `protect_last_n` 固定数量，则回退到该固定数量。

边界会对齐以避免拆分 tool\_call/tool\_result 组。`_align_boundary_backward()` 方法向前跳过连续的工具结果，找到父 assistant 消息，保持组完整。

### 阶段 3：生成结构化摘要

:::warning 摘要模型上下文长度
摘要模型的上下文窗口必须**至少与**主 agent 模型的一样大。整个中间部分在一个 `call_llm(task="compression")` 调用中发送给摘要模型。如果摘要模型的上下文较小，API 会返回 context-length 错误——`_generate_summary()` 会捕获它，记录警告，并返回 `None`。压缩器然后**不带摘要**地丢弃中间 turn，静默丢失对话上下文。这是压缩质量下降的最常见原因。
:::

中间 turn 使用辅助 LLM 和结构化模板进行摘要：

```
## 目标
[用户正在尝试完成的事情]

## 约束与偏好
[用户偏好、编码风格、约束、重要决策]

## 进展
### 已完成
[已完成的工作 — 具体文件路径、运行的命令、结果]
### 进行中
[正在进行的工作]
### 受阻
[遇到的障碍或问题]

## 关键决策
[重要的技术决策及其原因]

## 相关文件
[读取、修改或创建的文件 — 附简短说明]

## 下一步
[接下来需要做的事情]

## 关键上下文
[具体的值、错误消息、配置详情]
```

摘要预算随压缩内容量成比例缩放：
- 公式：`content_tokens × 0.20`（`_SUMMARY_RATIO` 常量）
- 最小值：2,000 token
- 最大值：`min(context_length × 0.05, 12,000)` token

### 阶段 4：组装压缩后的消息

压缩后的消息列表为：
1. 头部消息（首次压缩时在系统提示后追加注释）
2. 摘要消息（角色选择以避免连续相同角色违规）
3. 尾部消息（未修改）

孤立的 tool\_call/tool\_result 对由 `_sanitize_tool_pairs()` 清理：
- 引用已删除调用的工具结果 → 移除
- 结果被移除的工具调用 → 注入存根结果

### 迭代重新压缩

在后续压缩中，之前的摘要会传递给 LLM，指示**更新**而非从头摘要。这在多次压缩间保留信息——项目从"进行中"移到"已完成"，添加新进展，移除过时信息。

压缩器实例上的 `_previous_summary` 字段为此目的存储上次的摘要文本。


## 压缩前后示例

### 压缩前（45 条消息，约 95K token）

```
[0] system:    "You are a helpful assistant..." （系统提示）
[1] user:      "帮我搭建一个 FastAPI 项目"
[2] assistant:  [terminal: mkdir project]
[3] tool:      "目录已创建"
[4] assistant:  [write_file: main.py]
[5] tool:      "文件已写入 (2.3KB)"
    ... 30 多轮文件编辑、测试、调试 ...
[38] assistant:  [terminal: pytest]
[39] tool:      "8 通过, 2 失败\n..."  （5KB 输出）
[40] user:      "修复失败的测试"
[41] assistant:  [read_file: tests/test_api.py]
[42] tool:      "import pytest\n..."  （3KB）
[43] assistant: "我看到了测试 fixtures 的问题..."
[44] user:      "好的，也加上错误处理"
```

### 压缩后（25 条消息，约 45K token）

```
[0] system:    "You are a helpful assistant...
               [注意：部分较早的对话 turn 已被压缩...]"
[1] user:      "帮我搭建一个 FastAPI 项目"
[2] assistant: "[上下文压缩] 较早的 turn 已被压缩...

               ## 目标
               搭建一个带有测试和错误处理的 FastAPI 项目

               ## 进展
               ### 已完成
               - 创建了项目结构：main.py、tests/、requirements.txt
               - 在 main.py 中实现了 5 个 API 端点
               - 在 tests/test_api.py 中编写了 10 个测试用例
               - 8/10 测试通过

               ### 进行中
               - 修复 2 个失败的测试（test_create_user、test_delete_user）

               ## 相关文件
               - main.py — FastAPI 应用，包含 5 个端点
               - tests/test_api.py — 10 个测试用例
               - requirements.txt — fastapi、pytest、httpx

               ## 下一步
               - 修复失败的测试 fixtures
               - 添加错误处理"
[3] user:      "修复失败的测试"
[4] assistant:  [read_file: tests/test_api.py]
[5] tool:      "import pytest\n..."
[6] assistant: "我看到了测试 fixtures 的问题..."
[7] user:      "好的，也加上错误处理"
```


## Prompt 缓存（Anthropic）

源文件：`agent/prompt_caching.py`

通过缓存对话前缀，在多轮对话中减少约 75% 的输入 token 成本。使用 Anthropic 的 `cache_control` 断点。

### 策略：system\_and\_3

Anthropic 每个请求最多允许 4 个 `cache_control` 断点。Hermes 使用"system\_and\_3"策略：

```
断点 1：系统提示                    （所有 turn 中保持不变）
断点 2：倒数第 3 条非系统消息       ─┐
断点 3：倒数第 2 条非系统消息         ├─ 滑动窗口
断点 4：最后一条非系统消息           ─┘
```

### 工作原理

`apply_anthropic_cache_control()` 深拷贝消息并注入 `cache_control` 标记：

```python
# 缓存标记格式
marker = {"type": "ephemeral"}
# 或 1 小时 TTL：
marker = {"type": "ephemeral", "ttl": "1h"}
```

标记根据内容类型以不同方式应用：

| 内容类型 | 标记位置 |
|---------|---------|
| 字符串内容 | 转换为 `[{"type": "text", "text": ..., "cache_control": ...}]` |
| 列表内容 | 添加到最后一个元素的字典中 |
| None/空 | 添加为 `msg["cache_control"]` |
| 工具消息 | 添加为 `msg["cache_control"]`（仅限原生 Anthropic） |

### 缓存感知设计模式

1. **稳定的系统提示**：系统提示是断点 1，在所有 turn 中被缓存。避免在对话中途修改它（压缩只在首次压缩时追加注释）。

2. **消息顺序很重要**：缓存命中需要前缀匹配。在中间添加或删除消息会使之后的所有缓存失效。

3. **压缩缓存交互**：压缩后，压缩区域的缓存失效，但系统提示缓存存活。滑动的 3 消息窗口在 1-2 turn 内重新建立缓存。

4. **TTL 选择**：默认为 `5m`（5 分钟）。对于用户在 turn 之间休息的长会话使用 `1h`。

### 启用 Prompt 缓存

Prompt 缓存在以下条件满足时自动启用：
- 模型是 Anthropic Claude 模型（通过模型名称检测）
- Provider 支持 `cache_control`（原生 Anthropic API 或 OpenRouter）

```yaml
# config.yaml — TTL 可配置
model:
  cache_ttl: "5m"   # "5m" 或 "1h"
```

CLI 在启动时显示缓存状态：
```
💾 Prompt 缓存：已启用（Claude via OpenRouter，5m TTL）
```


## 上下文压力警告

Agent 在压缩阈值的 85% 时发出上下文压力警告（不是上下文的 85%——是阈值的 85%，而阈值本身是上下文的 50%）：

```
⚠️  上下文已达压缩阈值的 85%（42,500/50,000 token）
```

压缩后，如果使用量降至阈值 85% 以下，警告状态清除。如果压缩未能将使用量降至警告水平以下（对话太密集），警告持续存在，但压缩不会再次触发，直到超过阈值。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/context-compression-and-caching)
