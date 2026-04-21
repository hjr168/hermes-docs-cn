---
title: "视觉与图片粘贴"
description: 从剪贴板粘贴图片到 Hermes CLI，实现多模态视觉分析。
sidebar_label: 视觉与图片粘贴
sidebar_position: 7
---

# 视觉与图片粘贴

Hermes Agent 支持**多模态视觉（Multimodal Vision）**——你可以直接从剪贴板粘贴图片到 CLI 中，让 Agent 分析、描述或处理它们。图片以 base64 编码的内容块发送给模型，因此任何支持视觉的模型都可以处理它们。

## 工作原理

1. 复制一张图片到剪贴板（截图、浏览器图片等）
2. 使用以下任一方式附加图片
3. 输入你的问题并按 Enter
4. 图片会显示为输入框上方的 `[📎 Image #1]` 徽章
5. 提交时，图片作为视觉内容块发送给模型

你可以在发送前附加多张图片——每张图片都有自己的徽章。按 `Ctrl+C` 清除所有已附加的图片。

图片会保存到 `~/.hermes/images/` 目录，以时间戳命名的 PNG 文件。

## 粘贴方式

附加图片的方式取决于你的终端环境。并非所有方式在所有环境下都可用——以下是完整说明：

### `/paste` 命令

**最可靠的方式，所有环境均可用。**

```
/paste
```

输入 `/paste` 并按 Enter。Hermes 会检查剪贴板中是否有图片并附加它。这种方式在所有环境中都能工作，因为它直接调用剪贴板后端——无需担心终端按键拦截问题。

### Ctrl+V / Cmd+V（括号粘贴）

当你粘贴的文本与图片同时存在于剪贴板时，Hermes 会自动检查是否有图片。这在以下情况有效：
- 你的剪贴板**同时包含文本和图片**（某些应用在复制时会同时放入两者）
- 你的终端支持括号粘贴（Bracketed Paste，大多数现代终端都支持）

:::warning
如果你的剪贴板**只有图片**（没有文本），Ctrl+V 在大多数终端中不会起任何作用。终端只能粘贴文本——没有标准的机制来粘贴二进制图片数据。请使用 `/paste` 或 Alt+V 代替。
:::

### Alt+V

Alt 组合键在大多数终端模拟器中会直接传递（它们被发送为 ESC + 键，而不是被拦截）。按 `Alt+V` 检查剪贴板中是否有图片。

:::caution
**在 VSCode 集成终端中不可用。** VSCode 会拦截许多 Alt+键组合用于自己的 UI。请改用 `/paste`。
:::

### Ctrl+V（原始模式——仅限 Linux）

在 Linux 桌面终端（GNOME Terminal、Konsole、Alacritty 等）中，`Ctrl+V` **不是**粘贴快捷键——`Ctrl+Shift+V` 才是。因此 `Ctrl+V` 会发送一个原始字节给应用程序，Hermes 捕获它来检查剪贴板。这仅在具有 X11 或 Wayland 剪贴板访问权限的 Linux 桌面终端上有效。

## 平台兼容性

| 环境 | `/paste` | Ctrl+V 文本+图片 | Alt+V | 备注 |
|---|:---:|:---:|:---:|---|
| **macOS Terminal / iTerm2** | ✅ | ✅ | ✅ | 最佳体验——`osascript` 始终可用 |
| **Linux X11 桌面** | ✅ | ✅ | ✅ | 需要 `xclip`（`apt install xclip`） |
| **Linux Wayland 桌面** | ✅ | ✅ | ✅ | 需要 `wl-paste`（`apt install wl-clipboard`） |
| **WSL2（Windows Terminal）** | ✅ | ✅¹ | ✅ | 使用 `powershell.exe`——无需额外安装 |
| **VSCode Terminal（本地）** | ✅ | ✅¹ | ❌ | VSCode 拦截 Alt+键 |
| **VSCode Terminal（SSH）** | ❌² | ❌² | ❌ | 远程剪贴板不可访问 |
| **SSH 终端（任意）** | ❌² | ❌² | ❌² | 远程剪贴板不可访问 |

