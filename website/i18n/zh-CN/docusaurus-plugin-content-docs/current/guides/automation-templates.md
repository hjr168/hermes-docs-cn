---
sidebar_position: 15
title: "自动化模板"
description: "开箱即用的自动化方案 — 定时任务、GitHub 事件触发、API Webhook 和多 Skill 工作流"
---

# 自动化模板

常见自动化模式的复制粘贴方案。每个模板使用 Hermes 内置的 [Cron 调度器](/docs/user-guide/features/cron)处理定时触发，[Webhook 平台](/docs/user-guide/messaging/webhooks)处理事件驱动触发。

每个模板都兼容**任何模型** — 不锁定到单一提供商。

:::tip 三种触发类型
| 触发器 | 方式 | 工具 |
|--------|------|------|
| **定时** | 按节奏运行（每小时、每夜、每周） | `cronjob` 工具或 `/cron` 斜杠命令 |
| **GitHub 事件** | PR 打开、推送、Issue、CI 结果时触发 | Webhook 平台（`hermes webhook subscribe`） |
| **API 调用** | 外部服务向你的端点 POST JSON | Webhook 平台（config.yaml 路由或 `hermes webhook subscribe`） |

三种都支持投递到 Telegram、Discord、Slack、短信、邮件、GitHub 评论或本地文件。
:::

---

## 开发工作流

### 每夜待办分类

每天夜里为新 Issue 打标签、排优先级并汇总。将摘要投递到团队频道。

**触发器：** 定时（每夜）

```bash
hermes cron create "0 2 * * *" \
  "你是一位项目经理，对 NousResearch/hermes-agent GitHub 仓库进行分类。

1. 运行: gh issue list --repo NousResearch/hermes-agent --state open --json number,title,labels,author,createdAt --limit 30
2. 识别过去 24 小时内新开的 Issue
3. 对每个新 Issue：
   - 建议优先级标签（P0-critical、P1-high、P2-medium、P3-low）
   - 建议分类标签（bug、feature、docs、security）
   - 写一行分类备注
4. 汇总：总开放 Issue 数、今日新增、按优先级分布

格式化为清晰的摘要。如果没有新 Issue，回复 [SILENT]。" \
  --name "每夜待办分类" \
  --deliver telegram
```

### 自动 PR 代码审查

每次打开 PR 时自动审查。直接在 PR 上发布审查评论。

**触发器：** GitHub Webhook

**方案 A — 动态订阅（CLI）：**

```bash
hermes webhook subscribe github-pr-review \
  --events "pull_request" \
  --prompt "审查这个 Pull Request：
仓库: {repository.full_name}
PR #{pull_request.number}: {pull_request.title}
作者: {pull_request.user.login}
操作: {action}
Diff URL: {pull_request.diff_url}

使用以下命令获取 diff: curl -sL {pull_request.diff_url}

审查内容：
- 安全问题（注入、认证绕过、代码中的密钥）
- 性能问题（N+1 查询、无限循环、内存泄漏）
- 代码质量（命名、重复、错误处理）
- 新行为是否缺少测试

发布简洁的审查。如果 PR 是简单的文档/拼写修改，简要说明即可。" \
  --skills "github-code-review" \
  --deliver github_comment
```

**方案 B — 静态路由（config.yaml）：**

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "your-global-secret"
      routes:
        github-pr-review:
          events: ["pull_request"]
          secret: "github-webhook-secret"
          prompt: |
            审查 PR #{pull_request.number}: {pull_request.title}
            仓库: {repository.full_name}
            作者: {pull_request.user.login}
            Diff URL: {pull_request.diff_url}
            审查安全性、性能和代码质量。
          skills: ["github-code-review"]
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{pull_request.number}"
```

然后在 GitHub 中：**Settings → Webhooks → Add webhook** → Payload URL: `http://your-server:8644/webhooks/github-pr-review`，Content type: `application/json`，Secret: `github-webhook-secret`，Events: **Pull requests**。

