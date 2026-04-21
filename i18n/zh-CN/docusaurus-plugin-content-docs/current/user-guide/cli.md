---
sidebar_position: 1
title: "CLI 界面"
description: "掌握 Hermes Agent 终端界面 — 命令、快捷键、个性模式等"
---

# CLI 界面

Hermes Agent 的 CLI 是一个完整的终端用户界面（TUI）——而非 Web UI。它支持多行编辑、斜杠命令自动补全、对话历史、中断与重定向，以及流式工具输出。专为终端用户打造。

:::tip
Hermes 还内置了一个现代化 TUI，支持模态覆盖层、鼠标选择和非阻塞输入。使用 `hermes --tui` 启动 — 参见 [TUI](tui.md) 指南。
:::

## 运行 CLI

```bash
# 启动交互式会话（默认）
hermes

# 单次查询模式（非交互式）
hermes chat -q "Hello"

# 指定模型
hermes chat --model "anthropic/claude-sonnet-4"

# 指定 Provider（提供商）
hermes chat --provider nous        # 使用 Nous Portal
hermes chat --provider openrouter  # 强制使用 OpenRouter

# 指定工具集
hermes chat --toolsets "web,terminal,skills"

# 启动时预加载一个或多个 Skill
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -q "open a draft PR"

# 恢复之前的会话
hermes --continue             # 恢复最近的 CLI 会话 (-c)
hermes --resume <session_id>  # 通过 ID 恢复指定会话 (-r)

# 详细模式（调试输出）
hermes chat --verbose

# 隔离的 Git Worktree（用于并行运行多个 Agent）
hermes -w                         # Worktree 中的交互模式
hermes -w -q "Fix issue #123"     # Worktree 中的单次查询
```

## 界面布局

<img className="docs-terminal-figure" src="/img/docs/cli-layout.svg" alt="Hermes CLI 布局预览，显示横幅、对话区域和固定输入提示。" />
<p className="docs-figure-caption">Hermes CLI 横幅、对话流和固定输入提示，以稳定的文档示意图呈现。</p>

欢迎横幅一目了然地显示你的模型、终端后端、工作目录、可用工具和已安装的 Skill。

### 状态栏

输入区域上方有一个持久的状态栏，实时更新：

```
 ⚕ claude-sonnet-4-20250514 │ 12.4K/200K │ [██████░░░░] 6% │ $0.06 │ 15m
```

| 元素 | 说明 |
|------|------|
| 模型名称 | 当前使用的模型（超过 26 字符时截断） |
| Token 计数 | 已使用的上下文 Token / 最大上下文窗口 |
| 上下文进度条 | 带颜色阈值指示的可视填充条 |
| 费用 | 预估会话费用（未知/零定价模型显示 `n/a`） |
| 持续时间 | 已运行的会话时长 |

状态栏会根据终端宽度自适应 —— ≥ 76 列显示完整布局，52–75 列紧凑模式，< 52 列仅显示模型和时长。

**上下文颜色编码：**

| 颜色 | 阈值 | 含义 |
|------|------|------|
| 绿色 | < 50% | 空间充足 |
| 黄色 | 50–80% | 逐渐填满 |
| 橙色 | 80–95% | 接近上限 |
| 红色 | ≥ 95% | 即将溢出 — 考虑使用 `/compress` |

使用 `/usage` 查看详细明细，包括按类别划分的费用（输入 vs 输出 Token）。

### 会话恢复显示

