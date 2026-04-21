---
slug: /
sidebar_position: 0
title: "Hermes Agent 文档"
description: "由 Nous Research 打造的自我进化 AI Agent。内置学习循环，从经验中创建 Skill，在使用中不断改进，并在跨会话中持久记忆。"
hide_table_of_contents: true
displayed_sidebar: docs
---

# Hermes Agent

由 [Nous Research](https://nousresearch.com) 打造的自我进化 AI Agent。它是唯一内置学习循环的 Agent —— 从经验中创建 Skill，在使用中不断改进，主动将知识持久化，并在跨会话中逐步构建对你的深度理解。

<div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
  <a href="/getting-started/installation" style={{display: 'inline-block', padding: '0.6rem 1.2rem', backgroundColor: '#FFD700', color: '#07070d', borderRadius: '8px', fontWeight: 600, textDecoration: 'none'}}>开始使用 →</a>
  <a href="https://github.com/NousResearch/hermes-agent" style={{display: 'inline-block', padding: '0.6rem 1.2rem', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '8px', textDecoration: 'none'}}>在 GitHub 上查看</a>
</div>

## 什么是 Hermes Agent？

它不是绑定在 IDE 上的编程副驾驶，也不是套了个 API 的聊天机器人。它是一个**自主 Agent（智能体）**，运行时间越长能力越强。你可以把它部署在任何地方 —— 一台 5 美元的 VPS、一个 GPU 集群，或者是空闲时几乎不花钱的 Serverless 基础设施（Daytona、Modal）。你可以在 Telegram 上跟它对话，而它在你从未 SSH 登录过的云虚拟机上工作。它不依赖你的笔记本。

## 快速链接

| | |
|---|---|
| 🚀 **[安装](/docs/getting-started/installation)** | 60 秒内在 Linux、macOS 或 WSL2 上完成安装 |
| 📖 **[快速入门教程](/docs/getting-started/quickstart)** | 你的第一次对话及值得尝试的核心功能 |
| 🗺️ **[学习路径](/docs/getting-started/learning-path)** | 根据你的经验水平找到合适的文档 |
| ⚙️ **[配置](/docs/user-guide/configuration)** | 配置文件、Provider（提供商）、模型和选项 |
| 💬 **[消息网关](/docs/user-guide/messaging)** | 设置 Telegram、Discord、Slack 或 WhatsApp |
| 🔧 **[工具与工具集](/docs/user-guide/features/tools)** | 47 个内置工具及配置方法 |
| 🧠 **[记忆系统](/docs/user-guide/features/memory)** | 跨会话持续增长的持久化记忆 |
| 📚 **[Skill 系统](/docs/user-guide/features/skills)** | Agent 创建并复用的程序性记忆 |
| 🔌 **[MCP 集成](/docs/user-guide/features/mcp)** | 连接 MCP Server，过滤其工具，安全地扩展 Hermes |
| 🧭 **[在 Hermes 中使用 MCP](/docs/guides/use-mcp-with-hermes)** | 实用的 MCP 配置模式、示例和教程 |
| 🎙️ **[语音模式](/docs/user-guide/features/voice-mode)** | 在 CLI、Telegram、Discord 和 Discord 语音频道中的实时语音交互 |
| 🗣️ **[在 Hermes 中使用语音模式](/docs/guides/use-voice-mode-with-hermes)** | Hermes 语音工作流的上手配置和使用模式 |
| 🎭 **[个性与 SOUL.md](/docs/user-guide/features/personality)** | 通过全局 SOUL.md 定义 Hermes 的默认风格 |
| 📄 **[上下文文件](/docs/user-guide/features/context-files)** | 塑造每次对话的项目上下文文件 |
| 🔒 **[安全](/docs/user-guide/security)** | 命令审批、授权、容器隔离 |
| 💡 **[技巧与最佳实践](/docs/guides/tips)** | 充分发挥 Hermes 的快速上手建议 |
| 🏗️ **[架构](/docs/developer-guide/architecture)** | 底层工作原理 |
| ❓ **[常见问题与排障](/docs/reference/faq)** | 常见问题及解决方案 |

## 核心特性

- **闭环学习** —— Agent 策展的记忆配合周期性提醒，自主创建 Skill，使用中自我改进，FTS5（全文搜索）跨会话召回配合 LLM 摘要，以及 [Honcho](https://github.com/plastic-labs/honcho) 辩证式用户建模
- **随处运行，不只是你的笔记本** —— 6 种终端后端：本地、Docker、SSH、Daytona、Singularity、Modal。Daytona 和 Modal 提供 Serverless 持久化 —— 空闲时环境自动休眠，几乎不产生费用
- **活在你所在的地方** —— CLI、Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost、Email、SMS、钉钉、飞书、企业微信、BlueBubbles、Home Assistant —— 一个网关覆盖 15+ 平台
- **由模型训练者打造** —— 由 [Nous Research](https://nousresearch.com) 创建，该实验室是 Hermes、Nomos 和 Psyche 背后的团队。支持 [Nous Portal](https://portal.nousresearch.com)、[OpenRouter](https://openrouter.ai)、OpenAI 或任何兼容端点
- **定时自动化** —— 内置 Cron 支持，可推送到任何平台
- **委派与并行** —— 生成隔离的子 Agent 处理并行工作流。通过 `execute_code` 的编程式 Tool Calling（工具调用）可将多步管道压缩为单次推理调用
- **开放标准 Skill** —— 兼容 [agentskills.io](https://agentskills.io)。Skill 可移植、可分享，并通过 Skills Hub 由社区贡献
- **完整的 Web 控制能力** —— 搜索、提取、浏览、视觉、图像生成、TTS（文本转语音）
- **MCP 支持** —— 连接任何 MCP Server 以扩展工具能力
- **研究就绪** —— 批量处理、轨迹导出、配合 Atropos 进行 RL（强化学习）训练。由 [Nous Research](https://nousresearch.com) 构建 —— Hermes、Nomos 和 Psyche 模型背后的实验室

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/index)
