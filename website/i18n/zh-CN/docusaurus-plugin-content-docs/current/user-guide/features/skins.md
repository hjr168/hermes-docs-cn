---
sidebar_position: 10
title: "皮肤与主题"
description: "使用内置和自定义皮肤定制 Hermes CLI 的外观"
sidebar_label: 皮肤与主题
---

# 皮肤与主题

皮肤（Skins）控制 Hermes CLI 的**视觉呈现**：横幅颜色、加载动画的表情和动词、响应框标签、品牌文本以及工具活动前缀。

对话风格和视觉风格是独立的概念：

- **人格（Personality）** 改变 Agent 的语气和措辞。
- **皮肤** 改变 CLI 的外观。

## 更换皮肤

```bash
/skin                # 显示当前皮肤并列出可用皮肤
/skin ares           # 切换到内置皮肤
/skin mytheme        # 切换到来自 ~/.hermes/skins/mytheme.yaml 的自定义皮肤
```

或者在 `~/.hermes/config.yaml` 中设置默认皮肤：

```yaml
display:
  skin: default
```

## 内置皮肤

| 皮肤 | 说明 | Agent 品牌 | 视觉特征 |
|------|-------------|----------------|------------------|
| `default` | 经典 Hermes — 金色与可爱风 | `Hermes Agent` | 暖金色边框、玉米丝文本、加载动画中的可爱表情。经典蛇杖横幅。干净亲切。 |
| `ares` | 战神主题 — 深红与青铜 | `Ares Agent` | 深红色边框搭配青铜色调。激进的加载动词（"锻造中"、"行军中"、"淬火"）。自定义剑盾 ASCII 艺术横幅。 |
| `mono` | 单色 — 干净灰度 | `Hermes Agent` | 全灰色 — 无彩色。边框为 `#555555`，文本为 `#c9d1d9`。适合极简终端设置或屏幕录制。 |
| `slate` | 冷色调蓝 — 开发者风格 | `Hermes Agent` | 皇家蓝边框（`#4169e1`）、柔蓝色文本。沉稳专业。无自定义加载动画 — 使用默认表情。 |
| `daylight` | 浅色主题 — 适合明亮终端，深色文字配冷蓝色调 | `Hermes Agent` | 为白色或明亮终端设计。深石板色文本配蓝色边框，浅色状态面板，以及浅色补全菜单，在浅色终端配置中保持可读。 |
| `warm-lightmode` | 暖棕/金色文本 — 适合浅色终端背景 | `Hermes Agent` | 适合浅色终端的暖色调羊皮纸风格。深棕色文本配鞍棕色色调，奶油色状态面板。较冷色调 daylight 主题的大地色替代方案。 |
| `poseidon` | 海神主题 — 深蓝与海泡绿 | `Poseidon Agent` | 深蓝到海泡绿渐变。海洋主题加载动画（"绘制洋流"、"探测深度"）。三叉戟 ASCII 艺术横幅。 |
| `sisyphus` | 西西弗斯主题 — 朴素灰度，体现坚持 | `Sisyphus Agent` | 浅灰色配强烈对比。巨石主题加载动画（"推上坡"、"重置巨石"、"忍受循环"）。巨石与山坡 ASCII 艺术横幅。 |
| `charizard` | 火山主题 — 焦橙与余烬 | `Charizard Agent` | 暖焦橙到余烬渐变。火焰主题加载动画（"乘风而上"、"测量燃烧"）。龙形轮廓 ASCII 艺术横幅。 |

## 可配置键完整列表

### 颜色（`colors:`）

控制 CLI 中所有颜色值。值为十六进制颜色字符串。