### 文档偏差检测

每周扫描已合并的 PR，找出需要文档更新的 API 变更。

**触发器：** 定时（每周）

```bash
hermes cron create "0 9 * * 1" \
  "扫描 NousResearch/hermes-agent 仓库的文档偏差。

1. 运行: gh pr list --repo NousResearch/hermes-agent --state merged --json number,title,files,mergedAt --limit 30
2. 筛选过去 7 天内合并的 PR
3. 对每个已合并 PR，检查是否修改了：
   - 工具 Schema（tools/*.py）— 可能需要更新 docs/reference/tools-reference.md
   - CLI 命令（hermes_cli/commands.py、hermes_cli/main.py）— 可能需要更新 docs/reference/cli-commands.md
   - 配置选项（hermes_cli/config.py）— 可能需要更新 docs/user-guide/configuration.md
   - 环境变量 — 可能需要更新 docs/reference/environment-variables.md
4. 交叉比对：对于每个代码变更，检查对应的文档页面是否在同一 PR 中也更新了

报告代码变更但文档未更新的任何遗漏。如果一切同步，回复 [SILENT]。" \
  --name "文档偏差检测" \
  --deliver telegram
```

### 依赖安全审计

每日扫描项目依赖中的已知漏洞。

**触发器：** 定时（每日）

```bash
hermes cron create "0 6 * * *" \
  "对 hermes-agent 项目运行依赖安全审计。

1. cd ~/.hermes/hermes-agent && source .venv/bin/activate
2. 运行: pip audit --format json 2>/dev/null || pip audit 2>&1
3. 运行: npm audit --json 2>/dev/null（如果存在 website/ 目录）
4. 检查是否有 CVSS 评分 >= 7.0 的 CVE

如果发现漏洞：
- 列出每个漏洞的包名、版本、CVE ID、严重程度
- 检查是否有升级可用
- 标注是直接依赖还是传递依赖

如果没有漏洞，回复 [SILENT]。" \
  --name "依赖审计" \
  --deliver telegram
```

---

## DevOps 与监控

### 部署验证

每次部署后触发冒烟测试。你的 CI/CD 管道在部署完成时 POST 到 Webhook。

**触发器：** API 调用（Webhook）

```bash
hermes webhook subscribe deploy-verify \
  --events "deployment" \
  --prompt "部署刚刚完成：
服务: {service}
环境: {environment}
版本: {version}
部署者: {deployer}

运行以下验证步骤：
1. 检查服务是否响应: curl -s -o /dev/null -w '%{http_code}' {health_url}
2. 搜索最近的错误日志：检查部署负载中的任何错误指标
3. 验证版本是否匹配: curl -s {health_url}/version

报告：部署状态（healthy/degraded/failed）、响应时间、发现的任何错误。
如果健康，保持简短。如果降级或失败，提供详细诊断。" \
  --deliver telegram
```

你的 CI/CD 管道触发它：

```bash
curl -X POST http://your-server:8644/webhooks/deploy-verify \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"service":"api","environment":"prod","version":"2.1.0","deployer":"ci","health_url":"https://api.example.com/health"}' | openssl dgst -sha256 -hmac 'your-secret' | cut -d' ' -f2)" \
  -d '{"service":"api","environment":"prod","version":"2.1.0","deployer":"ci","health_url":"https://api.example.com/health"}'
```

### 告警分类

将监控告警与近期变更关联，草拟响应。兼容 Datadog、PagerDuty、Grafana 或任何能 POST JSON 的告警系统。

**触发器：** API 调用（Webhook）

```bash
hermes webhook subscribe alert-triage \
  --prompt "收到监控告警：
告警: {alert.name}
严重程度: {alert.severity}
服务: {alert.service}
消息: {alert.message}
时间戳: {alert.timestamp}

调查：
1. 在 Web 上搜索此错误模式的已知问题
2. 检查是否与最近的部署或配置变更相关
3. 草拟分类摘要：
   - 可能的根本原因
   - 建议的首要响应步骤
   - 升级建议（P1-P4）

保持简洁。这会发到值班频道。" \
  --deliver slack
```

