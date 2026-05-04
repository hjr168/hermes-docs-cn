---
sidebar_position: 11
sidebar_label: "通过 Webhook 进行 GitHub PR 审查"
title: "通过 Webhook 自动化 GitHub PR 评论"
description: "将 Hermes 连接到 GitHub，自动获取 PR diff、审查代码变更并发布评论 — 由 Webhook 触发，无需手动操作"
---

# 通过 Webhook 自动化 GitHub PR 评论

本指南介绍如何将 Hermes Agent 连接到 GitHub，使其自动获取 Pull Request 的 diff、分析代码变更并发布评论 — 由 Webhook 事件触发，无需手动操作。

当 PR 被打开或更新时，GitHub 会向你的 Hermes 实例发送一个 Webhook POST。Hermes 使用一个提示运行 Agent，指示它通过 `gh` CLI 获取 diff，然后将响应发布回 PR 线程。

:::tip 想要不需要公共端点的更简单设置？
如果你没有公共 URL 或只是想快速开始，请查看[构建 GitHub PR Review Agent](./github-pr-review-agent.md) — 使用 Cron 任务按计划轮询 PR，可在 NAT 和防火墙后运行。
:::

:::info 参考文档
关于完整的 Webhook 平台参考（所有配置选项、投递类型、动态订阅、安全模型），请参见 [Webhook](/docs/user-guide/messaging/webhooks)。
:::

