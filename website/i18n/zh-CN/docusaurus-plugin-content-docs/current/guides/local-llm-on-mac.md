---
sidebar_position: 2
title: "在 Mac 上运行本地 LLM"
description: "在 macOS 上使用 llama.cpp 或 MLX 设置本地 OpenAI 兼容 LLM 服务器 — 包括模型选择、内存优化和 Apple Silicon 实测基准"
---

# 在 Mac 上运行本地 LLM

本指南带你在 macOS 上运行带有 OpenAI 兼容 API 的本地 LLM 服务器。你获得完全隐私、零 API 费用，以及在 Apple Silicon 上令人惊讶的好性能。

我们覆盖两个后端：

| 后端 | 安装 | 优势 | 格式 |
|---------|---------|---------|--------|
| **llama.cpp** | `brew install llama.cpp` | 首个 Token 最快，量化 KV Cache 节省内存 | GGUF |
| **omlx** | [omlx.ai](https://omlx.ai) | Token 生成最快，原生 Metal 优化 | MLX (safetensors) |

两者都暴露 OpenAI 兼容的 `/v1/chat/completions` 端点。Hermes 兼容任一 — 只需指向 `http://localhost:8080` 或 `http://localhost:8000`。

:::info 仅限 Apple Silicon
本指南针对搭载 Apple Silicon（M1 及更高版本）的 Mac。Intel Mac 可以使用 llama.cpp 但没有 GPU 加速 — 性能会显著降低。
:::

---

## 选择模型

入门推荐 **Qwen3.5-9B** — 这是一个强大的推理模型，量化后可以轻松适配 8GB+ 的统一内存。

| 变体 | 磁盘大小 | 所需内存（128K 上下文） | 后端 |
|---------|-------------|---------------------------|---------|
| Qwen3.5-9B-Q4_K_M (GGUF) | 5.3 GB | ~10 GB（量化 KV Cache） | llama.cpp |
| Qwen3.5-9B-mlx-lm-mxfp4 (MLX) | ~5 GB | ~12 GB | omlx |

**内存经验法则：** 模型大小 + KV Cache。9B Q4 模型约 5 GB。128K 上下文的 KV Cache 使用 Q4 量化增加约 4-5 GB。使用默认（f16）KV Cache，会膨胀到约 16 GB。llama.cpp 中的量化 KV Cache 标志是内存受限系统的关键技巧。

对于更大的模型（27B、35B），你需要 32GB+ 的统一内存。9B 是 8-16 GB 机器的最佳选择。

---

## 方案 A：llama.cpp

llama.cpp 是最便携的本地 LLM 运行时。在 macOS 上它使用 Metal 进行 GPU 加速，开箱即用。

### 安装

```bash
brew install llama.cpp
```

这会全局安装 `llama-server` 命令。

### 下载模型

你需要 GGUF 格式的模型。最简单的方式是通过 `huggingface-cli` 从 Hugging Face 下载：

```bash
brew install huggingface-cli
```

然后下载：

```bash
huggingface-cli download unsloth/Qwen3.5-9B-GGUF Qwen3.5-9B-Q4_K_M.gguf --local-dir ~/models
```

:::tip 受限模型
Hugging Face 上的某些模型需要认证。如果你收到 401 或 404 错误，先运行 `huggingface-cli login`。
:::

### 启动服务器

```bash
llama-server -m ~/models/Qwen3.5-9B-Q4_K_M.gguf \
  -ngl 99 \
  -c 131072 \
  -np 1 \
  -fa on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --host 0.0.0.0
```

各标志说明：

| 标志 | 用途 |
|------|---------|
| `-ngl 99` | 将所有层卸载到 GPU（Metal）。使用高数字确保没有层留在 CPU。 |
| `-c 131072` | 上下文窗口大小（128K Token）。内存不足时减小此值。 |
| `-np 1` | 并行槽数。单用户保持为 1 — 更多槽位会分割内存预算。 |
| `-fa on` | Flash Attention。减少内存使用并加速长上下文推理。 |
| `--cache-type-k q4_0` | 将 Key Cache 量化为 4-bit。**这是最大的内存节省方案。** |
| `--cache-type-v q4_0` | 将 Value Cache 量化为 4-bit。与上面的组合，KV Cache 内存相比 f16 减少约 75%。 |
| `--host 0.0.0.0` | 监听所有接口。如果不需要网络访问，使用 `127.0.0.1`。 |

当你看到以下信息时服务器就准备好了：

```
main: server is listening on http://0.0.0.0:8080
srv  update_slots: all slots are idle
```

### 内存受限系统的优化

`--cache-type-k q4_0 --cache-type-v q4_0` 标志是内存有限系统最重要的优化。以下是 128K 上下文时的影响：

| KV Cache 类型 | KV Cache 内存（128K 上下文，9B 模型） |
|---------------|--------------------------------------|
| f16（默认） | ~16 GB |
| q8_0 | ~8 GB |
| **q4_0** | **~4 GB** |

在 8GB Mac 上，使用 `q4_0` KV Cache 并将上下文减小到 `-c 32768`（32K）。在 16GB 上，你可以轻松使用 128K 上下文。在 32GB+ 上，你可以运行更大的模型或多个并行槽位。

如果仍然内存不足，先减小上下文大小（`-c`），然后尝试更小的量化（Q3_K_M 而非 Q4_K_M）。

### 测试

```bash
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-9B-Q4_K_M.gguf",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq .choices[0].message.content
```

### 获取模型名称

如果你忘了模型名称，查询 models 端点：

```bash
curl -s http://localhost:8080/v1/models | jq '.data[].id'
```

---

## 方案 B：通过 omlx 使用 MLX

[omlx](https://omlx.ai) 是一个 macOS 原生应用，管理和提供 MLX 模型服务。MLX 是 Apple 自己的机器学习框架，专为 Apple Silicon 的统一内存架构优化。

### 安装

从 [omlx.ai](https://omlx.ai) 下载并安装。它提供 GUI 用于模型管理和内置服务器。

### 下载模型

使用 omlx 应用浏览和下载模型。搜索 `Qwen3.5-9B-mlx-lm-mxfp4` 并下载。模型存储在本地（通常在 `~/.omlx/models/`）。

### 启动服务器

omlx 默认在 `http://127.0.0.1:8000` 提供模型服务。从应用 UI 启动服务，或使用 CLI（如果可用）。

### 测试

```bash
curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-9B-mlx-lm-mxfp4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq .choices[0].message.content
```

### 列出可用模型

omlx 可以同时提供多个模型：

```bash
curl -s http://127.0.0.1:8000/v1/models | jq '.data[].id'
```

---

## 基准测试：llama.cpp vs MLX

两个后端在同一台机器（Apple M5 Max，128 GB 统一内存）上测试，运行相同模型（Qwen3.5-9B），可比量化级别（GGUF 使用 Q4_K_M，MLX 使用 mxfp4）。五个不同提示，各运行三次，后端顺序测试以避免资源竞争。

### 结果

| 指标 | llama.cpp (Q4_K_M) | MLX (mxfp4) | 胜者 |
|--------|-------------------|-------------|--------|
| **TTFT（平均）** | **67 ms** | 289 ms | llama.cpp（快 4.3 倍） |
| **TTFT（p50）** | **66 ms** | 286 ms | llama.cpp（快 4.3 倍） |
| **生成速度（平均）** | 70 tok/s | **96 tok/s** | MLX（快 37%） |
| **生成速度（p50）** | 70 tok/s | **96 tok/s** | MLX（快 37%） |
| **总时间（512 Token）** | 7.3s | **5.5s** | MLX（快 25%） |

### 这意味着什么

- **llama.cpp** 在提示处理上表现出色 — 其 Flash Attention + 量化 KV Cache 管道在大约 66ms 内给你第一个 Token。如果你构建感知响应速度重要的交互式应用（聊天机器人、自动补全），这是有意义的优势。

- **MLX** 一旦开始，生成 Token 快约 37%。对于批处理工作负载、长文本生成，或任何总完成时间比初始延迟更重要的任务，MLX 完成得更快。

- 两个后端都**极其一致** — 跨运行的方差可以忽略不计。你可以依赖这些数字。

### 你应该选哪个？

| 使用场景 | 推荐 |
|----------|---------------|
| 交互式聊天、低延迟工具 | llama.cpp |
| 长文本生成、批处理 | MLX (omlx) |
| 内存受限（8-16 GB） | llama.cpp（量化 KV Cache 无可匹敌） |
| 同时提供多个模型 | omlx（内置多模型支持） |
| 最大兼容性（也支持 Linux） | llama.cpp |

---

## 连接到 Hermes

本地服务器运行后：

```bash
hermes model
```

选择 **Custom endpoint** 并按提示操作。它会询问 Base URL 和模型名称 — 使用你上方设置的任一后端的值。

---

## 超时

Hermes 自动检测本地端点（localhost、局域网 IP）并放宽其流式超时。大多数设置无需配置。

如果你仍然遇到超时错误（例如在慢速硬件上使用非常大的上下文），可以覆盖流式读取超时：

```bash
# 在你的 .env 中 — 从默认 120s 提高到 30 分钟
HERMES_STREAM_READ_TIMEOUT=1800
```

| 超时 | 默认值 | 本地自动调整 | 环境变量覆盖 |
|---------|---------|----------------------|------------------|
| 流式读取（Socket 级别） | 120s | 提高到 1800s | `HERMES_STREAM_READ_TIMEOUT` |
| 停滞流检测 | 180s | 完全禁用 | `HERMES_STREAM_STALE_TIMEOUT` |
| API 调用（非流式） | 1800s | 无需更改 | `HERMES_API_TIMEOUT` |

流式读取超时最可能导致问题 — 它是接收下一个数据块的 Socket 级截止时间。在大上下文的预填充期间，本地模型可能几分钟不产生输出。自动检测透明处理此情况。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/local-llm-on-mac)
