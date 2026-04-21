---
sidebar_position: 10
title: "Voice Mode（语音模式）"
description: "与 Hermes Agent 的实时语音对话 — CLI、Telegram、Discord（私信、文字频道和语音频道）"
---

# Voice Mode（语音模式）

Hermes Agent 支持跨 CLI 和消息平台的完整语音交互。使用麦克风与 Agent 对话，听取语音回复，在 Discord 语音频道中进行实时语音对话。

如需实用的设置演练和推荐配置，参见[使用语音模式与 Hermes](/docs/guides/use-voice-mode-with-hermes)。

## 前提条件

使用语音功能前，确保：

1. **已安装 Hermes Agent** — `pip install hermes-agent`（参见[安装](/docs/getting-started/installation)）
2. **已配置 LLM Provider** — 运行 `hermes model` 或在 `~/.hermes/.env` 中设置你的 Provider 凭据
3. **基础设置可用** — 运行 `hermes` 验证 Agent 能正常响应文字后再启用语音

:::tip
`~/.hermes/` 目录和默认 `config.yaml` 在你首次运行 `hermes` 时自动创建。你只需手动创建 `~/.hermes/.env` 来放 API Key。
:::

## 概览

| 功能 | 平台 | 说明 |
|---------|----------|-------------|
| **交互式语音** | CLI | 按 Ctrl+B 录音，Agent 自动检测静音并响应 |
| **自动语音回复** | Telegram、Discord | Agent 在文字响应旁发送语音音频 |
| **语音频道** | Discord | Bot 加入语音频道，听取用户说话，在语音频道中语音回复 |

## 系统要求

### Python 包

```bash
# CLI 语音模式（麦克风 + 音频播放）
pip install "hermes-agent[voice]"

# Discord + Telegram 消息（包含 discord.py[voice] 用于语音频道支持）
pip install "hermes-agent[messaging]"

# 高级 TTS（ElevenLabs）
pip install "hermes-agent[tts-premium]"

# 本地 TTS（NeuTTS，可选）
python -m pip install -U neutts[all]

# 一次性安装所有
pip install "hermes-agent[all]"
```

| Extra | 包 | 用途 |
|-------|----------|-------------|
| `voice` | `sounddevice`, `numpy` | CLI 语音模式 |
| `messaging` | `discord.py[voice]`, `python-telegram-bot`, `aiohttp` | Discord & Telegram Bot |
| `tts-premium` | `elevenlabs` | ElevenLabs TTS Provider |

可选本地 TTS Provider：使用 `python -m pip install -U neutts[all]` 单独安装 `neutts`。首次使用时会自动下载模型。

:::info
`discord.py[voice]` 会自动安装 **PyNaCl**（用于语音加密）和 **opus 绑定**。这是 Discord 语音频道支持所必需的。
:::

### 系统依赖

```bash
# macOS
brew install portaudio ffmpeg opus
brew install espeak-ng   # 用于 NeuTTS

# Ubuntu/Debian
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng   # 用于 NeuTTS
```

| 依赖 | 用途 | 使用场景 |
|-----------|---------|-------------|
| **PortAudio** | 麦克风输入和音频播放 | CLI 语音模式 |
| **ffmpeg** | 音频格式转换（MP3 → Opus、PCM → WAV） | 所有平台 |
| **Opus** | Discord 语音编解码器 | Discord 语音频道 |
| **espeak-ng** | 音素化后端 | 本地 NeuTTS Provider |

### API Key

添加到 `~/.hermes/.env`：

```bash
# 语音转文字 — 本地 Provider 不需要任何 Key
# pip install faster-whisper          # 免费，本地运行，推荐
GROQ_API_KEY=your-key                 # Groq Whisper — 快速，有免费额度（云）
VOICE_TOOLS_OPENAI_KEY=your-key       # OpenAI Whisper — 付费（云）

# 文字转语音（可选 — Edge TTS 和 NeuTTS 无需任何 Key）
ELEVENLABS_API_KEY=***           # ElevenLabs — 高品质
# 上方 VOICE_TOOLS_OPENAI_KEY 也启用 OpenAI TTS
```

:::tip
如果安装了 `faster-whisper`，语音模式可以**零 API Key** 使用 STT。模型（`base` 约 150 MB）首次使用时自动下载。
:::

---

## CLI 语音模式

### 快速开始

启动 CLI 并启用语音模式：

```bash
hermes                # 启动交互式 CLI
```

然后在 CLI 中使用以下命令：

```
/voice          切换语音模式开/关
/voice on       启用语音模式
/voice off      禁用语音模式
/voice tts      切换 TTS 输出
/voice status   显示当前状态
```

### 工作原理