### 可用性监控

每 30 分钟检查端点。只在出问题时通知。

**触发器：** 定时（每 30 分钟）

```python title="~/.hermes/scripts/check-uptime.py"
import urllib.request, json, time

ENDPOINTS = [
    {"name": "API", "url": "https://api.example.com/health"},
    {"name": "Web", "url": "https://www.example.com"},
    {"name": "Docs", "url": "https://docs.example.com"},
]

results = []
for ep in ENDPOINTS:
    try:
        start = time.time()
        req = urllib.request.Request(ep["url"], headers={"User-Agent": "Hermes-Monitor/1.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        elapsed = round((time.time() - start) * 1000)
        results.append({"name": ep["name"], "status": resp.getcode(), "ms": elapsed})
    except Exception as e:
        results.append({"name": ep["name"], "status": "DOWN", "error": str(e)})

down = [r for r in results if r.get("status") == "DOWN" or (isinstance(r.get("status"), int) and r["status"] >= 500)]
if down:
    print("OUTAGE DETECTED")
    for r in down:
        print(f"  {r['name']}: {r.get('error', f'HTTP {r[\"status\"]}')} ")
    print(f"\n所有结果: {json.dumps(results, indent=2)}")
else:
    print("NO_ISSUES")
```

```bash
hermes cron create "every 30m" \
  "如果脚本报告 OUTAGE DETECTED，总结哪些服务宕机并建议可能的原因。如果是 NO_ISSUES，回复 [SILENT]。" \
  --script ~/.hermes/scripts/check-uptime.py \
  --name "可用性监控" \
  --deliver telegram
```

---

## 研究与情报

### 竞品仓库侦察

监控竞品仓库的有趣 PR、功能和架构决策。

**触发器：** 定时（每日）

```bash
hermes cron create "0 8 * * *" \
  "侦察这些 AI Agent 仓库过去 24 小时的显著活动：

待检查仓库：
- anthropics/claude-code
- openai/codex
- All-Hands-AI/OpenHands
- Aider-AI/aider

对每个仓库：
1. gh pr list --repo <repo> --state all --json number,title,author,createdAt,mergedAt --limit 15
2. gh issue list --repo <repo> --state open --json number,title,labels,createdAt --limit 10

关注：
- 正在开发的新功能
- 架构变更
- 我们可以学习的集成模式
- 可能也影响我们的安全修复

跳过常规依赖升级和 CI 修复。如果没有值得注意的内容，回复 [SILENT]。
如果有发现，按仓库组织并简要分析每个条目。" \
  --skills "competitive-pr-scout" \
  --name "竞品侦察" \
  --deliver telegram
```

### AI 新闻摘要

AI/ML 发展的每周综述。

**触发器：** 定时（每周）

```bash
hermes cron create "0 9 * * 1" \
  "生成过去 7 天的每周 AI 新闻摘要：

1. 在 Web 上搜索主要 AI 公告、模型发布和研究突破
2. 搜索 GitHub 上的热门 ML 仓库
3. 查看 arXiv 上关于语言模型和 Agent 的高引用论文

结构：
## 头条（3-5 个重大新闻）
## 值得关注的论文（2-3 篇，各一句话总结）
## 开源（有趣的新仓库或重大发布）
## 行业动态（融资、收购、产品发布）

每条控制在 1-2 句话。包含链接。总计不超过 600 字。" \
  --name "每周 AI 摘要" \
  --deliver telegram
```

### 论文摘要与笔记

每日 arXiv 扫描，将摘要保存到你的笔记系统。

**触发器：** 定时（每日）

