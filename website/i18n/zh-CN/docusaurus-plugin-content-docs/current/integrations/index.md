---
title: "集成"
sidebar_label: "概览"
sidebar_position: 0
---

# 集成

Hermes Agent 连接外部系统用于 AI 推理（Inference）、工具服务器、IDE 工作流、编程访问等。这些集成扩展了 Hermes 的能力和运行环境。

## AI 提供商与路由

Hermes 开箱即支持多种 AI 推理提供商。使用 `hermes model` 交互式配置，或在 `config.yaml` 中直接设置。

- **[AI 提供商](/docs/user-guide/features/provider-routing)** — OpenRouter、Anthropic、OpenAI、Google 及任何 OpenAI 兼容端点。Hermes 自动检测每个提供商的能力，如视觉、流式传输和工具使用。
- **[提供商路由](/docs/user-guide/features/provider-routing)** — 细粒度控制哪些底层提供商处理你的 OpenRouter 请求。通过排序、白名单、黑名单和显式优先级排序来优化成本、速度或质量。
- **[后备提供商](/docs/user-guide/features/fallback-providers)** — 当主模型遇到错误时自动故障转移到备用 LLM 提供商。包括主模型后备和独立的辅助任务后备（用于视觉、压缩和网页提取）。

## 工具服务器（MCP）

- **[MCP 服务器](/docs/user-guide/features/mcp)** — 通过 Model Context Protocol（模型上下文协议）连接 Hermes 到外部工具服务器。无需编写原生 Hermes 工具即可访问 GitHub、数据库、文件系统、浏览器栈、内部 API 等工具。支持 stdio 和 SSE 传输，每服务器工具过滤，以及能力感知的资源/提示注册。

## 网页搜索后端

`web_search` 和 `web_extract` 工具支持四个后端提供商，通过 `config.yaml` 或 `hermes tools` 配置：

| 后端 | 环境变量 | 搜索 | 提取 | 爬取 |
|------|----------|------|------|------|
| **Firecrawl**（默认） | `FIRECRAWL_API_KEY` | ✔ | ✔ | ✔ |
| **Parallel** | `PARALLEL_API_KEY` | ✔ | ✔ | — |
| **Tavily** | `TAVILY_API_KEY` | ✔ | ✔ | ✔ |
| **Exa** | `EXA_API_KEY` | ✔ | ✔ | — |

快速设置示例：

```yaml
web:
  backend: firecrawl    # firecrawl | parallel | tavily | exa
```

如果未设置 `web.backend`，后端会从可用的 API 密钥自动检测。自托管 Firecrawl 也通过 `FIRECRAWL_API_URL` 支持。

## 浏览器自动化

Hermes 包含完整的浏览器自动化功能，提供多种后端选项用于导航网站、填写表单和提取信息：

- **Browserbase** — 托管云浏览器，具有反机器人工具、CAPTCHA 解决和住宅代理
- **Browser Use** — 替代云浏览器提供商
- **通过 CDP 连接本地 Chrome** — 使用 `/browser connect` 连接到运行中的 Chrome 实例
- **本地 Chromium** — 通过 `agent-browser` CLI 的无头本地浏览器

详见[浏览器自动化](/docs/user-guide/features/browser)了解设置和使用方法。

## 语音与 TTS 提供商

跨所有消息平台的文本转语音（TTS，Text-to-Speech）和语音转文本：

| 提供商 | 质量 | 费用 | API 密钥 |
|--------|------|------|----------|
| **Edge TTS**（默认） | 良好 | 免费 | 无需 |
| **ElevenLabs** | 优秀 | 付费 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良好 | 付费 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax** | 良好 | 付费 | `MINIMAX_API_KEY` |
| **NeuTTS** | 良好 | 免费 | 无需 |

语音转文本支持三个提供商：本地 Whisper（免费，在设备上运行）、Groq（快速云端）和 OpenAI Whisper API。语音消息转录支持 Telegram、Discord、WhatsApp 和其他消息平台。详见[语音与 TTS](/docs/user-guide/features/tts) 和[语音模式](/docs/user-guide/features/voice-mode)了解详情。

