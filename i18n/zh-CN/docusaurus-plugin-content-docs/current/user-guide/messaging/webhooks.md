---
sidebar_position: 13
title: "Webhooks"
description: "从 GitHub、GitLab 和其他服务接收事件以触发 Hermes Agent 运行"
---

# Webhooks

从外部服务（GitHub、GitLab、JIRA、Stripe 等）接收事件，自动触发 Hermes Agent 运行。Webhook 适配器运行 HTTP 服务器，接受 POST 请求，验证 HMAC 签名，将负载转换为 Agent 提示，并将响应路由回源或到另一个已配置的平台。

Agent 处理事件后可以通过在 PR 上评论、发送消息到 Telegram/Discord 或记录结果来响应。

---

## 快速开始

1. 通过 `hermes gateway setup` 或环境变量启用
2. 在 `config.yaml` 中定义路由 **或** 使用 `hermes webhook subscribe` 动态创建
3. 将你的服务指向 `http://your-server:8644/webhooks/<route-name>`

---

## 设置

有两种方式启用 Webhook 适配器。

### 通过设置向导

```bash
hermes gateway setup
```

按照提示启用 Webhook、设置端口和全局 HMAC 密钥。

### 通过环境变量

添加到 `~/.hermes/.env`：

```bash
WEBHOOK_ENABLED=true
WEBHOOK_PORT=8644        # 默认
WEBHOOK_SECRET=your-global-secret
```

### 验证服务器

Gateway 运行后：

```bash
curl http://localhost:8644/health
```

预期响应：

```json
{"status": "ok", "platform": "webhook"}
```

---

## 配置路由 {#configuring-routes}

路由定义如何处理不同的 Webhook 来源。每个路由是 `config.yaml` 中 `platforms.webhook.extra.routes` 下的一个命名条目。

### 路由属性

| 属性 | 必需 | 说明 |
|----------|----------|-------------|
| `events` | 否 | 接受的事件类型列表（如 `["pull_request"]`）。如果为空，接受所有事件。事件类型从 `X-GitHub-Event`、`X-GitLab-Event` 或负载中的 `event_type` 读取。 |
| `secret` | **是** | 用于签名验证的 HMAC 密钥。如果路由上未设置则回退到全局 `secret`。仅在测试时设为 `"INSECURE_NO_AUTH"`（跳过验证）。 |
| `prompt` | 否 | 带点表示法负载访问的模板字符串（如 `{pull_request.title}`）。如果省略，完整 JSON 负载会转储到提示中。 |
| `skills` | 否 | Agent 运行时要加载的 Skill 名称列表。 |
| `deliver` | 否 | 发送响应的位置：`github_comment`、`telegram`、`discord`、`slack`、`signal`、`sms`、`whatsapp`、`matrix`、`mattermost`、`homeassistant`、`email`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot` 或 `log`（默认）。 |
| `deliver_extra` | 否 | 额外投递配置 — 键取决于 `deliver` 类型（如 `repo`、`pr_number`、`chat_id`）。值支持与 `prompt` 相同的 `{dot.notation}` 模板。 |
| `deliver_only` | 否 | 如果为 `true`，跳过 Agent — 渲染的 `prompt` 模板成为直接投递的字面消息。零 LLM 成本，亚秒级投递。参见[直接投递模式](#直接投递模式)了解用例。需要 `deliver` 为真实目标（非 `log`）。 |

### 完整示例

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "global-fallback-secret"
      routes:
        github-pr:
          events: ["pull_request"]
          secret: "github-webhook-secret"
          prompt: |
            审查此 Pull Request：
            仓库：{repository.full_name}
            PR #{number}：{pull_request.title}
            作者：{pull_request.user.login}
            URL：{pull_request.html_url}
            Diff URL：{pull_request.diff_url}
            动作：{action}
          skills: ["github-code-review"]
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
        deploy-notify:
          events: ["push"]
          secret: "deploy-secret"
          prompt: "新推送至 {repository.full_name} 分支 {ref}：{head_commit.message}"
          deliver: "telegram"
```

### 提示模板

提示使用点表示法访问 Webhook 负载中的嵌套字段：

- `{pull_request.title}` 解析为 `payload["pull_request"]["title"]`
- `{repository.full_name}` 解析为 `payload["repository"]["full_name"]`
- `{__raw__}` — 特殊令牌，将**整个负载**作为缩进 JSON 转储（截断至 4000 字符）。适用于监控告警或 Agent 需要完整上下文的通用 Webhook。
- 缺失的键保留为字面 `{key}` 字符串（不报错）
- 嵌套字典和列表被 JSON 序列化并截断至 2000 字符