¹ 仅当剪贴板同时包含文本和图片时有效（仅图片的剪贴板不会触发任何操作）
² 参见下方 [SSH 与远程会话](#ssh--远程会话)

## 平台特定配置

### macOS

**无需额外配置。** Hermes 使用 `osascript`（macOS 内置）读取剪贴板。如需更快的性能，可选择性安装 `pngpaste`：

```bash
brew install pngpaste
```

### Linux（X11）

安装 `xclip`：

```bash
# Ubuntu/Debian
sudo apt install xclip

# Fedora
sudo dnf install xclip

# Arch
sudo pacman -S xclip
```

### Linux（Wayland）

现代 Linux 桌面（Ubuntu 22.04+、Fedora 34+）通常默认使用 Wayland。安装 `wl-clipboard`：

```bash
# Ubuntu/Debian
sudo apt install wl-clipboard

# Fedora
sudo dnf install wl-clipboard

# Arch
sudo pacman -S wl-clipboard
```

:::tip 如何检查你使用的是 Wayland 还是 X11
```bash
echo $XDG_SESSION_TYPE
# "wayland" = Wayland, "x11" = X11, "tty" = 无显示服务器
```
:::

### WSL2

**无需额外配置。** Hermes 通过 `/proc/version` 自动检测 WSL2，并使用 `powershell.exe` 通过 .NET 的 `System.Windows.Forms.Clipboard` 访问 Windows 剪贴板。这是 WSL2 Windows 互操作内置的功能——`powershell.exe` 默认可用。

剪贴板数据通过 stdout 以 base64 编码的 PNG 格式传输，因此不需要文件路径转换或临时文件。

:::info WSLg 说明
如果你运行的是 WSLg（带 GUI 支持的 WSL2），Hermes 会先尝试 PowerShell 路径，然后回退到 `wl-paste`。WSLg 的剪贴板桥接仅支持 BMP 格式的图片——Hermes 会使用 Pillow（如果已安装）或 ImageMagick 的 `convert` 命令自动将 BMP 转换为 PNG。
:::

#### 验证 WSL2 剪贴板访问

```bash
# 1. 检查 WSL 检测
grep -i microsoft /proc/version

# 2. 检查 PowerShell 是否可用
which powershell.exe

# 3. 复制一张图片，然后检查
powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::ContainsImage()"
# 应该输出 "True"
```

## SSH 与远程会话

**剪贴板粘贴在 SSH 连接中不可用。** 当你通过 SSH 连接到远程机器时，Hermes CLI 运行在远程主机上。所有剪贴板工具（`xclip`、`wl-paste`、`powershell.exe`、`osascript`）读取的是它们运行所在机器的剪贴板——也就是远程服务器，而不是你的本地机器。你的本地剪贴板从远程端是不可访问的。

### SSH 环境的替代方案

1. **上传图片文件**——在本地保存图片，通过 `scp`、VSCode 的文件资源管理器（拖放）或任何文件传输方式上传到远程服务器。然后通过路径引用它。*（`/attach <filepath>` 命令计划在未来版本中推出。）*

2. **使用 URL**——如果图片可以在线访问，直接在消息中粘贴 URL。Agent 可以使用 `vision_analyze` 直接查看任何图片 URL。

3. **X11 转发**——使用 `ssh -X` 连接以转发 X11。这让远程机器上的 `xclip` 可以访问你本地的 X11 剪贴板。需要在本地运行 X 服务器（macOS 上的 XQuartz，Linux X11 桌面内置）。对大图片传输较慢。

4. **使用消息平台**——通过 Telegram、Discord、Slack 或 WhatsApp 发送图片给 Hermes。这些平台原生处理图片上传，不受剪贴板/终端限制的影响。

## 为什么终端无法粘贴图片

这是一个常见的困惑来源，以下是技术解释：

终端是**基于文本的**界面。当你按 Ctrl+V（或 Cmd+V）时，终端模拟器会：

1. 读取剪贴板中的**文本内容**
2. 将其包裹在[括号粘贴（Bracketed Paste）](https://en.wikipedia.org/wiki/Bracketed-paste)转义序列中
3. 通过终端的文本流发送给应用程序

如果剪贴板只包含图片（没有文本），终端没有任何内容可以发送。没有标准的终端转义序列用于二进制图片数据。终端什么也不做。

这就是为什么 Hermes 使用单独的剪贴板检查——它不是通过终端粘贴事件接收图片数据，而是通过子进程直接调用操作系统级别的工具（`osascript`、`powershell.exe`、`xclip`、`wl-paste`）独立读取剪贴板。

## 支持的模型

图片粘贴适用于任何支持视觉的模型。图片以 OpenAI 视觉内容格式的 base64 编码数据 URL 发送：

```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/png;base64,..."
  }
}
```

大多数现代模型都支持此格式，包括 GPT-4 Vision、Claude（含视觉）、Gemini，以及通过 OpenRouter 服务的开源多模态模型。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/vision)
