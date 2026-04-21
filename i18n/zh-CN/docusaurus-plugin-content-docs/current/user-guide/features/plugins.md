---
sidebar_position: 11
sidebar_label: "插件"
title: "插件"
description: "通过插件系统扩展 Hermes——自定义工具、钩子和集成"
---

# 插件

Hermes 拥有插件系统，用于添加自定义工具、钩子和集成，无需修改核心代码。

**→ [构建 Hermes 插件](/docs/guides/build-a-hermes-plugin)** — 带有完整可运行示例的分步指南。

## 快速概览

将一个目录放到 `~/.hermes/plugins/` 下，包含 `plugin.yaml` 和 Python 代码：

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml      # 清单文件
├── __init__.py      # register() — 将模式绑定到处理函数
├── schemas.py       # 工具模式（LLM 看到的）
└── tools.py         # 工具处理函数（被调用时执行的代码）
```

启动 Hermes——你的工具会与内置工具一起出现。模型可以立即调用它们。

### 最小可用示例

以下是一个完整的插件，添加了 `hello_world` 工具，并通过钩子记录每次工具调用。

**`~/.hermes/plugins/hello-world/plugin.yaml`**

```yaml
name: hello-world
version: "1.0"
description: 一个最小示例插件
```

**`~/.hermes/plugins/hello-world/__init__.py`**

```python
"""最小 Hermes 插件——注册一个工具和一个钩子。"""


def register(ctx):
    # --- 工具: hello_world ---
    schema = {
        "name": "hello_world",
        "description": "返回给定名称的友好问候。",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "要问候的名称",
                }
            },
            "required": ["name"],
        },
    }

    def handle_hello(params):
        name = params.get("name", "World")
        return f"Hello, {name}! 👋  (来自 hello-world 插件)"

    ctx.register_tool("hello_world", schema, handle_hello)

    # --- 钩子: 记录每次工具调用 ---
    def on_tool_call(tool_name, params, result):
        print(f"[hello-world] 工具被调用: {tool_name}")

    ctx.register_hook("post_tool_call", on_tool_call)
