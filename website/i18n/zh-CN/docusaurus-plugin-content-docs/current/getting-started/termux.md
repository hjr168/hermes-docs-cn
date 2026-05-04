---
sidebar_position: 3
title: "Android / Termux"
description: "在 Android 手机上通过 Termux 直接运行 Hermes Agent"
---

# 在 Android 上通过 Termux 运行 Hermes

这是通过 [Termux](https://termux.dev/) 在 Android 手机上直接运行 Hermes Agent 的经过测试的路径。

它为你提供手机上可用的本地 CLI，以及目前在 Android 上已知可以正常安装的核心扩展。

## 测试路径中支持什么？

测试路径的 Termux 打包安装以下内容：
- Hermes CLI
- Cron 支持
- PTY / 后台终端支持
- Telegram 网关支持（手动 / 尽力后台运行）
- MCP 支持
- Honcho 记忆支持
- ACP 支持

具体来说，它对应：

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

## 哪些功能尚未纳入测试路径？

一些功能仍需要桌面/服务器端的依赖，而这些依赖未发布 Android 版本，或尚未在手机上验证：

- `.[all]` 目前在 Android 上不受支持
- `voice` 扩展被 `faster-whisper -> ctranslate2` 阻挡，`ctranslate2` 未发布 Android wheel
- 自动浏览器 / Playwright 引导在 Termux 安装中被跳过
- Docker 终端隔离在 Termux 内不可用
- Android 可能仍会挂起 Termux 的后台任务，因此网关持久性是尽力而为，而非正常的托管服务

这并不妨碍 Hermes 作为手机原生 CLI Agent 正常工作 —— 只是推荐的移动端安装有意比桌面/服务器端安装范围更窄。

---

## 方式 1：一行安装

Hermes 现在提供了 Termux 感知的安装路径：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

在 Termux 上，安装程序会自动：
- 使用 `pkg` 安装系统包
- 使用 `python -m venv` 创建虚拟环境
- 使用 `pip` 安装 `.[termux]`
- 将 `hermes` 链接到 `$PREFIX/bin`，使其始终在 Termux PATH 中
- 跳过未测试的浏览器 / WhatsApp 引导

如果你想看完整命令或需要排查安装失败，请使用下面的手动路径。

---

## 方式 2：手动安装（完全显式）

### 1. 更新 Termux 并安装系统包

```bash
pkg update
pkg install -y git python clang rust make pkg-config libffi openssl nodejs ripgrep ffmpeg
```

为什么需要这些包？
- `python` —— 运行时 + 虚拟环境支持
- `git` —— 克隆/更新仓库
- `clang`、`rust`、`make`、`pkg-config`、`libffi`、`openssl` —— 在 Android 上构建某些 Python 依赖所需
- `nodejs` —— 可选的 Node 运行时，用于测试核心路径之外的实验
- `ripgrep` —— 快速文件搜索
- `ffmpeg` —— 媒体 / TTS 转换

### 2. 克隆 Hermes

```bash
git clone --recurse-submodules https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
```

如果之前克隆时没有加子模块：

```bash
git submodule update --init --recursive
```

### 3. 创建虚拟环境

```bash
python -m venv venv
source venv/bin/activate
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install --upgrade pip setuptools wheel
```

`ANDROID_API_LEVEL` 对于 Rust / maturin 构建的包（如 `jiter`）很重要。

### 4. 安装测试版 Termux 打包

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

如果只需要最小核心 Agent，也可以用：

```bash
python -m pip install -e '.' -c constraints-termux.txt
```

### 5. 将 `hermes` 放到 Termux PATH 上

```bash
ln -sf "$PWD/venv/bin/hermes" "$PREFIX/bin/hermes"
```

`$PREFIX/bin` 在 Termux 中已在 PATH 上，所以这使 `hermes` 命令在新 shell 中持久可用，无需每次重新激活虚拟环境。

### 6. 验证安装

```bash
hermes version
hermes doctor
```

### 7. 启动 Hermes

```bash
hermes
```

---

## 推荐的后续设置

### 配置模型

```bash
hermes model
```

或直接在 `~/.hermes/.env` 中设置 Key。

### 稍后重新运行完整交互设置向导

```bash
hermes setup
```

### 手动安装可选的 Node 依赖

测试路径有意跳过了 Node / 浏览器引导。如果你想之后尝试浏览器工具：

```bash
pkg install nodejs-lts
npm install
```

浏览器工具会自动在 PATH 搜索中包含 Termux 目录（`/data/data/com.termux/files/usr/bin`），因此 `agent-browser` 和 `npx` 无需额外 PATH 配置即可被发现。

在 Android 上的浏览器 / WhatsApp 工具目前请视为实验性功能，直到另有文档说明。

---

## 故障排除

### 安装 `.[all]` 时出现 `No solution found`

改用测试版 Termux 打包：

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

当前的阻碍是 `voice` 扩展：
- `voice` 拉取 `faster-whisper`
- `faster-whisper` 依赖 `ctranslate2`
- `ctranslate2` 未发布 Android wheel

### `uv pip install` 在 Android 上失败

改用标准库虚拟环境 + `pip` 的 Termux 路径：

```bash
python -m venv venv
source venv/bin/activate
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

### `jiter` / `maturin` 报错 `ANDROID_API_LEVEL`

安装前显式设置 API Level：

```bash
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

### `hermes doctor` 提示缺少 ripgrep 或 Node

用 Termux 包安装：

```bash
pkg install ripgrep nodejs
```

### 安装 Python 包时构建失败

确保构建工具链已安装：

```bash
pkg install clang rust make pkg-config libffi openssl
```

然后重试：

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

---

## 手机上的已知限制

- Docker 后端不可用
- 测试路径中无法使用通过 `faster-whisper` 的本地语音转录
- 浏览器自动化设置被安装程序有意跳过
- 部分可选扩展可能可以工作，但目前只有 `.[termux]` 被文档记录为经过测试的 Android 打包

如果你遇到新的 Android 特有问题，请提交 GitHub Issue，附上：
- 你的 Android 版本
- `termux-info` 输出
- `python --version` 输出
- `hermes doctor` 输出
- 完整的安装命令和错误输出

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/getting-started/termux)