你可以在 `{__raw__}` 中混合常规模板变量：

```yaml
prompt: "PR #{pull_request.number} 由 {pull_request.user.login}：{__raw__}"
```

如果路由没有配置 `prompt` 模板，整个负载作为缩进 JSON 转储（截断至 4000 字符）。

相同的点表示法模板在 `deliver_extra` 值中也可用。

### 论坛话题投递

将 Webhook 响应投递到 Telegram 时，你可以通过在 `deliver_extra` 中包含 `message_thread_id`（或 `thread_id`）来指定特定论坛话题：

```yaml
webhooks:
  routes:
    alerts:
      events: ["alert"]
      prompt: "告警：{__raw__}"
      deliver: "telegram"
      deliver_extra:
        chat_id: "-1001234567890"
        message_thread_id: "42"
```

如果 `deliver_extra` 中未提供 `chat_id`，投递会回退到目标平台配置的主频道。

---

## GitHub PR 审查（逐步指南） {#github-pr-review}

此演练在每次 Pull Request 时设置自动代码审查。

### 1. 在 GitHub 中创建 Webhook

1. 进入你的仓库 → **Settings** → **Webhooks** → **Add webhook**
2. 设置 **Payload URL** 为 `http://your-server:8644/webhooks/github-pr`
3. 设置 **Content type** 为 `application/json`
4. 设置 **Secret** 匹配你的路由配置（如 `github-webhook-secret`）
5. 在 **Which events?** 下，选择 **Let me select individual events** 并勾选 **Pull requests**
6. 点击 **Add webhook**

### 2. 添加路由配置

将 `github-pr` 路由添加到 `~/.hermes/config.yaml`，如上例所示。

### 3. 确保 `gh` CLI 已认证

`github_comment` 投递类型使用 GitHub CLI 发布评论：

```bash
gh auth login
```

### 4. 测试

在仓库上创建 Pull Request。Webhook 触发，Hermes 处理事件，并在 PR 上发布审查评论。

---

## GitLab Webhook 设置 {#gitlab-webhook-setup}

GitLab Webhook 工作方式类似，但使用不同的认证机制。GitLab 将密钥作为纯文本 `X-Gitlab-Token` 头发送（精确字符串匹配，非 HMAC）。

### 1. 在 GitLab 中创建 Webhook

1. 进入你的项目 → **Settings** → **Webhooks**
2. 设置 **URL** 为 `http://your-server:8644/webhooks/gitlab-mr`
3. 输入你的 **Secret token**
4. 选择 **Merge request events**（和你想要的其他事件）
5. 点击 **Add webhook**

### 2. 添加路由配置

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        gitlab-mr:
          events: ["merge_request"]
          secret: "your-gitlab-secret-token"
          prompt: |
            审查此 Merge Request：
            项目：{project.path_with_namespace}
            MR !{object_attributes.iid}：{object_attributes.title}
            作者：{object_attributes.last_commit.author.name}
            URL：{object_attributes.url}
            动作：{object_attributes.action}
          deliver: "log"