```

将这两个文件放入 `~/.hermes/plugins/hello-world/`，重启 Hermes，模型就可以立即调用 `hello_world` 了。钩子会在每次工具调用后打印一行日志。

项目本地插件位于 `./.hermes/plugins/` 下，默认禁用。仅对信任的仓库启用，在启动 Hermes 前设置 `HERMES_ENABLE_PROJECT_PLUGINS=true`。

## 插件能做什么

| 能力 | 方式 |
|------|------|
| 添加工具 | `ctx.register_tool(name, schema, handler)` |
| 添加钩子 | `ctx.register_hook("post_tool_call", callback)` |
| 添加斜杠命令 | `ctx.register_command(name, handler, description)` — 在 CLI 和网关会话中添加 `/name` |
| 添加 CLI 命令 | `ctx.register_cli_command(name, help, setup_fn, handler_fn)` — 添加 `hermes <plugin> <subcommand>` |
| 注入消息 | `ctx.inject_message(content, role="user")` — 参见[注入消息](#注入消息) |
| 附带数据文件 | `Path(__file__).parent / "data" / "file.yaml"` |
| 捆绑技能 | `ctx.register_skill(name, path)` — 命名空间为 `plugin:skill`，通过 `skill_view("plugin:skill")` 加载 |
| 环境变量门控 | `plugin.yaml` 中的 `requires_env: [API_KEY]` — 在 `hermes plugins install` 时提示输入 |
| 通过 pip 分发 | `[project.entry-points."hermes_agent.plugins"]` |

## 插件发现

`PluginManager` 按顺序扫描四个来源：

1. **Bundled（捆绑）** — `<repo>/plugins/<name>/`（随仓库发布）
2. **User（用户）** — `~/.hermes/plugins/<name>/`
3. **Project（项目）** — `./.hermes/plugins/<name>/`（需要 `HERMES_ENABLE_PROJECT_PLUGINS=1`）
4. **Pip entry points** — `hermes_agent.plugins`

名称冲突时，后面的来源优先 — 同名的用户 Plugin 会替换捆绑版本。

### 捆绑 Plugin 默认不启用

捆绑 Plugin 随仓库发布但默认禁用。发现机制能找到它们（出现在 `hermes plugins list` 中），但在你明确启用前不会加载：

```bash
hermes plugins enable disk-cleanup
```

捆绑 Plugin 永远不会自动启用。参见[内置 Plugin](./built-in-plugins.md) 了解当前随仓库发布的 Plugin 列表。

## 可用钩子

插件可以为以下生命周期事件注册回调。详见 **[事件钩子页面](/docs/user-guide/features/hooks#plugin-hooks)**，了解完整的回调签名和示例。

| 钩子 | 触发时机 |
|------|----------|
| [`pre_tool_call`](/docs/user-guide/features/hooks#pre_tool_call) | 任何工具执行之前 |
| [`post_tool_call`](/docs/user-guide/features/hooks#post_tool_call) | 任何工具返回之后 |
| [`pre_llm_call`](/docs/user-guide/features/hooks#pre_llm_call) | 每轮一次，在 LLM 循环之前——可以返回 `{"context": "..."}` 来[将上下文注入用户消息](/docs/user-guide/features/hooks#pre_llm_call) |
| [`post_llm_call`](/docs/user-guide/features/hooks#post_llm_call) | 每轮一次，在 LLM 循环之后（仅成功的轮次） |
| [`on_session_start`](/docs/user-guide/features/hooks#on_session_start) | 新会话创建时（仅第一轮） |
| [`on_session_end`](/docs/user-guide/features/hooks#on_session_end) | 每次 `run_conversation` 调用结束时 + CLI 退出处理 |

## 插件类型

Hermes 有三种插件：

| 类型 | 功能 | 选择方式 | 位置 |
|------|------|----------|------|
| **通用插件** | 添加工具、钩子、斜杠命令、CLI 命令 | 多选（启用/禁用） | `~/.hermes/plugins/` |
| **记忆提供者** | 替换或增强内置记忆 | 单选（一个激活） | `plugins/memory/` |
| **上下文引擎** | 替换内置上下文压缩器 | 单选（一个激活） | `plugins/context_engine/` |

记忆提供者和上下文引擎是**提供者插件**——每种类型只能同时激活一个。通用插件可以任意组合启用。

## 管理插件

```bash
hermes plugins                  # 统一交互式 UI
hermes plugins list             # 表格视图，显示启用/禁用状态
hermes plugins install user/repo  # 从 Git 安装
hermes plugins update my-plugin   # 拉取最新版本
hermes plugins remove my-plugin   # 卸载
hermes plugins enable my-plugin   # 重新启用已禁用的插件
hermes plugins disable my-plugin  # 禁用但不卸载
```

### 交互式 UI

不带参数运行 `hermes plugins` 会打开一个复合交互界面：

```
插件
  ↑↓ 导航  SPACE 切换  ENTER 配置/确认  ESC 完成

  通用插件
 → [✓] my-tool-plugin — 自定义搜索工具
   [ ] webhook-notifier — 事件钩子

  提供者插件
     记忆提供者          ▸ honcho
     上下文引擎           ▸ compressor
```

- **通用插件区域**——复选框，用 SPACE 切换
- **提供者插件区域**——显示当前选择。按 ENTER 进入单选选择器，选择一个激活的提供者。

提供者插件的选择保存到 `config.yaml`：

```yaml
memory:
  provider: "honcho"      # 空字符串 = 仅内置

context:
  engine: "compressor"    # 默认内置压缩器
```

### 禁用通用插件

被禁用的插件仍然安装，但在加载时被跳过。禁用列表存储在 `config.yaml` 的 `plugins.disabled` 下：

```yaml
plugins:
  disabled:
    - my-noisy-plugin
```

在运行中的会话中，`/plugins` 显示当前加载了哪些插件。

## 注入消息

插件可以使用 `ctx.inject_message()` 向活跃的对话注入消息：

```python
ctx.inject_message("从 webhook 收到新数据", role="user")
```

**签名：** `ctx.inject_message(content: str, role: str = "user") -> bool`

工作方式：

- 如果 Agent **空闲**（等待用户输入），消息被排队作为下一个输入并开始新一轮。
- 如果 Agent **正在处理中**（活跃运行），消息中断当前操作——与用户输入新消息并按 Enter 相同。
- 对于非 `"user"` 角色，内容会加上 `[role]` 前缀（例如 `[system] ...`）。
- 如果消息成功排队则返回 `True`，如果没有可用的 CLI 引用（例如在网关模式下）则返回 `False`。

这使得远程控制查看器、消息桥接或 webhook 接收器等插件可以从外部来源向对话中注入消息。

:::note
`inject_message` 仅在 CLI 模式下可用。在网关模式下，没有 CLI 引用，该方法返回 `False`。
:::

详见 **[完整指南](/docs/guides/build-a-hermes-plugin)**，了解处理函数约定、模式格式、钩子行为、错误处理和常见错误。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/plugins)
