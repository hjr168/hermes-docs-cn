---
sidebar_position: 7
---

# Profile（配置文件）命令参考

本页面涵盖所有与 [Hermes 配置文件](../user-guide/profiles.md) 相关的命令。有关通用 CLI 命令，请参阅 [CLI 命令参考](./cli-commands.md)。

## `hermes profile`

```bash
hermes profile <subcommand>
```

用于管理配置文件的顶级命令。不带子命令运行 `hermes profile` 会显示帮助信息。

| 子命令 | 说明 |
|--------|------|
| `list` | 列出所有配置文件。 |
| `use` | 设置活动（默认）配置文件。 |
| `create` | 创建新的配置文件。 |
| `delete` | 删除配置文件。 |
| `show` | 显示配置文件的详细信息。 |
| `alias` | 重新生成配置文件的 Shell 别名。 |
| `rename` | 重命名配置文件。 |
| `export` | 将配置文件导出为 tar.gz 压缩包。 |
| `import` | 从 tar.gz 压缩包导入配置文件。 |

## `hermes profile list`

```bash
hermes profile list
```

列出所有配置文件。当前活动的配置文件会用 `*` 标记。

**示例：**

```bash
$ hermes profile list
  default
* work
  dev
  personal
```

无选项。

## `hermes profile use`

```bash
hermes profile use <name>
```

将 `<name>` 设置为活动配置文件。之后所有的 `hermes` 命令（不带 `-p` 参数时）都将使用此配置文件。

| 参数 | 说明 |
|------|------|
| `<name>` | 要激活的配置文件名称。使用 `default` 可返回基础配置文件。 |

**示例：**

```bash
hermes profile use work
hermes profile use default
```

## `hermes profile create`

```bash
hermes profile create <name> [options]
```

创建新的配置文件。

| 参数 / 选项 | 说明 |
|-------------|------|
| `<name>` | 新配置文件的名称。必须是有效的目录名（字母、数字、连字符、下划线）。 |
| `--clone` | 从当前配置文件复制 `config.yaml`、`.env` 和 `SOUL.md`。 |
| `--clone-all` | 从当前配置文件复制所有内容（配置、记忆、技能、会话、状态）。 |
| `--clone-from <profile>` | 从指定配置文件克隆，而非当前配置文件。需与 `--clone` 或 `--clone-all` 一起使用。 |
| `--no-alias` | 跳过包装脚本的创建。 |

创建 Profile **不会**将该 Profile 目录设为终端命令的默认项目/工作目录。如果你想让 Profile 在特定项目中启动，在该 Profile 的 `config.yaml` 中设置 `terminal.cwd`。

**示例：**

```bash
# 空白配置文件 — 需要完整设置
hermes profile create mybot

# 仅从当前配置文件克隆配置
hermes profile create work --clone

# 从当前配置文件克隆所有内容
hermes profile create backup --clone-all

# 从指定配置文件克隆配置
hermes profile create work2 --clone --clone-from work
```

## `hermes profile delete`

```bash
hermes profile delete <name> [options]
```

删除配置文件并移除其 Shell 别名。

| 参数 / 选项 | 说明 |
|-------------|------|
| `<name>` | 要删除的配置文件。 |
| `--yes`, `-y` | 跳过确认提示。 |

**示例：**

```bash
hermes profile delete mybot
hermes profile delete mybot --yes
```

:::warning
此操作将永久删除配置文件的整个目录，包括所有配置、记忆、会话和技能。无法删除当前活动的配置文件。
:::

## `hermes profile show`

```bash
hermes profile show <name>
```

显示配置文件的详细信息，包括其主目录、已配置的模型、网关状态、技能数量和配置文件状态。

这显示 Profile 的 Hermes 主目录，而非终端工作目录。终端命令从 `terminal.cwd` 开始（或在本地后端上使用 `cwd: "."` 时的启动目录）。

| 参数 | 说明 |
|------|------|
| `<name>` | 要查看的配置文件。 |

**示例：**

