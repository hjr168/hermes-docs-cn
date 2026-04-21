---
sidebar_position: 15
title: "Web 仪表板"
description: "基于浏览器的仪表板，用于管理配置、API 密钥、会话、日志、分析、Cron 定时任务和技能"
sidebar_label: Web 仪表板
---

# Web 仪表板

Web 仪表板是一个基于浏览器的 UI，用于管理你的 Hermes Agent 安装。你可以通过清爽的 Web 界面配置设置、管理 API 密钥和监控会话，而无需编辑 YAML 文件或运行 CLI 命令。

## 快速开始

```bash
hermes dashboard
```

这会启动一个本地 Web 服务器并在浏览器中打开 `http://127.0.0.1:9119`。仪表板完全在你的机器上运行——没有数据离开 localhost。

### 选项

| 标志 | 默认值 | 说明 |
|------|---------|-------------|
| `--port` | `9119` | Web 服务器运行端口 |
| `--host` | `127.0.0.1` | 绑定地址 |
| `--no-open` | — | 不自动打开浏览器 |

```bash
# 自定义端口
hermes dashboard --port 8080

# 绑定到所有接口（在共享网络上请谨慎使用）
hermes dashboard --host 0.0.0.0

# 启动时不打开浏览器
hermes dashboard --no-open
```

## 前置条件

Web 仪表板需要 FastAPI 和 Uvicorn。安装方式：

```bash
pip install hermes-agent[web]
```

如果你使用 `pip install hermes-agent[all]` 安装，Web 依赖已经包含在内。

当你未安装依赖时运行 `hermes dashboard`，它会告诉你需要安装什么。如果前端尚未构建且 `npm` 可用，它会在首次启动时自动构建。

## 页面

### 状态

首页展示你的安装实时概览：

- **Agent 版本**和发布日期
- **网关状态** — 运行中/已停止、PID、已连接的平台及其状态
- **活动会话** — 最近 5 分钟内活跃的会话数
- **最近会话** — 最近 20 个会话列表，显示模型、消息数、令牌使用量和对话预览

状态页每 5 秒自动刷新。

### 配置

基于表单的 `config.yaml` 编辑器。所有 150+ 个配置字段从 `DEFAULT_CONFIG` 自动发现，按标签分类组织：

- **model** — 默认模型、提供商、基础 URL、推理设置
- **terminal** — 后端（local/docker/ssh/modal）、超时、Shell 偏好
- **display** — 皮肤、工具进度、恢复显示、加载动画设置
- **agent** — 最大迭代次数、网关超时、服务层级
- **delegation** — 子代理限制、推理力度
- **memory** — 提供商选择、上下文注入设置
- **approvals** — 危险命令审批模式（ask/yolo/deny）
- 更多 — config.yaml 的每个部分都有对应的表单字段

具有已知有效值的字段（终端后端、皮肤、审批模式等）渲染为下拉框。布尔值渲染为开关。其他都是文本输入框。

**操作：**

- **Save** — 立即将更改写入 `config.yaml`
- **Reset to defaults** — 将所有字段恢复为默认值（不会保存直到你点击 Save）
- **Export** — 以 JSON 格式下载当前配置
- **Import** — 上传 JSON 配置文件替换当前值

:::tip
配置更改在下次 Agent 会话或网关重启时生效。Web 仪表板编辑的 `config.yaml` 文件与 `hermes config set` 和网关读取的是同一个文件。
:::

### API 密钥

管理存储 API 密钥和凭证的 `.env` 文件。密钥按类别分组：

- **LLM 提供商** — OpenRouter、Anthropic、OpenAI、DeepSeek 等
- **工具 API 密钥** — Browserbase、Firecrawl、Tavily、ElevenLabs 等
- **消息平台** — Telegram、Discord、Slack bot 令牌等
- **Agent 设置** — 非密钥环境变量如 `API_SERVER_ENABLED`

每个密钥显示：
- 是否已设置（带脱敏预览值）
- 用途描述
- 提供商注册/密钥页面的链接
- 设置或更新值的输入框
- 删除按钮

高级/不常用的密钥默认隐藏在切换开关后面。

### 会话

浏览和检查所有 Agent 会话。每行显示会话标题、来源平台图标（CLI、Telegram、Discord、Slack、cron）、模型名称、消息数、工具调用数和上次活跃时间。活跃会话标有脉冲徽章。

- **搜索** — 使用 FTS5 对所有消息内容进行全文搜索。结果显示高亮片段，展开时自动滚动到第一个匹配消息。
- **展开** — 点击会话加载其完整消息历史。消息按角色（用户、助手、系统、工具）颜色编码，并以 Markdown 渲染并带有语法高亮。
- **工具调用** — 带有工具调用的助手消息显示可折叠块，包含函数名和 JSON 参数。
- **删除** — 使用垃圾桶图标移除会话及其消息历史。

### 日志

