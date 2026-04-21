---
sidebar_position: 2
---

# Profile：运行多个 Agent

在同一台机器上运行多个独立的 Hermes Agent —— 每个有自己的配置、API 密钥、记忆、会话、Skill 和网关。

## 什么是 Profile？

Profile 是一个完全隔离的 Hermes 环境。每个 Profile 有自己的目录，包含独立的 `config.yaml`、`.env`、`SOUL.md`、记忆、会话、Skill、Cron 任务和状态数据库。Profile 让你为不同目的运行独立的 Agent —— 编程助手、个人 Bot、研究 Agent —— 没有任何交叉污染。

创建 Profile 时，它会自动成为自己的命令。创建一个名为 `coder` 的 Profile，你立刻拥有 `coder chat`、`coder setup`、`coder gateway start` 等。

## 快速开始

```bash
hermes profile create coder       # 创建 Profile + "coder" 命令别名
coder setup                       # 配置 API 密钥和模型
coder chat                        # 开始聊天
```

就这样。`coder` 现在是一个完全独立的 Agent。它有自己的配置、记忆和一切。

## 创建 Profile

### 空白 Profile

```bash
hermes profile create mybot
```

创建一个带有捆绑 Skill 种子数据的新 Profile。运行 `mybot setup` 配置 API 密钥、模型和网关 Token。

### 仅克隆配置（`--clone`）

```bash
hermes profile create work --clone
```

将当前 Profile 的 `config.yaml`、`.env` 和 `SOUL.md` 复制到新 Profile。相同的 API 密钥和模型，但全新的会话和记忆。编辑 `~/.hermes/profiles/work/.env` 更改 API 密钥，或 `~/.hermes/profiles/work/SOUL.md` 更改个性。

### 克隆所有内容（`--clone-all`）

```bash
hermes profile create backup --clone-all
```

复制**所有内容** — 配置、API 密钥、个性、所有记忆、完整会话历史、Skill、Cron 任务、插件。一个完整的快照。适用于备份或分叉已有上下文的 Agent。

### 从特定 Profile 克隆

```bash
hermes profile create work --clone --clone-from coder
```

创建 Profile **不会**将该 Profile 目录设为终端命令的默认项目/工作目录。如果你想让 Profile 在特定项目中启动，在该 Profile 的 `config.yaml` 中设置 `terminal.cwd`。

:::tip Honcho 记忆 + Profile
启用 Honcho 时，`--clone` 会自动为新 Profile 创建专属的 AI peer，同时共享相同的用户工作区。每个 Profile 构建自己的观察和身份。详见 [Honcho — 多 Agent / Profile](./features/memory-providers.md#honcho)。
:::

## 使用 Profile

### 命令别名

每个 Profile 自动在 `~/.local/bin/<name>` 获得一个命令别名：

```bash
coder chat                    # 与 coder Agent 聊天
coder setup                   # 配置 coder 的设置
coder gateway start           # 启动 coder 的网关
coder doctor                  # 检查 coder 的健康状态
coder skills list             # 列出 coder 的 Skill
coder config set model.model anthropic/claude-sonnet-4
```

别名适用于所有 hermes 子命令 —— 底层就是 `hermes -p <name>`。

### `-p` 标志

你也可以用任何命令显式指定 Profile：

```bash
hermes -p coder chat
hermes --profile=coder doctor
hermes chat -p coder -q "hello"    # 可以放在任何位置
```

### 粘性默认值（`hermes profile use`）

```bash
hermes profile use coder
hermes chat                   # 现在针对 coder
hermes tools                  # 配置 coder 的工具
hermes profile use default    # 切回默认
```

设置默认值，使普通的 `hermes` 命令针对该 Profile。类似于 `kubectl config use-context`。

### 知道你在哪个 Profile

CLI 始终显示哪个 Profile 处于活跃状态：

- **提示符**：`coder ❯` 而非 `❯`
- **横幅**：启动时显示 `Profile: coder`
- **`hermes profile`**：显示当前 Profile 名称、路径、模型、网关状态

## 运行网关

每个 Profile 作为独立进程运行自己的网关，有自己的 Bot Token：

```bash
coder gateway start           # 启动 coder 的网关
assistant gateway start       # 启动 assistant 的网关（独立进程）
```

### 不同的 Bot Token

每个 Profile 有自己的 `.env` 文件。为每个配置不同的 Telegram/Discord/Slack Bot Token：

```bash
# 编辑 coder 的 Token
nano ~/.hermes/profiles/coder/.env

# 编辑 assistant 的 Token
nano ~/.hermes/profiles/assistant/.env
```

### 安全：Token 锁

如果两个 Profile 意外使用相同的 Bot Token，第二个网关会被阻止并显示明确错误，指出冲突的 Profile。支持 Telegram、Discord、Slack、WhatsApp 和 Signal。

### 持久化服务

```bash
coder gateway install         # 创建 hermes-gateway-coder systemd/launchd 服务
assistant gateway install     # 创建 hermes-gateway-assistant 服务
```

每个 Profile 有自己的服务名称。它们独立运行。

## 配置 Profile

每个 Profile 有自己的：

- **`config.yaml`** — 模型、Provider、工具集、所有设置
- **`.env`** — API 密钥、Bot Token
- **`SOUL.md`** — 个性与指令

```bash
coder config set model.model anthropic/claude-sonnet-4
echo "You are a focused coding assistant." > ~/.hermes/profiles/coder/SOUL.md
```

## 更新

`hermes update` 拉取代码一次（共享），并自动将新的捆绑 Skill 同步到**所有** Profile：

```bash
hermes update
# → Code updated (12 commits)
# → Skills synced: default (up to date), coder (+2 new), assistant (+2 new)
```

用户修改的 Skill 永远不会被覆盖。

## 管理 Profile

```bash
hermes profile list           # 显示所有 Profile 及状态
hermes profile show coder     # 单个 Profile 的详细信息
hermes profile rename coder dev-bot   # 重命名（更新别名 + 服务）
hermes profile export coder   # 导出到 coder.tar.gz
hermes profile import coder.tar.gz   # 从归档导入
```

## 删除 Profile

```bash
hermes profile delete coder
```

这会停止网关、移除 systemd/launchd 服务、移除命令别名，并删除所有 Profile 数据。系统会要求你输入 Profile 名称以确认。

使用 `--yes` 跳过确认：`hermes profile delete coder --yes`

:::note
你不能删除默认 Profile（`~/.hermes`）。要移除所有内容，使用 `hermes uninstall`。
:::

## Tab 补全

```bash
# Bash
eval "$(hermes completion bash)"

# Zsh
eval "$(hermes completion zsh)"
```

将此行添加到 `~/.bashrc` 或 `~/.zshrc` 以获得持久补全。补全 `-p` 后的 Profile 名称、Profile 子命令和顶级命令。

## 工作原理

Profile 使用 `HERMES_HOME` 环境变量。当你运行 `coder chat` 时，包装脚本在启动 hermes 之前设置 `HERMES_HOME=~/.hermes/profiles/coder`。由于代码库中有 119+ 个文件通过 `get_hermes_home()` 解析路径，所有内容自动作用域到 Profile 的目录 — 配置、会话、记忆、Skill、状态数据库、网关 PID、日志和 Cron 任务。

默认 Profile 就是 `~/.hermes` 本身。无需迁移 —— 现有安装行为完全不变。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/profiles)