```

---

## 投递选项 {#delivery-options}

`deliver` 字段控制 Agent 响应处理 Webhook 事件后的去向。

| 投递类型 | 说明 |
|-------------|-------------|
| `log` | 将响应记录到 Gateway 日志输出。这是默认值，适用于测试。 |
| `github_comment` | 通过 `gh` CLI 将响应作为 PR/Issue 评论发布。需要 `deliver_extra.repo` 和 `deliver_extra.pr_number`。`gh` CLI 必须在 Gateway 主机上安装并认证（`gh auth login`）。 |
| `telegram` | 将响应路由到 Telegram。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `discord` | 将响应路由到 Discord。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `slack` | 将响应路由到 Slack。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `signal` | 将响应路由到 Signal。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `sms` | 通过 Twilio 将响应路由到 SMS。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `whatsapp` | 将响应路由到 WhatsApp。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `matrix` | 将响应路由到 Matrix。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `mattermost` | 将响应路由到 Mattermost。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `homeassistant` | 将响应路由到 Home Assistant。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `email` | 将响应路由到 Email。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `dingtalk` | 将响应路由到钉钉。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `feishu` | 将响应路由到飞书。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `wecom` | 将响应路由到企业微信。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `weixin` | 将响应路由到微信。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `bluebubbles` | 将响应路由到 BlueBubbles（iMessage）。使用主频道，或在 `deliver_extra` 中指定 `chat_id`。 |

对于跨平台投递，目标平台也必须在 Gateway 中启用并连接。如果 `deliver_extra` 中未提供 `chat_id`，响应会发送到该平台配置的主频道。

---

## 直接投递模式 {#直接投递模式}

默认情况下，每个 Webhook POST 都会触发一次 Agent 运行 — 载荷成为提示，Agent 处理它，Agent 的响应被投递。这在每次事件时都消耗 LLM Token。

对于你只想**推送普通通知**的用例 — 无推理、无 Agent 循环，只需投递消息 — 在路由上设置 `deliver_only: true`。渲染的 `prompt` 模板成为消息正文，适配器将其直接分发到配置的投递目标。

### 何时使用直接投递

- **外部服务推送** — Supabase/Firebase Webhook 在数据库变更时触发 → 即时通知 Telegram 用户
- **监控告警** — Datadog/Grafana 告警 Webhook → 推送到 Discord 频道
- **Agent 间通知** — Agent A 通知 Agent B 的用户长时间任务已完成
- **后台作业完成** — Cron 任务完成 → 将结果发布到 Slack

优势：

- **零 LLM Token** — Agent 永远不会被调用
- **亚秒级投递** — 单次适配器调用，无推理循环
- **与 Agent 模式相同的安全性** — HMAC 认证、速率限制、幂等性和请求体大小限制仍然适用
- **同步响应** — 投递成功时 POST 返回 `200 OK`，目标拒绝时返回 `502`，以便上游服务智能重试

### 示例：从 Supabase 推送到 Telegram

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "global-secret"
      routes:
        antenna-matches:
          secret: "antenna-webhook-secret"
          deliver: "telegram"
          deliver_only: true
          prompt: "🎉 新匹配：{match.user_name} 与你匹配了！"
          deliver_extra:
            chat_id: "{match.telegram_chat_id}"
```

### 响应码

| 状态 | 含义 |
|------|------|
| `200 OK` | 投递成功 |
| `200 OK`（status=duplicate） | 幂等 TTL 内重复的 ID。不会重新投递 |
| `401 Unauthorized` | HMAC 签名无效或缺失 |
| `400 Bad Request` | JSON 请求体格式错误 |
| `404 Not Found` | 未知路由名称 |
| `413 Payload Too Large` | 请求体超过 `max_body_bytes` |
| `429 Too Many Requests` | 路由速率限制超出 |
| `502 Bad Gateway` | 目标适配器拒绝了消息。错误在服务端记录 |

### 配置注意事项

- `deliver_only: true` 要求 `deliver` 为真实目标。`deliver: log` 在启动时会被拒绝
- `skills` 字段在直接投递模式下被忽略
- 模板渲染使用与 Agent 模式相同的 `{dot.notation}` 语法
- 幂等性使用相同的 `X-GitHub-Delivery` / `X-Request-ID` 头

---

## 动态订阅（CLI） {#dynamic-subscriptions}

除了 `config.yaml` 中的静态路由，你还可以使用 `hermes webhook` CLI 命令动态创建 Webhook 订阅。当 Agent 自身需要设置事件驱动触发器时尤其有用。

### 创建订阅

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "新 Issue #{issue.number}：{issue.title}\n作者：{issue.user.login}\n\n{issue.body}" \
  --deliver telegram \
  --deliver-chat-id "-100123456789" \
  --description "分类新 GitHub Issue"
