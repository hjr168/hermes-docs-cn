---
sidebar_position: 3
title: "持久记忆"
description: "Hermes Agent 如何跨会话记忆——MEMORY.md、USER.md 和会话搜索"
---

# 持久记忆

Hermes Agent 拥有有限的、经过筛选的记忆，可以跨会话持久化。这让它能记住你的偏好、项目、环境以及它学到的东西。

## 工作原理

两个文件构成了 Agent 的记忆：

| 文件 | 用途 | 字符限制 |
|------|------|----------|
| **MEMORY.md** | Agent 的个人笔记——环境事实、约定、学到的东西 | 2,200 字符（约 800 tokens） |
| **USER.md** | 用户档案——你的偏好、沟通风格、期望 | 1,375 字符（约 500 tokens） |

两者都存储在 `~/.hermes/memories/` 中，在会话开始时作为冻结快照注入到系统提示中。Agent 通过 `memory` 工具管理自己的记忆——它可以添加、替换或删除条目。

:::info
字符限制使记忆保持聚焦。当记忆满了，Agent 会合并或替换条目来为新信息腾出空间。
:::

## 记忆在系统提示中的呈现方式

在每个会话开始时，记忆条目从磁盘加载并渲染为系统提示中的冻结块：

```
══════════════════════════════════════════════
MEMORY (your personal notes) [67% — 1,474/2,200 chars]
══════════════════════════════════════════════
User's project is a Rust web service at ~/code/myapi using Axum + SQLx
§
This machine runs Ubuntu 22.04, has Docker and Podman installed
§
User prefers concise responses, dislikes verbose explanations
```

格式包括：
- 显示存储类型（MEMORY 或 USER PROFILE）的标题
- 使用百分比和字符计数，让 Agent 了解容量
- 各条目由 `§`（章节符号）分隔
- 条目可以跨多行

**冻结快照模式：** 系统提示注入在会话开始时捕获一次，在会话期间不会改变。这是有意为之的——它保持了 LLM 的前缀缓存以提升性能。当 Agent 在会话中添加/删除记忆条目时，更改会立即持久化到磁盘，但要到下次会话开始才会在系统提示中出现。工具响应始终显示实时状态。

## 记忆工具操作

Agent 使用 `memory` 工具执行以下操作：

- **add**——添加新的记忆条目
- **replace**——用更新的内容替换现有条目（通过 `old_text` 子串匹配）
- **remove**——删除不再相关的条目（通过 `old_text` 子串匹配）

没有 `read` 操作——记忆内容在会话开始时自动注入到系统提示中。Agent 将其记忆视为对话上下文的一部分。

### 子串匹配

`replace` 和 `remove` 操作使用简短的唯一子串匹配——你不需要完整的条目文本。`old_text` 参数只需是能唯一标识一个条目的子串：

```python
# 如果记忆中包含 "User prefers dark mode in all editors"
memory(action="replace", target="memory",
       old_text="dark mode",
       content="User prefers light mode in VS Code, dark mode in terminal")
```

如果子串匹配多个条目，会返回错误，要求提供更具体的匹配。

## 两个存储目标详解

### `memory`——Agent 的个人笔记

用于 Agent 需要记住的关于环境、工作流和经验教训的信息：

- 环境事实（操作系统、工具、项目结构）
- 项目约定和配置
- 发现的工具特性和解决方案
- 已完成的任务记录
- 有效的技能和技巧

### `user`——用户档案

用于关于用户身份、偏好和沟通风格的信息：

- 姓名、角色、时区
- 沟通偏好（简洁 vs 详细、格式偏好）
- 不喜欢的事物和需要避免的
- 工作流习惯
- 技术水平

## 什么该保存，什么该跳过

### 应该保存的（主动保存）

Agent 会自动保存——你不需要主动要求。它在学到以下内容时保存：

- **用户偏好：** "我更喜欢 TypeScript 而不是 JavaScript" → 保存到 `user`
- **环境事实：** "这台服务器运行 Debian 12 和 PostgreSQL 16" → 保存到 `memory`
- **纠正：** "Docker 命令不要用 `sudo`，用户已在 docker 组中" → 保存到 `memory`
- **约定：** "项目使用制表符、120 字符行宽、Google 风格文档字符串" → 保存到 `memory`
- **已完成的工作：** "2026-01-15 将数据库从 MySQL 迁移到 PostgreSQL" → 保存到 `memory`
- **明确请求：** "记住我的 API 密钥每月轮换一次" → 保存到 `memory`

### 应该跳过的

