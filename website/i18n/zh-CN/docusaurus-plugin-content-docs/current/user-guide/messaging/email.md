---
sidebar_position: 7
title: "邮件"
description: "通过 IMAP/SMTP 将 Hermes Agent 设置为邮件助手"
---

# 邮件设置

Hermes 可以使用标准的 IMAP（邮件接收协议）和 SMTP（邮件发送协议）收发邮件。向 Agent 的邮箱地址发送邮件，它会在同一邮件线程中回复 —— 无需特殊客户端或 Bot API。支持 Gmail、Outlook、Yahoo、Fastmail 或任何支持 IMAP/SMTP 的邮件服务商。

:::info 无外部依赖
邮件适配器使用 Python 内置的 `imaplib`、`smtplib` 和 `email` 模块。无需安装额外的包或外部服务。
:::

---

## 前提条件

- 为你的 Hermes Agent 准备一个**专用邮箱账号**（不要使用你的个人邮箱）
- 邮箱账号已启用 **IMAP**
- 如果使用 Gmail 或其他启用了两步验证的服务商，需要一个**应用专用密码**

### Gmail 设置

1. 在你的 Google 账号上启用两步验证
2. 前往[应用专用密码](https://myaccount.google.com/apppasswords)
3. 创建新的应用专用密码（选择"邮件"或"其他"）
4. 复制 16 位密码 —— 你将使用它代替常规密码

### Outlook / Microsoft 365

1. 前往[安全设置](https://account.microsoft.com/security)
2. 如果尚未启用两步验证，请先启用
3. 在"其他安全选项"下创建应用专用密码
4. IMAP 主机：`outlook.office365.com`，SMTP 主机：`smtp.office365.com`

### 其他邮件服务商

大多数邮件服务商支持 IMAP/SMTP。请查阅你的服务商文档获取：
- IMAP 主机和端口（通常为 993 端口，使用 SSL）
- SMTP 主机和端口（通常为 587 端口，使用 STARTTLS）
- 是否需要应用专用密码

---

## 第 1 步：配置 Hermes

最简单的方式：

```bash
hermes gateway setup
```

从平台菜单中选择 **Email**。向导会提示你输入邮箱地址、密码、IMAP/SMTP 主机和允许的发件人。

### 手动配置

添加到 `~/.hermes/.env`：

```bash
# 必填
EMAIL_ADDRESS=hermes@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # 应用专用密码（不是常规密码）
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_SMTP_HOST=smtp.gmail.com

# 安全设置（推荐）
EMAIL_ALLOWED_USERS=your@email.com,colleague@work.com

# 可选
EMAIL_IMAP_PORT=993                    # 默认：993（IMAP SSL）
EMAIL_SMTP_PORT=587                    # 默认：587（SMTP STARTTLS）
EMAIL_POLL_INTERVAL=15                 # 收件箱检查间隔秒数（默认：15）
EMAIL_HOME_ADDRESS=your@email.com      # Cron（定时任务）的默认投递目标
```

---

## 第 2 步：启动网关

```bash
hermes gateway              # 前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅 Linux：开机启动的系统服务
```

启动时，适配器会：
1. 测试 IMAP 和 SMTP 连接
2. 将收件箱中所有现有邮件标记为"已读"（仅处理新邮件）
3. 开始轮询新消息

---

## 工作原理

### 接收消息

适配器以可配置的间隔（默认：15 秒）轮询 IMAP 收件箱中的未读消息。对于每封新邮件：

- **主题行**作为上下文包含在内（例如 `[Subject: 部署到生产环境]`）
- **回复邮件**（主题以 `Re:` 开头）会跳过主题前缀 —— 线程上下文已经建立
- **附件**会本地缓存：
  - 图片（JPEG、PNG、GIF、WebP） → 可供视觉工具使用
  - 文档（PDF、ZIP 等） → 可供文件访问
- **仅 HTML 的邮件**会去除标签以提取纯文本
- **自己发送的消息**会被过滤掉以防止回复循环
- **自动发送/无回复的发件人**会被静默忽略 —— `noreply@`、`mailer-daemon@`、`bounce@`、`no-reply@`，以及带有 `Auto-Submitted`、`Precedence: bulk` 或 `List-Unsubscribe` 头部的邮件

### 发送回复

回复通过 SMTP 发送，带有正确的邮件线程信息：

- **In-Reply-To** 和 **References** 头部用于维护线程
- **主题行**保留 `Re:` 前缀（不会出现 `Re: Re:` 的重复）
- **Message-ID** 使用 Agent 的域名生成
- 回复以纯文本（UTF-8）发送

### 文件附件

Agent 可以在回复中发送文件附件。在响应中包含 `MEDIA:/path/to/file`，文件将作为附件发送到邮件中。

### 跳过附件

如需忽略所有入站附件（用于恶意软件防护或节省带宽），在 `config.yaml` 中添加：

```yaml
platforms:
  email:
    skip_attachments: true
```

启用后，附件和内联部分会在载荷解码之前被跳过。邮件正文文本仍会正常处理。

---

## 访问控制

邮件访问控制遵循与所有其他 Hermes 平台相同的模式：

1. **设置了 `EMAIL_ALLOWED_USERS`** → 仅处理来自这些地址的邮件
2. **未设置白名单** → 未知发件人会收到配对码
3. **`EMAIL_ALLOW_ALL_USERS=true`** → 接受任何发件人（请谨慎使用）

:::warning
**务必配置 `EMAIL_ALLOWED_USERS`。** 否则，任何知道 Agent 邮箱地址的人都可以发送命令。Agent 默认拥有终端访问权限。
:::

---

## 故障排除

| 问题 | 解决方案 |
|---------|----------|
| 启动时出现 **"IMAP 连接失败"** | 验证 `EMAIL_IMAP_HOST` 和 `EMAIL_IMAP_PORT`。确保账号已启用 IMAP。对于 Gmail，在设置 → 转发和 POP/IMAP 中启用。 |
| 启动时出现 **"SMTP 连接失败"** | 验证 `EMAIL_SMTP_HOST` 和 `EMAIL_SMTP_PORT`。检查密码是否正确（Gmail 需使用应用专用密码）。 |
| **收不到消息** | 检查 `EMAIL_ALLOWED_USERS` 是否包含发件人的邮箱。检查垃圾邮件文件夹 —— 某些服务商会标记自动回复。 |
| **"认证失败"** | 对于 Gmail，必须使用应用专用密码，而非常规密码。请先确保已启用两步验证。 |
| **重复回复** | 确保只运行一个网关实例。检查 `hermes gateway status`。 |
| **响应慢** | 默认轮询间隔为 15 秒。可使用 `EMAIL_POLL_INTERVAL=5` 缩短以加快响应（但会增加 IMAP 连接数）。 |
| **回复未形成线程** | 适配器使用 In-Reply-To 头部。某些邮件客户端（尤其是网页版）可能无法正确将自动消息归入线程。 |

---

## 安全

:::warning
**使用专用邮箱账号。** 不要使用你的个人邮箱 —— Agent 将密码存储在 `.env` 中，并通过 IMAP 拥有完整的收件箱访问权限。
:::

- 使用**应用专用密码**而非主密码（Gmail 开启两步验证后必须使用）
- 设置 `EMAIL_ALLOWED_USERS` 以限制谁可以与 Agent 交互
- 密码存储在 `~/.hermes/.env` 中 —— 保护此文件（`chmod 600`）
- IMAP 默认使用 SSL（端口 993），SMTP 默认使用 STARTTLS（端口 587）—— 连接已加密

---

## 环境变量参考

| 变量 | 必填 | 默认值 | 描述 |
|----------|----------|---------|-------------|
| `EMAIL_ADDRESS` | 是 | — | Agent 的邮箱地址 |
| `EMAIL_PASSWORD` | 是 | — | 邮箱密码或应用专用密码 |
| `EMAIL_IMAP_HOST` | 是 | — | IMAP 服务器主机（例如 `imap.gmail.com`） |
| `EMAIL_SMTP_HOST` | 是 | — | SMTP 服务器主机（例如 `smtp.gmail.com`） |
| `EMAIL_IMAP_PORT` | 否 | `993` | IMAP 服务器端口 |
| `EMAIL_SMTP_PORT` | 否 | `587` | SMTP 服务器端口 |
| `EMAIL_POLL_INTERVAL` | 否 | `15` | 收件箱检查间隔（秒） |
| `EMAIL_ALLOWED_USERS` | 否 | — | 逗号分隔的允许发件人地址 |
| `EMAIL_HOME_ADDRESS` | 否 | — | Cron（定时任务）的默认投递目标 |
| `EMAIL_ALLOW_ALL_USERS` | 否 | `false` | 允许所有发件人（不推荐） |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/email)