```

这返回 Webhook URL 和自动生成的 HMAC 密钥。配置你的服务 POST 到该 URL。

### 列出订阅

```bash
hermes webhook list
```

### 移除订阅

```bash
hermes webhook remove github-issues
```

### 测试订阅

```bash
hermes webhook test github-issues
hermes webhook test github-issues --payload '{"issue": {"number": 42, "title": "Test"}}'
```

### 动态订阅工作原理

- 订阅存储在 `~/.hermes/webhook_subscriptions.json`
- Webhook 适配器在每次传入请求时热重载此文件（mtime 控制，开销可忽略）
- `config.yaml` 中的静态路由始终优先于同名的动态路由
- 动态订阅使用与静态路由相同的路由格式和能力（事件、提示模板、Skill、投递）
- 无需重启 Gateway — 订阅后立即生效

### Agent 驱动的订阅

Agent 可以在 `webhook-subscriptions` Skill 的引导下通过终端工具创建订阅。让 Agent "为 GitHub Issue 设置 Webhook"，它会运行相应的 `hermes webhook subscribe` 命令。

---

## 安全 {#security}

Webhook 适配器包含多层安全措施：

### HMAC 签名验证

适配器使用适合每个来源的方法验证传入 Webhook 签名：

- **GitHub**：`X-Hub-Signature-256` 头 — HMAC-SHA256 十六进制摘要，前缀为 `sha256=`
- **GitLab**：`X-Gitlab-Token` 头 — 纯密钥字符串匹配
- **通用**：`X-Webhook-Signature` 头 — 原始 HMAC-SHA256 十六进制摘要

如果配置了密钥但没有识别到的签名头，请求会被拒绝。

### 密钥是必需的

每个路由必须有密钥 — 直接设置在路由上或从全局 `secret` 继承。没有密钥的路由会导致适配器在启动时报错。仅在开发/测试时，你可以将密钥设为 `"INSECURE_NO_AUTH"` 完全跳过验证。

### 速率限制

每个路由默认限制为每分钟 **30 个请求**（固定窗口）。全局配置：

```yaml
platforms:
  webhook:
    extra:
      rate_limit: 60  # 每分钟请求数
```

超限请求收到 `429 Too Many Requests` 响应。

### 幂等性

投递 ID（来自 `X-GitHub-Delivery`、`X-Request-ID` 或时间戳回退）缓存 **1 小时**。重复投递（如 Webhook 重试）被静默跳过并返回 `200` 响应，防止重复 Agent 运行。

### 请求体大小限制

超过 **1 MB** 的负载在读取请求体前被拒绝。配置此项：

```yaml
platforms:
  webhook:
    extra:
      max_body_bytes: 2097152  # 2 MB
```

### 提示注入风险

:::warning
Webhook 负载包含攻击者控制的数据 — PR 标题、提交消息、Issue 描述等都可能包含恶意指令。暴露在互联网上时，在沙箱环境（Docker、VM）中运行 Gateway。考虑使用 Docker 或 SSH 终端后端进行隔离。
:::

---

## 故障排除 {#troubleshooting}

### Webhook 未到达

- 验证端口已暴露且可从 Webhook 源访问
- 检查防火墙规则 — 端口 `8644`（或你配置的端口）必须开放
- 验证 URL 路径匹配：`http://your-server:8644/webhooks/<route-name>`
- 使用 `/health` 端点确认服务器正在运行

### 签名验证失败

- 确保路由配置中的密钥与 Webhook 源中配置的密钥完全匹配
- 对于 GitHub，密钥是基于 HMAC 的 — 检查 `X-Hub-Signature-256`
- 对于 GitLab，密钥是纯令牌匹配 — 检查 `X-Gitlab-Token`
- 查看 Gateway 日志中的 `Invalid signature` 警告

### 事件被忽略

- 检查事件类型是否在你的路由 `events` 列表中
- GitHub 事件使用如 `pull_request`、`push`、`issues` 的值（`X-GitHub-Event` 头值）
- GitLab 事件使用如 `merge_request`、`push` 的值（`X-GitLab-Event` 头值）
- 如果 `events` 为空或未设置，接受所有事件

### Agent 不响应

- 前台运行 Gateway 查看日志：`hermes gateway run`
- 检查提示模板是否正确渲染
- 验证投递目标已配置并连接

### 重复响应

- 幂等性缓存应防止此问题 — 检查 Webhook 源是否发送了投递 ID 头（`X-GitHub-Delivery` 或 `X-Request-ID`）
- 投递 ID 缓存 1 小时

### `gh` CLI 错误（GitHub 评论投递）

- 在 Gateway 主机上运行 `gh auth login`
- 确保已认证的 GitHub 用户对仓库有写权限
- 检查 `gh` 已安装且在 PATH 中

---

## 环境变量 {#environment-variables}

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `WEBHOOK_ENABLED` | 启用 Webhook 平台适配器 | `false` |
| `WEBHOOK_PORT` | 接收 Webhook 的 HTTP 服务器端口 | `8644` |
| `WEBHOOK_SECRET` | 全局 HMAC 密钥（当路由未指定自己的密钥时用作回退） | _（无）_ |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/webhooks)