:::warning Prompt 注入风险
Webhook 载荷包含攻击者可控制的数据 — PR 标题、提交消息和描述可能包含恶意指令。当你的 Webhook 端点暴露在互联网上时，请在沙盒环境（Docker、SSH 后端）中运行 Gateway。参见下方[安全说明](#安全说明)。
:::

---

## 前提条件

- Hermes Agent 已安装并运行（`hermes gateway`）
- [`gh` CLI](https://cli.github.com/) 已安装并在 Gateway 主机上认证（`gh auth login`）
- Hermes 实例的可公开访问的 URL（如果在本地运行，参见[使用 ngrok 进行本地测试](#使用-ngrok-进行本地测试)）
- GitHub 仓库的管理员权限（管理 Webhook 所需）

---

## 第 1 步 — 启用 Webhook 平台

在 `~/.hermes/config.yaml` 中添加以下内容：

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644          # 默认端口；如果被其他服务占用请更改
      rate_limit: 30      # 每分钟每路由最大请求数（非全局上限）

      routes:
        github-pr-review:
          secret: "your-webhook-secret-here"   # 必须与 GitHub Webhook Secret 完全匹配
          events:
            - pull_request

          # Agent 被指示在审查前获取实际的 diff。
          # {number} 和 {repository.full_name} 从 GitHub 载荷中解析。
          prompt: |
            A pull request event was received (action: {action}).

            PR #{number}: {pull_request.title}
            Author: {pull_request.user.login}
            Branch: {pull_request.head.ref} → {pull_request.base.ref}
            Description: {pull_request.body}
            URL: {pull_request.html_url}

            If the action is "closed" or "labeled", stop here and do not post a comment.

            Otherwise:
            1. Run: gh pr diff {number} --repo {repository.full_name}
            2. Review the code changes for correctness, security issues, and clarity.
            3. Write a concise, actionable review comment and post it.

          deliver: github_comment
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
```

**关键字段：**

| 字段 | 描述 |
|---|---|
| `secret`（路由级别） | 此路由的 HMAC 密钥。如果省略则回退到 `extra.secret` 全局设置。 |
| `events` | 接受的 `X-GitHub-Event` 头值列表。空列表 = 接受所有。 |
| `prompt` | 模板；`{field}` 和 `{nested.field}` 从 GitHub 载荷中解析。 |
| `deliver` | `github_comment` 通过 `gh pr comment` 发布。`log` 只写入 Gateway 日志。 |
| `deliver_extra.repo` | 解析为载荷中的 `org/repo`。 |
| `deliver_extra.pr_number` | 解析为载荷中的 PR 编号。 |

:::note 载荷不包含代码
GitHub Webhook 载荷包含 PR 元数据（标题、描述、分支名、URL），但**不包含 diff**。上面的提示指示 Agent 运行 `gh pr diff` 来获取实际变更。`terminal` 工具包含在默认的 `hermes-webhook` 工具集中，所以不需要额外配置。
:::

---

## 第 2 步 — 启动 Gateway

```bash
hermes gateway
```

你应该看到：

```
[webhook] Listening on 0.0.0.0:8644 — routes: github-pr-review
```

验证它正在运行：

```bash
curl http://localhost:8644/health
# {"status": "ok", "platform": "webhook"}
```

---

## 第 3 步 — 在 GitHub 上注册 Webhook

1. 进入你的仓库 → **Settings** → **Webhooks** → **Add webhook**
2. 填写：
   - **Payload URL：** `https://your-public-url.example.com/webhooks/github-pr-review`
   - **Content type：** `application/json`
   - **Secret：** 与路由配置中 `secret` 设置相同的值
   - **Which events?** → 选择个别事件 → 勾选 **Pull requests**
3. 点击 **Add webhook**

GitHub 会立即发送一个 `ping` 事件来确认连接。它会被安全忽略 — `ping` 不在你的 `events` 列表中 — 并返回 `{"status": "ignored", "event": "ping"}`。它只在 DEBUG 日志级别记录，所以在默认日志级别下不会出现在控制台中。

---

## 第 4 步 — 打开一个测试 PR

创建一个分支，推送变更，然后打开一个 PR。在 30-90 秒内（取决于 PR 大小和模型），Hermes 应该会发布一条审查评论。

要实时跟踪 Agent 的进度：

```bash
tail -f "${HERMES_HOME:-$HOME/.hermes}/logs/gateway.log"
```

---

## 使用 ngrok 进行本地测试

如果 Hermes 在你的笔记本电脑上运行，使用 [ngrok](https://ngrok.com/) 来暴露它：

```bash
ngrok http 8644
```

复制 `https://...ngrok-free.app` URL 并用作你的 GitHub Payload URL。在 ngrok 免费版中，URL 每次重启 ngrok 时都会变化 — 每次会话都要更新你的 GitHub Webhook。付费 ngrok 账户可获得静态域名。

你可以直接用 `curl` 对静态路由进行冒烟测试 — 不需要 GitHub 账户或真实 PR。

:::tip 测试时使用 `deliver: log`
在测试时将配置中的 `deliver: github_comment` 改为 `deliver: log`。否则 Agent 会尝试向测试载荷中的假 `org/repo#99` 仓库发布评论，这会失败。对提示输出满意后再改回 `deliver: github_comment`。
:::

```bash
SECRET="your-webhook-secret-here"
BODY='{"action":"opened","number":99,"pull_request":{"title":"Test PR","body":"Adds a feature.","user":{"login":"testuser"},"head":{"ref":"feat/x"},"base":{"ref":"main"},"html_url":"https://github.com/org/repo/pull/99"},"repository":{"full_name":"org/repo"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print "sha256="$2}')

curl -s -X POST http://localhost:8644/webhooks/github-pr-review \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$BODY"
# 预期：{"status":"accepted","route":"github-pr-review","event":"pull_request","delivery_id":"..."}
```

然后观察 Agent 运行：
```bash
tail -f "${HERMES_HOME:-$HOME/.hermes}/logs/gateway.log"
```

:::note
`hermes webhook test <name>` 只适用于通过 `hermes webhook subscribe` 创建的**动态订阅**。它不会读取 `config.yaml` 中的路由。
:::

---

## 过滤特定操作

GitHub 为许多操作发送 `pull_request` 事件：`opened`、`synchronize`、`reopened`、`closed`、`labeled` 等。`events` 列表只按 `X-GitHub-Event` 头值过滤 — 无法在路由级别按操作子类型过滤。

第 1 步中的提示已经通过指示 Agent 对 `closed` 和 `labeled` 事件提前停止来处理这个问题。

:::warning Agent 仍然会运行并消耗 Token
"stop here" 指令阻止了有意义的审查，但 Agent 仍然会为每个 `pull_request` 事件运行到完成。GitHub Webhook 只能按事件类型（`pull_request`、`push`、`issues` 等）过滤 — 不能按操作子类型（`opened`、`closed`、`labeled`）过滤。路由级别没有子操作过滤器。对于高流量仓库，接受这个成本或在上游用 GitHub Actions 工作流有条件地调用你的 Webhook URL。
:::

> 没有 Jinja2 或条件模板语法。`{field}` 和 `{nested.field}` 是唯一支持的替换。其他任何内容都原样传递给 Agent。

---

## 使用 Skill 实现一致的审查风格

加载一个 [Hermes Skill](/docs/user-guide/features/skills) 来给 Agent 一致的审查风格。在 `config.yaml` 的 `platforms.webhook.extra.routes` 中的路由内添加 `skills`：

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        github-pr-review:
          secret: "your-webhook-secret-here"
          events: [pull_request]
          prompt: |
            A pull request event was received (action: {action}).
            PR #{number}: {pull_request.title} by {pull_request.user.login}
            URL: {pull_request.html_url}

            If the action is "closed" or "labeled", stop here and do not post a comment.

            Otherwise:
            1. Run: gh pr diff {number} --repo {repository.full_name}
            2. Review the diff using your review guidelines.
            3. Write a concise, actionable review comment and post it.
          skills:
            - review
          deliver: github_comment
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
```

> **注意：** 只加载列表中找到的第一个 Skill。Hermes 不会堆叠多个 Skill — 后续条目会被忽略。

---

## 将响应发送到 Slack 或 Discord

在路由内将 `deliver` 和 `deliver_extra` 字段替换为你的目标平台：

```yaml
# 在 platforms.webhook.extra.routes.<route-name> 中：

# Slack
deliver: slack
deliver_extra:
  chat_id: "C0123456789"   # Slack 频道 ID（省略则使用配置的主频道）

# Discord
deliver: discord
deliver_extra:
  chat_id: "987654321012345678"  # Discord 频道 ID（省略则使用主频道）
```

目标平台也必须在 Gateway 中启用并连接。如果省略 `chat_id`，响应会发送到该平台配置的主频道。

有效的 `deliver` 值：`log` · `github_comment` · `telegram` · `discord` · `slack` · `signal` · `sms`

---

## GitLab 支持

同样的适配器适用于 GitLab。GitLab 使用 `X-Gitlab-Token` 进行认证（纯字符串匹配，非 HMAC）— Hermes 会自动处理两者。

对于事件过滤，GitLab 将 `X-GitLab-Event` 设置为 `Merge Request Hook`、`Push Hook`、`Pipeline Hook` 等值。在 `events` 中使用精确的头值：

```yaml
events:
  - Merge Request Hook
```

GitLab 载荷字段与 GitHub 不同 — 例如 MR 标题用 `{object_attributes.title}`，MR 编号用 `{object_attributes.iid}`。发现完整载荷结构最简单的方法是 GitLab Webhook 设置中的 **Test** 按钮，结合 **Recent Deliveries** 日志。或者，从路由配置中省略 `prompt` — Hermes 会将完整载荷作为格式化 JSON 直接传给 Agent，Agent 的响应（通过 `deliver: log` 在 Gateway 日志中可见）会描述其结构。

---

## 安全说明 {#安全说明}

- **永远不要在生产环境使用 `INSECURE_NO_AUTH`** — 它会完全禁用签名验证。仅用于本地开发。
- **定期轮换你的 Webhook Secret**，并在 GitHub（Webhook 设置）和 `config.yaml` 中同时更新。
- **速率限制** 默认为每路由每分钟 30 次请求（可通过 `extra.rate_limit` 配置）。超出返回 `429`。
- **重复投递**（Webhook 重试）通过 1 小时幂等缓存去重。缓存键是 `X-GitHub-Delivery`（如果存在），然后是 `X-Request-ID`，再然后是毫秒时间戳。当两个 delivery ID 头都未设置时，重试**不会**被去重。
- **Prompt 注入：** PR 标题、描述和提交消息是攻击者可控制的。恶意 PR 可能试图操纵 Agent 的行为。当暴露在公共互联网上时，在沙盒环境（Docker、VM）中运行 Gateway。

---

## 故障排除

| 症状 | 检查 |
|---|---|
| `401 Invalid signature` | config.yaml 中的 Secret 与 GitHub Webhook Secret 不匹配 |
| `404 Unknown route` | URL 中的路由名与 `routes:` 中的键不匹配 |
| `429 Rate limit exceeded` | 超过每路由每分钟 30 次请求 — 常见于从 GitHub UI 重新投递测试事件；等待一分钟或提高 `extra.rate_limit` |
| 没有评论发布 | `gh` 未安装、不在 PATH 中或未认证（`gh auth login`） |
| Agent 运行但没有评论 | 检查 Gateway 日志 — 如果 Agent 输出为空或只是 "SKIP"，投递仍会尝试 |
| 端口被占用 | 在 config.yaml 中更改 `extra.port` |
| Agent 运行但只审查了 PR 描述 | 提示中没有包含 `gh pr diff` 指令 — diff 不在 Webhook 载荷中 |
| 看不到 ping 事件 | 被忽略的事件在 DEBUG 日志级别返回 `{"status":"ignored","event":"ping"}` — 检查 GitHub 的投递日志（仓库 → Settings → Webhooks → 你的 Webhook → Recent Deliveries） |

**GitHub 的 Recent Deliveries 标签页**（仓库 → Settings → Webhooks → 你的 Webhook）显示每次投递的精确请求头、载荷、HTTP 状态和响应体。这是不触碰服务器日志就能诊断故障的最快方式。

---

## 完整配置参考

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      host: "0.0.0.0"         # 绑定地址（默认：0.0.0.0）
      port: 8644               # 监听端口（默认：8644）
      secret: ""               # 可选全局回退密钥
      rate_limit: 30           # 每分钟每路由请求数
      max_body_bytes: 1048576  # 载荷大小限制（字节，默认：1 MB）

      routes:
        <route-name>:
          secret: "required-per-route"
          events: []            # [] = 接受所有；否则列出 X-GitHub-Event 值
          prompt: ""            # {field} / {nested.field} 从载荷中解析
          skills: []            # 加载第一个匹配的 Skill（仅一个）
          deliver: "log"        # log | github_comment | telegram | discord | slack | signal | sms
          deliver_extra: {}     # github_comment 用 repo + pr_number；其他用 chat_id
```

---

## 下一步

- **[基于 Cron 的 PR 审查](./github-pr-review-agent.md)** — 按计划轮询 PR，无需公共端点
- **[Webhook 参考](/docs/user-guide/messaging/webhooks)** — Webhook 平台的完整配置参考
- **[构建 Plugin](/docs/guides/build-a-hermes-plugin)** — 将审查逻辑封装为可分享的 Plugin
- **[Profile（配置文件）](/docs/user-guide/profiles)** — 用独立的 Memory 和配置运行专属审查器

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/webhook-github-pr-review)
