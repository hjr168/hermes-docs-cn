---
sidebar_position: 11
title: "使用 Cron 自动化一切"
description: "使用 Hermes Cron 的真实自动化模式 — 监控、报告、数据管道和多 Skill 工作流"
---

# 使用 Cron 自动化一切

[每日简报 Bot 教程](/docs/guides/daily-briefing-bot)涵盖了基础知识。本指南更进一步 — 五个你可以直接适配的真实自动化模式。

完整功能参考，参见[定时任务（Cron）](/docs/user-guide/features/cron)。

:::info 核心概念
Cron 任务在全新的 Agent 会话中运行，没有你当前聊天的记忆。提示必须**完全自包含** — 包含 Agent 需要知道的一切。
:::

---

## 模式 1：网站变更监控

监视一个 URL 的变化，仅在内容不同时收到通知。

`script` 参数是这里的秘密武器。Python 脚本在每次执行前运行，其标准输出成为 Agent 的上下文。脚本处理机械工作（抓取、比较）；Agent 处理推理（这个变更有意义吗？）。

创建监控脚本：

```bash
mkdir -p ~/.hermes/scripts
```

```python title="~/.hermes/scripts/watch-site.py"
import hashlib, json, os, urllib.request

URL = "https://example.com/pricing"
STATE_FILE = os.path.expanduser("~/.hermes/scripts/.watch-site-state.json")

# 抓取当前内容
req = urllib.request.Request(URL, headers={"User-Agent": "Hermes-Monitor/1.0"})
content = urllib.request.urlopen(req, timeout=30).read().decode()
current_hash = hashlib.sha256(content.encode()).hexdigest()

# 加载之前的状态
prev_hash = None
if os.path.exists(STATE_FILE):
    with open(STATE_FILE) as f:
        prev_hash = json.load(f).get("hash")

# 保存当前状态
with open(STATE_FILE, "w") as f:
    json.dump({"hash": current_hash, "url": URL}, f)

# 输出给 Agent
if prev_hash and prev_hash != current_hash:
    print(f"CHANGE DETECTED on {URL}")
    print(f"Previous hash: {prev_hash}")
    print(f"Current hash: {current_hash}")
    print(f"\nCurrent content (first 2000 chars):\n{content[:2000]}")
else:
    print("NO_CHANGE")
```

设置 Cron 任务：

```bash
/cron add "every 1h" "如果脚本输出显示 CHANGE DETECTED，总结页面发生了什么变化以及为什么重要。如果显示 NO_CHANGE，仅回复 [SILENT]。" --script ~/.hermes/scripts/watch-site.py --name "定价监控" --deliver telegram
```

:::tip [SILENT] 技巧
当 Agent 的最终响应包含 `[SILENT]` 时，投递会被抑制。这意味着你只在真正有事发生时才收到通知 — 安静时段无打扰。
:::

---

## 模式 2：每周报告

从多个来源汇总信息生成格式化摘要。每周运行一次并投递到你的主频道。

```bash
/cron add "0 9 * * 1" "生成一份每周报告，涵盖：

1. 搜索过去一周排名前 5 的 AI 新闻
2. 在 GitHub 上搜索 'machine-learning' 话题的热门仓库
3. 查看 Hacker News 上讨论最热烈的 AI/ML 帖子

按来源分节格式化为清晰的摘要。包含链接。
控制在 500 字以内 — 仅突出重点。" --name "每周 AI 摘要" --deliver telegram
```

从 CLI：

```bash
hermes cron create "0 9 * * 1" \
  "生成一份涵盖热门 AI 新闻、ML GitHub 热门仓库和 HN 热门讨论的每周报告。按来源分节，包含链接，控制在 500 字以内。" \
  --name "每周 AI 摘要" \
  --deliver telegram
```

`0 9 * * 1` 是标准 cron 表达式：每周一上午 9:00。

---

## 模式 3：GitHub 仓库监控

监视仓库的新 Issue、PR 或发布版本。

```bash
/cron add "every 6h" "检查 GitHub 仓库 NousResearch/hermes-agent 的：
- 过去 6 小时内新开的 Issue
- 过去 6 小时内新开或合并的 PR
- 任何新的 Release

使用终端运行 gh 命令：
  gh issue list --repo NousResearch/hermes-agent --state open --json number,title,author,createdAt --limit 10
  gh pr list --repo NousResearch/hermes-agent --state all --json number,title,author,createdAt,mergedAt --limit 10

仅筛选过去 6 小时的项目。如果没有新内容，回复 [SILENT]。
否则，提供活动的简洁摘要。" --name "仓库监控" --deliver discord
```

:::warning 自包含提示
注意提示中包含了确切的 `gh` 命令。Cron Agent 没有之前运行的记忆或你的偏好 — 把一切都写清楚。
:::

---

## 模式 4：数据收集管道

定时抓取数据、保存到文件并检测趋势。此模式结合脚本（用于收集）和 Agent（用于分析）。