恢复之前的会话时（`hermes -c` 或 `hermes --resume <id>`），横幅和输入提示之间会出现一个"之前的对话"面板，显示对话历史的紧凑回顾。详见 [会话 — 恢复时的对话回顾](sessions.md#conversation-recap-on-resume)。

## 快捷键 {#keybindings}

| 按键 | 操作 |
|------|------|
| `Enter` | 发送消息 |
| `Alt+Enter` 或 `Ctrl+J` | 换行（多行输入） |
| `Alt+V` | 在终端支持时从剪贴板粘贴图片 |
| `Ctrl+V` | 粘贴文本并自动附加剪贴板图片 |
| `Ctrl+B` | 语音模式启用时开始/停止录音（`voice.record_key`，默认：`ctrl+b`） |
| `Ctrl+C` | 中断 Agent（2 秒内双击强制退出） |
| `Ctrl+D` | 退出 |
| `Ctrl+Z` | 将 Hermes 挂起到后台（仅 Unix）。在 Shell 中运行 `fg` 恢复。 |
| `Tab` | 接受自动建议（幽灵文本）或自动补全斜杠命令 |

## 斜杠命令

输入 `/` 可查看自动补全下拉列表。Hermes 支持大量 CLI 斜杠命令、动态 Skill 命令和用户自定义快捷命令。

常用示例：

| 命令 | 说明 |
|------|------|
| `/help` | 显示命令帮助 |
| `/model` | 显示或切换当前模型 |
| `/tools` | 列出当前可用工具 |
| `/skills browse` | 浏览 Skill Hub 和官方可选 Skill |
| `/background <提示>` | 在独立的后台会话中运行提示 |
| `/skin` | 显示或切换当前 CLI 皮肤 |
| `/voice on` | 启用 CLI 语音模式（按 `Ctrl+B` 录音） |
| `/voice tts` | 切换 Hermes 回复的语音播放 |
| `/reasoning high` | 提高推理强度 |
| `/title My Session` | 命名当前会话 |

完整的内置 CLI 和消息平台命令列表，参见[斜杠命令参考](../reference/slash-commands.md)。

关于设置、Provider、静音调优以及消息平台/Discord 语音使用，参见[语音模式](features/voice-mode.md)。

:::tip
命令不区分大小写 —— `/HELP` 和 `/help` 效果相同。已安装的 Skill 也会自动成为斜杠命令。
:::

## 快捷命令

你可以定义自定义命令，立即运行 Shell 命令而无需调用 LLM。这些命令在 CLI 和消息平台（Telegram、Discord 等）中均可使用。

```yaml
# ~/.hermes/config.yaml
quick_commands:
  status:
    type: exec
    command: systemctl status hermes-agent
  gpu:
    type: exec
    command: nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader
```

然后在任何聊天中输入 `/status` 或 `/gpu`。更多示例参见[配置指南](/docs/user-guide/configuration#quick-commands)。

## 启动时预加载 Skill

如果你已经知道会话中要激活哪些 Skill，可以在启动时传入：

```bash
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -s github-auth
```

Hermes 会在第一轮对话前将每个命名的 Skill 加载到会话提示中。该标志在交互模式和单次查询模式下均可使用。

## Skill 斜杠命令

`~/.hermes/skills/` 中的每个已安装 Skill 都会自动注册为斜杠命令。Skill 名称即为命令名：

```
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor

# 仅输入 Skill 名称即可加载并让 Agent 询问你的需求：
/excalidraw
```

## 个性模式

设置预定义的个性模式来改变 Agent 的语气：

```
/personality pirate
/personality kawaii
/personality concise
```

内置个性模式包括：`helpful`、`concise`、`technical`、`creative`、`teacher`、`kawaii`、`catgirl`、`pirate`、`shakespeare`、`surfer`、`noir`、`uwu`、`philosopher`、`hype`。

你还可以在 `~/.hermes/config.yaml` 中定义自定义个性模式：

```yaml
personalities:
  helpful: "You are a helpful, friendly AI assistant."
  kawaii: "You are a kawaii assistant! Use cute expressions..."
  pirate: "Arrr! Ye be talkin' to Captain Hermes..."
  # 添加你自己的！
```

## 多行输入

有两种方式输入多行消息：

1. **`Alt+Enter` 或 `Ctrl+J`** — 插入新行
2. **反斜杠续行** — 在行尾加 `\` 继续：

```
❯ Write a function that:\
  1. Takes a list of numbers\
  2. Returns the sum
```

:::info
支持粘贴多行文本 —— 使用 `Alt+Enter` 或 `Ctrl+J` 插入换行，或直接粘贴内容。
:::

## 中断 Agent

你可以随时中断 Agent：

- **输入新消息 + Enter** — 在 Agent 工作时中断并处理你的新指令
- **`Ctrl+C`** — 中断当前操作（2 秒内按两次强制退出）
- 正在执行的终端命令会立即被终止（SIGTERM，1 秒后 SIGKILL）
- 中断期间输入的多条消息会合并为一个提示

### 忙碌输入模式

`display.busy_input_mode` 配置项控制 Agent 工作时按 Enter 的行为：

| 模式 | 行为 |
|------|------|
| `"interrupt"`（默认） | 你的消息中断当前操作并立即处理 |
| `"queue"` | 你的消息静默排队，在 Agent 完成后作为下一轮发送 |

```yaml
# ~/.hermes/config.yaml
display:
  busy_input_mode: "queue"   # 或 "interrupt"（默认）
```

当你想准备后续消息而不意外取消正在执行的工作时，排队模式非常有用。未知值会回退到 `"interrupt"`。

### 挂起到后台

在 Unix 系统上，按 **`Ctrl+Z`** 将 Hermes 挂起到后台 —— 就像任何终端进程一样。Shell 会打印确认信息：

```
Hermes Agent has been suspended. Run `fg` to bring Hermes Agent back.
```

在 Shell 中输入 `fg` 即可从上次中断处恢复会话。Windows 不支持此功能。

## 工具进度显示

CLI 会在 Agent 工作时显示动画反馈：

**思考动画**（API 调用期间）：
```
  ◜ (｡•́︿•̀｡) pondering... (1.2s)
  ◠ (⊙_⊙) contemplating... (2.4s)
  ✧٩(ˊᗜˋ*)و✧ got it! (3.1s)
```

**工具执行信息流：**
```
  ┊ 💻 terminal `ls -la` (0.3s)
  ┊ 🔍 web_search (1.2s)
  ┊ 📄 web_extract (2.1s)
```

使用 `/verbose` 切换显示模式：`off → new → all → verbose`。此命令也可用于消息平台 —— 参见[配置](/docs/user-guide/configuration#display-settings)。

### 工具预览长度

`display.tool_preview_length` 配置项控制工具调用预览行（如文件路径、终端命令）中显示的最大字符数。默认为 `0`，即无限制 —— 显示完整路径和命令。

```yaml
# ~/.hermes/config.yaml
display:
  tool_preview_length: 80   # 将工具预览截断为 80 个字符（0 = 无限制）
```

这在窄终端或工具参数包含很长文件路径时很有用。

## 会话管理

### 恢复会话

退出 CLI 会话时，会打印恢复命令：

```
Resume this session with:
  hermes --resume 20260225_143052_a1b2c3

Session:        20260225_143052_a1b2c3
Duration:       12m 34s
Messages:       28 (5 user, 18 tool calls)
```

恢复选项：

```bash
hermes --continue                          # 恢复最近的 CLI 会话
hermes -c                                  # 简写形式
hermes -c "my project"                     # 恢复命名的会话（同系列中最近的）
hermes --resume 20260225_143052_a1b2c3     # 通过 ID 恢复指定会话
hermes --resume "refactoring auth"         # 通过标题恢复
hermes -r 20260225_143052_a1b2c3           # 简写形式
```

恢复会从 SQLite 中还原完整的对话历史。Agent 能看到所有之前的消息、工具调用和响应 —— 就像你从未离开一样。

在聊天中使用 `/title My Session Name` 命名当前会话，或从命令行使用 `hermes sessions rename <id> <title>`。使用 `hermes sessions list` 浏览历史会话。

### 会话存储

CLI 会话存储在 Hermes 的 SQLite 状态数据库 `~/.hermes/state.db` 中。数据库保存：

- 会话元数据（ID、标题、时间戳、Token 计数器）
- 消息历史
- 压缩/恢复会话之间的沿袭关系
- `session_search` 使用的全文搜索索引

某些消息适配器还会在数据库旁边保留各平台的转录文件，但 CLI 本身从 SQLite 会话存储恢复。

### 上下文压缩

长对话在接近上下文限制时会自动摘要：

```yaml
# 在 ~/.hermes/config.yaml 中
compression:
  enabled: true
  threshold: 0.50    # 默认在上下文限制的 50% 时压缩

# 摘要模型在 auxiliary 下配置：
auxiliary:
  compression:
    model: "google/gemini-3-flash-preview"  # 用于摘要的模型
```

压缩触发时，中间轮次会被摘要，而前 3 轮和后 4 轮始终保留。

## 后台会话

在独立的后台会话中运行提示，同时继续使用 CLI 处理其他工作：

```
/background Analyze the logs in /var/log and summarize any errors from today
```

Hermes 立即确认任务并返回提示符：

```
🔄 Background task #1 started: "Analyze the logs in /var/log and summarize..."
   Task ID: bg_143022_a1b2c3
```

### 工作原理

每个 `/background` 提示会在守护线程中生成一个**完全独立的 Agent 会话**：

- **隔离对话** — 后台 Agent 不了解你当前会话的历史。它只接收你提供的提示。
- **相同配置** — 后台 Agent 继承当前会话的模型、Provider、工具集、推理设置和回退模型。
- **非阻塞** — 你的前台会话保持完全交互。你可以聊天、运行命令，甚至启动更多后台任务。
- **多任务** — 你可以同时运行多个后台任务。每个都有编号 ID。

### 结果

后台任务完成时，结果会以面板形式出现在终端中：

```
╭─ ⚕ Hermes (background #1) ──────────────────────────────────╮
│ Found 3 errors in syslog from today:                         │
│ 1. OOM killer invoked at 03:22 — killed process nginx        │
│ 2. Disk I/O error on /dev/sda1 at 07:15                      │
│ 3. Failed SSH login attempts from 192.168.1.50 at 14:30      │
╰──────────────────────────────────────────────────────────────╯
```

如果任务失败，你会看到错误通知。如果在配置中启用了 `display.bell_on_complete`，任务完成时终端会响铃。

### 使用场景

- **长时间研究** — "/background research the latest developments in quantum error correction" 同时你可以继续编写代码
- **文件处理** — "/background analyze all Python files in this repo and list any security issues" 同时你可以继续对话
- **并行调查** — 启动多个后台任务从不同角度同时探索

:::info
后台会话不会出现在你的主对话历史中。它们是独立的会话，有自己的任务 ID（例如 `bg_143022_a1b2c3`）。
:::

## 静默模式

默认情况下，CLI 以静默模式运行：

- 抑制工具的详细日志
- 启用 kawaii 风格的动画反馈
- 保持输出简洁友好

启用调试输出：
```bash
hermes chat --verbose
```

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/cli)
