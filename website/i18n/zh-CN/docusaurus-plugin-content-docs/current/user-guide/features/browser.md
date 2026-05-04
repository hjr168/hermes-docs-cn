---
title: 浏览器自动化
description: 使用多种 Provider 控制浏览器，通过 CDP 使用本地 Chrome，或使用云浏览器进行网页交互、表单填充、数据抓取等。
sidebar_label: 浏览器
sidebar_position: 5
---

# 浏览器自动化

Hermes Agent 包含完整的浏览器自动化工具集，支持多种后端选项：

- **Browserbase 云模式** — 通过 [Browserbase](https://browserbase.com) 提供托管云浏览器和反 Bot 工具
- **Browser Use 云模式** — 通过 [Browser Use](https://browser-use.com) 作为替代云浏览器 Provider
- **Firecrawl 云模式** — 通过 [Firecrawl](https://firecrawl.dev) 提供内置抓取功能的云浏览器
- **Camofox 本地模式** — 通过 [Camofox](https://github.com/jo-inc/camofox-browser) 提供本地反检测浏览（基于 Firefox 的指纹伪装）
- **通过 CDP 使用本地 Chrome** — 使用 `/browser connect` 将浏览器工具连接到你自己的 Chrome 实例
- **本地浏览器模式** — 通过 `agent-browser` CLI 和本地 Chromium 安装

在所有模式下，Agent 都可以导航网站、与页面元素交互、填写表单和提取信息。

## 概览

页面以**无障碍树（Accessibility Tree）**（基于文本的快照）形式呈现，非常适合 LLM Agent。交互元素获得 ref ID（如 `@e1`、`@e2`），Agent 用它们进行点击和输入。

关键能力：

- **多 Provider 云执行** — Browserbase、Browser Use 或 Firecrawl — 无需本地浏览器
- **本地 Chrome 集成** — 通过 CDP 连接到运行中的 Chrome 进行实时浏览
- **内置隐身** — 随机指纹、CAPTCHA 解决、住宅代理（Browserbase）
- **会话隔离** — 每个任务获得独立的浏览器会话
- **自动清理** — 不活跃的会话在超时后关闭
- **视觉分析** — 截图 + AI 分析用于视觉理解

## 设置

:::tip Nous 订阅用户
如果你有付费的 [Nous Portal](https://portal.nousresearch.com) 订阅，可以通过 **[Tool Gateway](tool-gateway.md)** 使用浏览器自动化，无需单独的 API Key。运行 `hermes model` 或 `hermes tools` 启用。
:::

### Browserbase 云模式

使用 Browserbase 托管云浏览器，添加：

```bash
# 添加到 ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

在 [browserbase.com](https://browserbase.com) 获取凭据。

### Browser Use 云模式

使用 Browser Use 作为云浏览器 Provider，添加：

```bash
# 添加到 ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

在 [browser-use.com](https://browser-use.com) 获取 API Key。Browser Use 通过其 REST API 提供云浏览器。如果同时设置了 Browserbase 和 Browser Use 凭据，Browserbase 优先。

### Firecrawl 云模式

使用 Firecrawl 作为云浏览器 Provider，添加：

```bash
# 添加到 ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***
```

在 [firecrawl.dev](https://firecrawl.dev) 获取 API Key。然后选择 Firecrawl 作为浏览器 Provider：

```bash
hermes setup tools
# → Browser Automation → Firecrawl
```

可选设置：

```bash
# 自托管 Firecrawl 实例（默认：https://api.firecrawl.dev）
FIRECRAWL_API_URL=http://localhost:3002

# 会话 TTL，单位秒（默认：300）
FIRECRAWL_BROWSER_TTL=600
```

### Camofox 本地模式

[Camofox](https://github.com/jo-inc/camofox-browser) 是一个自托管的 Node.js 服务器，封装了 Camoufox（一个带有 C++ 指纹伪装的 Firefox 分支）。它提供无需云依赖的本地反检测浏览。

```bash
# 安装并运行
git clone https://github.com/jo-inc/camofox-browser && cd camofox-browser
npm install && npm start   # 首次运行时下载 Camoufox（约 300MB）

# 或通过 Docker
docker run -d --network host -e CAMOFOX_PORT=9377 jo-inc/camofox-browser
```

然后在 `~/.hermes/.env` 中设置：

```bash
CAMOFOX_URL=http://localhost:9377
```

或通过 `hermes tools` → Browser Automation → Camofox 配置。

设置 `CAMOFOX_URL` 后，所有浏览器工具会自动通过 Camofox 路由，而不是 Browserbase 或 agent-browser。

#### 持久浏览器会话

默认情况下，每个 Camofox 会话获得随机身份 — Cookie 和登录状态不会在 Agent 重启后保留。要启用持久浏览器会话，在 `~/.hermes/config.yaml` 中添加：

```yaml
browser:
  camofox:
    managed_persistence: true
```

然后完全重启 Hermes 以加载新配置。

:::warning 嵌套路径很重要
Hermes 读取 `browser.camofox.managed_persistence`，**而不是**顶层的 `managed_persistence`。常见错误是写成：

```yaml
# ❌ 错误 — Hermes 会忽略此配置
managed_persistence: true
```

如果标志放在错误的路径，Hermes 会静默回退到随机临时 `userId`，你的登录状态会在每次会话时丢失。
:::

##### Hermes 做了什么
- 向 Camofox 发送确定性的、基于 Profile 的 `userId`，以便服务器可以在会话间复用相同的 Firefox Profile。
- 清理时跳过服务器端的上下文销毁，因此 Cookie 和登录状态在 Agent 任务间保留。
- 将 `userId` 限定在活跃的 Hermes Profile 范围内，因此不同的 Hermes Profile 获得不同的浏览器 Profile（Profile 隔离）。

##### Hermes 不做什么
- 不会强制 Camofox 服务器持久化。Hermes 只发送稳定的 `userId`；服务器必须通过将该 `userId` 映射到持久 Firefox Profile 目录来支持它。
- 如果你的 Camofox 服务器构建将每个请求视为临时的（例如总是调用 `browser.newContext()` 而不加载存储的 Profile），Hermes 无法使这些会话持久化。确保你运行的 Camofox 构建实现了基于 userId 的 Profile 持久化。

##### 验证是否正常工作

1. 启动 Hermes 和你的 Camofox 服务器。
2. 在浏览器任务中打开 Google（或任何登录站点）并手动登录。
3. 正常结束浏览器任务。
4. 启动新的浏览器任务。
5. 再次打开同一站点 — 你应该仍然保持登录状态。

如果步骤 5 让你登出了，说明 Camofox 服务器没有支持稳定的 `userId`。请仔细检查配置路径，确认编辑 `config.yaml` 后完全重启了 Hermes，并验证你的 Camofox 服务器版本支持持久的每用户 Profile。

##### 状态存储位置

Hermes 从 Profile 范围的目录 `~/.hermes/browser_auth/camofox/`（或非默认 Profile 下 `$HERMES_HOME` 的等效路径）派生稳定的 `userId`。实际浏览器 Profile 数据存储在 Camofox 服务器端，以该 `userId` 为键。要完全重置持久 Profile，在 Camofox 服务器上清除它并删除相应 Hermes Profile 的状态目录。

#### VNC 实时查看

当 Camofox 以有头模式（带可见浏览器窗口）运行时，它在其健康检查响应中暴露一个 VNC 端口。Hermes 自动发现此端口并在导航响应中包含 VNC URL，因此 Agent 可以分享链接让你实时观看浏览器。

### 通过 CDP 使用本地 Chrome（`/browser connect`）

除了云 Provider，你还可以通过 Chrome DevTools Protocol（CDP）将 Hermes 浏览器工具连接到你自己的运行中的 Chrome 实例。这在你想要实时看到 Agent 正在做什么、与需要你自己 Cookie/会话的页面交互，或避免云浏览器费用时很有用。

:::note
`/browser connect` 是一个**交互式 CLI 斜杠命令** — 它不会由网关分发。如果你尝试在 WebUI、Telegram、Discord 或其他网关聊天中运行它，消息会作为纯文本发送给 Agent，命令不会执行。请从终端（`hermes` 或 `hermes chat`）启动 Hermes 并在那里执行 `/browser connect`。
:::

在 CLI 中使用：

```
/browser connect              # 连接到 ws://localhost:9222 的 Chrome
/browser connect ws://host:port  # 连接到指定的 CDP 端点
/browser status               # 检查当前连接
/browser disconnect            # 分离并返回云/本地模式
```

如果 Chrome 尚未以远程调试模式运行，Hermes 会尝试使用 `--remote-debugging-port=9222` 自动启动它。

:::tip
要手动启用 CDP 启动 Chrome，使用专用的 user-data-dir，这样即使 Chrome 已经以你的正常 Profile 运行，调试端口也能正常开启：

```bash
# Linux
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/.hermes/chrome-debug \
  --no-first-run \
  --no-default-browser-check &

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.hermes/chrome-debug" \
  --no-first-run \
  --no-default-browser-check &
```

然后启动 Hermes CLI 并运行 `/browser connect`。

**为什么需要 `--user-data-dir`？** 没有它，在已有常规 Chrome 实例运行时启动 Chrome 通常会在现有进程上打开新窗口 — 而该进程没有以 `--remote-debugging-port` 启动，因此端口 9222 永远不会开启。专用 user-data-dir 强制启动新的 Chrome 进程，调试端口才能真正监听。`--no-first-run --no-default-browser-check` 跳过新 Profile 的首次启动向导。
:::

通过 CDP 连接时，所有浏览器工具（`browser_navigate`、`browser_click` 等）在你的实时 Chrome 实例上操作，而不是启动云会话。

### 本地浏览器模式

如果你**没有**设置任何云凭据也不使用 `/browser connect`，Hermes 仍然可以通过由 `agent-browser` 驱动的本地 Chromium 安装使用浏览器工具。

### 可选环境变量

```bash
# 用于更好 CAPTCHA 解决的住宅代理（默认："true"）
BROWSERBASE_PROXIES=true

# 使用自定义 Chromium 的高级隐身 — 需要 Scale Plan（默认："false"）
BROWSERBASE_ADVANCED_STEALTH=false

# 断线后会话重连 — 需要付费计划（默认："true"）
BROWSERBASE_KEEP_ALIVE=true

# 自定义会话超时，单位毫秒（默认：项目默认值）
# 示例：600000（10分钟），1800000（30分钟）
BROWSERBASE_SESSION_TIMEOUT=600000

# 自动清理前的非活跃超时，单位秒（默认：120）
BROWSER_INACTIVITY_TIMEOUT=120
```

### 安装 agent-browser CLI

```bash
npm install -g agent-browser
# 或在仓库中本地安装：
npm install
```

:::info
`browser` 工具集必须包含在你的配置的 `toolsets` 列表中，或通过 `hermes config set toolsets '["hermes-cli", "browser"]'` 启用。
:::

## 可用工具

### `browser_navigate`

导航到 URL。必须在任何其他浏览器工具之前调用。初始化 Browserbase 会话。

```
导航到 https://github.com/NousResearch
```

:::tip
对于简单的信息检索，推荐使用 `web_search` 或 `web_extract` — 它们更快更便宜。当你需要与页面**交互**（点击按钮、填写表单、处理动态内容）时使用浏览器工具。
:::

### `browser_snapshot`

获取当前页面无障碍树的基于文本的快照。返回带有 ref ID（如 `@e1`、`@e2`）的交互元素，用于 `browser_click` 和 `browser_type`。

- **`full=false`**（默认）：紧凑视图，仅显示交互元素
- **`full=true`**：完整页面内容

超过 8000 字符的快照会被 LLM 自动摘要。

### `browser_click`

点击由快照中 ref ID 标识的元素。

```
点击 @e5 按下 "登录" 按钮
```

### `browser_type`

在输入框中输入文本。先清除字段，然后输入新文本。

```
在搜索框 @e3 中输入 "hermes agent"
```

### `browser_scroll`

向上或向下滚动页面以显示更多内容。

```
向下滚动查看更多结果
```

### `browser_press`

按下键盘按键。适用于提交表单或导航。

```
按 Enter 提交表单
```

支持的按键：`Enter`、`Tab`、`Escape`、`ArrowDown`、`ArrowUp` 等。

### `browser_back`

导航回浏览器历史中的上一页。

### `browser_get_images`

列出当前页面上所有图片及其 URL 和 alt 文本。适用于查找要分析的图片。

### `browser_vision`

截图并用视觉 AI 分析。当文本快照无法捕获重要视觉信息时使用 — 特别适用于 CAPTCHA、复杂布局或视觉验证挑战。

截图会持久保存，文件路径与 AI 分析一起返回。在消息平台（Telegram、Discord、Slack、WhatsApp）上，你可以要求 Agent 分享截图 — 它会通过 `MEDIA:` 机制作为原生照片附件发送。

```
这个页面上的图表显示了什么？
```

截图存储在 `~/.hermes/cache/screenshots/` 中，24 小时后自动清理。

### `browser_console`

获取浏览器控制台输出（log/warn/error 消息）和当前页面未捕获的 JavaScript 异常。对于检测不出现在无障碍树中的静默 JS 错误至关重要。

```
检查浏览器控制台是否有 JavaScript 错误
```

使用 `clear=True` 在读取后清除控制台，这样后续调用只显示新消息。

### `browser_cdp`

原始 Chrome DevTools Protocol 透传 — 其他工具未覆盖的浏览器操作的逃生通道。用于原生对话框处理、iframe 内执行、Cookie/网络控制或 Agent 需要的任何 CDP 操作。

**仅在会话开始时可达到 CDP 端点时可用** — 即 `/browser connect` 已附加到运行中的 Chrome，或 `config.yaml` 中设置了 `browser.cdp_url`。默认的本地 Agent-浏览器模式、Camofox 和云提供商（Browserbase、Browser Use、Firecrawl）目前不向此工具暴露 CDP — 云提供商有每会话 CDP URL，但实时会话路由是后续工作。

**CDP 方法参考：** https://chromedevtools.github.io/devtools-protocol/ — Agent 可以 `web_extract` 特定方法的页面来查看参数和返回格式。

常见模式：

```
# 列出标签页（浏览器级别，无需 target_id）
browser_cdp(method="Target.getTargets")

# 处理标签页上的原生 JS 对话框
browser_cdp(method="Page.handleJavaScriptDialog",
            params={"accept": true, "promptText": ""},
            target_id="<tabId>")

# 在特定标签页中执行 JS
browser_cdp(method="Runtime.evaluate",
            params={"expression": "document.title", "returnByValue": true},
            target_id="<tabId>")

# 获取所有 Cookie
browser_cdp(method="Network.getAllCookies")
```

浏览器级别的方法（`Target.*`、`Browser.*`、`Storage.*`）省略 `target_id`。页面级别的方法（`Page.*`、`Runtime.*`、`DOM.*`、`Emulation.*`）需要从 `Target.getTargets` 获取的 `target_id`。每次无状态调用独立 — 调用之间不保持会话。

**跨域 iframe：** 传递 `frame_id`（从 `browser_snapshot.frame_tree.children[]`，其中 `is_oopif=true`）以通过该 iframe 的监督器实时会话路由 CDP 调用。这就是跨域 iframe 内部 `Runtime.evaluate` 在 Browserbase 上工作的方式，因为无状态 CDP 连接会遇到签名 URL 过期。示例：

```
browser_cdp(
  method="Runtime.evaluate",
  params={"expression": "document.title", "returnByValue": True},
  frame_id="<frame_id from browser_snapshot>",
)
```

同域 iframe 不需要 `frame_id` — 改用顶级 `Runtime.evaluate` 中的 `document.querySelector('iframe').contentDocument`。

### `browser_dialog`

响应原生 JS 对话框（`alert` / `confirm` / `prompt` / `beforeunload`）。在此工具存在之前，对话框会静默阻塞页面的 JavaScript 线程，后续 `browser_*` 调用会挂起或抛出错误；现在 Agent 在 `browser_snapshot` 输出中看到待处理对话框并明确响应。

**工作流程：**
1. 调用 `browser_snapshot`。如果对话框阻塞了页面，它显示为 `pending_dialogs: [{"id": "d-1", "type": "alert", "message": "..."}]`。
2. 调用 `browser_dialog(action="accept")` 或 `browser_dialog(action="dismiss")`。对于 `prompt()` 对话框，传递 `prompt_text="..."` 来提供响应。
3. 重新快照 — `pending_dialogs` 为空；页面的 JS 线程已恢复。

**检测通过持久 CDP 监督器自动进行** — 每个任务一个 WebSocket，订阅 Page/Runtime/Target 事件。监督器还在快照中填充 `frame_tree` 字段，使 Agent 可以看到当前页面的 iframe 结构，包括跨域（OOPIF）iframe。

**可用性矩阵：**

| 后端 | 通过 `pending_dialogs` 检测 | 响应（`browser_dialog` 工具） |
|---|---|---|
| 通过 `/browser connect` 或 `browser.cdp_url` 的本地 Chrome | ✓ | ✓ 完整工作流程 |
| Browserbase | ✓ | ✓ 完整工作流程（通过注入的 XHR 桥接） |
| Camofox / 默认本地 agent-browser | ✗ | ✗（无 CDP 端点） |

**在 Browserbase 上的工作原理。** Browserbase 的 CDP 代理在服务端 ~10ms 内自动关闭真实原生对话框，所以我们不能使用 `Page.handleJavaScriptDialog`。监督器通过 `Page.addScriptToEvaluateOnNewDocument` 注入一个小脚本，用同步 XHR 覆盖 `window.alert`/`confirm`/`prompt`。我们通过 `Fetch.enable` 拦截这些 XHR — 页面的 JS 线程在 XHR 上保持阻塞，直到我们用 Agent 的响应调用 `Fetch.fulfillRequest`。`prompt()` 返回值不变地往返进入页面 JS。

**对话框策略** 在 `config.yaml` 的 `browser.dialog_policy` 下配置：

| 策略 | 行为 |
|--------|----------|
| `must_respond`（默认） | 捕获，在快照中显示，等待显式 `browser_dialog()` 调用。如果 `browser.dialog_timeout_s`（默认 300 秒）后没有响应，安全自动关闭，这样有缺陷的 Agent 不会永远停滞。 |
| `auto_dismiss` | 立即捕获并关闭。Agent 仍会在 `browser_state` 历史中看到对话框，但不需要采取行动。 |
| `auto_accept` | 立即捕获并接受。适用于带有强制 `beforeunload` 对话框的页面。 |

**Frame tree** 在 `browser_snapshot.frame_tree` 内部限制为 30 帧和 OOPIF 深度 2，以保持广告密集页面的负载bounded。当达到限制时会显示 `truncated: true` 标志；需要完整树的 Agent 可以使用 `Page.getFrameTree` 的 `browser_cdp`。

## 实用示例

### 填写网页表单

```
用户：用我的邮箱 john@example.com 在 example.com 注册账号

Agent 工作流：
1. browser_navigate("https://example.com/signup")
2. browser_snapshot()  → 看到带有 ref 的表单字段
3. browser_type(ref="@e3", text="john@example.com")
4. browser_type(ref="@e5", text="SecurePass123")
5. browser_click(ref="@e8")  → 点击 "Create Account"
6. browser_snapshot()  → 确认成功
```

### 研究动态内容

```
用户：GitHub 上现在最热门的仓库有哪些？

Agent 工作流：
1. browser_navigate("https://github.com/trending")
2. browser_snapshot(full=true)  → 读取热门仓库列表
3. 返回格式化结果
```

## 会话录制

自动将浏览器会话录制为 WebM 视频文件：

```yaml
browser:
  record_sessions: true  # 默认：false
```

启用后，录制在首次 `browser_navigate` 时自动开始，并在会话关闭时保存到 `~/.hermes/browser_recordings/`。在本地和云（Browserbase）模式下均可工作。超过 72 小时的录制会自动清理。

## 隐身功能

Browserbase 提供自动隐身能力：

| 功能 | 默认 | 说明 |
|------|------|------|
| 基础隐身 | 始终开启 | 随机指纹、视口随机化、CAPTCHA 解决 |
| 住宅代理 | 开启 | 通过住宅 IP 路由以获得更好访问 |
| 高级隐身 | 关闭 | 自定义 Chromium 构建，需要 Scale Plan |
| Keep Alive | 开启 | 网络波动后的会话重连 |

:::note
如果你的计划没有付费功能，Hermes 会自动回退 — 先禁用 `keepAlive`，再禁用代理 — 因此免费计划下浏览仍然可用。
:::

## 会话管理

- 每个任务通过 Browserbase 获得隔离的浏览器会话
- 会话在非活跃后自动清理（默认：2 分钟）
- 后台线程每 30 秒检查一次过期会话
- 进程退出时运行紧急清理以防止孤立会话
- 会话通过 Browserbase API 释放（`REQUEST_RELEASE` 状态）

## 限制

- **基于文本的交互** — 依赖无障碍树，而非像素坐标
- **快照大小** — 大页面可能被截断或在 8000 字符处被 LLM 摘要
- **会话超时** — 云会话根据你的 Provider 计划设置过期
- **费用** — 云会话消耗 Provider 额度；会话在对话结束或非活跃后自动清理。使用 `/browser connect` 进行免费的本地浏览。
- **无文件下载** — 无法从浏览器下载文件

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/browser)
