---
sidebar_position: 2
sidebar_label: "Google Workspace"
title: "Google Workspace — Gmail、日历、Drive、Sheets 和 Docs"
description: "发送邮件、管理日历事件、搜索 Drive、读写 Sheets 以及访问 Docs — 全部通过 OAuth2 认证的 Google API 实现"
---

# Google Workspace 技能

Hermes 的 Gmail、日历、Drive、通讯录、Sheets 和 Docs 集成。使用 OAuth2（开放授权）并自动刷新令牌。优先使用 [Google Workspace CLI (`gws`)](https://github.com/nicholasgasior/gws)（可用时）以获得更广泛的覆盖范围，否则回退到 Google 的 Python 客户端库。

**技能路径：** `skills/productivity/google-workspace/`

## 设置

设置完全由 Agent 驱动 —— 让 Hermes 设置 Google Workspace，它会引导你完成每一步。流程如下：

1. **创建 Google Cloud 项目**并启用所需的 API（Gmail、日历、Drive、Sheets、Docs、People）
2. **创建 OAuth 2.0 凭据**（桌面应用类型）并下载客户端密钥 JSON
3. **授权** — Hermes 生成授权 URL，你在浏览器中批准，然后粘贴回调 URL
4. **完成** — 令牌从此自动刷新

:::tip 仅需邮件功能的用户
如果你只需要邮件功能（不需要日历/Drive/Sheets），请使用 **himalaya** 技能 —— 它可以使用 Gmail 应用专用密码工作，只需 2 分钟。无需 Google Cloud 项目。
:::

## Gmail

### 搜索

```bash
$GAPI gmail search "is:unread" --max 10
$GAPI gmail search "from:boss@company.com newer_than:1d"
$GAPI gmail search "has:attachment filename:pdf newer_than:7d"
```

返回包含每条消息的 `id`、`from`、`subject`、`date`、`snippet` 和 `labels` 的 JSON。

### 读取

```bash
$GAPI gmail get MESSAGE_ID
```

返回完整的邮件正文文本（优先使用纯文本，回退到 HTML）。

### 发送

```bash
# 基本发送
$GAPI gmail send --to user@example.com --subject "你好" --body "消息内容"

# HTML 邮件
$GAPI gmail send --to user@example.com --subject "报告" \
  --body "<h1>第四季度结果</h1><p>详情在此</p>" --html

# 自定义 From 头部（显示名称 + 邮箱）
$GAPI gmail send --to user@example.com --subject "你好" \
  --from '"研究 Agent" <user@example.com>' --body "消息内容"

# 附带抄送
$GAPI gmail send --to user@example.com --cc "team@example.com" \
  --subject "更新" --body "供参考"
```

### 自定义 From 头部

`--from` 标志允许你自定义发件人的显示名称。当多个 Agent 共享同一个 Gmail 账号但希望收件人看到不同的名称时非常有用：

```bash
# Agent 1
$GAPI gmail send --to client@co.com --subject "研究摘要" \
  --from '"研究 Agent" <shared@company.com>' --body "..."

# Agent 2
$GAPI gmail send --to client@co.com --subject "代码审查" \
  --from '"代码助手" <shared@company.com>' --body "..."
```

**工作原理：** `--from` 值被设置为 MIME 消息上的 RFC 5322 `From` 头部。Gmail 允许在你自己已认证的邮箱地址上自定义显示名称，无需额外配置。收件人看到自定义的显示名称（例如"研究 Agent"），而邮箱地址保持不变。

**重要提示：** 如果你在 `--from` 中使用了*不同的邮箱地址*（非已认证账号），Gmail 要求该地址在 Gmail 设置 → 账号 → 以此地址发送邮件中配置为[发送别名](https://support.google.com/mail/answer/22370)。

`--from` 标志同时适用于 `send` 和 `reply`：

```bash
$GAPI gmail reply MESSAGE_ID \
  --from '"支持 Bot" <shared@company.com>' --body "我们正在处理"
```

### 回复

```bash
$GAPI gmail reply MESSAGE_ID --body "谢谢，这样可以。"
```

自动将回复归入线程（设置 `In-Reply-To` 和 `References` 头部），并使用原始消息的线程 ID。

### 标签

```bash
# 列出所有标签
$GAPI gmail labels

# 添加/移除标签
$GAPI gmail modify MESSAGE_ID --add-labels LABEL_ID
$GAPI gmail modify MESSAGE_ID --remove-labels UNREAD
```

## 日历

```bash
# 列出事件（默认显示未来 7 天）
$GAPI calendar list
$GAPI calendar list --start 2026-03-01T00:00:00Z --end 2026-03-07T23:59:59Z

# 创建事件（必须指定时区）
$GAPI calendar create --summary "团队站会" \
  --start 2026-03-01T10:00:00-07:00 --end 2026-03-01T10:30:00-07:00

# 带地点和参与者
$GAPI calendar create --summary "午餐" \
  --start 2026-03-01T12:00:00Z --end 2026-03-01T13:00:00Z \
  --location "咖啡厅" --attendees "alice@co.com,bob@co.com"

# 删除事件
$GAPI calendar delete EVENT_ID
```

:::warning
日历时间**必须**包含时区偏移（例如 `-07:00`）或使用 UTC（`Z`）。不带时区的日期时间如 `2026-03-01T10:00:00` 是不明确的，将被视为 UTC。
:::

## Drive

```bash
$GAPI drive search "季度报告" --max 10
$GAPI drive search "mimeType='application/pdf'" --raw-query --max 5
```

## Sheets

```bash
# 读取范围
$GAPI sheets get SHEET_ID "Sheet1!A1:D10"

# 写入范围
$GAPI sheets update SHEET_ID "Sheet1!A1:B2" --values '[["姓名","分数"],["Alice","95"]]'

# 追加行
$GAPI sheets append SHEET_ID "Sheet1!A:C" --values '[["新","行","数据"]]'
```

## Docs

```bash
$GAPI docs get DOC_ID
```

返回文档标题和完整文本内容。

## 通讯录

```bash
$GAPI contacts list --max 20
```

## 输出格式

所有命令返回 JSON。各服务的关键字段：

| 命令 | 字段 |
|---------|--------|
| `gmail search` | `id`、`threadId`、`from`、`to`、`subject`、`date`、`snippet`、`labels` |
| `gmail get` | `id`、`threadId`、`from`、`to`、`subject`、`date`、`labels`、`body` |
| `gmail send/reply` | `status`、`id`、`threadId` |
| `calendar list` | `id`、`summary`、`start`、`end`、`location`、`description`、`htmlLink` |
| `calendar create` | `status`、`id`、`summary`、`htmlLink` |
| `drive search` | `id`、`name`、`mimeType`、`modifiedTime`、`webViewLink` |
| `contacts list` | `name`、`emails`、`phones` |
| `sheets get` | 单元格值的二维数组 |

## 故障排除

| 问题 | 修复方法 |
|---------|-----|
| `NOT_AUTHENTICATED` | 运行设置（让 Hermes 设置 Google Workspace） |
| `REFRESH_FAILED` | 令牌已撤销 — 重新运行授权步骤 |
| `HttpError 403: Insufficient Permission` | 缺少权限范围 — 撤销并使用正确的服务重新授权 |
| `HttpError 403: Access Not Configured` | API 未在 Google Cloud Console 中启用 |
| `ModuleNotFoundError` | 使用 `--install-deps` 运行安装脚本 |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/skills/google-workspace)
