# Trajectory 格式

Hermes Agent 以 ShareGPT 兼容的 JSONL 格式保存对话轨迹，用作训练数据、调试产物和强化学习数据集。

源文件：`agent/trajectory.py`、`run_agent.py`（搜索 `_save_trajectory`）、`batch_runner.py`


## 文件命名约定

Trajectory 写入当前工作目录的文件中：

| 文件 | 何时生成 |
|------|---------|
| `trajectory_samples.jsonl` | 成功完成的对话（`completed=True`） |
| `failed_trajectories.jsonl` | 失败或中断的对话（`completed=False`） |

批量运行器（`batch_runner.py`）为每批写入自定义输出文件（如 `batch_001_output.jsonl`），包含额外的元数据字段。

你可以通过 `save_trajectory()` 的 `filename` 参数覆盖文件名。


## JSONL 条目格式

文件中每行是一个自包含的 JSON 对象。有两种变体：

### CLI/交互式格式（来自 `_save_trajectory`）

```json
{
  "conversations": [ ... ],
  "timestamp": "2026-03-30T14:22:31.456789",
  "model": "anthropic/claude-sonnet-4.6",
  "completed": true
}
```

### 批量运行器格式（来自 `batch_runner.py`）

```json
{
  "prompt_index": 42,
  "conversations": [ ... ],
  "metadata": { "prompt_source": "gsm8k", "difficulty": "hard" },
  "completed": true,
  "partial": false,
  "api_calls": 7,
  "toolsets_used": ["code_tools", "file_tools"],
  "tool_stats": {
    "terminal": {"count": 3, "success": 3, "failure": 0},
    "read_file": {"count": 2, "success": 2, "failure": 0},
    "write_file": {"count": 0, "success": 0, "failure": 0}
  },
  "tool_error_counts": {
    "terminal": 0,
    "read_file": 0,
    "write_file": 0
  }
}
```

`tool_stats` 和 `tool_error_counts` 字典被标准化为包含所有可能的工具（来自 `model_tools.TOOL_TO_TOOLSET_MAP`），零值默认，确保条目间一致的 Schema 以便 HuggingFace 数据集加载。


## Conversations 数组（ShareGPT 格式）

`conversations` 数组使用 ShareGPT 角色约定：

| API 角色 | ShareGPT `from` |
|---------|----------------|
| system | `"system"` |
| user | `"human"` |
| assistant | `"gpt"` |
| tool | `"tool"` |

### 完整示例

```json
{
  "conversations": [
    {
      "from": "system",
      "value": "You are a function calling AI model..."
    },
    {
      "from": "human",
      "value": "What Python version is installed?"
    },
    {
      "from": "gpt",
      "value": " nét\n{'name': 'terminal', 'arguments': {'command': 'python3 --version'}}\n n"
    },
    {
      "from": "tool",
      "value": " n{'tool_call_id': 'call_abc123', 'name': 'terminal', 'content': 'Python 3.11.6'}\n n"
    },
    {
      "from": "gpt",
      "value": "Python 3.11.6 is installed on this system."
    }
  ],
  "timestamp": "2026-03-30T14:22:31.456789",
  "model": "anthropic/claude-sonnet-4.6",
  "completed": true
}
```


## 标准化规则

### 推理内容标记

Trajectory 转换器将所有推理标准化为 `tég` 标签，无论模型最初如何生成：

1. **原生思考 Token**（来自 Anthropic、OpenAI o-series 等 Provider 的 `msg["reasoning"]` 字段）：包装为 `tég\n{reasoning}\n n` 并前置到内容之前。

2. **REASONING_SCRATCHPAD XML**（当原生思考被禁用且模型通过系统提示指示的 XML 推理时）：`<REASONING_SCRATCHPAD>` 标签通过 `convert_scratchpad_to_think()` 转换为 `tég`。

3. **空思考块**：每个 `gpt` 轮次保证有一个 `tég` 块。如果未产生推理，插入空块：`tég\n n` — 这确保训练数据格式一致。

### 工具调用标准化

API 格式的工具调用（带 `tool_call_id`、函数名、JSON 字符串参数）转换为 XML 包装的 JSON：

```
 nét
{"name": "terminal", "arguments": {"command": "ls -la"}}
 n
```

- 参数从 JSON 字符串解析回对象（不双重编码）
- 如果 JSON 解析失败（不应发生 — 在对话期间已验证），使用空 `{}` 并记录警告
- 一个助手轮次中的多个工具调用在单个 `gpt` 消息中产生多个 ` nét` 块

### 工具响应标准化

助手消息后的所有工具结果分组为单个 `tool` 轮次，使用 XML 包装的 JSON 响应：

```
 n
{"tool_call_id": "call_abc123", "name": "terminal", "content": "output here"}
 n
```

- 如果工具内容看起来像 JSON（以 `{` 或 `[` 开头），会被解析以使内容字段包含 JSON 对象/数组而非字符串
- 多个工具结果用换行符连接在一条消息中
- 工具名称按位置与父助手的 `tool_calls` 数组匹配

### 系统消息

系统消息在保存时生成（不从对话中获取）。它遵循 Hermes 函数调用提示模板，包含：

- 解释函数调用协议的前言
- 包含 JSON 工具定义的 `<tools>` XML 块
- `FunctionCall` 对象的 Schema 参考
- ` nét` 示例

工具定义包括 `name`、`description`、`parameters` 和 `required`（设为 `null` 以匹配规范格式）。


## 加载 Trajectory

Trajectory 是标准 JSONL — 使用任何 JSON-lines 读取器加载：

```python
import json

def load_trajectories(path: str):
    """从 JSONL 文件加载 trajectory 条目。"""
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries

# 仅过滤成功完成的数据
successful = [e for e in load_trajectories("trajectory_samples.jsonl")
              if e.get("completed")]

# 仅提取用于训练的对话
training_data = [e["conversations"] for e in successful]
```

### 为 HuggingFace 数据集加载

```python
from datasets import load_dataset

ds = load_dataset("json", data_files="trajectory_samples.jsonl")
```

标准化的 `tool_stats` Schema 确保所有条目具有相同的列，防止数据集加载时的 Arrow Schema 不匹配错误。


## 控制 Trajectory 保存

在 CLI 中，trajectory 保存由以下配置控制：

```yaml
# config.yaml
agent:
  save_trajectories: true  # 默认：false
```

或通过 `--save-trajectories` 标志。当 Agent 以 `save_trajectories=True` 初始化时，每个对话轮次结束时调用 `_save_trajectory()` 方法。

批量运行器始终保存 trajectory（这是其主要目的）。

所有轮次中零推理的样本会被批量运行器自动丢弃，以避免用非推理样本污染训练数据。