查看 Agent、网关和错误日志文件，支持过滤和实时跟踪。

- **文件** — 切换 `agent`、`errors` 和 `gateway` 日志文件
- **级别** — 按日志级别过滤：ALL、DEBUG、INFO、WARNING 或 ERROR
- **组件** — 按来源组件过滤：all、gateway、agent、tools、cli 或 cron
- **行数** — 选择显示行数（50、100、200 或 500）
- **自动刷新** — 切换实时跟踪，每 5 秒轮询新日志行
- **颜色编码** — 日志行按严重程度着色（红色为错误、黄色为警告、暗色为调试）

### 分析

基于会话历史计算的使用量和成本分析。选择时间范围（7、30 或 90 天）查看：

- **摘要卡片** — 总令牌数（输入/输出）、缓存命中率、总预估或实际成本，以及总会话数及日均
- **每日令牌图表** — 堆叠柱状图显示每天的输入和输出令牌使用量，悬停提示显示细分和成本
- **每日细分表** — 日期、会话数、输入令牌、输出令牌、缓存命中率和成本
- **按模型细分** — 表格显示使用的每个模型、其会话数、令牌使用量和预估成本

### Cron 定时任务

创建和管理定时 Cron（定时任务），按周期性计划运行 Agent 提示。

- **创建** — 填写名称（可选）、提示、cron 表达式（如 `0 9 * * *`）和投递目标（local、Telegram、Discord、Slack 或 email）
- **任务列表** — 每个任务显示其名称、提示预览、计划表达式、状态徽章（enabled/paused/error）、投递目标、上次运行时间和下次运行时间
- **暂停 / 恢复** — 在活动和暂停状态之间切换任务
- **立即触发** — 在正常计划之外立即执行任务
- **删除** — 永久移除 Cron 任务

### 技能

浏览、搜索和切换技能及工具集。技能从 `~/.hermes/skills/` 加载，按类别分组。

- **搜索** — 按名称、描述或类别过滤技能和工具集
- **类别过滤** — 点击类别标签缩小列表（如 MLOps、MCP、Red Teaming、AI）
- **切换** — 通过开关启用或禁用单个技能。更改在下次会话时生效。
- **工具集** — 单独的分区显示内置工具集（文件操作、网页浏览等）及其活动/非活动状态、设置要求和包含的工具列表

:::warning 安全
Web 仪表板读取和写入你的 `.env` 文件，其中包含 API 密钥和密钥。它默认绑定到 `127.0.0.1` — 只能从你的本地机器访问。如果你绑定到 `0.0.0.0`，你网络上的任何人都可以查看和修改你的凭证。仪表板本身没有身份验证。
:::

## `/reload` 斜杠命令

仪表板还向交互式 CLI 添加了 `/reload` 斜杠命令。通过 Web 仪表板（或直接编辑 `.env`）更改 API 密钥后，在活动的 CLI 会话中使用 `/reload` 来加载更改，无需重启：

```
You → /reload
  Reloaded .env (3 var(s) updated)
```

这会重新将 `~/.hermes/.env` 读入运行进程的环境。适用于通过仪表板添加新的提供商密钥后立即使用。

## REST API

Web 仪表板暴露了前端使用的 REST API。你也可以直接调用这些端点进行自动化：

### GET /api/status

返回 Agent 版本、网关状态、平台状态和活动会话数。

### GET /api/sessions

返回最近 20 个会话及其元数据（模型、令牌数、时间戳、预览）。

### GET /api/config

返回当前 `config.yaml` 内容的 JSON。

### GET /api/config/defaults

返回默认配置值。

### GET /api/config/schema

返回描述每个配置字段的 schema — 类型、描述、类别和适用的选择选项。前端使用此信息为每个字段渲染正确的输入控件。

### PUT /api/config

保存新配置。请求体：`{"config": {...}}`。

### GET /api/env

返回所有已知环境变量及其设置/未设置状态、脱敏值、描述和类别。

### PUT /api/env

设置一个环境变量。请求体：`{"key": "VAR_NAME", "value": "secret"}`。

### DELETE /api/env

移除一个环境变量。请求体：`{"key": "VAR_NAME"}`。

### GET /api/sessions/\{session\_id\}

返回单个会话的元数据。

### GET /api/sessions/\{session\_id\}/messages

返回会话的完整消息历史，包括工具调用和时间戳。

### GET /api/sessions/search

对消息内容进行全文搜索。查询参数：`q`。返回匹配的会话 ID 及高亮片段。

### DELETE /api/sessions/\{session\_id\}

删除一个会话及其消息历史。

### GET /api/logs

返回日志行。查询参数：`file`（agent/errors/gateway）、`lines`（数量）、`level`、`component`。

### GET /api/analytics/usage

返回令牌使用量、成本和会话分析。查询参数：`days`（默认 30）。响应包含每日细分和按模型汇总。

### GET /api/cron/jobs

