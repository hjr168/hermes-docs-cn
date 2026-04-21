---
sidebar_position: 10
title: "教程：GitHub PR Review Agent"
description: "构建一个自动化 AI 代码审查器，监控你的仓库、审查 Pull Request 并交付反馈 — 全自动"
---

# 教程：构建 GitHub PR Review Agent

**问题：** 你的团队开 PR 的速度比你审查的速度还快。PR 等待审查要花好几天。初级开发者因为没人有时间检查而合并了有 bug 的代码。你每天早上都在追赶 diff 而不是构建产品。

**解决方案：** 一个全天候监控你的仓库的 AI Agent，审查每一个新 PR 的 bug、安全问题和代码质量，然后给你发摘要 — 这样你只需要花时间在真正需要人工判断的 PR 上。

**你将构建的内容：**

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│   Cron 定时器  ──▶  Hermes Agent  ──▶  GitHub API  ──▶  审查       │
│   (每 2 小时)       + gh CLI           (PR diff)       投递        │
│                    + Skill                             (Telegram, │
│                    + Memory                            Discord,   │
│                                                        本地)      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

本指南使用 **Cron（定时任务）** 来按计划轮询 PR — 无需服务器或公共端点。可在 NAT 和防火墙后运行。

:::tip 想要实时审查？
如果你有公共端点可用，请查看[通过 Webhook 自动化 GitHub PR 评论](./webhook-github-pr-review.md) — GitHub 在 PR 被打开或更新时即时推送事件给 Hermes。
:::

---

## 前提条件

- **Hermes Agent 已安装** — 参见[安装指南](/docs/getting-started/installation)
- **Gateway 运行中** 用于 Cron 任务：
  ```bash
  hermes gateway install   # 安装为服务
  # 或
  hermes gateway           # 前台运行
  ```
- **GitHub CLI（`gh`）已安装并认证**：
  ```bash
  # 安装
  brew install gh        # macOS
  sudo apt install gh    # Ubuntu/Debian

  # 认证
  gh auth login
  ```
- **消息平台已配置**（可选）— [Telegram](/docs/user-guide/messaging/telegram) 或 [Discord](/docs/user-guide/messaging/discord)

:::tip 没有消息平台？没问题
使用 `deliver: "local"` 将审查结果保存到 `~/.hermes/cron/output/`。非常适合在接入通知前进行测试。
:::

---

## 第 1 步：验证设置

确保 Hermes 可以访问 GitHub。开始一个聊天：

```bash
hermes
```

用一个简单命令测试：

```
Run: gh pr list --repo NousResearch/hermes-agent --state open --limit 3
```

你应该看到一个打开的 PR 列表。如果这能工作，你就准备好了。

---

## 第 2 步：试一次手动审查

仍在聊天中，让 Hermes 审查一个真实的 PR：

```
Review this pull request. Read the diff, check for bugs, security issues,
and code quality. Be specific about line numbers and quote problematic code.

Run: gh pr diff 3888 --repo NousResearch/hermes-agent
```

Hermes 会：
1. 执行 `gh pr diff` 获取代码变更
2. 阅读整个 diff
3. 生成结构化的审查，包含具体的发现

如果你对质量满意，就可以自动化了。

---

## 第 3 步：创建审查 Skill

Skill 为 Hermes 提供一致的审查指南，在会话和 Cron 运行之间持久化。没有它，审查质量会有波动。

```bash
mkdir -p ~/.hermes/skills/code-review
```

创建 `~/.hermes/skills/code-review/SKILL.md`：

```markdown
---
name: code-review
description: Review pull requests for bugs, security issues, and code quality
---

# Code Review Guidelines

When reviewing a pull request:

## What to Check
1. **Bugs** — Logic errors, off-by-one, null/undefined handling
2. **Security** — Injection, auth bypass, secrets in code, SSRF
3. **Performance** — N+1 queries, unbounded loops, memory leaks
4. **Style** — Naming conventions, dead code, missing error handling
5. **Tests** — Are changes tested? Do tests cover edge cases?

## Output Format
For each finding:
- **File:Line** — exact location
- **Severity** — Critical / Warning / Suggestion
- **What's wrong** — one sentence
- **Fix** — how to fix it

## Rules
- Be specific. Quote the problematic code.
- Don't flag style nitpicks unless they affect readability.
- If the PR looks good, say so. Don't invent problems.
- End with: APPROVE / REQUEST_CHANGES / COMMENT
```

验证它已加载 — 启动 `hermes`，你应该在启动时的 Skill 列表中看到 `code-review`。

---

## 第 4 步：教它你的团队规范

这是让审查器真正有用的关键。开始一个会话，教 Hermes 你团队的标准：

