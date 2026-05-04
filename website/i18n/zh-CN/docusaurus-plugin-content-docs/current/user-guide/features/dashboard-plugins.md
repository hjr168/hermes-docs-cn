---
sidebar_position: 16
title: "Dashboard 插件"
description: "为 Hermes Web Dashboard 构建自定义标签页和扩展"
---

# Dashboard 插件

Dashboard 插件让你可以向 Web Dashboard 添加自定义标签页。插件可以显示自己的 UI、调用 Hermes API，以及可选地注册后端端点 — 所有这些都不需要修改 Dashboard 源代码。

## 快速开始

创建一个包含清单和 JS 文件的插件目录：

```bash
mkdir -p ~/.hermes/plugins/my-plugin/dashboard/dist
```

**manifest.json：**

```json
{
  "name": "my-plugin",
  "label": "My Plugin",
  "icon": "Sparkles",
  "version": "1.0.0",
  "tab": {
    "path": "/my-plugin",
    "position": "after:skills"
  },
  "entry": "dist/index.js"
}
```

**dist/index.js：**

```javascript
(function () {
  var SDK = window.__HERMES_PLUGIN_SDK__;
  var React = SDK.React;
  var Card = SDK.components.Card;
  var CardHeader = SDK.components.CardHeader;
  var CardTitle = SDK.components.CardTitle;
  var CardContent = SDK.components.CardContent;

  function MyPage() {
    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement(CardTitle, null, "My Plugin")
      ),
      React.createElement(CardContent, null,
        React.createElement("p", { className: "text-sm text-muted-foreground" },
          "Hello from my custom dashboard tab!"
        )
      )
    );
  }

  window.__HERMES_PLUGINS__.register("my-plugin", MyPage);
})();
```

刷新 Dashboard — 你的标签页出现在导航栏中。

## 插件结构

插件存放在标准的 `~/.hermes/plugins/` 目录中。Dashboard 扩展是 `dashboard/` 子文件夹：

```
~/.hermes/plugins/my-plugin/
  plugin.yaml              # 可选 — 现有 CLI/网关插件清单
  __init__.py              # 可选 — 现有 CLI/网关钩子
  dashboard/               # Dashboard 扩展
    manifest.json          # 必需 — 标签页配置、图标、入口点
    dist/
      index.js             # 必需 — 预构建的 JS 包
      style.css            # 可选 — 自定义 CSS
    plugin_api.py          # 可选 — 后端 API 路由
```

单个插件可以从一个目录同时扩展 CLI/网关（通过 `plugin.yaml` + `__init__.py`）和 Dashboard（通过 `dashboard/`）。

## 清单参考

`manifest.json` 文件向 Dashboard 描述你的插件：

```json
{
  "name": "my-plugin",
  "label": "My Plugin",
  "description": "What this plugin does",
  "icon": "Sparkles",
  "version": "1.0.0",
  "tab": {
    "path": "/my-plugin",
    "position": "after:skills"
  },
  "entry": "dist/index.js",
  "css": "dist/style.css",
  "api": "plugin_api.py"
}
```

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 是 | 唯一插件标识符（小写，可用连字符） |
| `label` | 是 | 导航标签页中显示的名称 |
| `description` | 否 | 简短描述 |
| `icon` | 否 | Lucide 图标名称（默认：`Puzzle`） |
| `version` | 否 | Semver 版本字符串 |
| `tab.path` | 是 | 标签页的 URL 路径（如 `/my-plugin`） |
| `tab.position` | 否 | 标签页插入位置：`end`（默认）、`after:<tab>`、`before:<tab>` |
| `entry` | 是 | 相对于 `dashboard/` 的 JS 包路径 |
| `css` | 否 | 要注入的 CSS 文件路径 |
| `api` | 否 | 包含 FastAPI 路由的 Python 文件路径 |

### 标签页位置

`position` 字段控制你的标签页在导航中的位置：

- `"end"` — 所有内置标签页之后（默认）
- `"after:skills"` — Skills 标签页之后
- `"before:config"` — Config 标签页之前
- `"after:cron"` — Cron 标签页之后

冒号后的值是目标标签页的路径段（不含前导斜杠）。

### 可用图标

插件可以使用以下 Lucide 图标名称：

`Activity`, `BarChart3`, `Clock`, `Code`, `Database`, `Eye`, `FileText`, `Globe`, `Heart`, `KeyRound`, `MessageSquare`, `Package`, `Puzzle`, `Settings`, `Shield`, `Sparkles`, `Star`, `Terminal`, `Wrench`, `Zap`

无法识别的图标名称回退到 `Puzzle`。

## 插件 SDK

插件不打包 React 或 UI 组件 — 它们使用 `window.__HERMES_PLUGIN_SDK__` 上暴露的 SDK。这避免了版本冲突并保持插件包体积小巧。

### SDK 内容

```javascript
var SDK = window.__HERMES_PLUGIN_SDK__;

// React
SDK.React              // React 实例
SDK.hooks.useState     // React 钩子
SDK.hooks.useEffect
SDK.hooks.useCallback
SDK.hooks.useMemo
SDK.hooks.useRef
SDK.hooks.useContext
SDK.hooks.createContext

// API
SDK.api                // Hermes API 客户端（getStatus, getSessions 等）
SDK.fetchJSON          // 用于自定义端点的原始 fetch — 自动处理认证

// UI 组件（shadcn/ui 风格）
SDK.components.Card
SDK.components.CardHeader
SDK.components.CardTitle
SDK.components.CardContent
SDK.components.Badge
SDK.components.Button
SDK.components.Input
SDK.components.Label
SDK.components.Select
SDK.components.SelectOption
SDK.components.Separator
SDK.components.Tabs
SDK.components.TabsList
SDK.components.TabsTrigger

// 工具
SDK.utils.cn           // Tailwind 类合并器（clsx + twMerge）
SDK.utils.timeAgo      // 从 unix 时间戳生成 "5m ago"
SDK.utils.isoTimeAgo   // 从 ISO 字符串生成 "5m ago"

// 钩子
SDK.useI18n            // i18n 翻译
SDK.useTheme           // 当前主题信息
```

