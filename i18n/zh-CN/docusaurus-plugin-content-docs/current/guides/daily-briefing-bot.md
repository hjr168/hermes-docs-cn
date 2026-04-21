---
sidebar_position: 3
title: "教程：每日简报 Bot"
description: "构建一个自动化每日简报 Bot，研究话题、总结发现，并每天早上投递到 Telegram 或 Discord"
---

# 教程：构建每日简报 Bot

在本教程中，你将构建一个个人简报 Bot，它每天早上自动醒来，研究你关心的话题，总结发现，并将简洁的简报直接发送到你的 Telegram 或 Discord。

完成后，你将拥有一个结合**Web 搜索**、**Cron 调度**、**委托（Delegation）**和**消息投递**的全自动工作流 — 无需编写代码。

## 我们要构建什么

流程如下：

1. **早上 8:00** — Cron 调度器触发你的任务
2. **Hermes 启动**一个带有你提示的新 Agent 会话
3. **Web 搜索**拉取你话题的最新新闻
4. **总结**将内容提炼为简洁的简报格式
5. **投递**将简报发送到你的 Telegram 或 Discord

整个过程无需手动干预。你只需要在喝晨间咖啡时阅读简报。

## 前提条件

开始之前，确保你有：

- **已安装 Hermes Agent** — 参见[安装指南](/docs/getting-started/installation)
- **Gateway 正在运行** — Gateway 守护进程处理 Cron 执行：
  ```bash
  hermes gateway install   # 安装为用户服务
  sudo hermes gateway install --system   # Linux 服务器：开机系统服务
  # 或
  hermes gateway           # 前台运行
  ```
- **Firecrawl API Key** — 在环境中设置 `FIRECRAWL_API_KEY` 用于 Web 搜索
- **已配置消息平台**（可选但推荐）— [Telegram](/docs/user-guide/messaging/telegram) 或 Discord 已设置主频道

:::tip 没有消息平台？没问题
你仍然可以使用 `deliver: "local"` 跟随本教程。简报会保存到 `~/.hermes/cron/output/`，你可以随时阅读。
:::

## 第 1 步：手动测试工作流

在自动化之前，先确保简报能正常工作。启动聊天会话：

```bash
hermes
```

然后输入这个提示：

```
搜索关于 AI Agent 和开源 LLM 的最新新闻。
用简洁的简报格式总结排名前 3 的故事并附链接。
```

Hermes 会搜索 Web、阅读结果，并生成类似这样的内容：

```
☀️ 你的 AI 简报 — 2026 年 3 月 8 日

1. Qwen 3 发布 235B 参数模型
   阿里巴巴最新的开放权重模型在多项基准上匹配 GPT-4.5，
   同时保持完全开源。
   → https://qwenlm.github.io/blog/qwen3/

2. LangChain 发布 Agent 协议标准
   一个新的 Agent 间通信开放标准在首周就获得
   15 个主要框架的采用。
   → https://blog.langchain.dev/agent-protocol/

3. EU AI Act 通用模型执行开始
   首批合规截止日期到来，开源模型在 10M 参数
   阈值下获得豁免。
   → https://artificialintelligenceact.eu/updates/

---
3 个故事 • 搜索来源：8 个 • 由 Hermes Agent 生成
```

如果这能工作，你就可以自动化它了。

:::tip 迭代格式
尝试不同的提示直到你得到满意的输出。添加指令如"使用 emoji 标题"或"每个摘要控制在 2 句话以内"。你最终确定的内容将放入 Cron 任务。
:::

## 第 2 步：创建 Cron 任务

现在让这个每天早上自动运行。你可以用两种方式创建。

### 方案 A：自然语言（在聊天中）

直接告诉 Hermes 你想要什么：

```
每天早上 8 点，搜索 Web 获取关于 AI Agent
和开源 LLM 的最新新闻。用简洁的简报总结排名前 3 的故事
并附链接。使用友好、专业的语气。投递到 telegram。
```

Hermes 会使用统一的 `cronjob` 工具为你创建 Cron 任务。

### 方案 B：CLI 斜杠命令

使用 `/cron` 命令获得更多控制：

```
/cron add "0 8 * * *" "搜索 Web 获取关于 AI Agent 和开源 LLM 的最新新闻。找到至少 5 篇过去 24 小时的文章。用简洁的每日简报格式总结最重要的 3 个故事。每个故事包含：清晰的标题、2 句话摘要和来源 URL。使用友好、专业的语气。用 emoji 项目符号格式化，结尾附故事总数。"
```

### 黄金法则：自包含提示

:::warning 关键概念
Cron 任务在**全新的会话**中运行 — 没有你之前对话的记忆，没有你"之前设置过"的上下文。你的提示必须包含 Agent 完成工作所需的**一切**。
:::

**差的提示：**
```
做我平时的早间简报。
```

**好的提示：**
```
搜索 Web 获取关于 AI Agent 和开源 LLM 的最新新闻。
找到至少 5 篇过去 24 小时的文章。用简洁的每日简报格式
总结最重要的 3 个故事。每个故事包含：清晰的标题、
2 句话摘要和来源 URL。使用友好、专业的语气。
用 emoji 项目符号格式化。
```