```bash
hermes cron create "0 8 * * *" \
  "在 arXiv 上搜索过去一天关于 'language model reasoning' 或 'tool-use agents' 最有趣的 3 篇论文。为每篇论文创建 Obsidian 笔记，包含标题、作者、摘要总结、关键贡献和与 Hermes Agent 开发的潜在相关性。" \
  --skills "arxiv,obsidian" \
  --name "论文摘要" \
  --deliver local
```

---

## GitHub 事件自动化

### Issue 自动标签

自动为新 Issue 打标签并回复。

**触发器：** GitHub Webhook

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "收到新的 GitHub Issue：
仓库: {repository.full_name}
Issue #{issue.number}: {issue.title}
作者: {issue.user.login}
操作: {action}
内容: {issue.body}
标签: {issue.labels}

如果是新 Issue（action=opened）：
1. 仔细阅读 Issue 标题和内容
2. 建议合适的标签（bug、feature、docs、security、question）
3. 如果是 bug 报告，尝试从描述中识别受影响的组件
4. 发布有帮助的初步回复确认该 Issue

如果是标签或指派变更，回复 [SILENT]。" \
  --deliver github_comment
```

### CI 失败分析

分析 CI 失败并在 PR 上发布诊断信息。

**触发器：** GitHub Webhook

```yaml
# config.yaml 路由
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        ci-failure:
          events: ["check_run"]
          secret: "ci-secret"
          prompt: |
            CI 检查失败：
            仓库: {repository.full_name}
            检查: {check_run.name}
            状态: {check_run.conclusion}
            PR: #{check_run.pull_requests.0.number}
            详情 URL: {check_run.details_url}

            如果结论是 "failure"：
            1. 如果可访问，从详情 URL 获取日志
            2. 识别可能的失败原因
            3. 建议修复方案
            如果结论是 "success"，回复 [SILENT]。
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{check_run.pull_requests.0.number}"
```

### 跨仓库自动移植

当一个 PR 在一个仓库合并时，自动将等效变更移植到另一个仓库。

**触发器：** GitHub Webhook

```bash
hermes webhook subscribe auto-port \
  --events "pull_request" \
  --prompt "源仓库的 PR 已合并：
仓库: {repository.full_name}
PR #{pull_request.number}: {pull_request.title}
作者: {pull_request.user.login}
操作: {action}
合并提交: {pull_request.merge_commit_sha}

如果 action 是 'closed' 且 pull_request.merged 为 true：
1. 获取 diff: curl -sL {pull_request.diff_url}
2. 分析变更内容
3. 确定此变更是否需要移植到 Go SDK 等效版本
4. 如果是，创建分支，应用等效变更，在目标仓库开 PR
5. 在新 PR 描述中引用原始 PR

如果 action 不是 'closed' 或未合并，回复 [SILENT]。" \
  --skills "github-pr-workflow" \
  --deliver log
```

---

## 业务运营

### Stripe 支付监控

跟踪支付事件并获取失败摘要。

**触发器：** API 调用（Webhook）

```bash
hermes webhook subscribe stripe-payments \
  --events "payment_intent.succeeded,payment_intent.payment_failed,charge.dispute.created" \
  --prompt "收到 Stripe 事件：
事件类型: {type}
金额: {data.object.amount} 分 ({data.object.currency})
客户: {data.object.customer}
状态: {data.object.status}

对于 payment_intent.payment_failed：
- 从 {data.object.last_payment_error} 识别失败原因
- 建议这是临时问题（重试）还是永久问题（联系客户）

对于 charge.dispute.created：
- 标记为紧急
- 总结争议详情

对于 payment_intent.succeeded：
- 仅简要确认

保持回复简洁，发到运维频道。" \
  --deliver slack
```

### 每日营收摘要

每天早上汇总关键业务指标。

**触发器：** 定时（每日）

```bash
hermes cron create "0 8 * * *" \
  "生成早间业务指标摘要。

