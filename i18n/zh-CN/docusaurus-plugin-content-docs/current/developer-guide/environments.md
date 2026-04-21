---
sidebar_position: 5
title: "环境、基准测试与数据生成"
description: "构建 RL 训练环境、运行评估基准测试，以及通过 Hermes-Agent Atropos 集成生成 SFT 数据"
---

# 环境、基准测试与数据生成

Hermes Agent 包含完整的环境框架，将其工具调用能力连接到 [Atropos](https://github.com/NousResearch/atropos) RL 训练框架。这支持三种工作流：

1. **RL 训练** — 在多轮 Agent 任务上使用 GRPO 训练语言模型
2. **基准测试** — 在标准化 Agent 基准上评估模型
3. **数据生成** — 从 Agent 推导生成 SFT 训练数据

三种工作流共享相同的核心：一个**环境**类，定义任务、运行 Agent 循环并评分输出。

:::info 仓库环境 vs RL 训练工具
此处记录的 Python 环境框架位于仓库的 `environments/` 目录下，是 Hermes/Atropos 集成的实现级 API。这与面向用户的 `rl_*` 工具不同，后者作为远程 RL 训练工作流的编排表面。
:::

:::tip 快速链接
- **想运行基准测试？** 跳转到[可用基准测试](#available-benchmarks)
- **想用 RL 训练？** 参见 [RL 训练工具](/user-guide/features/rl-training)了解 Agent 驱动接口，或[运行环境](#running-environments)了解手动执行
- **想创建新环境？** 参见[创建环境](#creating-environments)
:::

## 架构

环境系统建立在三层继承链上：

```mermaid
classDiagram
    class BaseEnv {
      Server management
      Worker scheduling
      Wandb logging
      CLI: serve / process / evaluate
    }

    class HermesAgentBaseEnv {
      Terminal backend configuration
      Tool resolution
      Agent loop engine
      ToolContext access
    }

    class TerminalTestEnv {
      Stack testing
    }

    class HermesSweEnv {
      SWE training
    }

    class TerminalBench2EvalEnv {
      Benchmark evaluation
    }

    class TBLiteEvalEnv {
      Fast benchmark
    }

    class YCBenchEvalEnv {
      Long-horizon benchmark
    }

    BaseEnv <|-- HermesAgentBaseEnv
    HermesAgentBaseEnv <|-- TerminalTestEnv
    HermesAgentBaseEnv <|-- HermesSweEnv
    HermesAgentBaseEnv <|-- TerminalBench2EvalEnv
    TerminalBench2EvalEnv <|-- TBLiteEvalEnv
    TerminalBench2EvalEnv <|-- YCBenchEvalEnv
```

### BaseEnv（Atropos）

来自 `atroposlib` 的基础。提供：
- **服务器管理** — 连接到 OpenAI 兼容 API（VLLM、SGLang、OpenRouter）
- **工作器调度** — 并行推导协调
- **Wandb 集成** — 指标日志和推导可视化
- **CLI 接口** — 三个子命令：`serve`、`process`、`evaluate`
- **评估日志** — `evaluate_log()` 将结果保存为 JSON + JSONL

### HermesAgentBaseEnv

Hermes-agent 层（`environments/hermes_base_env.py`）。添加：
- **终端后端配置** — 设置 `TERMINAL_ENV` 用于沙箱执行（local、Docker、Modal、Daytona、SSH、Singularity）
- **工具解析** — `_resolve_tools_for_group()` 调用 hermes-agent 的 `get_tool_definitions()` 获取基于启用/禁用工具集的正确工具 Schema
- **Agent 循环集成** — `collect_trajectory()` 运行 `HermesAgentLoop` 并评分结果
- **两阶段操作** — 阶段 1（OpenAI 服务器）用于评估/SFT，阶段 2（VLLM ManagedServer）用于带 logprobs 的完整 RL
- **异步安全补丁** — 猴子补丁 Modal 后端以在 Atropos 事件循环内工作

### 具体环境

你的环境继承自 `HermesAgentBaseEnv` 并实现五个方法：

| 方法 | 用途 |
|------|------|
| `setup()` | 加载数据集，初始化状态 |
| `get_next_item()` | 返回下一个推导项 |
| `format_prompt(item)` | 将项转换为用户消息 |
| `compute_reward(item, result, ctx)` | 评分推导（0.0–1.0） |
| `evaluate()` | 定期评估逻辑 |

## 核心组件

### Agent 循环

`HermesAgentLoop`（`environments/agent_loop.py`）是可复用的多轮 Agent 引擎。它运行与 hermes-agent 主循环相同的工具调用模式：

1. 通过 `server.chat_completion()` 将消息 + 工具 Schema 发送到 API
2. 如果响应包含 `tool_calls`，通过 `handle_function_call()` 分发每个调用
3. 将工具结果附加到对话，回到步骤 1
4. 如果没有 `tool_calls`，Agent 完成

工具调用在线程池（`ThreadPoolExecutor(128)`）中执行，以便异步后端（Modal、Docker）不会在 Atropos 事件循环中死锁。

返回 `AgentResult`：

```python
@dataclass
class AgentResult:
    messages: List[Dict[str, Any]]       # 完整对话历史
    turns_used: int                       # LLM 调用次数
    finished_naturally: bool              # 模型自行停止则为 True
    reasoning_per_turn: List[Optional[str]]  # 提取的推理内容
    tool_errors: List[ToolError]          # 工具分发期间遇到的错误
    managed_state: Optional[Dict]         # VLLM ManagedServer 状态（阶段 2）
```

### 工具上下文

`ToolContext`（`environments/tool_context.py`）给奖励函数直接访问模型推导期间使用的**相同沙箱**。`task_id` 作用域意味着所有状态（文件、进程、浏览器标签）都被保留。

```python
async def compute_reward(self, item, result, ctx: ToolContext):
    # 在模型的终端沙箱中运行测试
    test = ctx.terminal("pytest -v")
    if test["exit_code"] == 0:
        return 1.0

    # 检查是否创建了文件
    content = ctx.read_file("/workspace/solution.py")
    if content.get("content"):
        return 0.5

    # 下载文件用于本地验证
    ctx.download_file("/remote/output.bin", "/local/output.bin")
    return 0.0
```

可用方法：

| 类别 | 方法 |
|------|------|
| **终端** | `terminal(command, timeout)` |
| **文件** | `read_file(path)`、`write_file(path, content)`、`search(query, path)` |
| **传输** | `upload_file()`、`upload_dir()`、`download_file()`、`download_dir()` |
| **Web** | `web_search(query)`、`web_extract(urls)` |
| **浏览器** | `browser_navigate(url)`、`browser_snapshot()` |
| **通用** | `call_tool(name, args)` — 任何 hermes-agent 工具的逃生口 |
| **清理** | `cleanup()` — 释放所有资源 |

### 工具调用解析器

对于**阶段 2**（VLLM ManagedServer），服务器返回没有结构化工具调用的原始文本。`environments/tool_call_parsers/` 中的客户端解析器从原始输出中提取 `tool_calls`：

```python
from environments.tool_call_parsers import get_parser

parser = get_parser("hermes")  # 或 "mistral"、"llama3_json"、"qwen"、"deepseek_v3" 等
content, tool_calls = parser.parse(raw_model_output)
```

可用解析器：`hermes`、`mistral`、`llama3_json`、`qwen`、`qwen3_coder`、`deepseek_v3`、`deepseek_v3_1`、`kimi_k2`、`longcat`、`glm45`、`glm47`。

在阶段 1（OpenAI 服务器类型）中，不需要解析器 — 服务器原生处理工具调用解析。

## 可用基准测试

### TerminalBench2

**89 个挑战性终端任务**，每个任务有独立的 Docker 沙箱环境。

| | |
|---|---|
| **测试内容** | 单任务编码/系统管理能力 |
| **评分** | 二元通过/失败（测试套件验证） |
| **沙箱** | Modal 云沙箱（每任务 Docker 镜像） |
| **工具** | `terminal` + `file` |
| **任务** | 跨多个类别的 89 个任务 |
| **成本** | 完整评估约 $50–200（并行执行） |
| **时间** | 约 2–4 小时 |

```bash
python environments/benchmarks/terminalbench_2/terminalbench2_env.py evaluate \
    --config environments/benchmarks/terminalbench_2/default.yaml

# 运行特定任务
python environments/benchmarks/terminalbench_2/terminalbench2_env.py evaluate \
    --config environments/benchmarks/terminalbench_2/default.yaml \
    --env.task_filter fix-git,git-multibranch
```

数据集：HuggingFace 上的 [NousResearch/terminal-bench-2](https://huggingface.co/datasets/NousResearch/terminal-bench-2)。

### TBLite（OpenThoughts Terminal Bench Lite）

**100 个难度校准任务** — TerminalBench2 的更快代理。

| | |
|---|---|
| **测试内容** | 与 TB2 相同（编码/系统管理），校准的难度等级 |
| **评分** | 二元通过/失败 |
| **沙箱** | Modal 云沙箱 |
| **工具** | `terminal` + `file` |
| **任务** | 100 个任务：简单（40）、中等（26）、困难（26）、极限（8） |
| **相关性** | 与完整 TB2 的 r=0.911 |
| **速度** | 比 TB2 快 2.6–8 倍 |

```bash
python environments/benchmarks/tblite/tblite_env.py evaluate \
    --config environments/benchmarks/tblite/default.yaml
```

TBLite 是 TerminalBench2 的薄子类 — 仅数据集和超时不同。由 OpenThoughts Agent 团队（Snorkel AI + Bespoke Labs）创建。数据集：[NousResearch/openthoughts-tblite](https://huggingface.co/datasets/NousResearch/openthoughts-tblite)。

### YC-Bench

**长期战略基准测试** — Agent 扮演 AI 创业公司的 CEO。

| | |
|---|---|
| **测试内容** | 数百轮的多轮战略连贯性 |
| **评分** | 复合：`0.5 × 生存率 + 0.5 × 标准化资金` |
| **沙箱** | 本地终端（无需 Modal） |
| **工具** | 仅 `terminal` |
| **运行** | 9 个默认（3 个预设 × 3 个种子），顺序执行 |
| **成本** | 完整评估约 $50–200 |
| **时间** | 约 3–6 小时 |

```bash
# 安装 yc-bench（可选依赖）
pip install "hermes-agent[yc-bench]"

# 运行评估
bash environments/benchmarks/yc_bench/run_eval.sh

# 或直接运行
python environments/benchmarks/yc_bench/yc_bench_env.py evaluate \
    --config environments/benchmarks/yc_bench/default.yaml

# 快速单预设测试
python environments/benchmarks/yc_bench/yc_bench_env.py evaluate \
    --config environments/benchmarks/yc_bench/default.yaml \
    --env.presets '["fast_test"]' --env.seeds '[1]'
```

YC-Bench 使用 [collinear-ai/yc-bench](https://github.com/collinear-ai/yc-bench) — 一个确定性模拟，包含 4 个技能领域（research、inference、data_environment、training）、声望系统、员工管理和财务压力。与 TB2 的每任务二元评分不同，YC-Bench 衡量 Agent 是否能在数百个复合决策中保持连贯战略。

## 训练环境

### TerminalTestEnv

一个带有内联任务（无外部数据集）的最小自包含环境。用于**端到端验证完整技术栈**。每个任务要求模型在已知路径创建文件；验证器检查内容。

```bash
# 处理模式（将推导保存为 JSONL，不需要训练服务器）
python environments/terminal_test_env/terminal_test_env.py process \
    --env.data_path_to_save_groups terminal_test_output.jsonl

# 服务模式（连接到 Atropos API 用于 RL 训练）
python environments/terminal_test_env/terminal_test_env.py serve
```

### HermesSweEnv

SWE-bench 风格的训练环境。模型获得一个编码任务，使用 terminal + file + web 工具解决它，奖励函数在同一个 Modal 沙箱中运行测试。

```bash
python environments/hermes_swe_env/hermes_swe_env.py serve \
    --openai.model_name YourModel \
    --env.dataset_name bigcode/humanevalpack \
    --env.terminal_backend modal
```

## 运行环境

每个环境是一个独立 Python 脚本，有三个 CLI 子命令：

### `evaluate` — 运行基准测试

用于仅评估环境（基准测试）。运行所有项，计算指标，记录到 wandb。

```bash
python environments/benchmarks/tblite/tblite_env.py evaluate \
    --config environments/benchmarks/tblite/default.yaml \
    --openai.model_name anthropic/claude-sonnet-4.6
```

不需要训练服务器或 `run-api`。环境处理一切。

### `process` — 生成 SFT 数据

运行推导并将评分轨迹保存为 JSONL。用于生成训练数据而不需要完整 RL 循环。

```bash
python environments/terminal_test_env/terminal_test_env.py process \
    --env.data_path_to_save_groups output.jsonl \
    --openai.model_name anthropic/claude-sonnet-4.6
```

输出格式：每行是一个带完整对话历史、奖励和元数据的评分轨迹。

### `serve` — 连接到 Atropos 进行 RL 训练

将环境连接到运行中的 Atropos API 服务器（`run-api`）。在实时 RL 训练期间使用。

```bash
# 终端 1：启动 Atropos API
run-api

# 终端 2：启动环境
python environments/hermes_swe_env/hermes_swe_env.py serve \
    --openai.model_name YourModel
```

环境从 Atropos 接收项，运行 Agent 推导，计算奖励，并将评分轨迹发送回训练。

## 两阶段操作

### 阶段 1：OpenAI 服务器（评估 / SFT）

使用带 `tools=` 参数的 `server.chat_completion()`。服务器（VLLM、SGLang、OpenRouter、OpenAI）原生处理工具调用解析。返回带结构化 `tool_calls` 的 `ChatCompletion` 对象。

- **用于**：评估、SFT 数据生成、基准测试、测试
- **占位 Token**为 Atropos 管道创建（因为 OpenAI API 不提供真实 Token ID）

### 阶段 2：VLLM ManagedServer（完整 RL）

使用 ManagedServer 通过 `/generate` 获取精确的 Token ID + logprobs。客户端[工具调用解析器](#tool-call-parsers)从原始输出重建结构化 `tool_calls`。

- **用于**：使用 GRPO/PPO 的完整 RL 训练
- **真实 Token**、掩码和 logprobs 流经管道
- 在配置中设置 `tool_call_parser` 以匹配你的模型格式（如 `"hermes"`、`"qwen"`、`"mistral"`）

## 创建环境

### 训练环境

```python
from environments.hermes_base_env import HermesAgentBaseEnv, HermesAgentEnvConfig
from atroposlib.envs.server_handling.server_manager import APIServerConfig

class MyEnvConfig(HermesAgentEnvConfig):
    my_custom_field: str = "default_value"

class MyEnv(HermesAgentBaseEnv):
    name = "my-env"
    env_config_cls = MyEnvConfig

    @classmethod
    def config_init(cls):
        env_config = MyEnvConfig(
            enabled_toolsets=["terminal", "file"],
            terminal_backend="modal",
            max_agent_turns=30,
        )
        server_configs = [APIServerConfig(
            base_url="https://openrouter.ai/api/v1",
            model_name="anthropic/claude-sonnet-4.6",
            server_type="openai",
        )]
        return env_config, server_configs

    async def setup(self):
        from datasets import load_dataset
        self.dataset = list(load_dataset("my-dataset", split="train"))
        self.iter = 0

    async def get_next_item(self):
        item = self.dataset[self.iter % len(self.dataset)]
        self.iter += 1
        return item

    def format_prompt(self, item):
        return item["instruction"]

    async def compute_reward(self, item, result, ctx):
        # ctx 给予对推导沙箱的完整工具访问
        test = ctx.terminal("pytest -v")
        return 1.0 if test["exit_code"] == 0 else 0.0

    async def evaluate(self, *args, **kwargs):
        # 训练期间的定期评估
        pass

if __name__ == "__main__":
    MyEnv.cli()
```

### 仅评估基准测试

对于基准测试，遵循 TerminalBench2、TBLite 和 YC-Bench 使用的模式：

1. **在 `environments/benchmarks/your-benchmark/` 下创建**
2. **设置仅评估配置**：`eval_handling=STOP_TRAIN`、`steps_per_eval=1`、`total_steps=1`
3. **桩训练方法**：`collect_trajectories()` 返回 `(None, [])`，`score()` 返回 `None`
4. **实现** `rollout_and_score_eval(eval_item)` — 每项的 Agent 循环 + 评分
5. **实现** `evaluate()` — 编排所有运行，计算聚合指标
6. **添加流式 JSONL** 用于崩溃安全的结果持久化
7. **添加清理**：`KeyboardInterrupt` 处理、`cleanup_all_environments()`、`_tool_executor.shutdown()`
8. **用 `evaluate` 子命令运行**

参见 `environments/benchmarks/yc_bench/yc_bench_env.py` 了解干净、有良好文档的参考实现。

## 配置参考

### HermesAgentEnvConfig 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled_toolsets` | `List[str]` | `None`（全部） | 启用哪些 hermes 工具集 |
| `disabled_toolsets` | `List[str]` | `None` | 要过滤掉的工具集 |
| `distribution` | `str` | `None` | 概率工具集分布名称 |
| `max_agent_turns` | `int` | `30` | 每次推导的最大 LLM 调用数 |
| `agent_temperature` | `float` | `1.0` | 采样温度 |
| `system_prompt` | `str` | `None` | Agent 的系统消息 |
| `terminal_backend` | `str` | `"local"` | `local`、`docker`、`modal`、`daytona`、`ssh`、`singularity` |
| `terminal_timeout` | `int` | `120` | 每个终端命令的秒数 |
| `terminal_lifetime` | `int` | `3600` | 最大沙箱生命周期 |
| `dataset_name` | `str` | `None` | HuggingFace 数据集标识符 |
| `tool_pool_size` | `int` | `128` | 工具执行的线程池大小 |
| `tool_call_parser` | `str` | `"hermes"` | 阶段 2 原始输出的解析器 |
| `extra_body` | `Dict` | `None` | OpenAI API 的额外参数（如 OpenRouter 提供商偏好） |
| `eval_handling` | `Enum` | `STOP_TRAIN` | `STOP_TRAIN`、`LIMIT_TRAIN`、`NONE` |

### YAML 配置

环境可以通过 `--config` 传入的 YAML 文件配置：

```yaml
env:
  enabled_toolsets: ["terminal", "file"]
  max_agent_turns: 60
  max_token_length: 32000
  agent_temperature: 0.8
  terminal_backend: "modal"
  terminal_timeout: 300
  dataset_name: "NousResearch/terminal-bench-2"
  tokenizer_name: "NousResearch/Hermes-3-Llama-3.1-8B"
  use_wandb: true
  wandb_name: "my-benchmark"

openai:
  base_url: "https://openrouter.ai/api/v1"
  model_name: "anthropic/claude-sonnet-4.6"
  server_type: "openai"
  health_check: false
```

YAML 值覆盖 `config_init()` 默认值。CLI 参数覆盖 YAML 值：

```bash
python my_env.py evaluate \
    --config my_config.yaml \
    --openai.model_name anthropic/claude-opus-4.6  # 覆盖 YAML
```

## 前提条件

### 所有环境

- Python >= 3.11
- `atroposlib`：`pip install git+https://github.com/NousResearch/atropos.git`
- LLM API 密钥（OpenRouter、OpenAI 或自托管的 VLLM/SGLang）

### Modal 沙箱基准测试（TB2、TBLite）

- [Modal](https://modal.com) 账户和 CLI：`pip install "hermes-agent[modal]"`
- `MODAL_TOKEN_ID` 和 `MODAL_TOKEN_SECRET` 环境变量

### YC-Bench

- `pip install "hermes-agent[yc-bench]"`（安装 yc-bench CLI + SQLAlchemy）
- 无需 Modal — 使用本地终端后端运行

### RL 训练

- `TINKER_API_KEY` — [Tinker](https://tinker.computer) 训练服务的 API 密钥
- `WANDB_API_KEY` — 用于 Weights & Biases 指标跟踪
- `tinker-atropos` 子模块（在仓库的 `tinker-atropos/` 中）

参见 [RL 训练](/user-guide/features/rl-training)了解 Agent 驱动的 RL 工作流。

## 目录结构

```
environments/
├── hermes_base_env.py          # 抽象基类（HermesAgentBaseEnv）
├── agent_loop.py               # 多轮 Agent 引擎（HermesAgentLoop）
├── tool_context.py             # 每次推导的奖励函数工具访问
├── patches.py                  # Modal 后端的异步安全补丁
│
├── tool_call_parsers/          # 阶段 2 客户端解析器
│   ├── hermes_parser.py        # Hermes/ChatML 格式
│   ├── mistral_parser.py       # Mistral [TOOL_CALLS] 格式
│   ├── llama_parser.py         # Llama 3 JSON 工具调用
│   ├── qwen_parser.py          # Qwen 格式
│   ├── deepseek_v3_parser.py   # DeepSeek V3 格式
│   └── ...                     # + kimi_k2、longcat、glm45/47 等
│
├── terminal_test_env/          # 技术栈验证（内联任务）
├── hermes_swe_env/             # SWE-bench 训练环境
│
└── benchmarks/                 # 评估基准测试
    ├── terminalbench_2/        # 89 个终端任务，Modal 沙箱
    ├── tblite/                 # 100 个校准任务（快速 TB2 代理）
    └── yc_bench/               # 长期战略基准测试
```

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/environments)