## IDE 与编辑器集成

- **[IDE 集成（ACP）](/docs/user-guide/features/acp)** — 在兼容 ACP 的编辑器（如 VS Code、Zed 和 JetBrains）中使用 Hermes Agent。Hermes 作为 ACP 服务器运行，在编辑器内渲染聊天消息、工具活动、文件差异和终端命令。

## 编程访问

- **[API 服务器](/docs/user-guide/features/api-server)** — 将 Hermes 暴露为 OpenAI 兼容的 HTTP 端点。任何使用 OpenAI 格式的前端 — Open WebUI、LobeChat、LibreChat、NextChat、ChatBox — 都可以连接并使用 Hermes 作为后端，享受其完整工具集。

## 记忆与个性化

- **[内置记忆](/docs/user-guide/features/memory)** — 通过 `MEMORY.md` 和 `USER.md` 文件实现持久化、精心管理的记忆。Agent 维护有界的个人笔记和用户档案数据存储，跨会话持久保存。
- **[记忆提供商](/docs/user-guide/features/memory-providers)** — 接入外部记忆后端以实现更深层个性化。支持七个提供商：Honcho（辩证推理）、OpenViking（分层检索）、Mem0（云端提取）、Hindsight（知识图谱）、Holographic（本地 SQLite）、RetainDB（混合搜索）和 ByteRover（基于 CLI）。

## 消息平台

Hermes 作为网关机器人在 15+ 消息平台上运行，全部通过相同的 `gateway` 子系统配置：

- **[Telegram](/docs/user-guide/messaging/telegram)**、**[Discord](/docs/user-guide/messaging/discord)**、**[Slack](/docs/user-guide/messaging/slack)**、**[WhatsApp](/docs/user-guide/messaging/whatsapp)**、**[Signal](/docs/user-guide/messaging/signal)**、**[Matrix](/docs/user-guide/messaging/matrix)**、**[Mattermost](/docs/user-guide/messaging/mattermost)**、**[Email](/docs/user-guide/messaging/email)**、**[SMS](/docs/user-guide/messaging/sms)**、**[钉钉](/docs/user-guide/messaging/dingtalk)**、**[飞书](/docs/user-guide/messaging/feishu)**、**[企业微信](/docs/user-guide/messaging/wecom)**、**[企业微信回调](/docs/user-guide/messaging/wecom-callback)**、**[微信](/docs/user-guide/messaging/weixin)**、**[BlueBubbles](/docs/user-guide/messaging/bluebubbles)**、**[QQ 机器人](/docs/user-guide/messaging/qqbot)**、**[Home Assistant](/docs/user-guide/messaging/homeassistant)**、**[Webhooks](/docs/user-guide/messaging/webhooks)**

详见[消息网关概览](/docs/user-guide/messaging)了解平台对比表和设置指南。

## 智能家居

- **[Home Assistant](/docs/user-guide/messaging/homeassistant)** — 通过四个专用工具（`ha_list_entities`、`ha_get_state`、`ha_list_services`、`ha_call_service`）控制智能家居设备。配置 `HASS_TOKEN` 后 Home Assistant 工具集会自动激活。

## 插件

- **[插件系统](/docs/user-guide/features/plugins)** — 无需修改核心代码即可使用自定义工具、生命周期钩子和 CLI 命令扩展 Hermes。插件从 `~/.hermes/plugins/`、项目本地 `.hermes/plugins/` 和 pip 安装的入口点发现。
- **[构建插件](/docs/guides/build-a-hermes-plugin)** — 创建具有工具、钩子和 CLI 命令的 Hermes 插件的分步指南。

## 训练与评估

- **[RL 训练](/docs/user-guide/features/rl-training)** — 从 Agent 会话生成轨迹数据，用于强化学习和模型微调。支持带有可自定义奖励函数的 Atropos 环境。
- **[批处理](/docs/user-guide/features/batch-processing)** — 跨数百个提示并行运行 Agent，生成结构化的 ShareGPT 格式轨迹数据，用于训练数据生成或评估。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/integrations/index)