1. 用 `hermes` 启动 CLI，用 `/voice on` 启用语音模式
2. **按 Ctrl+B** — 播放一声提示音（880Hz），开始录音
3. **说话** — 实时音频电平条显示输入：`● [▁▂▃▅▇▇▅▂] ❯`
4. **停止说话** — 3 秒静音后，录音自动停止
5. **两声提示音**（660Hz）确认录音结束
6. 音频通过 Whisper 转录并发送给 Agent
7. 如果 TTS 已启用，Agent 的回复会被朗读出来
8. 录音**自动重新开始** — 无需按任何键即可继续说话

此循环持续进行，直到你在录音期间按 **Ctrl+B**（退出连续模式）或连续 3 次录音未检测到语音。

:::tip
录音键可通过 `~/.hermes/config.yaml` 中的 `voice.record_key` 配置（默认：`ctrl+b`）。
:::

### 静音检测

两阶段算法检测你何时说完：

1. **语音确认** — 等待 RMS 阈值（200）以上的音频持续至少 0.3 秒，容忍音节间的短暂下降
2. **结束检测** — 确认语音后，3.0 秒连续静音触发

如果 15 秒内完全未检测到语音，录音自动停止。

`silence_threshold` 和 `silence_duration` 均可在 `config.yaml` 中配置。

### 流式 TTS

启用 TTS 后，Agent 会**逐句**朗读回复，随着文本生成实时播放 — 无需等待完整响应：

1. 将文本增量缓冲为完整句子（最少 20 字符）
2. 去除 Markdown 格式和 `字` 块
3. 每句实时生成并播放音频

### 幻觉过滤

Whisper 有时从静音或背景噪音中生成虚幻文本（"Thank you for watching"、"Subscribe" 等）。Agent 使用跨多语言的 26 个已知幻觉短语集加上捕获重复变体的正则模式来过滤这些内容。

---

## Gateway 语音回复（Telegram & Discord）

如果你还没设置消息 Bot，参见平台特定指南：
- [Telegram 设置指南](../messaging/telegram.md)
- [Discord 设置指南](../messaging/discord.md)

启动 Gateway 连接到你的消息平台：

```bash
hermes gateway        # 启动 Gateway（连接到已配置的平台）
hermes gateway setup  # 首次配置的交互式设置向导
```

### Discord：频道 vs 私信

Bot 在 Discord 上支持两种交互模式：

| 模式 | 如何对话 | 需要 @提及 | 设置 |
|------|------------|-----------------|-------|
| **私信（DM）** | 打开 Bot 的资料 → "Message" | 否 | 立即可用 |
| **服务器频道** | 在 Bot 所在的文字频道中输入 | 是（`@botname`） | Bot 需被邀请到服务器 |

**私信（个人使用推荐）：** 直接打开 Bot 的私信对话 — 不需要 @提及。语音回复和所有命令与频道中相同。

**服务器频道：** Bot 仅在你 @提及它时响应（如 `@hermesbyt4 hello`）。确保从提及弹窗中选择 **Bot 用户**，而不是同名的角色。

:::tip
要禁用服务器频道中的提及要求，在 `~/.hermes/.env` 中添加：
```bash
DISCORD_REQUIRE_MENTION=false
```
或设置特定频道为自由响应（无需提及）：
```bash
DISCORD_FREE_RESPONSE_CHANNELS=123456789,987654321
```
:::

### 命令

在 Telegram 和 Discord（私信和文字频道）中均可使用：

```
/voice          切换语音模式开/关
/voice on       仅在你发送语音消息时回复语音
/voice tts      对所有消息回复语音
/voice off      禁用语音回复
/voice status   显示当前设置
```

### 模式

| 模式 | 命令 | 行为 |
|------|---------|----------|
| `off` | `/voice off` | 仅文字（默认） |
| `voice_only` | `/voice on` | 仅在你发送语音消息时语音回复 |
| `all` | `/voice tts` | 对每条消息语音回复 |

语音模式设置在 Gateway 重启后保持不变。

### 平台投递

| 平台 | 格式 | 说明 |
|----------|--------|-------|
| **Telegram** | 语音气泡（Opus/OGG） | 聊天中内联播放。ffmpeg 在需要时转换 MP3 → Opus |
| **Discord** | 原生语音气泡（Opus/OGG） | 像用户语音消息一样内联播放。语音气泡 API 失败时回退到文件附件 |

---

## Discord 语音频道

最沉浸的语音功能：Bot 加入 Discord 语音频道，听取用户说话，转录语音，通过 Agent 处理，并在语音频道中语音回复。

### 设置

#### 1. Discord Bot 权限

如果你已经为文字功能设置了 Discord Bot（参见 [Discord 设置指南](../messaging/discord.md)），需要添加语音权限。