- **琐碎/显而易见的信息：** "用户问了关于 Python 的问题"——太模糊，没有用处
- **容易重新发现的事实：** "Python 3.12 支持 f-string 嵌套"——可以网上搜索
- **原始数据转储：** 大段代码、日志文件、数据表——太大，不适合记忆
- **会话特定的临时信息：** 临时文件路径、一次性调试上下文
- **已在上下文文件中的信息：** SOUL.md 和 AGENTS.md 的内容

## 容量管理

记忆有严格的字符限制以保持系统提示的有限性：

| 存储 | 限制 | 典型条目数 |
|------|------|------------|
| memory | 2,200 字符 | 8-15 条 |
| user | 1,375 字符 | 5-10 条 |

### 记忆满了会怎样

当你尝试添加一个会超出限制的条目时，工具会返回错误：

```json
{
  "success": false,
  "error": "Memory at 2,100/2,200 chars. Adding this entry (250 chars) would exceed the limit. Replace or remove existing entries first.",
  "current_entries": ["..."],
  "usage": "2,100/2,200"
}
```

Agent 应该：
1. 读取当前条目（在错误响应中显示）
2. 识别可以删除或合并的条目
3. 使用 `replace` 将相关条目合并为更短的版本
4. 然后 `add` 新条目

**最佳实践：** 当记忆使用超过 80% 容量时（在系统提示标题中可见），在添加新条目前先合并现有条目。例如，将三个独立的"项目使用 X"条目合并为一个综合性的项目描述条目。

### 优质记忆条目的实践示例

**紧凑、信息密集的条目效果最好：**

```
# 好：包含多个相关事实
用户使用 macOS 14 Sonoma，使用 Homebrew，安装了 Docker Desktop 和 Podman。Shell：zsh + oh-my-zsh。编辑器：VS Code + Vim 键绑定。

# 好：具体、可操作的约定
项目 ~/code/api 使用 Go 1.22，sqlc 处理数据库查询，chi 路由器。使用 'make test' 运行测试。CI 通过 GitHub Actions。

# 好：带上下文的经验教训
预发布服务器 (10.0.1.50) 的 SSH 端口是 2222，不是 22。密钥在 ~/.ssh/staging_ed25519。

# 差：太模糊
用户有一个项目。

# 差：太冗长
在 2026 年 1 月 5 日，用户让我查看他们的项目，项目位于 ~/code/api。我发现它使用 Go 版本 1.22 并且...
```

## 重复检测

记忆系统会自动拒绝完全重复的条目。如果你尝试添加已存在的内容，它会返回成功并附带"未添加重复条目"的消息。

## 安全扫描

记忆条目在接受之前会扫描注入和泄露模式，因为它们会被注入到系统提示中。匹配威胁模式（提示注入、凭据泄露、SSH 后门）或包含不可见 Unicode 字符的内容会被阻止。

## 会话搜索

除了 MEMORY.md 和 USER.md，Agent 还可以使用 `session_search` 工具搜索过去的对话：

- 所有 CLI 和消息会话都存储在 SQLite（`~/.hermes/state.db`）中，支持 FTS5 全文搜索
- 搜索查询返回相关的历史对话，并使用 Gemini Flash 进行摘要
- Agent 可以找到几周前讨论过的内容，即使不在活跃记忆中

```bash
hermes sessions list    # 浏览历史会话
```

### session_search 与 memory 的对比

| 特性 | 持久记忆 | 会话搜索 |
|------|----------|----------|
| **容量** | 总共约 1,300 tokens | 无限制（所有会话） |
| **速度** | 即时（在系统提示中） | 需要搜索 + LLM 摘要 |
| **使用场景** | 应始终可用的关键事实 | 查找特定的历史对话 |
| **管理方式** | 由 Agent 手动筛选 | 自动——所有会话都存储 |
| **Token 成本** | 每会话固定（约 1,300 tokens） | 按需（需要时搜索） |

**记忆**用于应该始终在上下文中的关键事实。**会话搜索**用于"上周我们讨论过 X 吗？"这类查询，Agent 需要回忆过去对话的具体细节。

## 配置

```yaml
# 在 ~/.hermes/config.yaml 中
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # 约 800 tokens
  user_char_limit: 1375     # 约 500 tokens
```

## 外部记忆提供者

对于超越 MEMORY.md 和 USER.md 的更深层、更持久的记忆，Hermes 内置了 8 个外部记忆提供者插件——包括 Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover 和 Supermemory。

外部提供者**并行于**内置记忆运行（永远不会替代），并增加知识图谱、语义搜索、自动事实提取和跨会话用户建模等能力。

```bash
hermes memory setup      # 选择一个提供者并配置
hermes memory status     # 检查当前激活的提供者
```

详见[记忆提供者](./memory-providers.md)指南，了解每个提供者的详细信息、安装说明和对比。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/memory)
