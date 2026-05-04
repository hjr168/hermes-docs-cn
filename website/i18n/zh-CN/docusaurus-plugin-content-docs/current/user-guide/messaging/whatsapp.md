---
sidebar_position: 5
title: "WhatsApp"
description: "通过内置 Baileys 桥接将 Hermes Agent 设置为 WhatsApp Bot"
---

# WhatsApp 设置

Hermes 通过基于 **Baileys** 的内置桥接连接到 WhatsApp。它通过模拟 WhatsApp Web 会话工作 — **不是**通过官方 WhatsApp Business API。不需要 Meta 开发者账号或商业验证。

:::warning 非官方 API — 封号风险
WhatsApp **不**官方支持 Business API 之外的第三方 Bot。使用第三方桥接存在少量账号限制风险。为降低风险：
- **使用专用手机号**作为 Bot（不是你的个人号码）
- **不要发送大量/垃圾消息** — 保持对话式使用
- **不要向未先发消息的人自动发送消息**
:::

:::warning WhatsApp Web 协议更新
WhatsApp 会定期更新其 Web 协议，这可能暂时破坏与第三方桥接的兼容性。发生这种情况时，Hermes 会更新桥接依赖。如果 Bot 在 WhatsApp 更新后停止工作，拉取最新 Hermes 版本并重新配对。
:::

## 两种模式

| 模式 | 工作方式 | 适用场景 |
|------|---------|---------|
| **独立 Bot 号码**（推荐） | 专用一个手机号给 Bot。人们直接向该号码发消息。 | 干净的用户体验、多用户、较低封号风险 |
| **个人自聊** | 使用你自己的 WhatsApp。你给自己发消息来与 Agent 对话。 | 快速设置、单用户、测试 |

---

## 前提条件

- **Node.js v18+** 和 **npm** — WhatsApp 桥接作为 Node.js 进程运行
- **安装了 WhatsApp 的手机**（用于扫描二维码）

与旧版浏览器驱动的桥接不同，当前基于 Baileys 的桥接**不**需要本地 Chromium 或 Puppeteer 依赖栈。

---

## 步骤 1：运行设置向导

```bash
hermes whatsapp
```

向导将会：

1. 询问你想要的模式（**bot** 或 **self-chat**）
2. 如有需要安装桥接依赖
3. 在终端显示**二维码**
4. 等待你扫描

**扫描二维码：**

1. 在手机上打开 WhatsApp
2. 进入 **设置 → 已关联的设备**
3. 点击 **关联设备**
4. 将摄像头对准终端二维码

配对后，向导确认连接并退出。会话自动保存。

:::tip
如果二维码显示乱码，确保终端至少有 60 列宽且支持 Unicode。你也可以尝试不同的终端模拟器。
:::

---

## 步骤 2：获取第二个手机号码（Bot 模式）

对于 Bot 模式，你需要一个未在 WhatsApp 注册的手机号码。三个选项：