前往 [Discord 开发者门户](https://discord.com/developers/applications) → 你的应用 → **Installation** → **Default Install Settings** → **Guild Install**：

**将这些权限添加到现有文字权限中：**

| 权限 | 用途 | 必需 |
|-----------|---------|----------|
| **Connect** | 加入语音频道 | 是 |
| **Speak** | 在语音频道中播放 TTS 音频 | 是 |
| **Use Voice Activity** | 检测用户何时在说话 | 推荐 |

**更新后的权限整数：**

| 级别 | 整数 | 包含内容 |
|-------|---------|----------------|
| 仅文字 | `274878286912` | 查看频道、发送消息、读取历史、嵌入、附件、线程、反应 |
| 文字 + 语音 | `274881432640` | 以上全部 + Connect、Speak |

**使用更新后的权限 URL 重新邀请 Bot：**

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274881432640
```

将 `YOUR_APP_ID` 替换为开发者门户中的 Application ID。

:::warning
重新邀请已存在于服务器中的 Bot 会更新其权限而不会移除它。你不会丢失任何数据或配置。
:::

#### 2. 特权 Gateway Intent

在[开发者门户](https://discord.com/developers/applications) → 你的应用 → **Bot** → **Privileged Gateway Intents**，启用全部三个：

| Intent | 用途 |
|--------|---------|
| **Presence Intent** | 检测用户在线/离线状态 |
| **Server Members Intent** | 将语音 SSRC 标识符映射到 Discord 用户 ID |
| **Message Content Intent** | 读取频道中的文字消息内容 |

三个都是完整语音频道功能所必需的。**Server Members Intent** 尤为关键 — 没有它，Bot 无法识别语音频道中谁在说话。

#### 3. Opus 编解码器

运行 Gateway 的机器上必须安装 Opus 编解码器库：

```bash
# macOS (Homebrew)
brew install opus

# Ubuntu/Debian
sudo apt install libopus0
```

Bot 从以下位置自动加载编解码器：
- **macOS：** `/opt/homebrew/lib/libopus.dylib`
- **Linux：** `libopus.so.0`

#### 4. 环境变量

```bash
# ~/.hermes/.env

# Discord Bot（已为文字功能配置）
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=your-user-id

# STT — 本地 Provider 不需要 Key（pip install faster-whisper）
# GROQ_API_KEY=your-key            # 替代方案：基于云，快速，有免费额度

# TTS — 可选。Edge TTS 和 NeuTTS 不需要 Key。
# ELEVENLABS_API_KEY=***      # 高品质
# VOICE_TOOLS_OPENAI_KEY=***  # OpenAI TTS / Whisper
```

### 启动 Gateway

```bash
hermes gateway        # 使用现有配置启动
```

Bot 应在几秒内在 Discord 上线。

### 命令

在 Bot 所在的 Discord 文字频道中使用：

```
/voice join      Bot 加入你当前的语音频道
/voice channel   /voice join 的别名
/voice leave     Bot 断开语音频道
/voice status    显示语音模式和连接的频道
```

:::info
运行 `/voice join` 前你必须先在语音频道中。Bot 会加入你所在的语音频道。
:::

### 工作原理

当 Bot 加入语音频道时：

1. **独立监听**每个用户的音频流
2. **检测静音** — 至少 0.5 秒语音后的 1.5 秒静音触发处理
3. **转录**音频通过 Whisper STT（本地、Groq 或 OpenAI）
4. **处理**通过完整的 Agent 管道（会话、工具、记忆）
5. **语音回复**在语音频道中通过 TTS 播放

### 文字频道集成

当 Bot 在语音频道中时：

- 转录内容显示在文字频道中：`[Voice] @user: 你说的话`
- Agent 响应作为文字发送到频道中，并在语音频道中朗读
- 文字频道是发出 `/voice join` 命令的那个频道

### 回声预防

Bot 在播放 TTS 回复时自动暂停音频监听器，防止听到并重新处理自己的输出。

### 访问控制

只有 `DISCORD_ALLOWED_USERS` 中列出的用户可以通过语音交互。其他用户的音频被静默忽略。

```bash
# ~/.hermes/.env
DISCORD_ALLOWED_USERS=284102345871466496
```

---

## 配置参考

### config.yaml

```yaml
# 语音录音（CLI）
voice:
  record_key: "ctrl+b"            # 开始/停止录音的按键
  max_recording_seconds: 120       # 最大录音时长
  auto_tts: false                  # 语音模式启动时自动启用 TTS
  silence_threshold: 200           # RMS 电平（0-32767），低于此值视为静音
  silence_duration: 3.0            # 自动停止前的静音秒数

# 语音转文字
stt:
  provider: "local"                  # "local"（免费）| "groq" | "openai"
  local:
    model: "base"                    # tiny, base, small, medium, large-v3
  # model: "whisper-1"              # 旧版：未设置 provider 时使用

# 文字转语音
tts:
  provider: "edge"                 # "edge"（免费）| "elevenlabs" | "openai" | "neutts" | "minimax"
  edge:
    voice: "en-US-AriaNeural"      # 322 种声音，74 种语言
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"    # Adam
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"                 # alloy, echo, fable, onyx, nova, shimmer
    base_url: "https://api.openai.com/v1"  # 可选：自托管或 OpenAI 兼容端点覆盖
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

### 环境变量

```bash
# 语音转文字 Provider（本地不需要 Key）
# pip install faster-whisper        # 免费本地 STT — 不需要 API Key
GROQ_API_KEY=...                    # Groq Whisper（快速，有免费额度）
VOICE_TOOLS_OPENAI_KEY=...         # OpenAI Whisper（付费）

# STT 高级覆盖（可选）
STT_GROQ_MODEL=whisper-large-v3-turbo    # 覆盖默认 Groq STT 模型
STT_OPENAI_MODEL=whisper-1               # 覆盖默认 OpenAI STT 模型
GROQ_BASE_URL=https://api.groq.com/openai/v1     # 自定义 Groq 端点
STT_OPENAI_BASE_URL=https://api.openai.com/v1    # 自定义 OpenAI STT 端点

# 文字转语音 Provider（Edge TTS 和 NeuTTS 不需要 Key）
ELEVENLABS_API_KEY=***             # ElevenLabs（高品质）
# 上方 VOICE_TOOLS_OPENAI_KEY 也启用 OpenAI TTS

# Discord 语音频道
DISCORD_BOT_TOKEN=...
DISCORD_ALLOWED_USERS=...
```

### STT Provider 对比

| Provider | 模型 | 速度 | 质量 | 费用 | API Key |
|----------|-------|-------|---------|------|---------|
| **本地** | `base` | 快（取决于 CPU/GPU） | 好 | 免费 | 不需要 |
| **本地** | `small` | 中等 | 更好 | 免费 | 不需要 |
| **本地** | `large-v3` | 慢 | 最好 | 免费 | 不需要 |
| **Groq** | `whisper-large-v3-turbo` | 非常快（~0.5s） | 好 | 有免费额度 | 需要 |
| **Groq** | `whisper-large-v3` | 快（~1s） | 更好 | 有免费额度 | 需要 |
| **OpenAI** | `whisper-1` | 快（~1s） | 好 | 付费 | 需要 |
| **OpenAI** | `gpt-4o-transcribe` | 中等（~2s） | 最好 | 付费 | 需要 |

Provider 优先级（自动回退）：**local** > **groq** > **openai**

### TTS Provider 对比

| Provider | 质量 | 费用 | 延迟 | 需要 Key |
|----------|---------|------|---------|-------------|
| **Edge TTS** | 好 | 免费 | ~1s | 不需要 |
| **ElevenLabs** | 优秀 | 付费 | ~2s | 需要 |
| **OpenAI TTS** | 好 | 付费 | ~1.5s | 需要 |
| **NeuTTS** | 好 | 免费 | 取决于 CPU/GPU | 不需要 |

NeuTTS 使用上方的 `tts.neutts` 配置块。

---

## 故障排除

### "No audio device found"（CLI）

PortAudio 未安装：

```bash
brew install portaudio    # macOS
sudo apt install portaudio19-dev  # Ubuntu
```

### Bot 在 Discord 服务器频道中不响应

Bot 在服务器频道中默认需要 @提及。确保你：

1. 输入 `@` 并选择 **Bot 用户**（带 #判别符），而不是同名的**角色**
2. 或改用私信 — 不需要提及
3. 或在 `~/.hermes/.env` 中设置 `DISCORD_REQUIRE_MENTION=false`

### Bot 加入语音频道但听不到我

- 检查你的 Discord 用户 ID 是否在 `DISCORD_ALLOWED_USERS` 中
- 确保你在 Discord 中没有静音
- Bot 需要从 Discord 收到 SPEAKING 事件才能映射你的音频 — 加入后几秒内开始说话

### Bot 听到我但不响应

- 验证 STT 可用：安装 `faster-whisper`（无需 Key）或设置 `GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY`
- 检查 LLM 模型已配置且可访问
- 查看 Gateway 日志：`tail -f ~/.hermes/logs/gateway.log`

### Bot 以文字响应但不在语音频道中说话

- TTS Provider 可能失败 — 检查 API Key 和配额
- Edge TTS（免费，无需 Key）是默认回退
- 检查日志中的 TTS 错误

### Whisper 返回垃圾文本

幻觉过滤器会自动捕获大多数情况。如果你仍然得到虚幻转录：

- 使用更安静的环境
- 在配置中调整 `silence_threshold`（更高 = 不太敏感）
- 尝试不同的 STT 模型

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/voice-mode)
