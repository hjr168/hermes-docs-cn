---
sidebar_position: 2
title: "TUI"
description: "启动 Hermes 的现代化终端 UI — 支持鼠标、丰富覆盖层和非阻塞输入。"
---

# TUI

TUI 是 Hermes 的现代化前端 —— 一个终端 UI，使用与[经典 CLI](cli.md) 相同的 Python 运行时。相同的 Agent、相同的会话、相同的斜杠命令；只是提供了一个更干净、更响应的交互界面。

这是推荐的 Hermes 交互式运行方式。

## 启动

```bash
# 启动 TUI
hermes --tui

# 恢复最近的 TUI 会话（如果没有则回退到最近的经典 CLI 会话）
hermes --tui -c
hermes --tui --continue

# 通过 ID 或标题恢复指定会话
hermes --tui -r 20260409_000000_aa11bb
hermes --tui --resume "my t0p session"

# 直接运行源码 — 跳过预构建步骤（适用于 TUI 贡献者）
hermes --tui --dev
```

你也可以通过环境变量启用：

```bash
export HERMES_TUI=1
hermes          # 现在使用 TUI
hermes chat     # 同样
```

经典 CLI 仍作为默认可用。[CLI 界面](cli.md) 中记录的所有内容 —— 斜杠命令、快捷命令、Skill 预加载、个性模式、多行输入、中断 —— 在 TUI 中完全相同地工作。

## 为什么使用 TUI

- **即时首帧** — 横幅在应用完成加载前就绘制好，终端在 Hermes 启动时不会感觉卡住。
- **非阻塞输入** — 在会话准备好之前就可以输入和排队消息。你的第一个提示在 Agent 上线时立即发送。
- **丰富覆盖层** — 模型选择器、会话选择器、审批和澄清提示都渲染为模态面板而非内联流程。
- **实时会话面板** — 工具和 Skill 在初始化时渐进填充。
- **鼠标友好选择** — 拖拽高亮使用统一背景而非 SGR 反色。使用终端的正常复制手势复制。
- **备用屏幕渲染** — 差分更新意味着流式传输时无闪烁，退出后无滚动回溯混乱。
- **编辑器增强** — 长代码片段的内联粘贴折叠、从剪贴板粘贴图片（`Alt+V`）、括号粘贴安全。

相同的 [Skin](features/skins.md) 和[个性模式](features/personality.md) 同样适用。在会话中用 `/skin ares`、`/personality pirate` 切换，UI 实时重绘。参见 [Skin 和主题](features/skins.md) 了解完整的可自定义键列表以及哪些适用于经典 CLI 和 TUI — TUI 支持 Banner 调色板、UI 颜色、提示符字形/颜色、会话显示、补全菜单、选择背景、`tool_prefix` 和 `help_header`。

## 要求

- **Node.js** ≥ 20 — TUI 作为从 Python CLI 启动的子进程运行。`hermes doctor` 会验证此要求。
- **TTY** — 与经典 CLI 一样，管道 stdin 或在非交互环境中运行会回退到单次查询模式。

首次启动时，Hermes 会将 TUI 的 Node 依赖安装到 `ui-tui/node_modules`（一次性，几秒钟）。后续启动很快。如果你拉取了新版本的 Hermes，当源文件比 dist 更新时，TUI 包会自动重建。

### 外部预构建

分发预构建包的发行版（Nix、系统包）可以指向预构建的 TUI：

```bash
export HERMES_TUI_DIR=/path/to/prebuilt/ui-tui
hermes --tui
```

该目录必须包含 `dist/entry.js` 和最新的 `node_modules`。

## 快捷键

快捷键与[经典 CLI](cli.md#keybindings) 完全一致。唯一的行为差异：

- **鼠标拖拽** 使用统一的选择背景高亮文本。
- **`Ctrl+V`** 直接从剪贴板粘贴文本到编辑器；多行粘贴保持在一行直到你展开。
- **斜杠自动补全** 打开为带描述的浮动面板，而非内联下拉列表。

## 斜杠命令

所有斜杠命令不变地工作。少数是 TUI 专属的 —— 它们产生更丰富的输出或渲染为覆盖层而非内联面板：

| 命令 | TUI 行为 |
|------|---------|
| `/help` | 覆盖层显示分类命令，支持箭头键导航 |
| `/sessions` | 模态会话选择器 — 预览、标题、Token 总计、内联恢复 |
| `/model` | 按 Provider 分组的模态模型选择器，带费用提示 |
| `/skin` | 实时预览 — 浏览时主题变更即时应用 |
| `/details` | 切换转录中的详细工具调用详情 |
| `/usage` | 丰富的 Token / 费用 / 上下文面板 |

所有其他斜杠命令（包括已安装的 Skill、快捷命令和个性切换）与经典 CLI 完全相同。参见[斜杠命令参考](../reference/slash-commands.md)。

## 状态栏

TUI 的状态栏实时跟踪 Agent 状态：

| 状态 | 含义 |
|------|------|
| `starting agent…` | 会话 ID 已激活；工具和 Skill 仍在上线。你可以输入 — 消息排队等待就绪后发送。 |
| `ready` | Agent 空闲，接受输入。 |
| `thinking…` / `running…` | Agent 正在推理或运行工具。 |
| `interrupted` | 当前轮次已取消；按 Enter 重新发送。 |
| `forging session…` / `resuming…` | 初始连接或 `--resume` 握手。 |

每个 Skin 的状态栏颜色和阈值与经典 CLI 共享 — 参见 [Skin](features/skins.md) 了解自定义。

## 配置

TUI 遵循所有标准 Hermes 配置：`~/.hermes/config.yaml`、Profile、个性模式、Skin、快捷命令、凭据池、Memory Provider、工具/Skill 启用。没有 TUI 专属的配置文件。

少数键专门调整 TUI 界面：

```yaml
display:
  skin: default          # 任何内置或自定义 Skin
  personality: helpful
  details_mode: compact  # 或 "verbose" — 默认工具调用详情级别
  mouse_tracking: true   # 如果终端与鼠标报告冲突则禁用
```

`/details on` / `/details off` / `/details cycle` 在运行时切换此设置。

## 会话

会话在 TUI 和经典 CLI 之间共享 —— 两者都写入相同的 `~/.hermes/state.db`。你可以在一个中开始会话，在另一个中恢复。会话选择器显示两个来源的会话，带有来源标签。

参见[会话](sessions.md)了解生命周期、搜索、压缩和导出。

## 回退到经典 CLI

运行 `hermes`（不带 `--tui`）保持使用经典 CLI。要让机器默认使用 TUI，在 Shell 配置中设置 `HERMES_TUI=1`。要回退，取消设置即可。

如果 TUI 启动失败（没有 Node、缺少包、TTY 问题），Hermes 会打印诊断信息并回退 — 而不是让你卡住。

## 另见

- [CLI 界面](cli.md) — 完整的斜杠命令和快捷键参考（共享）
- [会话](sessions.md) — 恢复、分支和历史
- [Skin 与主题](features/skins.md) — 自定义 Banner、状态栏和覆盖层
- [语音模式](features/voice-mode.md) — 两种界面中均可使用
- [配置](configuration.md) — 所有配置键

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/tui)