| 键 | 说明 | 默认值（`default` 皮肤） |
|-----|-------------|--------------------------|
| `banner_border` | 启动横幅的面板边框 | `#CD7F32`（青铜） |
| `banner_title` | 横幅中的标题文本颜色 | `#FFD700`（金色） |
| `banner_accent` | 横幅中的章节标题（可用工具等） | `#FFBF00`（琥珀） |
| `banner_dim` | 横幅中的暗淡文本（分隔符、次要标签） | `#B8860B`（暗金菊） |
| `banner_text` | 横幅中的正文文本（工具名、技能名） | `#FFF8DC`（玉米丝） |
| `ui_accent` | 通用 UI 强调色（高亮、活动元素） | `#FFBF00` |
| `ui_label` | UI 标签和标记 | `#4dd0e1`（青色） |
| `ui_ok` | 成功指示器（勾选、完成） | `#4caf50`（绿色） |
| `ui_error` | 错误指示器（失败、阻止） | `#ef5350`（红色） |
| `ui_warn` | 警告指示器（注意、审批提示） | `#ffa726`（橙色） |
| `prompt` | 交互式提示文本颜色 | `#FFF8DC` |
| `input_rule` | 输入区域上方的水平分隔线 | `#CD7F32` |
| `response_border` | Agent 响应框的边框（ANSI 转义） | `#FFD700` |
| `session_label` | 会话标签颜色 | `#DAA520` |
| `session_border` | 会话 ID 暗淡边框颜色 | `#8B8682` |
| `status_bar_bg` | TUI 状态/使用率栏的背景色 | `#1a1a2e` |
| `voice_status_bg` | 语音模式状态徽章的背景色 | `#1a1a2e` |
| `completion_menu_bg` | 补全菜单列表的背景色 | `#1a1a2e` |
| `completion_menu_current_bg` | 活动补全行的背景色 | `#333355` |
| `completion_menu_meta_bg` | 补全元信息列的背景色 | `#1a1a2e` |
| `completion_menu_meta_current_bg` | 活动补全元信息列的背景色 | `#333355` |

### 加载动画（`spinner:`）

控制等待 API 响应时显示的动画加载指示器。

| 键 | 类型 | 说明 | 示例 |
|-----|------|-------------|---------|
| `waiting_faces` | 字符串列表 | 等待 API 响应时循环的表情 | `["(⚔)", "(⛨)", "(▲)"]` |
| `thinking_faces` | 字符串列表 | 模型推理时循环的表情 | `["(⚔)", "(⌁)", "(<>)"]` |
| `thinking_verbs` | 字符串列表 | 加载消息中显示的动词 | `["锻造中", "谋划中", "锤炼计划"]` |
| `wings` | [左, 右] 对列表 | 加载动画周围的装饰括号 | `[["⟪⚔", "⚔⟫"], ["⟪▲", "▲⟫"]]` |

当加载动画值为空时（如 `default` 和 `mono`），使用 `display.py` 中的硬编码默认值。

### 品牌文本（`branding:`）

CLI 界面中使用的文本字符串。

| 键 | 说明 | 默认值 |
|-----|-------------|---------|
| `agent_name` | 横幅标题和状态显示中的名称 | `Hermes Agent` |
| `welcome` | CLI 启动时显示的欢迎消息 | `Welcome to Hermes Agent! Type your message or /help for commands.` |
| `goodbye` | 退出时显示的消息 | `Goodbye! ⚕` |
| `response_label` | 响应框标题的标签 | ` ⚕ Hermes ` |
| `prompt_symbol` | 用户输入提示前的符号 | `❯ ` |
| `help_header` | `/help` 命令输出的标题文本 | `(^_^)? Available Commands` |

### 其他顶级键

| 键 | 类型 | 说明 | 默认值 |
|-----|------|-------------|---------|
| `tool_prefix` | 字符串 | CLI 中工具输出行的前缀字符 | `┊` |
| `tool_emojis` | 字典 | 按工具覆盖加载动画和进度的表情符号（`{tool_name: emoji}`） | `{}` |
| `banner_logo` | 字符串 | Rich 标记 ASCII 艺术标志（替换默认 HERMES_AGENT 横幅） | `""` |
| `banner_hero` | 字符串 | Rich 标记英雄图案（替换默认蛇杖图案） | `""` |

## 自定义皮肤

在 `~/.hermes/skins/` 下创建 YAML 文件。用户皮肤从内置 `default` 皮肤继承缺失值，因此你只需指定要更改的键。

### 完整自定义皮肤 YAML 模板