返回所有已配置的 Cron 任务及其状态、计划和运行历史。

### POST /api/cron/jobs

创建新的 Cron 任务。请求体：`{"prompt": "...", "schedule": "0 9 * * *", "name": "...", "deliver": "local"}`。

### POST /api/cron/jobs/\{job\_id\}/pause

暂停一个 Cron 任务。

### POST /api/cron/jobs/\{job\_id\}/resume

恢复一个暂停的 Cron 任务。

### POST /api/cron/jobs/\{job\_id\}/trigger

在计划之外立即触发一个 Cron 任务。

### DELETE /api/cron/jobs/\{job\_id\}

删除一个 Cron 任务。

### GET /api/skills

返回所有技能及其名称、描述、类别和启用状态。

### PUT /api/skills/toggle

启用或禁用一个技能。请求体：`{"name": "skill-name", "enabled": true}`。

### GET /api/tools/toolsets

返回所有工具集及其标签、描述、工具列表和活动/已配置状态。

## CORS

Web 服务器将 CORS 限制为仅 localhost 来源：

- `http://localhost:9119` / `http://127.0.0.1:9119`（生产环境）
- `http://localhost:3000` / `http://127.0.0.1:3000`
- `http://localhost:5173` / `http://127.0.0.1:5173`（Vite 开发服务器）

如果你在自定义端口上运行服务器，该来源会自动添加。

## 开发

如果你在为 Web 仪表板前端贡献代码：

```bash
# 终端 1：启动后端 API
hermes dashboard --no-open

# 终端 2：启动带 HMR 的 Vite 开发服务器
cd web/
npm install
npm run dev
```

`http://localhost:5173` 上的 Vite 开发服务器将 `/api` 请求代理到 `http://127.0.0.1:9119` 的 FastAPI 后端。

前端使用 React 19、TypeScript、Tailwind CSS v4 和 shadcn/ui 风格的组件构建。生产构建输出到 `hermes_cli/web_dist/`，由 FastAPI 服务器作为静态 SPA 提供。

## 更新时自动构建

当你运行 `hermes update` 时，如果 `npm` 可用，Web 前端会自动重新构建。这保持仪表板与代码更新同步。如果未安装 `npm`，更新会跳过前端构建，`hermes dashboard` 会在首次启动时构建它。

## 主题

仪表板支持视觉主题，可以改变颜色、叠加效果和整体感觉。从顶栏实时切换主题——点击语言切换器旁边的调色板图标。

### 内置主题

| 主题 | 说明 |
|-------|-------------|
| **Hermes Teal** | 经典深青色（默认） |
| **Midnight** | 深蓝紫配冷色调 |
| **Ember** | 暖深红与青铜 |
| **Mono** | 干净灰度，极简 |
| **Cyberpunk** | 黑底霓虹绿 |
| **Rosé** | 柔粉与暖象牙白 |

主题选择持久化到 `config.yaml` 的 `dashboard.theme` 下，页面加载时恢复。

### 自定义主题

在 `~/.hermes/dashboard-themes/` 中创建 YAML 文件：

```yaml
# ~/.hermes/dashboard-themes/ocean.yaml
name: ocean
label: Ocean
description: 深海蓝色配珊瑚色调

colors:
  background: "#0a1628"
  foreground: "#e0f0ff"
  card: "#0f1f35"
  card-foreground: "#e0f0ff"
  primary: "#ff6b6b"
  primary-foreground: "#0a1628"
  secondary: "#152540"
  secondary-foreground: "#e0f0ff"
  muted: "#1a2d4a"
  muted-foreground: "#7899bb"
  accent: "#1f3555"
  accent-foreground: "#e0f0ff"
  destructive: "#fb2c36"
  destructive-foreground: "#fff"
  success: "#4ade80"
  warning: "#fbbf24"
  border: "color-mix(in srgb, #ff6b6b 15%, transparent)"
  input: "color-mix(in srgb, #ff6b6b 15%, transparent)"
  ring: "#ff6b6b"
  popover: "#0f1f35"
  popover-foreground: "#e0f0ff"

overlay:
  noiseOpacity: 0.08
  noiseBlendMode: color-dodge
  warmGlowOpacity: 0.15
  warmGlowColor: "rgba(255,107,107,0.2)"
```

21 个颜色令牌直接映射到仪表板中使用的 CSS 自定义属性。自定义主题所有字段都是必填的。`overlay` 部分是可选的——它控制颗粒纹理和环境光效果。

创建文件后刷新仪表板。自定义主题会与内置主题一起出现在主题选择器中。

### 主题 API

| 端点 | 方法 | 说明 |
|----------|--------|-------------|
| `/api/dashboard/themes` | GET | 列出可用主题 + 当前活动主题名 |
| `/api/dashboard/theme` | PUT | 设置活动主题。请求体：`{"name": "midnight"}` |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/web-dashboard)