### 使用 SDK.fetchJSON

用于调用插件的后端 API 端点：

```javascript
SDK.fetchJSON("/api/plugins/my-plugin/data")
  .then(function (result) {
    console.log(result);
  })
  .catch(function (err) {
    console.error("API call failed:", err);
  });
```

`fetchJSON` 自动注入会话认证 Token、处理错误并解析 JSON。

### 使用现有 API 方法

`SDK.api` 对象包含所有内置 Hermes 端点的方法：

```javascript
// 获取 Agent 状态
SDK.api.getStatus().then(function (status) {
  console.log("Version:", status.version);
});

// 列出会话
SDK.api.getSessions(10).then(function (resp) {
  console.log("Sessions:", resp.sessions.length);
});
```

## 后端 API 路由

插件可以通过在清单中设置 `api` 字段来注册 FastAPI 路由。创建一个导出 `router` 的 Python 文件：

```python
# plugin_api.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/data")
async def get_data():
    return {"items": ["one", "two", "three"]}

@router.post("/action")
async def do_action(body: dict):
    return {"ok": True, "received": body}
```

路由挂载在 `/api/plugins/<name>/`，因此上面的示例变为：
- `GET /api/plugins/my-plugin/data`
- `POST /api/plugins/my-plugin/action`

插件 API 路由绕过会话 Token 认证，因为 Dashboard 服务器仅绑定到 localhost。

### 访问 Hermes 内部

后端路由可以从 hermes-agent 代码库导入：

```python
from fastapi import APIRouter
from hermes_state import SessionDB
from hermes_cli.config import load_config

router = APIRouter()

@router.get("/session-count")
async def session_count():
    db = SessionDB()
    try:
        count = len(db.list_sessions(limit=9999))
        return {"count": count}
    finally:
        db.close()
```

## 自定义 CSS

如果你的插件需要自定义样式，添加 CSS 文件并在清单中引用：

```json
{
  "css": "dist/style.css"
}
```

CSS 文件在插件加载时作为 `<link>` 标签注入。使用特定的类名以避免与 Dashboard 现有样式冲突。

```css
/* dist/style.css */
.my-plugin-chart {
  border: 1px solid var(--color-border);
  background: var(--color-card);
  padding: 1rem;
}
```

你可以使用 Dashboard 的 CSS 自定义属性（如 `--color-border`、`--color-foreground`）以匹配当前主题。

## 插件加载流程

1. Dashboard 加载 — `main.tsx` 在 `window.__HERMES_PLUGIN_SDK__` 上暴露 SDK
2. `App.tsx` 调用 `usePlugins()`，获取 `GET /api/dashboard/plugins`
3. 对每个插件：CSS `<link>` 被注入（如果声明了），JS `<script>` 被加载
4. 插件 JS 调用 `window.__HERMES_PLUGINS__.register(name, Component)`
5. Dashboard 将标签页添加到导航并将组件挂载为路由

插件在其脚本加载后有最多 2 秒的注册时间。如果插件加载失败，Dashboard 继续运行而不受影响。

## 插件发现

Dashboard 扫描以下目录查找 `dashboard/manifest.json`：

1. **用户插件：** `~/.hermes/plugins/<name>/dashboard/manifest.json`
2. **内置插件：** `<repo>/plugins/<name>/dashboard/manifest.json`
3. **项目插件：** `./.hermes/plugins/<name>/dashboard/manifest.json`（仅在设置了 `HERMES_ENABLE_PROJECT_PLUGINS` 时）

用户插件优先 — 如果同一插件名存在于多个来源中，用户版本胜出。

添加新插件后，要在不重启服务器的情况下强制重新扫描：

```bash
curl http://127.0.0.1:9119/api/dashboard/plugins/rescan
```

## 插件 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/dashboard/plugins` | GET | 列出已发现的插件 |
| `/api/dashboard/plugins/rescan` | GET | 强制重新扫描新插件 |
| `/dashboard-plugins/<name>/<path>` | GET | 提供插件静态资源 |
| `/api/plugins/<name>/*` | * | 插件注册的 API 路由 |

## 示例插件

仓库中包含一个示例插件，位于 `plugins/example-dashboard/`，演示了：

- 使用 SDK 组件（Card, Badge, Button）
- 调用后端 API 路由
- 通过 `window.__HERMES_PLUGINS__.register()` 注册

要试用，运行 `hermes dashboard` — "Example" 标签页出现在 Skills 之后。

## 提示

- **无需构建步骤** — 编写纯 JavaScript IIFE。如果你更喜欢 JSX，使用任何打包工具（esbuild、Vite、webpack）以 IIFE 输出为目标，React 作为外部依赖。
- **保持包体积小** — React 和所有 UI 组件由 SDK 提供。你的包应该只包含插件逻辑。
- **使用主题变量** — 在 CSS 中引用 `var(--color-*)` 以自动匹配用户选择的主题。
- **本地测试** — 运行 `hermes dashboard --no-open` 并使用浏览器开发者工具验证插件加载和注册是否正确。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/dashboard-plugins)
