---
sidebar_position: 8
title: "使用 Hermes 语音模式"
description: "在 CLI、Telegram、Discord 和 Discord 语音频道中设置和使用 Hermes 语音模式的实用指南"
---

# 使用 Hermes 语音模式

本指南是[语音模式功能参考](/docs/user-guide/features/voice-mode)的实践配套。

功能页面解释了语音模式能做什么，本指南展示如何真正用好它。

## 语音模式适合什么

语音模式特别适合以下场景：
- 你想要免提的 CLI 工作流
- 你想要在 Telegram 或 Discord 中收到语音回复
- 你想让 Hermes 坐在 Discord 语音频道中进行实时对话
- 你想边走边快速捕捉想法、调试或来回讨论，而不是打字

## 选择你的语音模式设置

Hermes 中实际上有三种不同的语音体验。

| 模式 | 最适合 | 平台 |
|---|---|---|
| 交互式麦克风循环 | 编码或研究时的个人免提使用 | CLI |
| 聊天中的语音回复 | 在正常消息旁边附带语音回复 | Telegram、Discord |
| 实时语音频道 Bot | 在语音频道中的群组或个人实时对话 | Discord 语音频道 |

一个好的路径是：
1. 先让文本模式正常工作
2. 然后启用语音回复
3. 如果你想要完整体验，最后转到 Discord 语音频道

## 第 1 步：先确保普通 Hermes 正常工作

在接触语音模式之前，验证：
- Hermes 能启动
- 你的提供商已配置
- Agent 能正常回答文本提示

```bash
hermes
```

问一些简单的问题：

```text
你有哪些可用工具？
```

如果这个还不稳定，先解决文本模式。

## 第 2 步：安装正确的附加组件

### CLI 麦克风 + 播放

```bash
pip install "hermes-agent[voice]"
```

### 消息平台

```bash
pip install "hermes-agent[messaging]"
```

### 高级 ElevenLabs TTS

```bash
pip install "hermes-agent[tts-premium]"
```

### 本地 NeuTTS（可选）

```bash
python -m pip install -U neutts[all]
```

### 全部安装

```bash
pip install "hermes-agent[all]"
```

## 第 3 步：安装系统依赖

### macOS

```bash
brew install portaudio ffmpeg opus
brew install espeak-ng
```

### Ubuntu / Debian

```bash
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng
```

为什么需要这些：
- `portaudio` → CLI 语音模式的麦克风输入/播放
- `ffmpeg` → TTS 和消息投递的音频转换
- `opus` → Discord 语音编解码支持
- `espeak-ng` → NeuTTS 的音素化后端

## 第 4 步：选择 STT 和 TTS 提供商

Hermes 同时支持本地和云端语音栈。

### 最简单/最便宜的设置

使用本地 STT 和免费的 Edge TTS：
- STT 提供商：`local`
- TTS 提供商：`edge`

这通常是最好的起点。

### 环境文件示例

添加到 `~/.hermes/.env`：

```bash
# 云端 STT 选项（本地不需要密钥）
GROQ_API_KEY=***
VOICE_TOOLS_OPENAI_KEY=***

# 高级 TTS（可选）
ELEVENLABS_API_KEY=***
```

### 提供商推荐

#### 语音转文本（STT）

- `local` → 隐私和零成本使用的最佳默认
- `groq` → 非常快的云端转录
- `openai` → 好的付费备选

#### 文本转语音（TTS）

- `edge` → 免费且对大多数用户足够好
- `neutts` → 免费的本地/设备端 TTS
- `elevenlabs` → 最佳质量
- `openai` → 好的中间选择
- `mistral` → 多语言，原生 Opus

### 如果你使用 `hermes setup`

如果你在设置向导中选择 NeuTTS，Hermes 会检查 `neutts` 是否已安装。如果缺失，向导会告诉你 NeuTTS 需要 Python 包 `neutts` 和系统包 `espeak-ng`，提供安装选项，用你的平台包管理器安装 `espeak-ng`，然后运行：

```bash
python -m pip install -U neutts[all]
```

如果你跳过安装或安装失败，向导会回退到 Edge TTS。

## 第 5 步：推荐配置

```yaml
voice:
  record_key: "ctrl+b"
  max_recording_seconds: 120
  auto_tts: false
  silence_threshold: 200
  silence_duration: 3.0

stt:
  provider: "local"
  local:
    model: "base"

tts:
  provider: "edge"
  edge:
    voice: "en-US-AriaNeural"
```

这对大多数人是一个好的保守默认。

如果你想要本地 TTS，将 `tts` 块改为：