```python title="~/.hermes/scripts/collect-prices.py"
import json, os, urllib.request
from datetime import datetime

DATA_DIR = os.path.expanduser("~/.hermes/data/prices")
os.makedirs(DATA_DIR, exist_ok=True)

# 抓取当前数据（示例：加密货币价格）
url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
data = json.loads(urllib.request.urlopen(url, timeout=30).read())

# 追加到历史文件
entry = {"timestamp": datetime.now().isoformat(), "prices": data}
history_file = os.path.join(DATA_DIR, "history.jsonl")
with open(history_file, "a") as f:
    f.write(json.dumps(entry) + "\n")

# 加载近期历史用于分析
lines = open(history_file).readlines()
recent = [json.loads(l) for l in lines[-24:]]  # 最近 24 个数据点

# 输出给 Agent
print(f"当前价格: BTC=${data['bitcoin']['usd']}, ETH=${data['ethereum']['usd']}")
print(f"已收集数据点: 共 {len(lines)} 个，显示最近 {len(recent)} 个")
print(f"\n近期历史:")
for r in recent[-6:]:
    print(f"  {r['timestamp']}: BTC=${r['prices']['bitcoin']['usd']}, ETH=${r['prices']['ethereum']['usd']}")
```

```bash
/cron add "every 1h" "分析脚本输出的价格数据。报告：
1. 当前价格
2. 最近 6 个数据点的趋势方向（上升/下降/平稳）
3. 任何显著波动（>5% 变化）

如果价格平稳且无显著变化，回复 [SILENT]。
如果有显著波动，解释发生了什么。" \
  --script ~/.hermes/scripts/collect-prices.py \
  --name "价格追踪" \
  --deliver telegram
```

脚本做机械收集；Agent 添加推理层。

---

## 模式 5：多 Skill 工作流

将 Skill 链接在一起完成复杂的定时任务。Skill 在提示执行前按顺序加载。

```bash
# 使用 arxiv Skill 搜索论文，然后用 obsidian Skill 保存笔记
/cron add "0 8 * * *" "在 arXiv 上搜索过去一天关于 'language model reasoning' 最有趣的 3 篇论文。为每篇论文创建 Obsidian 笔记，包含标题、作者、摘要总结和关键贡献。" \
  --skill arxiv \
  --skill obsidian \
  --name "论文摘要"
```

从工具直接调用：

```python
cronjob(
    action="create",
    skills=["arxiv", "obsidian"],
    prompt="在 arXiv 上搜索过去一天关于 'language model reasoning' 的论文。将前 3 篇保存为 Obsidian 笔记。",
    schedule="0 8 * * *",
    name="论文摘要",
    deliver="local"
)
```

Skill 按顺序加载 — 先 `arxiv`（教 Agent 如何搜索论文），然后 `obsidian`（教如何写笔记）。提示将它们串联在一起。

---

## 管理你的任务

```bash
# 列出所有活跃任务
/cron list

# 立即触发任务（用于测试）
/cron run <job_id>

# 暂停任务而不删除
/cron pause <job_id>

# 编辑正在运行的任务的计划或提示
/cron edit <job_id> --schedule "every 4h"
/cron edit <job_id> --prompt "更新的任务描述"

# 为现有任务添加或移除 Skill
/cron edit <job_id> --skill arxiv --skill obsidian
/cron edit <job_id> --clear-skills

# 永久移除任务
/cron remove <job_id>
```

---

## 投递目标

`--deliver` 标志控制结果发送到哪里：

| 目标 | 示例 | 使用场景 |
|--------|---------|----------|
| `origin` | `--deliver origin` | 创建任务的同一聊天（默认） |
| `local` | `--deliver local` | 仅保存到本地文件 |
| `telegram` | `--deliver telegram` | 你的 Telegram 主频道 |
| `discord` | `--deliver discord` | 你的 Discord 主频道 |
| `slack` | `--deliver slack` | 你的 Slack 主频道 |
| 指定聊天 | `--deliver telegram:-1001234567890` | 特定 Telegram 群 |
| 线程 | `--deliver telegram:-1001234567890:17585` | 特定 Telegram 话题线程 |

---

## 技巧

**让提示自包含。** Cron 任务中的 Agent 没有你对话的记忆。直接在提示中包含 URL、仓库名、格式偏好和投递说明。

**大量使用 `[SILENT]`。** 对于监控任务，始终包含类似"如果没有变化，回复 `[SILENT]`"的指令。这防止通知噪音。

**用脚本做数据收集。** `script` 参数让 Python 脚本处理无聊的部分（HTTP 请求、文件 I/O、状态追踪）。Agent 只看到脚本的标准输出并应用推理。这比让 Agent 自己去抓取更便宜也更可靠。

**用 `/cron run` 测试。** 在等待计划触发之前，用 `/cron run <job_id>` 立即执行并验证输出是否正确。

**计划表达式。** 支持的格式：相对延迟（`30m`）、间隔（`every 2h`）、标准 cron 表达式（`0 9 * * *`）和 ISO 时间戳（`2025-06-15T09:00:00`）。不支持自然语言如 `daily at 9am` — 改用 `0 9 * * *`。

---

*完整 Cron 参考 — 所有参数、边界情况和内部机制 — 见[定时任务（Cron）](/docs/user-guide/features/cron)。*

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/automate-with-cron)