好的提示具体说明了**搜索什么**、**多少篇文章**、**什么格式**和**什么语气**。这是 Agent 一次性需要的所有信息。

## 第 3 步：自定义简报

基本简报能工作后，你可以发挥创意。

### 多话题简报

在一份简报中覆盖多个领域：

```
/cron add "0 8 * * *" "创建一份涵盖三个话题的早间简报。对于每个话题，搜索过去 24 小时的最新新闻并用链接总结排名前 2 的故事。

话题：
1. AI 和机器学习 — 关注开源模型和 Agent 框架
2. 加密货币 — 关注比特币、以太坊和监管新闻
3. 太空探索 — 关注 SpaceX、NASA 和商业太空

格式化为带章节标题和 emoji 的清晰简报。结尾附今天日期和一句励志名言。"
```

### 使用委托进行并行研究

为了更快的简报，告诉 Hermes 将每个话题委托给子 Agent：

```
/cron add "0 8 * * *" "通过将研究委托给子 Agent 来创建早间简报。委托三个并行任务：

1. 委托：搜索过去 24 小时排名前 2 的 AI/ML 新闻故事并附链接
2. 委托：搜索过去 24 小时排名前 2 的加密货币新闻故事并附链接
3. 委托：搜索过去 24 小时排名前 2 的太空探索新闻故事并附链接

收集所有结果并合并为一份带章节标题、emoji 格式和来源链接的清晰简报。添加今天日期作为标题。"
```

每个子 Agent 独立且并行搜索，然后主 Agent 将所有内容合并为一份精美的简报。参见[委托文档](/docs/user-guide/features/delegation)了解更多工作原理。

### 仅工作日计划

周末不需要简报？使用针对周一到周五的 cron 表达式：

```
/cron add "0 8 * * 1-5" "搜索最新的 AI 和科技新闻..."
```

### 每日两次简报

获取早上概览和晚间回顾：

```
/cron add "0 8 * * *" "早间简报：搜索过去 12 小时的 AI 新闻..."
/cron add "0 18 * * *" "晚间回顾：搜索过去 12 小时的 AI 新闻..."
```

### 用记忆添加个人上下文

如果你启用了[记忆](/docs/user-guide/features/memory)，你可以存储跨会话持久化的偏好。但记住 — Cron 任务在全新会话中运行，没有对话记忆。要添加个人上下文，直接将它嵌入提示中：

```
/cron add "0 8 * * *" "你正在为一位高级 ML 工程师创建简报，他关心：PyTorch 生态、Transformer 架构、开放权重模型和欧盟 AI 监管。跳过产品发布或融资新闻，除非涉及开源。

搜索这些话题的最新新闻。用链接总结排名前 3 的故事。简洁且技术化 — 这位读者不需要基础解释。"
```

:::tip 定制角色
包含简报是*为谁*准备的细节会显著提高相关性。告诉 Agent 你的角色、兴趣和要跳过的内容。
:::

## 第 4 步：管理你的任务

### 列出所有计划任务

在聊天中：
```
/cron list
```

或从终端：
```bash
hermes cron list
```

你会看到类似输出：

```
ID          | 名称              | 计划        | 下次运行           | 投递
------------|-------------------|-------------|--------------------|--------
a1b2c3d4    | Morning Briefing  | 0 8 * * *   | 2026-03-09 08:00   | telegram
e5f6g7h8    | Evening Recap     | 0 18 * * *  | 2026-03-08 18:00   | telegram
```

### 移除任务

在聊天中：
```
/cron remove a1b2c3d4
```

或对话式请求：
```
移除我的早间简报 Cron 任务。
```

Hermes 会使用 `cronjob(action="list")` 找到它，然后用 `cronjob(action="remove")` 删除。

### 检查 Gateway 状态

确保调度器确实在运行：

```bash
hermes cron status
```

如果 Gateway 没在运行，你的任务不会执行。将其安装为后台服务以确保可靠性：

```bash
hermes gateway install
# 或在 Linux 服务器上
sudo hermes gateway install --system
```

## 进一步探索

你已经构建了一个可工作的每日简报 Bot。以下是一些可以探索的方向：

- **[定时任务（Cron）](/docs/user-guide/features/cron)** — 计划格式、重复限制和投递选项的完整参考
- **[委托（Delegation）](/docs/user-guide/features/delegation)** — 并行子 Agent 工作流的深入探讨
- **[消息平台](/docs/user-guide/messaging)** — 设置 Telegram、Discord 或其他投递目标
- **[记忆（Memory）](/docs/user-guide/features/memory)** — 跨会话的持久上下文
- **[技巧与最佳实践](/docs/guides/tips)** — 更多提示工程建议

:::tip 还能计划什么？
简报 Bot 模式适用于任何场景：竞争对手监控、GitHub 仓库摘要、天气预报、投资组合追踪、服务器健康检查，甚至每日笑话。如果你能用提示描述它，你就能计划它。
:::

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/daily-briefing-bot)