```yaml
tts:
  provider: "neutts"
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

## 用例 1：CLI 语音模式

## 开启

启动 Hermes：

```bash
hermes
```

在 CLI 中：

```text
/voice on
```

### 录音流程

默认按键：
- `Ctrl+B`

工作流：
1. 按下 `Ctrl+B`
2. 说话
3. 等待静音检测自动停止录音
4. Hermes 转录并回复
5. 如果 TTS 开启，它会朗读回答
6. 循环可以自动重启以持续使用

### 实用命令

```text
/voice
/voice on
/voice off
/voice tts
/voice status
```

### 好的 CLI 工作流

#### 走近式调试

说：

```text
我一直收到 docker 权限错误。帮我调试。
```

然后继续免提：
- "再读一遍最后的错误"
- "用更简单的话解释根本原因"
- "现在给我精确的修复方案"

#### 研究/头脑风暴

非常适合：
- 边走边思考
- 口述半成形的想法
- 让 Hermes 实时组织你的思路

#### 无障碍/低打字会话

如果打字不方便，语音模式是保持完整 Hermes 工作流的最快方式之一。

## 调整 CLI 行为

### 静音阈值

如果 Hermes 太积极开始/停止录音，调整：

```yaml
voice:
  silence_threshold: 250
```

更高的阈值 = 更不敏感。

### 静音持续时间

如果你在句子之间经常停顿，增加：

```yaml
voice:
  silence_duration: 4.0
```

### 录音键

如果 `Ctrl+B` 与你的终端或 tmux 习惯冲突：

```yaml
voice:
  record_key: "ctrl+space"
```

## 用例 2：Telegram 或 Discord 中的语音回复

这个模式比完整语音频道更简单。

Hermes 保持为普通聊天 Bot，但可以朗读回复。

### 启动 Gateway

```bash
hermes gateway
```

### 开启语音回复

在 Telegram 或 Discord 中：

```text
/voice on
```

或

```text
/voice tts
```

### 模式

| 模式 | 含义 |
|---|---|
| `off` | 仅文本 |
| `voice_only` | 仅当用户发送语音时才朗读 |
| `all` | 朗读每条回复 |

### 何时使用哪种模式

- `/voice on` 如果你只想要针对语音消息的语音回复
- `/voice tts` 如果你想要一个全时段语音助手

### 好的消息工作流

#### 手机上的 Telegram 助手

使用场景：
- 你不在电脑旁
- 你想发送语音笔记并获得快速语音回复
- 你想让 Hermes 充当便携式研究或运维助手

#### 带语音输出的 Discord 私信

当你想要私密交互，不受服务器频道 @提及行为影响时有用。

## 用例 3：Discord 语音频道

这是最高级的模式。

Hermes 加入 Discord 语音频道（VC），监听用户语音，转录，运行正常的 Agent 管道，然后在频道中朗读回复。

## 所需 Discord 权限

除了正常的文本 Bot 设置外，确保 Bot 拥有：
- 连接
- 说话
- 最好有使用语音活动

同时在开发者门户中启用特权意图：
- Presence Intent
- Server Members Intent
- Message Content Intent

## 加入和离开

在 Bot 所在的 Discord 文本频道中：

```text
/voice join
/voice leave
/voice status
```

### 加入后发生什么

- 用户在 VC 中说话
- Hermes 检测语音边界
- 转录文本发布到关联的文本频道
- Hermes 以文本和音频回复
- 文本频道是发出 `/voice join` 的那个

### Discord VC 使用的最佳实践

- 保持 `DISCORD_ALLOWED_USERS` 严格
- 开始时使用专门的 Bot/测试频道
- 在尝试 VC 模式之前，先验证 STT 和 TTS 在普通文本聊天语音模式中正常工作

## 语音质量推荐

### 最佳质量设置

- STT：本地 `large-v3` 或 Groq `whisper-large-v3`
- TTS：ElevenLabs

### 最佳速度/便利性设置

- STT：本地 `base` 或 Groq
- TTS：Edge

### 最佳零成本设置

- STT：本地
- TTS：Edge

## 常见故障模式

### "No audio device found"

安装 `portaudio`。

### "Bot 加入但听不到任何声音"

检查：
- 你的 Discord 用户 ID 在 `DISCORD_ALLOWED_USERS` 中
- 你没有静音
- 特权意图已启用
- Bot 有连接/说话权限

### "能转录但不说话"

检查：
- TTS 提供商配置
- ElevenLabs 或 OpenAI 的 API 密钥/配额
- Edge 转换路径需要的 `ffmpeg` 安装

### "Whisper 输出乱码"

尝试：
- 更安静的环境
- 更高的 `silence_threshold`
- 不同的 STT 提供商/模型
- 更短、更清晰的语句

### "在私信中能工作但在服务器频道中不行"

这通常是提及策略问题。

默认情况下，Bot 在 Discord 服务器文本频道中需要 `@mention`，除非另行配置。

## 建议的首周设置

如果你想要最短的成功路径：

1. 让文本 Hermes 正常工作
2. 安装 `hermes-agent[voice]`
3. 使用本地 STT + Edge TTS 的 CLI 语音模式
4. 然后在 Telegram 或 Discord 中启用 `/voice on`
5. 只有在那之后，才尝试 Discord VC 模式

这个渐进过程保持了较小的调试范围。

## 接下来阅读什么

- [语音模式功能参考](/docs/user-guide/features/voice-mode)
- [消息 Gateway](/docs/user-guide/messaging)
- [Discord 设置](/docs/user-guide/messaging/discord)
- [Telegram 设置](/docs/user-guide/messaging/telegram)
- [配置](/docs/user-guide/configuration)

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/use-voice-mode-with-hermes)