```yaml
# ~/.hermes/skins/mytheme.yaml
# 完整皮肤模板 — 显示所有键。删除不需要的；
# 缺失值自动从 'default' 皮肤继承。

name: mytheme
description: 我的自定义主题

colors:
  banner_border: "#CD7F32"
  banner_title: "#FFD700"
  banner_accent: "#FFBF00"
  banner_dim: "#B8860B"
  banner_text: "#FFF8DC"
  ui_accent: "#FFBF00"
  ui_label: "#4dd0e1"
  ui_ok: "#4caf50"
  ui_error: "#ef5350"
  ui_warn: "#ffa726"
  prompt: "#FFF8DC"
  input_rule: "#CD7F32"
  response_border: "#FFD700"
  session_label: "#DAA520"
  session_border: "#8B8682"
  status_bar_bg: "#1a1a2e"
  voice_status_bg: "#1a1a2e"
  completion_menu_bg: "#1a1a2e"
  completion_menu_current_bg: "#333355"
  completion_menu_meta_bg: "#1a1a2e"
  completion_menu_meta_current_bg: "#333355"

spinner:
  waiting_faces:
    - "(⚔)"
    - "(⛨)"
    - "(▲)"
  thinking_faces:
    - "(⚔)"
    - "(⌁)"
    - "(<>)"
  thinking_verbs:
    - "处理中"
    - "分析中"
    - "计算中"
    - "评估中"
  wings:
    - ["⟪⚡", "⚡⟫"]
    - ["⟪●", "●⟫"]

branding:
  agent_name: "我的 Agent"
  welcome: "欢迎使用我的 Agent！输入你的消息或 /help 查看命令。"
  goodbye: "再见！⚡"
  response_label: " ⚡ 我的 Agent "
  prompt_symbol: "⚡ ❯ "
  help_header: "(⚡) 可用命令"

tool_prefix: "┊"

# 按工具覆盖表情符号（可选）
tool_emojis:
  terminal: "⚔"
  web_search: "🔮"
  read_file: "📄"

# 自定义 ASCII 艺术横幅（可选，支持 Rich 标记）
# banner_logo: |
#   [bold #FFD700] MY AGENT [/]
# banner_hero: |
#   [#FFD700]  此处放置自定义图案  [/]
```

### 最小自定义皮肤示例

由于所有值都从 `default` 继承，最小皮肤只需更改不同的部分：

```yaml
name: cyberpunk
description: 霓虹终端主题

colors:
  banner_border: "#FF00FF"
  banner_title: "#00FFFF"
  banner_accent: "#FF1493"

spinner:
  thinking_verbs: ["接入中", "解密中", "上传中"]
  wings:
    - ["⟨⚡", "⚡⟩"]

branding:
  agent_name: "Cyber Agent"
  response_label: " ⚡ Cyber "

tool_prefix: "▏"
```

## Hermes Mod — 可视化皮肤编辑器

[Hermes Mod](https://github.com/cocktailpeanut/hermes-mod) 是社区构建的 Web UI，用于可视化创建和管理皮肤。你无需手动编写 YAML，而是使用点击式编辑器并实时预览。

![Hermes Mod 皮肤编辑器](https://raw.githubusercontent.com/cocktailpeanut/hermes-mod/master/nous.png)

**功能：**

- 列出所有内置和自定义皮肤
- 打开任意皮肤进入可视化编辑器，包含所有 Hermes 皮肤字段（颜色、加载动画、品牌、工具前缀、工具表情）
- 从文本提示生成 `banner_logo` 文字艺术
- 将上传的图片（PNG、JPG、GIF、WEBP）转换为 `banner_hero` ASCII 艺术，支持多种渲染风格（盲文、ASCII 渐变、方块、点阵）
- 直接保存到 `~/.hermes/skins/`
- 通过更新 `~/.hermes/config.yaml` 激活皮肤
- 显示生成的 YAML 和实时预览

### 安装

**方式 1 — Pinokio（一键安装）：**

在 [pinokio.computer](https://pinokio.computer) 上找到并一键安装。

**方式 2 — npx（终端最快方式）：**

```bash
npx -y hermes-mod
```

**方式 3 — 手动安装：**

```bash
git clone https://github.com/cocktailpeanut/hermes-mod.git
cd hermes-mod/app
npm install
npm start
```

### 使用方法

1. 启动应用（通过 Pinokio 或终端）。
2. 打开 **Skin Studio**。
3. 选择一个内置或自定义皮肤进行编辑。
4. 从文本生成标志和/或上传图片生成英雄图案。选择渲染风格和宽度。
5. 编辑颜色、加载动画、品牌和其他字段。
6. 点击 **Save** 将皮肤 YAML 写入 `~/.hermes/skins/`。
7. 点击 **Activate** 将其设为当前皮肤（更新 `config.yaml` 中的 `display.skin`）。

Hermes Mod 支持 `HERMES_HOME` 环境变量，因此它也可以与[配置文件](/docs/user-guide/profiles)配合使用。

## 操作说明

- 内置皮肤从 `hermes_cli/skin_engine.py` 加载。
- 未知皮肤自动回退到 `default`。
- `/skin` 会立即更新当前会话的活动 CLI 主题。
- `~/.hermes/skins/` 中的用户皮肤优先于同名的内置皮肤。
- 通过 `/skin` 更改皮肤仅对当前会话有效。要将皮肤设为永久默认，请在 `config.yaml` 中设置。
- `banner_logo` 和 `banner_hero` 字段支持 Rich 控制台标记（例如 `[bold #FF0000]text[/]`）来渲染彩色 ASCII 艺术。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/skins)