```bash
$ hermes profile show work
Profile: work
Path:    ~/.hermes/profiles/work
Model:   anthropic/claude-sonnet-4 (anthropic)
Gateway: stopped
Skills:  12
.env:    exists
SOUL.md: exists
Alias:   ~/.local/bin/work
```

## `hermes profile alias`

```bash
hermes profile alias <name> [options]
```

重新生成位于 `~/.local/bin/<name>` 的 Shell 别名脚本。当别名被意外删除或在移动 Hermes 安装位置后需要更新别名时非常有用。

| 参数 / 选项 | 说明 |
|-------------|------|
| `<name>` | 要创建/更新别名的配置文件。 |
| `--remove` | 移除包装脚本而非创建。 |
| `--name <alias>` | 自定义别名名称（默认：配置文件名称）。 |

**示例：**

```bash
hermes profile alias work
# 创建/更新 ~/.local/bin/work

hermes profile alias work --name mywork
# 创建 ~/.local/bin/mywork

hermes profile alias work --remove
# 移除包装脚本
```

## `hermes profile rename`

```bash
hermes profile rename <old-name> <new-name>
```

重命名配置文件。会更新目录和 Shell 别名。

| 参数 | 说明 |
|------|------|
| `<old-name>` | 当前配置文件名称。 |
| `<new-name>` | 新的配置文件名称。 |

**示例：**

```bash
hermes profile rename mybot assistant
# ~/.hermes/profiles/mybot → ~/.hermes/profiles/assistant
# ~/.local/bin/mybot → ~/.local/bin/assistant
```

## `hermes profile export`

```bash
hermes profile export <name> [options]
```

将配置文件导出为压缩的 tar.gz 压缩包。

| 参数 / 选项 | 说明 |
|-------------|------|
| `<name>` | 要导出的配置文件。 |
| `-o`, `--output <path>` | 输出文件路径（默认：`<name>.tar.gz`）。 |

**示例：**

```bash
hermes profile export work
# 在当前目录创建 work.tar.gz

hermes profile export work -o ./work-2026-03-29.tar.gz
```

## `hermes profile import`

```bash
hermes profile import <archive> [options]
```

从 tar.gz 压缩包导入配置文件。

| 参数 / 选项 | 说明 |
|-------------|------|
| `<archive>` | 要导入的 tar.gz 压缩包路径。 |
| `--name <name>` | 导入的配置文件名称（默认：从压缩包推断）。 |

**示例：**

```bash
hermes profile import ./work-2026-03-29.tar.gz
# 从压缩包推断配置文件名称

hermes profile import ./work-2026-03-29.tar.gz --name work-restored
```

## `hermes -p` / `hermes --profile`

```bash
hermes -p <name> <command> [options]
hermes --profile <name> <command> [options]
```

全局标志，用于在指定配置文件下运行任何 Hermes 命令，而无需更改固定的默认配置文件。此标志仅在命令执行期间覆盖活动配置文件。

| 选项 | 说明 |
|------|------|
| `-p <name>`, `--profile <name>` | 本次命令使用的配置文件。 |

**示例：**

```bash
hermes -p work chat -q "Check the server status"
hermes --profile dev gateway start
hermes -p personal skills list
hermes -p work config edit
```

## `hermes completion`

```bash
hermes completion <shell>
```

生成 Shell 补全脚本。包含配置文件名称和配置文件子命令的补全。

| 参数 | 说明 |
|------|------|
| `<shell>` | 要生成补全的 Shell 类型：`bash` 或 `zsh`。 |

**示例：**

```bash
# 安装补全
hermes completion bash >> ~/.bashrc
hermes completion zsh >> ~/.zshrc

# 重新加载 Shell
source ~/.bashrc
```

安装完成后，以下命令支持 Tab 补全：
- `hermes profile <TAB>` — 子命令（list、use、create 等）
- `hermes profile use <TAB>` — 配置文件名称
- `hermes -p <TAB>` — 配置文件名称

## 另请参阅

- [配置文件用户指南](../user-guide/profiles.md)
- [CLI 命令参考](./cli-commands.md)
- [常见问题 — 配置文件部分](./faq.md#profiles)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/profile-commands)
