---
title: 图片生成
description: 通过 FAL.ai 生成图片 — 8 种模型包括 FLUX 2、GPT-Image、Nano Banana Pro、Ideogram、Recraft V4 Pro 等，可通过 `hermes tools` 选择。
sidebar_label: 图片生成
sidebar_position: 6
---

# 图片生成

Hermes Agent 通过 FAL.ai 从文本提示词生成图片。开箱即用支持八种模型，每种模型在速度、质量和成本上有不同的权衡。活跃模型可通过 `hermes tools` 由用户配置，并持久保存在 `config.yaml` 中。

## 支持的模型

| 模型 | 速度 | 优势 | 价格 |
|---|---|---|---|
| `fal-ai/flux-2/klein/9b` *(默认)* | `<1s` | 快速，清晰的文字 | $0.006/MP |
| `fal-ai/flux-2-pro` | ~6s | 工作室级照片写实 | $0.03/MP |
| `fal-ai/z-image/turbo` | ~2s | 中英双语，6B 参数 | $0.005/MP |
| `fal-ai/nano-banana-pro` | ~8s | Gemini 3 Pro，推理深度，文字渲染 | $0.15/image (1K) |
| `fal-ai/gpt-image-1.5` | ~15s | 提示词遵从度高 | $0.034/image |
| `fal-ai/ideogram/v3` | ~5s | 最佳排版效果 | $0.03–0.09/image |
| `fal-ai/recraft/v4/pro/text-to-image` | ~8s | 设计、品牌系统、生产就绪 | $0.25/image |
| `fal-ai/qwen-image` | ~12s | 基于 LLM，复杂文字 | $0.02/MP |

以上价格为撰写时的 FAL 定价；请查看 [fal.ai](https://fal.ai/) 获取最新价格。

## 设置

:::tip Nous 订阅用户
如果你拥有付费的 [Nous Portal](https://portal.nousresearch.com) 订阅，可以通过 **[Tool Gateway](tool-gateway.md)** 使用图片生成功能，无需 FAL API 密钥。你的模型选择在两种路径间持久保存。

如果托管 Gateway 对特定模型返回 `HTTP 4xx`，说明该模型尚未在 Portal 端代理 — Agent 会告知你此情况，并提供修复步骤（设置 `FAL_KEY` 进行直接访问，或选择其他模型）。
:::

### 获取 FAL API 密钥

1. 在 [fal.ai](https://fal.ai/) 注册
2. 从仪表板生成 API 密钥

### 配置并选择模型

运行工具命令：

```bash
hermes tools
```

导航到 **🎨 Image Generation**，选择你的后端（Nous Subscription 或 FAL.ai），然后选择器会以列对齐表格显示所有支持的模型 — 使用方向键导航，Enter 键选择：

```
  Model                          Speed    Strengths                    Price
  fal-ai/flux-2/klein/9b         <1s      Fast, crisp text             $0.006/MP   ← currently in use
  fal-ai/flux-2-pro              ~6s      Studio photorealism          $0.03/MP
  fal-ai/z-image/turbo           ~2s      Bilingual EN/CN, 6B          $0.005/MP
  ...
```

你的选择会保存到 `config.yaml`：

```yaml
image_gen:
  model: fal-ai/flux-2/klein/9b
  use_gateway: false            # 使用 Nous Subscription 时为 true
```

### GPT-Image 画质

`fal-ai/gpt-image-1.5` 的请求画质固定为 `medium`（1024x1024 约 $0.034/image）。我们不将 `low` / `high` 等级暴露为用户可选选项，以使 Nous Portal 计费在所有用户间保持可预测 — 各等级之间的成本差距约为 22 倍。如果你想要更便宜的 GPT-Image 选项，请选择其他模型；如果想要更高质量，请使用 Klein 9B 或 Imagen 级别的模型。

## 使用方法

面向 Agent 的接口刻意保持简洁 — 模型会使用你已配置的设置：

```
Generate an image of a serene mountain landscape with cherry blossoms
```

```
Create a square portrait of a wise old owl — use the typography model
```

```
Make me a futuristic cityscape, landscape orientation
```

## 宽高比

从 Agent 的角度看，每个模型都接受相同的三种宽高比。在内部，每个模型的原生尺寸规格会自动填充：

| Agent 输入 | image_size (flux/z-image/qwen/recraft/ideogram) | aspect_ratio (nano-banana-pro) | image_size (gpt-image) |
|---|---|---|---|
| `landscape` | `landscape_16_9` | `16:9` | `1536x1024` |
| `square` | `square_hd` | `1:1` | `1024x1024` |
| `portrait` | `portrait_16_9` | `9:16` | `1024x1536` |

此转换在 `_build_fal_payload()` 中进行 — Agent 代码无需了解各模型的 Schema 差异。

## 自动放大

通过 FAL 的 **Clarity Upscaler** 进行的放大按模型控制：

| 模型 | 是否放大 | 原因 |
|---|---|---|
| `fal-ai/flux-2-pro` | ✓ | 向后兼容（曾是选择器出现前的默认模型） |
| 所有其他模型 | ✗ | 快速模型会失去亚秒级的价值主张；高分辨率模型不需要 |

放大运行时使用以下设置：

| 设置 | 值 |
|---|---|
| 放大倍数 | 2x |
| 创造力 | 0.35 |
| 相似度 | 0.6 |
| 引导比例 | 4 |
| 推理步数 | 18 |

如果放大失败（网络问题、速率限制），会自动返回原始图片。

## 内部工作原理

1. **模型解析** — `_resolve_fal_model()` 从 `config.yaml` 读取 `image_gen.model`，依次回退到 `FAL_IMAGE_MODEL` 环境变量和 `fal-ai/flux-2/klein/9b`。
2. **载荷构建** — `_build_fal_payload()` 将你的 `aspect_ratio` 转换为模型的原生格式（预设枚举、宽高比枚举或 GPT 字面值），合并模型默认参数，应用调用方覆盖，然后过滤为模型的 `supports` 白名单，确保不支持的键永远不会被发送。
3. **提交** — `_submit_fal_request()` 通过直接的 FAL 凭证或托管的 Nous Gateway 进行路由。
4. **放大** — 仅当模型的元数据中设置了 `upscale: True` 时运行。
5. **投递** — 最终图片 URL 返回给 Agent，Agent 发出 `MEDIA:<url>` 标签，由平台适配器转换为原生媒体。

## 调试

启用调试日志：

```bash
export IMAGE_TOOLS_DEBUG=true
```

调试日志写入 `./logs/image_tools_debug_<session_id>.json`，包含每次调用的详细信息（模型、参数、耗时、错误）。

## 平台投递

| 平台 | 投递方式 |
|---|---|
| **CLI** | 图片 URL 以 Markdown `![](url)` 格式打印 — 点击打开 |
| **Telegram** | 以提示词为标题的图片消息 |
| **Discord** | 嵌入在消息中 |
| **Slack** | URL 由 Slack 自动展开 |
| **WhatsApp** | 媒体消息 |
| **其他** | 纯文本 URL |

## 限制

- **需要 FAL 凭证**（直接的 `FAL_KEY` 或 Nous Subscription）
- **仅支持文生图** — 不支持 inpainting、img2img 或通过此工具进行编辑
- **临时 URL** — FAL 返回的托管 URL 会在数小时/数天后过期；如需保留请保存到本地
- **各模型约束** — 部分模型不支持 `seed`、`num_inference_steps` 等参数。`supports` 过滤器会静默丢弃不支持的参数；这是预期行为

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/image-generation)