```
Remember: In our backend repo, we use Python with FastAPI.
All endpoints must have type annotations and Pydantic models.
We don't allow raw SQL — only SQLAlchemy ORM.
Test files go in tests/ and must use pytest fixtures.
```

```
Remember: In our frontend repo, we use TypeScript with React.
No `any` types allowed. All components must have props interfaces.
We use React Query for data fetching, never useEffect for API calls.
```

这些记忆会永久保存 — 审查器会在不需要每次提醒的情况下执行你的规范。

---

## 第 5 步：创建自动化 Cron 任务

现在把所有东西连接起来。创建一个每 2 小时运行的 Cron 任务：

```bash
hermes cron create "0 */2 * * *" \
  "Check for new open PRs and review them.

Repos to monitor:
- myorg/backend-api
- myorg/frontend-app

Steps:
1. Run: gh pr list --repo REPO --state open --limit 5 --json number,title,author,createdAt
2. For each PR created or updated in the last 4 hours:
   - Run: gh pr diff NUMBER --repo REPO
   - Review the diff using the code-review guidelines
3. Format output as:

## PR Reviews — today

### [repo] #[number]: [title]
**Author:** [name] | **Verdict:** APPROVE/REQUEST_CHANGES/COMMENT
[findings]

If no new PRs found, say: No new PRs to review." \
  --name "pr-review" \
  --deliver telegram \
  --skill code-review
```

验证它已排程：

```bash
hermes cron list
```

### 其他实用排程

| 排程 | 时机 |
|------|------|
| `0 */2 * * *` | 每 2 小时 |
| `0 9,13,17 * * 1-5` | 工作日每天三次 |
| `0 9 * * 1` | 每周一上午汇总 |
| `30m` | 每 30 分钟（高流量仓库） |

---

## 第 6 步：按需运行

不想等排程？手动触发：

```bash
hermes cron run pr-review
```

或在聊天会话中：

```
/cron run pr-review
```

---

## 进阶用法

### 直接在 GitHub 上发布审查

不投递到 Telegram，让 Agent 直接在 PR 上发表评论：

在 Cron 提示中添加：

```
After reviewing, post your review:
- For issues: gh pr review NUMBER --repo REPO --comment --body "YOUR_REVIEW"
- For critical issues: gh pr review NUMBER --repo REPO --request-changes --body "YOUR_REVIEW"
- For clean PRs: gh pr review NUMBER --repo REPO --approve --body "Looks good"
```

:::caution
确保 `gh` 的 Token 有 `repo` 权限。审查会以 `gh` 认证的用户身份发布。
:::

### 每周 PR 仪表板

创建一个周一上午的仓库总览：

```bash
hermes cron create "0 9 * * 1" \
  "Generate a weekly PR dashboard:
- myorg/backend-api
- myorg/frontend-app
- myorg/infra

For each repo show:
1. Open PR count and oldest PR age
2. PRs merged this week
3. Stale PRs (older than 5 days)
4. PRs with no reviewer assigned

Format as a clean summary." \
  --name "weekly-dashboard" \
  --deliver telegram
```

### 多仓库监控

通过在提示中添加更多仓库来扩展。Agent 会按顺序处理它们 — 无需额外设置。

---

## 故障排除

### "gh: command not found"
Gateway 在最小环境中运行。确保 `gh` 在系统 PATH 中并重启 Gateway。

### 审查太笼统
1. 添加 `code-review` Skill（第 3 步）
2. 通过 Memory 教 Hermes 你的团队规范（第 4 步）
3. 它对你技术栈的上下文越多，审查越好

### Cron 任务没有运行
```bash
hermes gateway status    # Gateway 是否在运行？
hermes cron list         # 任务是否已启用？
```

### API 速率限制
GitHub 允许认证用户每小时 5,000 次 API 请求。每次 PR 审查使用约 3-5 次请求（列表 + diff + 可选评论）。即使每天审查 100 个 PR 也远在限制之内。

---

## 下一步

- **[基于 Webhook 的 PR 审查](./webhook-github-pr-review.md)** — PR 打开时即时审查（需要公共端点）
- **[每日简报 Bot](/docs/guides/daily-briefing-bot)** — 将 PR 审查与每日新闻摘要结合
- **[构建 Plugin](/docs/guides/build-a-hermes-plugin)** — 将审查逻辑封装为可分享的 Plugin
- **[Profile（配置文件）](/docs/user-guide/profiles)** — 用独立的 Memory 和配置运行专属审查器
- **[Fallback Provider（备用提供商）](/docs/user-guide/features/fallback-providers)** — 确保即使某个提供商宕机审查也能运行

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/github-pr-review-agent)
