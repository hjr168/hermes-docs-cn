---
sidebar_position: 3
title: "更新与卸载"
description: "如何将 Hermes Agent 更新到最新版本或卸载它"
---

# 更新与卸载

## 更新

一条命令即可更新到最新版本：

```bash
hermes update
```

这会拉取最新代码、更新依赖，并提示你配置上次更新以来新增的选项。

:::tip
`hermes update` 会自动检测新的配置选项并提示你添加。如果你跳过了那个提示，可以手动运行 `hermes config check` 查看缺失的选项，然后运行 `hermes config migrate` 交互式地添加它们。
:::

### 更新过程中发生了什么

运行 `hermes update` 时，会执行以下步骤：

1. **Git pull** —— 从 `main` 分支拉取最新代码并更新子模块
2. **依赖安装** —— 运行 `uv pip install -e ".[all]"` 以获取新增或变更的依赖
3. **配置迁移** —— 检测自你当前版本以来新增的配置选项，并提示你设置
4. **网关自动重启** —— 如果网关服务正在运行（Linux 上的 systemd，macOS 上的 launchd），更新完成后会**自动重启**，使新代码立即生效

预期输出如下：

```
$ hermes update
Updating Hermes Agent...
📥 Pulling latest code...
Already up to date.  (或者: Updating abc1234..def5678)
📦 Updating dependencies...
✅ Dependencies updated
🔍 Checking for new config options...
✅ Config is up to date  (或者: Found 2 new options — running migration...)
🔄 Restarting gateway service...
✅ Gateway restarted
✅ Hermes Agent updated successfully!
```

### 推荐的更新后验证

`hermes update` 处理了主要的更新流程，但快速验证可以确认一切正常：

1. `git status --short` —— 如果工作树出现意外改动，先检查再继续
2. `hermes doctor` —— 检查配置、依赖和服务健康状态
3. `hermes --version` —— 确认版本号已如预期更新
4. 如果你使用了网关：`hermes gateway status`
5. 如果 `doctor` 报告了 npm audit 问题：在提示的目录中运行 `npm audit fix`

:::warning 更新后工作树有改动
如果 `git status --short` 在 `hermes update` 后显示了意外的变更，先停下来检查再继续。这通常意味着本地修改被重新应用到了更新后的代码之上，或者某个依赖步骤刷新了锁文件。
:::

### 如果更新过程中终端断开

`hermes update` 能保护自己免受意外的终端断开影响：

- 更新过程忽略 `SIGHUP` 信号，所以关闭 SSH 会话或终端窗口不再会导致安装中途失败。`pip` 和 `git` 子进程继承了这个保护，因此 Python 环境不会因为连接断开而处于半安装状态。
- 所有输出在更新运行时会同步写入 `~/.hermes/logs/update.log`。如果终端消失了，重新连接后查看日志即可确认更新是否完成、网关重启是否成功：

```bash
tail -f ~/.hermes/logs/update.log
```

- `Ctrl-C`（SIGINT）和系统关机（SIGTERM）仍然有效 —— 这些是有意的取消操作，不是意外。

你不再需要用 `screen` 或 `tmux` 包裹 `hermes update` 来应对终端断开。

### 查看当前版本

```bash
hermes version
```

在 [GitHub releases 页面](https://github.com/NousResearch/hermes-agent/releases) 查看最新版本。

### 从消息平台更新

你也可以直接从 Telegram、Discord、Slack 或 WhatsApp 更新，发送：

```
/update
```

这会拉取最新代码、更新依赖并重启网关。机器人会在重启期间短暂离线（通常 5-15 秒），然后恢复。

### 手动更新

如果你是手动安装的（非快速安装器）：

```bash
cd /path/to/hermes-agent
export VIRTUAL_ENV="$(pwd)/venv"

# 拉取最新代码和子模块
git pull origin main
git submodule update --init --recursive

# 重新安装（获取新依赖）
uv pip install -e ".[all]"
uv pip install -e "./tinker-atropos"

# 检查新的配置选项
hermes config check
hermes config migrate   # 交互式添加缺失的选项
```

### 回滚说明

如果更新引入了问题，你可以回滚到之前的版本：

```bash
cd /path/to/hermes-agent

# 查看最近的版本
git log --oneline -10

# 回滚到特定提交
git checkout <commit-hash>
git submodule update --init --recursive
uv pip install -e ".[all]"

# 如果网关在运行，重启它
hermes gateway restart
```

要回滚到特定的发布标签：

```bash
git checkout v0.6.0
git submodule update --init --recursive
uv pip install -e ".[all]"
```

:::warning
回滚可能导致配置不兼容，如果新版本添加了新的选项。回滚后运行 `hermes config check`，如果遇到错误，从 `config.yaml` 中移除无法识别的选项。
:::

### Nix 用户注意

如果你通过 Nix Flake 安装，更新由 Nix 包管理器管理：

```bash
# 更新 Flake 输入
nix flake update hermes-agent

# 或使用最新版本重建
nix profile upgrade hermes-agent
```

Nix 安装是不可变的 —— 回滚由 Nix 的 generation（世代）系统处理：

```bash
nix profile rollback
```

详见 [Nix 安装配置](./nix-setup.md)。

---

## 卸载

```bash
hermes uninstall
```

卸载器会给你选择是否保留配置文件（`~/.hermes/`），以便将来重新安装。

### 手动卸载

```bash
rm -f ~/.local/bin/hermes
rm -rf /path/to/hermes-agent
rm -rf ~/.hermes            # 可选 —— 如果打算重新安装可保留
```

:::info
如果你将网关安装为了系统服务，先停止并禁用它：
```bash
hermes gateway stop
# Linux: systemctl --user disable hermes-gateway
# macOS: launchctl remove ai.hermes.gateway
```
:::

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/getting-started/updating)
