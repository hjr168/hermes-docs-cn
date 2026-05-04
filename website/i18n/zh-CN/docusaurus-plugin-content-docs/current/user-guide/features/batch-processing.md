---
sidebar_position: 12
title: "批量处理"
description: "大规模生成 Agent 轨迹数据——并行处理、断点续传和工具集分布"
---

# 批量处理

批量处理让你可以在数百或数千个提示上并行运行 Hermes Agent，生成结构化的轨迹数据。这主要用于**训练数据生成**——生成 ShareGPT 格式的轨迹，包含工具使用统计，可用于微调或评估。

## 概述

批量运行器（`batch_runner.py`）处理 JSONL 数据集中的提示，通过完整的 Agent 会话和工具访问来运行每个提示。每个提示获得自己隔离的环境。输出是结构化的轨迹数据，包含完整的对话历史、工具调用统计和推理覆盖率指标。

## 快速开始

```bash
# 基本批量运行
python batch_runner.py \
    --dataset_file=data/prompts.jsonl \
    --batch_size=10 \
    --run_name=my_first_run \
    --model=anthropic/claude-sonnet-4.6 \
    --num_workers=4

# 恢复中断的运行
python batch_runner.py \
    --dataset_file=data/prompts.jsonl \
    --batch_size=10 \
    --run_name=my_first_run \
    --resume

# 列出可用的工具集分布
python batch_runner.py --list_distributions
```

## 数据集格式

输入数据集是 JSONL 文件（每行一个 JSON 对象）。每个条目必须有 `prompt` 字段：

```jsonl
{"prompt": "编写一个 Python 函数，找到最长回文子串"}
{"prompt": "使用 Flask 创建一个用户认证的 REST API 端点"}
{"prompt": "调试这个错误：TypeError: cannot unpack non-iterable NoneType object"}
```

条目可选包含：
- `image` 或 `docker_image`：用于此提示沙箱的容器镜像（支持 Docker、Modal 和 Singularity 后端）
- `cwd`：任务终端会话的工作目录覆盖

## 配置选项

| 参数 | 默认值 | 描述 |
|------|--------|------|
| `--dataset_file` | （必填） | JSONL 数据集路径 |
| `--batch_size` | （必填） | 每批次提示数 |
| `--run_name` | （必填） | 运行名称（用于输出目录和断点续传） |
| `--distribution` | `"default"` | 采样的工具集分布 |
| `--model` | `claude-sonnet-4.6` | 使用的模型 |
| `--base_url` | `https://openrouter.ai/api/v1` | API 基础 URL |
| `--api_key` | （环境变量） | 模型的 API 密钥 |
| `--max_turns` | `10` | 每个提示的最大工具调用迭代次数 |
| `--num_workers` | `4` | 并行工作进程数 |
| `--resume` | `false` | 从断点恢复 |
| `--verbose` | `false` | 启用详细日志 |
| `--max_samples` | 全部 | 仅处理数据集的前 N 个样本 |
| `--max_tokens` | 模型默认 | 每次模型响应的最大 token 数 |

### 提供者路由（OpenRouter）

| 参数 | 描述 |
|------|------|
| `--providers_allowed` | 允许的提供者，逗号分隔（例如 `"anthropic,openai"`） |
| `--providers_ignored` | 忽略的提供者，逗号分隔（例如 `"together,deepinfra"`） |
| `--providers_order` | 首选提供者顺序，逗号分隔 |
| `--provider_sort` | 按 `"price"`、`"throughput"` 或 `"latency"` 排序 |

### 推理控制

| 参数 | 描述 |
|------|------|
| `--reasoning_effort` | 推理力度：`none`、`minimal`、`low`、`medium`、`high`、`xhigh` |
| `--reasoning_disabled` | 完全禁用推理/thinking tokens |

### 高级选项

| 参数 | 描述 |
|------|------|
| `--ephemeral_system_prompt` | 执行期间使用的系统提示，但不会保存到轨迹中 |
| `--log_prefix_chars` | 日志预览中显示的字符数（默认：100） |
| `--prefill_messages_file` | 包含预填充消息的 JSON 文件路径，用于 few-shot 初始化 |

## 工具集分布

每个提示从**分布**中随机采样一组工具集。这确保训练数据覆盖多样的工具组合。使用 `--list_distributions` 查看所有可用的分布。

在当前实现中，分布为**每个工具集**分配一个概率。采样器独立地对每个工具集进行翻转判断，然后保证至少启用一个工具集。这与手工编排的预设组合表不同。

## 输出格式