| 选项 | 费用 | 说明 |
|------|------|------|
| **Google Voice** | 免费 | 仅限美国。在 [voice.google.com](https://voice.google.com) 获取号码。通过 Google Voice 应用验证 WhatsApp。 |
| **预付 SIM 卡** | $5-15 一次性 | 任何运营商。激活、验证 WhatsApp，然后 SIM 卡可以放在抽屉里。号码必须保持活跃（每 90 天打一次电话）。 |
| **VoIP 服务** | 免费-$5/月 | TextNow、TextFree 或类似服务。部分 VoIP 号码被 WhatsApp 屏蔽 — 如果第一个不行可以多试几个。 |

获取号码后：

1. 在手机上安装 WhatsApp（或使用双卡手机上的 WhatsApp Business 应用）
2. 用新号码注册 WhatsApp
3. 运行 `hermes whatsapp` 并从该 WhatsApp 账号扫描二维码

---

## 步骤 3：配置 Hermes

在 `~/.hermes/.env` 文件中添加：

```bash
# 必需
WHATSAPP_ENABLED=true
WHATSAPP_MODE=bot                          # "bot" 或 "self-chat"

# 访问控制 — 选择以下选项之一：
WHATSAPP_ALLOWED_USERS=15551234567         # 逗号分隔的电话号码（带国家代码，不带 +）
# WHATSAPP_ALLOWED_USERS=*                 # 或使用 * 允许所有人
# WHATSAPP_ALLOW_ALL_USERS=true            # 或设置此标志（与 * 相同效果）
```

:::tip 允许所有用户的简写
设置 `WHATSAPP_ALLOWED_USERS=*` 允许**所有**发送者（等同于 `WHATSAPP_ALLOW_ALL_USERS=true`）。
这与 [Signal 群组白名单](/docs/reference/environment-variables)保持一致。
要改用配对流程，删除这两个变量并依赖 [DM 配对系统](/docs/user-guide/security#dm-pairing-system)。
:::

`~/.hermes/config.yaml` 中的可选行为设置：

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `unauthorized_dm_behavior: pair` 是全局默认值。未知 DM 发送者获得配对码。
- `whatsapp.unauthorized_dm_behavior: ignore` 让 WhatsApp 对未授权 DM 保持沉默，这对私人号码通常是更好的选择。

然后启动网关：

```bash
hermes gateway              # 前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅 Linux：开机自启系统服务
```

网关使用保存的会话自动启动 WhatsApp 桥接。

---

## 会话持久化

Baileys 桥接将其会话保存在 `~/.hermes/platforms/whatsapp/session` 下。这意味着：

- **会话在重启后保留** — 你不需要每次都重新扫描二维码
- 会话数据包含加密密钥和设备凭据
- **不要分享或提交此会话目录** — 它授予对 WhatsApp 账号的完全访问权限

---

## 重新配对

如果会话中断（手机重置、WhatsApp 更新、手动解除关联），你会在网关日志中看到连接错误。修复方法：

```bash
hermes whatsapp
```

这会生成新的二维码。再次扫描即可重新建立会话。网关会自动处理**临时**断线（网络波动、手机短暂离线），具有自动重连逻辑。

---

## 语音消息

Hermes 在 WhatsApp 上支持语音：

- **接收：** 语音消息（`.ogg` opus）使用配置的 STT Provider 自动转录：本地 `faster-whisper`、Groq Whisper（`GROQ_API_KEY`）或 OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）
- **发送：** TTS 响应作为 MP3 音频文件附件发送
- Agent 响应默认以"⚕ **Hermes Agent**"前缀开头。你可以在 `config.yaml` 中自定义或禁用：

```yaml
# ~/.hermes/config.yaml
whatsapp:
  reply_prefix: ""                          # 空字符串禁用标题
  # reply_prefix: "🤖 *My Bot*\n──────\n"  # 自定义前缀（支持 \n 换行）
```

---

## 消息格式与投递

WhatsApp 支持**流式（渐进式）响应** — Bot 在 AI 生成文本时实时编辑其消息，就像 Discord 和 Telegram 一样。在内部，WhatsApp 被归类为 TIER_MEDIUM 平台。

### 分块

长响应会自动按每块 **4,096 字符**（WhatsApp 的实际显示限制）拆分为多条消息。你不需要配置任何东西 — 网关自动处理拆分并按顺序发送。

### WhatsApp 兼容 Markdown

AI 响应中的标准 Markdown 会自动转换为 WhatsApp 原生格式：

| Markdown | WhatsApp | 渲染为 |
|----------|----------|--------|
| `**bold**` | `*bold*` | **bold** |
| `~~strikethrough~~` | `~strikethrough~` | ~~strikethrough~~ |
| `# Heading` | `*Heading*` | 粗体文本（无原生标题） |
| `[link text](url)` | `link text (url)` | 内联 URL |

代码块和行内代码保持原样，因为 WhatsApp 原生支持三反引号格式。

### 工具进度

当 Agent 调用工具（网页搜索、文件操作等）时，WhatsApp 显示实时进度指示器，显示哪个工具正在运行。默认启用 — 无需配置。

---

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| **二维码无法扫描** | 确保终端足够宽（60+ 列）。尝试不同终端。确保从正确的 WhatsApp 账号扫描（Bot 号码，不是个人）。 |
| **二维码过期** | 二维码约每 20 秒刷新。如果超时，重启 `hermes whatsapp`。 |
| **会话不持久化** | 检查 `~/.hermes/platforms/whatsapp/session` 是否存在且可写。如果使用容器，将其挂载为持久卷。 |
| **意外登出** | WhatsApp 会在长时间不活跃后解除设备关联。保持手机开机并联网，如需要使用 `hermes whatsapp` 重新配对。 |
| **桥接崩溃或重连循环** | 重启网关，更新 Hermes，如果会话被 WhatsApp 协议变更使无效则重新配对。 |
| **Bot 在 WhatsApp 更新后停止工作** | 更新 Hermes 获取最新桥接版本，然后重新配对。 |
| **macOS："Node.js not installed" 但终端中 node 可用** | launchd 服务不继承你的 shell PATH。运行 `hermes gateway install` 将当前 PATH 重新快照到 plist，然后 `hermes gateway start`。参见[网关服务文档](./index.md#macos-launchd)。 |
| **消息未被接收** | 验证 `WHATSAPP_ALLOWED_USERS` 包含发送者号码（带国家代码，不带 `+` 或空格），或设置为 `*` 允许所有人。在 `.env` 中设置 `WHATSAPP_DEBUG=true` 并重启网关以在 `bridge.log` 中查看原始消息事件。 |
| **Bot 用配对码回复陌生人** | 如果希望未授权 DM 被静默忽略，在 `~/.hermes/config.yaml` 中设置 `whatsapp.unauthorized_dm_behavior: ignore`。 |

---

## 安全

:::warning
在上线前**配置访问控制**。设置 `WHATSAPP_ALLOWED_USERS` 为特定电话号码（包含国家代码，不带 `+`），使用 `*` 允许所有人，或设置 `WHATSAPP_ALLOW_ALL_USERS=true`。如果没有设置以上任何一项，网关会作为安全措施**拒绝所有传入消息**。
:::

默认情况下，未授权 DM 仍会收到配对码回复。如果你希望私人 WhatsApp 号码对陌生人完全保持沉默，设置：

```yaml
whatsapp:
  unauthorized_dm_behavior: ignore
```

- `~/.hermes/platforms/whatsapp/session` 目录包含完整会话凭据 — 像保护密码一样保护它
- 设置文件权限：`chmod 700 ~/.hermes/platforms/whatsapp/session`
- 为 Bot 使用**专用手机号**以隔离与个人账号的风险
- 如果你怀疑凭据泄露，从 WhatsApp → 设置 → 已关联的设备中解除设备关联
- 日志中的电话号码已部分脱敏，但仍需审查你的日志保留策略

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/messaging/whatsapp)
