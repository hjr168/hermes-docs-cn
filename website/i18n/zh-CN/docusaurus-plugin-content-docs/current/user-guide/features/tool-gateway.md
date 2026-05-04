---
title: "Nous Tool Gateway"
description: "通过你的 Nous 订阅路由网络搜索、图片生成、文本转语音和浏览器自动化 — 无需额外 API 密钥"
sidebar_label: "Tool Gateway"
sidebar_position: 2
---

# Nous Tool Gateway

:::tip 快速开始
Tool Gateway 包含在付费的 Nous Portal 订阅中。**[管理你的订阅 →](https://portal.nousresearch.com/manage-subscription)**
:::

**Tool Gateway** 让付费 [Nous Portal](https://portal.nousresearch.com) 订阅用户可以通过现有订阅使用网络搜索、图片生成、文本转语音和浏览器自动化 — 无需注册 Firecrawl、FAL、OpenAI 或 Browser Use 的单独 API 密钥。

## 包含内容

| 工具 | 功能 | 直接替代方案 |
|------|--------------|--------------------|
| **网络搜索与提取** | 通过 Firecrawl 搜索网页并提取页面内容 | `FIRECRAWL_API_KEY`、`EXA_API_KEY`、`PARALLEL_API_KEY`、`TAVILY_API_KEY` |
| **图片生成** | 通过 FAL 生成图片（8 种模型：FLUX 2 Klein/Pro、GPT-Image、Nano Banana Pro、Ideogram、Recraft V4 Pro、Qwen、Z-Image） | `FAL_KEY` |
| **文本转语音** | 通过 OpenAI TTS 将文本转换为语音 | `VOICE_TOOLS_OPENAI_KEY`、`ELEVENLABS_API_KEY` |
| **浏览器自动化** | 通过 Browser Use 控制云端浏览器 | `BROWSER_USE_API_KEY`、`BROWSERBASE_API_KEY` |

所有四种工具都通过你的 Nous 订阅计费。你可以启用任意组合 — 例如，使用 Gateway 处理网络搜索和图片生成，同时保留自己的 ElevenLabs 密钥用于 TTS。

## 资格

Tool Gateway 面向 **付费** [Nous Portal](https://portal.nousresearch.com/manage-subscription) 订阅用户开放。免费层级账号无法使用 — [升级你的订阅](https://portal.nousresearch.com/manage-subscription) 即可解锁。

要检查你的状态：

```bash
hermes status
```

查找 **Nous Tool Gateway** 部分。它会显示哪些工具通过 Gateway 激活、哪些使用直接密钥、哪些未配置。

## 启用 Tool Gateway

### 在模型设置期间

当你运行 `hermes model` 并选择 Nous Portal 作为提供商时，Hermes 会自动提示是否启用 Tool Gateway：

```
Your Nous subscription includes the Tool Gateway.

  The Tool Gateway gives you access to web search, image generation,
  text-to-speech, and browser automation through your Nous subscription.
  No need to sign up for separate API keys — just pick the tools you want.

  ○ Web search & extract (Firecrawl) — not configured
  ○ Image generation (FAL) — not configured
  ○ Text-to-speech (OpenAI TTS) — not configured
  ○ Browser automation (Browser Use) — not configured

  ● Enable Tool Gateway
  ○ Skip
```

选择 **Enable Tool Gateway** 即可完成。

如果你已经拥有某些工具的直接 API 密钥，提示会自动调整 — 你可以为所有工具启用 Gateway（现有密钥保留在 `.env` 中但运行时不使用）、仅为未配置的工具启用 Gateway，或完全跳过。

### 通过 `hermes tools`

你也可以通过交互式工具配置逐个启用 Gateway：

```bash
hermes tools
```

选择一个工具类别（Web、Browser、Image Generation 或 TTS），然后选择 **Nous Subscription** 作为提供商。这会在你的配置中为该工具设置 `use_gateway: true`。

### 手动配置

直接在 `~/.hermes/config.yaml` 中设置 `use_gateway` 标志：

```yaml
web:
  backend: firecrawl
  use_gateway: true

image_gen:
  use_gateway: true

tts:
  provider: openai
  use_gateway: true

browser:
  cloud_provider: browser-use
  use_gateway: true
```

## 工作原理

当为某个工具设置 `use_gateway: true` 时，运行时会通过 Nous Tool Gateway 路由 API 调用，而不是使用直接的 API 密钥：

1. **Web 工具** — `web_search` 和 `web_extract` 使用 Gateway 的 Firecrawl 端点
2. **图片生成** — `image_generate` 使用 Gateway 的 FAL 端点
3. **TTS** — `text_to_speech` 使用 Gateway 的 OpenAI Audio 端点
4. **浏览器** — `browser_navigate` 和其他浏览器工具使用 Gateway 的 Browser Use 端点

Gateway 使用你的 Nous Portal 凭证进行认证（在 `hermes model` 后存储在 `~/.hermes/auth.json` 中）。

### 优先级

每个工具首先检查 `use_gateway`：

- **`use_gateway: true`** → 通过 Gateway 路由，即使 `.env` 中存在直接 API 密钥
- **`use_gateway: false`**（或未设置） → 如果可用则使用直接 API 密钥，仅在没有直接密钥时回退到 Gateway

这意味着你可以随时在 Gateway 和直接密钥之间切换，而无需删除 `.env` 凭证。

## 切换回直接密钥

要停止使用某个工具的 Gateway：

```bash
hermes tools    # 选择工具 → 选择直接提供商
```

或在配置中设置 `use_gateway: false`：

```yaml
web:
  backend: firecrawl
  use_gateway: false  # 现在使用 .env 中的 FIRECRAWL_API_KEY
```

当你在 `hermes tools` 中选择非 Gateway 提供商时，`use_gateway` 标志会自动设置为 `false`，以防止配置矛盾。

## 检查状态

```bash
hermes status
```

**Nous Tool Gateway** 部分显示：

```
◆ Nous Tool Gateway
  Nous Portal   ✓ managed tools available
  Web tools       ✓ active via Nous subscription
  Image gen       ✓ active via Nous subscription
  TTS             ✓ active via Nous subscription
  Browser         ○ active via Browser Use key
  Modal           ○ available via subscription (optional)
```

标记为 "active via Nous subscription" 的工具通过 Gateway 路由。拥有自己密钥的工具会显示当前活跃的提供商。

## 高级：自托管 Gateway

对于自托管或自定义 Gateway 部署，你可以通过 `~/.hermes/.env` 中的环境变量覆盖 Gateway 端点：

```bash
TOOL_GATEWAY_DOMAIN=nousresearch.com     # Gateway 路由的基础域名
TOOL_GATEWAY_SCHEME=https                 # HTTP 或 HTTPS（默认：https）
TOOL_GATEWAY_USER_TOKEN=your-token        # 认证令牌（通常自动填充）
FIRECRAWL_GATEWAY_URL=https://...         # 专门覆盖 Firecrawl 端点
```

无论订阅状态如何，这些环境变量始终在配置中可见 — 它们对于自定义基础设施设置非常有用。

## 常见问题

### 我需要删除现有的 API 密钥吗？

不需要。当设置 `use_gateway: true` 时，运行时会跳过直接 API 密钥并通过 Gateway 路由。你的密钥保留在 `.env` 中不变。如果你之后禁用 Gateway，它们会再次被自动使用。

### 我可以某些工具使用 Gateway，其他工具使用直接密钥吗？

可以。`use_gateway` 标志是按工具设置的。你可以混合搭配 — 例如，Gateway 处理网络搜索和图片生成，你自己的 ElevenLabs 密钥用于 TTS，Browserbase 用于浏览器自动化。

### 如果我的订阅过期了怎么办？

通过 Gateway 路由的工具将停止工作，直到你[续订](https://portal.nousresearch.com/manage-subscription)或通过 `hermes tools` 切换到直接 API 密钥。

### Gateway 可以与消息 Gateway 一起使用吗？

可以。Tool Gateway 路由工具 API 调用，无论你使用的是 CLI、Telegram、Discord 还是任何其他消息平台。它运行在工具运行时层面，而非入口层面。

### 包含 Modal 吗？

Modal（无服务器终端后端）通过 Nous 订阅作为可选附加功能提供。它不会由 Tool Gateway 提示启用 — 通过 `hermes setup terminal` 或在 `config.yaml` 中单独配置。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/tool-gateway)
