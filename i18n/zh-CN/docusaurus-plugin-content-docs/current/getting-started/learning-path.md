---
sidebar_position: 3
title: '学习路径'
description: '根据你的经验水平和目标，选择适合你的 Hermes Agent 文档学习路径。'
---

# 学习路径

Hermes Agent 功能丰富 —— CLI 助手、Telegram/Discord 机器人、任务自动化、RL（强化学习）训练等等。本页帮你根据经验水平和目标，找到合适的起点和阅读顺序。

:::tip 从这里开始
如果你还没有安装 Hermes Agent，先看[安装指南](/docs/getting-started/installation)，然后跑一遍[快速开始](/docs/getting-started/quickstart)。以下内容假设你已经有一个可用的安装。
:::

## 如何使用本页

- **清楚自己的水平？** 直接跳到[经验等级表](#by-experience-level)，按你所在层级的阅读顺序进行。
- **有明确目标？** 跳到[按使用场景](#by-use-case)，找到匹配的场景。
- **随便看看？** 查看[核心功能一览](#key-features-at-a-glance)表格，快速了解 Hermes Agent 能做什么。

## 按经验等级 {#by-experience-level}

| 等级 | 目标 | 推荐阅读 | 预估时间 |
|---|---|---|---|
| **入门** | 跑起来，进行基本对话，使用内置工具 | [安装](/docs/getting-started/installation) → [快速开始](/docs/getting-started/quickstart) → [CLI 使用](/docs/user-guide/cli) → [配置](/docs/user-guide/configuration) | 约 1 小时 |
| **中级** | 搭建消息机器人，使用记忆、Cron（定时任务）、Skills 等高级功能 | [会话](/docs/user-guide/sessions) → [消息平台](/docs/user-guide/messaging) → [工具](/docs/user-guide/features/tools) → [Skills](/docs/user-guide/features/skills) → [记忆](/docs/user-guide/features/memory) → [Cron](/docs/user-guide/features/cron) | 约 2-3 小时 |
| **高级** | 开发自定义工具、创建 Skill、用 RL 训练模型、贡献代码 | [架构](/docs/developer-guide/architecture) → [添加工具](/docs/developer-guide/adding-tools) → [创建 Skill](/docs/developer-guide/creating-skills) → [RL 训练](/docs/user-guide/features/rl-training) → [贡献指南](/docs/developer-guide/contributing) | 约 4-6 小时 |

## 按使用场景 {#by-use-case}

选择与你目标匹配的场景，每个场景按你应该阅读的顺序列出了相关文档。

### "我想用 CLI 编程助手"

将 Hermes Agent 用作交互式终端助手，辅助编写、审查和运行代码。

1. [安装](/docs/getting-started/installation)
2. [快速开始](/docs/getting-started/quickstart)
3. [CLI 使用](/docs/user-guide/cli)
4. [代码执行](/docs/user-guide/features/code-execution)
5. [上下文文件](/docs/user-guide/features/context-files)
6. [技巧与窍门](/docs/guides/tips)

:::tip
通过上下文文件直接将文件传入对话。Hermes Agent 可以读取、编辑和运行你项目中的代码。
:::

### "我想搭建 Telegram/Discord 机器人"

将 Hermes Agent 部署为你喜爱的消息平台上的机器人。

1. [安装](/docs/getting-started/installation)
2. [配置](/docs/user-guide/configuration)
3. [消息平台概览](/docs/user-guide/messaging)
4. [Telegram 配置](/docs/user-guide/messaging/telegram)
5. [Discord 配置](/docs/user-guide/messaging/discord)
6. [语音模式](/docs/user-guide/features/voice-mode)
7. [使用 Hermes 语音模式](/docs/guides/use-voice-mode-with-hermes)
8. [安全](/docs/user-guide/security)

完整项目示例：
- [每日简报机器人](/docs/guides/daily-briefing-bot)
- [团队 Telegram 助手](/docs/guides/team-telegram-assistant)

### "我想自动化任务"

安排定时任务、运行批量作业，或将 Agent 操作串联起来。

1. [快速开始](/docs/getting-started/quickstart)
2. [Cron 定时任务](/docs/user-guide/features/cron)
3. [批处理](/docs/user-guide/features/batch-processing)
4. [委派](/docs/user-guide/features/delegation)
5. [Hooks（钩子）](/docs/user-guide/features/hooks)

:::tip
Cron 任务让 Hermes Agent 按计划执行任务 —— 每日摘要、定期检查、自动报告 —— 无需你时刻关注。
:::

### "我想开发自定义工具/Skill"

用你自己的工具和可复用的 Skill 包扩展 Hermes Agent。

1. [工具概览](/docs/user-guide/features/tools)
2. [Skill 概览](/docs/user-guide/features/skills)
3. [MCP（Model Context Protocol，模型上下文协议）](/docs/user-guide/features/mcp)
4. [架构](/docs/developer-guide/architecture)
5. [添加工具](/docs/developer-guide/adding-tools)
6. [创建 Skill](/docs/developer-guide/creating-skills)

:::tip
工具（Tool）是 Agent 可以调用的单个函数。Skill（技能）是工具、提示词和配置的打包组合。建议先从工具入手，再进阶到 Skill。
:::

### "我想训练模型"

使用强化学习通过 Hermes Agent 内置的 RL 训练管线微调模型行为。

1. [快速开始](/docs/getting-started/quickstart)
2. [配置](/docs/user-guide/configuration)
3. [RL 训练](/docs/user-guide/features/rl-training)
4. [提供商路由](/docs/user-guide/features/provider-routing)
5. [架构](/docs/developer-guide/architecture)

:::tip
RL 训练在你已经了解 Hermes Agent 如何处理对话和工具调用的基础知识后效果最好。如果你是新手，建议先走完入门路径。
:::

### "我想当 Python 库用"

将 Hermes Agent 以编程方式集成到你自己的 Python 应用中。

1. [安装](/docs/getting-started/installation)
2. [快速开始](/docs/getting-started/quickstart)
3. [Python 库指南](/docs/guides/python-library)
4. [架构](/docs/developer-guide/architecture)
5. [工具](/docs/user-guide/features/tools)
6. [会话](/docs/user-guide/sessions)

## 核心功能一览 {#key-features-at-a-glance}

不清楚有哪些功能？这里是主要功能的快速目录：

| 功能 | 作用 | 链接 |
|---|---|---|
| **工具** | Agent 可调用的内置工具（文件读写、搜索、Shell 等） | [工具](/docs/user-guide/features/tools) |
| **Skills** | 可安装的插件包，添加新能力 | [Skills](/docs/user-guide/features/skills) |
| **记忆** | 跨会话的持久化记忆 | [记忆](/docs/user-guide/features/memory) |
| **上下文文件** | 将文件和目录传入对话 | [上下文文件](/docs/user-guide/features/context-files) |
| **MCP** | 通过 Model Context Protocol 连接外部工具服务器 | [MCP](/docs/user-guide/features/mcp) |
| **Cron** | 安排定时执行的 Agent 任务 | [Cron](/docs/user-guide/features/cron) |
| **委派** | 生成子 Agent 并行工作 | [委派](/docs/user-guide/features/delegation) |
| **代码执行** | 运行调用 Hermes 工具的 Python 脚本 | [代码执行](/docs/user-guide/features/code-execution) |
| **浏览器** | 网页浏览和信息抓取 | [浏览器](/docs/user-guide/features/browser) |
| **Hooks** | 事件驱动的回调和中间件 | [Hooks](/docs/user-guide/features/hooks) |
| **批处理** | 批量处理多个输入 | [批处理](/docs/user-guide/features/batch-processing) |
| **RL 训练** | 用强化学习微调模型 | [RL 训练](/docs/user-guide/features/rl-training) |
| **提供商路由** | 跨多个 LLM 提供商路由请求 | [提供商路由](/docs/user-guide/features/provider-routing) |

## 接下来读什么

根据你目前的进度：

- **刚安装完？** → 进入[快速开始](/docs/getting-started/quickstart)，跑通你的第一次对话。
- **完成了快速开始？** → 阅读 [CLI 使用](/docs/user-guide/cli)和[配置](/docs/user-guide/configuration)来个性化你的设置。
- **基础已经上手？** → 探索[工具](/docs/user-guide/features/tools)、[Skills](/docs/user-guide/features/skills)和[记忆](/docs/user-guide/features/memory)，解锁 Agent 的全部能力。
- **要给团队部署？** → 阅读[安全](/docs/user-guide/security)和[会话](/docs/user-guide/sessions)，了解访问控制和对话管理。
- **准备开发？** → 进入[开发者指南](/docs/developer-guide/architecture)，理解内部架构并开始贡献代码。
- **想要实际案例？** → 查看[指南](/docs/guides/tips)板块中的真实项目示例和技巧。

:::tip
你不需要读完所有内容。选择与你目标匹配的路径，按顺序跟着链接走，很快就能上手。随时可以回到本页找到你的下一步。
:::

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/getting-started/learning-path)