所有输出写入 `data/<run_name>/`：

```text
data/my_run/
├── trajectories.jsonl    # 合并的最终输出（所有批次合并）
├── batch_0.jsonl         # 单独的批次结果
├── batch_1.jsonl
├── ...
├── checkpoint.json       # 断点续传检查点
└── statistics.json       # 汇总工具使用统计
```

### 轨迹格式

`trajectories.jsonl` 中的每一行是一个 JSON 对象：

```json
{
  "prompt_index": 42,
  "conversations": [
    {"from": "human", "value": "编写一个函数..."},
    {"from": "gpt", "value": "我来创建这个函数...",
     "tool_calls": [...]},
    {"from": "tool", "value": "..."},
    {"from": "gpt", "value": "这是完成的函数..."}
  ],
  "metadata": {
    "batch_num": 2,
    "timestamp": "2026-01-15T10:30:00",
    "model": "anthropic/claude-sonnet-4.6"
  },
  "completed": true,
  "partial": false,
  "api_calls": 3,
  "toolsets_used": ["terminal", "file"],
  "tool_stats": {
    "terminal": {"count": 2, "success": 2, "failure": 0},
    "read_file": {"count": 1, "success": 1, "failure": 0}
  },
  "tool_error_counts": {
    "terminal": 0,
    "read_file": 0
  }
}
```

`conversations` 字段使用类似 ShareGPT 的格式，包含 `from` 和 `value` 字段。工具统计被规范化为包含所有可能的工具，默认为零值，确保条目间模式一致，兼容 HuggingFace 数据集格式。

## 断点续传

批量运行器具有健壮的断点续传机制以确保容错性：

- **检查点文件：** 每个批次完成后保存，跟踪哪些提示索引已完成
- **基于内容的恢复：** 使用 `--resume` 时，运行器扫描现有的批次文件，通过实际文本内容（而非仅索引）匹配已完成的提示，即使数据集顺序变化也能恢复
- **失败的提示：** 只有成功完成的提示被标记为已完成——失败的提示在恢复时会重试
- **批次合并：** 完成时，所有批次文件（包括之前运行的）被合并为单个 `trajectories.jsonl`

### 恢复如何工作

1. 扫描所有 `batch_*.jsonl` 文件查找已完成的提示（通过内容匹配）
2. 过滤数据集以排除已完成的提示
3. 对剩余提示重新分批
4. 仅处理剩余的提示
5. 将所有批次文件（旧 + 新）合并为最终输出

## 质量过滤

批量运行器应用自动质量过滤：

- **无推理过滤：** 零个助手轮次包含推理的样本（没有 `<REASONING_SCRATCHPAD>` 或原生 thinking tokens）会被丢弃
- **损坏条目过滤：** 在最终合并时，包含幻觉工具名称（不在有效工具列表中）的条目会被过滤掉
- **推理统计：** 跟踪整个运行中有/无推理的轮次百分比

## 统计信息

完成后，运行器打印详细的统计信息：

- **工具使用：** 调用次数、每个工具的成功/失败率
- **推理覆盖率：** 包含推理的助手轮次百分比
- **丢弃的样本：** 因缺乏推理而被过滤的样本数
- **耗时：** 总处理时间

统计信息也保存到 `statistics.json` 供程序化分析。

## 使用场景

### 训练数据生成

生成多样的工具使用轨迹用于微调：

```bash
python batch_runner.py \
    --dataset_file=data/coding_prompts.jsonl \
    --batch_size=20 \
    --run_name=coding_v1 \
    --model=anthropic/claude-sonnet-4.6 \
    --num_workers=8 \
    --distribution=default \
    --max_turns=15
```

### 模型评估

评估模型在标准化提示上的工具使用能力：

```bash
python batch_runner.py \
    --dataset_file=data/eval_suite.jsonl \
    --batch_size=10 \
    --run_name=eval_gpt4 \
    --model=openai/gpt-4o \
    --num_workers=4 \
    --max_turns=10
```

### 每提示容器镜像

对于需要特定环境的基准测试，每个提示可以指定自己的容器镜像：

```jsonl
{"prompt": "安装 numpy 并计算 3x3 矩阵的特征值", "image": "python:3.11-slim"}
{"prompt": "编译这个 Rust 程序并运行它", "image": "rust:1.75"}
{"prompt": "搭建一个 Node.js Express 服务器", "image": "node:20-alpine", "cwd": "/app"}
```

批量运行器在运行每个提示前会验证 Docker 镜像是否可访问。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/batch-processing)