搜索 Web 获取：
1. 当前比特币和以太坊价格
2. 标普 500 状态（盘前或前一日收盘）
3. 过去 12 小时的主要科技/AI 行业新闻

格式化为简短的早间简报，最多 3-4 个要点。
投递为清晰、易读的消息。" \
  --name "早间简报" \
  --deliver telegram
```

---

## 多 Skill 工作流

### 安全审计管道

组合多个 Skill 进行全面的每周安全审查。

**触发器：** 定时（每周）

```bash
hermes cron create "0 3 * * 0" \
  "对 hermes-agent 代码库运行全面安全审计。

1. 检查依赖漏洞（pip audit、npm audit）
2. 搜索代码库中的常见安全反模式：
   - 硬编码的密钥或 API 密钥
   - SQL 注入向量（查询中的字符串格式化）
   - 路径遍历风险（文件路径中的用户输入未经验证）
   - 不安全的反序列化（pickle.loads、无 SafeLoader 的 yaml.load）
3. 审查最近提交（过去 7 天）中的安全相关变更
4. 检查是否有新环境变量未被文档化

编写安全报告，按严重程度分类（Critical、High、Medium、Low）。
如果没有发现，报告健康状态。" \
  --skills "codebase-security-audit" \
  --name "每周安全审计" \
  --deliver telegram
```

### 内容管道

按计划研究、起草和准备内容。

**触发器：** 定时（每周）

```bash
hermes cron create "0 10 * * 3" \
  "研究和起草一篇关于 AI Agent 热门话题的技术博客大纲。

1. 在 Web 上搜索本周讨论最多的 AI Agent 话题
2. 选择一个与开源 AI Agent 相关的最有趣话题
3. 创建大纲：
   - 引子/开篇角度
   - 3-4 个关键章节
   - 适合开发者的技术深度
   - 带有可操作要点的结论
4. 保存大纲到 ~/drafts/blog-$(date +%Y%m%d).md

大纲控制在约 300 字。这是起点，不是成品。" \
  --name "博客大纲" \
  --deliver local
```

---

## 快速参考

### Cron 调度语法

| 表达式 | 含义 |
|--------|------|
| `every 30m` | 每 30 分钟 |
| `every 2h` | 每 2 小时 |
| `0 2 * * *` | 每天凌晨 2:00 |
| `0 9 * * 1` | 每周一上午 9:00 |
| `0 9 * * 1-5` | 工作日上午 9:00 |
| `0 3 * * 0` | 每周日凌晨 3:00 |
| `0 */6 * * *` | 每 6 小时 |

### 投递目标

| 目标 | 标志 | 备注 |
|------|------|------|
| 同一聊天 | `--deliver origin` | 默认 — 投递到创建任务的位置 |
| 本地文件 | `--deliver local` | 保存输出，无通知 |
| Telegram | `--deliver telegram` | 主频道，或 `telegram:CHAT_ID` 指定特定频道 |
| Discord | `--deliver discord` | 主频道，或 `discord:CHANNEL_ID` |
| Slack | `--deliver slack` | 主频道 |
| 短信 | `--deliver sms:+15551234567` | 直接发送到手机号 |
| 特定线程 | `--deliver telegram:-100123:456` | Telegram 论坛话题 |

### Webhook 模板变量

| 变量 | 说明 |
|------|------|
| `{pull_request.title}` | PR 标题 |
| `{issue.number}` | Issue 编号 |
| `{repository.full_name}` | `owner/repo` |
| `{action}` | 事件动作（opened、closed 等） |
| `{__raw__}` | 完整 JSON 负载（截断至 4000 字符） |
| `{sender.login}` | 触发事件的 GitHub 用户 |

### [SILENT] 模式

当 Cron 任务的响应包含 `[SILENT]` 时，投递会被抑制。使用此模式避免安静运行时的通知噪音：

```
如果没有值得关注的内容，回复 [SILENT]。
```

这意味着你只在 Agent 有内容要报告时才收到通知。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/automation-templates)
