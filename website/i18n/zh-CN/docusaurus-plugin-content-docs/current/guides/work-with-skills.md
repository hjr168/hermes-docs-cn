---
sidebar_position: 12
title: "使用 Skill"
description: "查找、安装、使用和创建 Skill — 按需加载的知识，教会 Hermes 新的工作流"
---

# 使用 Skill

Skill（技能）是按需加载的知识文档，教会 Hermes 如何处理特定任务 — 从生成 ASCII 艺术到管理 GitHub PR。本指南带你了解日常使用方法。

完整技术参考参见 [Skill 系统](/docs/user-guide/features/skills)。

---

## 查找 Skill

每个 Hermes 安装都附带内置 Skill。查看可用的 Skill：

```bash
# 在任何聊天会话中：
/skills

# 或从 CLI：
hermes skills list
```

这会显示包含名称和描述的简洁列表：

```
ascii-art         使用 pyfiglet、cowsay、boxes 生成 ASCII 艺术...
arxiv             从 arXiv 搜索和获取学术论文...
github-pr-workflow 完整 PR 生命周期 — 创建分支、提交...
plan              计划模式 — 检查上下文、编写 markdown...
excalidraw        使用 Excalidraw 创建手绘风格图表...
```

### 搜索 Skill

```bash
# 按关键词搜索
/skills search docker
/skills search music
```

### Skill Hub

官方可选 Skill（较重或小众的 Skill，默认未激活）通过 Hub 提供：

```bash
# 浏览官方可选 Skill
/skills browse

# 在 Hub 中搜索
/skills search blockchain
```

---

## 使用 Skill

每个已安装的 Skill 自动成为斜杠命令。直接输入名称：

```bash
# 加载 Skill 并给出任务
/ascii-art 做一个写着 "HELLO WORLD" 的横幅
/plan 设计一个待办事项的 REST API
/github-pr-workflow 为认证重构创建 PR

# 仅输入 Skill 名称（不带任务）会加载它，然后你可以描述需求
/excalidraw
```

你也可以通过自然对话触发 Skill — 要求 Hermes 使用特定 Skill，它会通过 `skill_view` 工具加载。

### 渐进式加载

Skill 使用节省 Token 的加载模式。Agent 不会一次加载所有内容：

1. **`skills_list()`** — 所有 Skill 的紧凑列表（约 3k Token）。会话开始时加载。
2. **`skill_view(name)`** — 单个 Skill 的完整 SKILL.md 内容。Agent 决定需要时加载。
3. **`skill_view(name, file_path)`** — Skill 中的特定参考文件。仅在需要时加载。

这意味着 Skill 在实际使用前不消耗 Token。

---

## 从 Hub 安装

官方可选 Skill 随 Hermes 附带但默认不激活。明确安装它们：

```bash
# 安装官方可选 Skill
hermes skills install official/research/arxiv

# 在聊天会话中从 Hub 安装
/skills install official/creative/songwriting-and-ai-music
```

发生什么：
1. Skill 目录被复制到 `~/.hermes/skills/`
2. 出现在你的 `skills_list` 输出中
3. 成为可用的斜杠命令

:::tip
安装的 Skill 在新会话中生效。如果你想在当前会话中使用，使用 `/reset` 重新开始，或添加 `--now` 立即使提示缓存失效（下一轮会消耗更多 Token）。
:::

### 验证安装

```bash
# 检查是否安装
hermes skills list | grep arxiv

# 或在聊天中
/skills search arxiv
```

---

## 插件提供的 Skill

插件可以使用命名空间名称（`plugin:skill`）打包自己的 Skill。这防止与内置 Skill 的名称冲突。

```bash
# 通过限定名加载插件 Skill
skill_view("superpowers:writing-plans")

# 同名基础名的内置 Skill 不受影响
skill_view("writing-plans")
```

插件 Skill **不会**列在系统提示中，也不出现在 `skills_list` 中。它们是按需使用的 — 当你知道某个插件提供 Skill 时明确加载。加载时，Agent 会看到同一插件的其他 Skill 的横幅列表。

关于如何在你的插件中打包 Skill，参见[构建 Hermes 插件 → 打包 Skill](/docs/guides/build-a-hermes-plugin#bundle-skills)。

---

## 配置 Skill 设置

某些 Skill 在其 frontmatter 中声明需要的配置：

```yaml
metadata:
  hermes:
    config:
      - key: tenor.api_key
        description: "Tenor API key for GIF search"
        prompt: "Enter your Tenor API key"
        url: "https://developers.google.com/tenor/guides/quickstart"
```

当带有配置的 Skill 首次加载时，Hermes 会提示你输入值。它们存储在 `config.yaml` 的 `skills.config.*` 下。

从 CLI 管理 Skill 配置：

```bash
# 交互式配置特定 Skill
hermes skills config gif-search

# 查看所有 Skill 配置
hermes config get skills.config
```

---

## 创建你自己的 Skill

Skill 只是带有 YAML frontmatter 的 Markdown 文件。创建一个不到五分钟。

### 1. 创建目录

```bash
mkdir -p ~/.hermes/skills/my-category/my-skill
```

### 2. 编写 SKILL.md

```markdown title="~/.hermes/skills/my-category/my-skill/SKILL.md"
---
name: my-skill
description: 简要描述这个 Skill 做什么
version: 1.0.0
metadata:
  hermes:
    tags: [my-tag, automation]
    category: my-category
---

# 我的 Skill

## 何时使用
当用户询问[特定话题]或需要[特定任务]时使用此 Skill。

## 流程
1. 首先，检查[前置条件]是否可用
2. 运行 `command --with-flags`
3. 解析输出并呈现结果

## 注意事项
- 常见失败：[描述]。修复：[解决方案]
- 注意[边界情况]

## 验证
运行 `check-command` 确认结果正确。
```

### 3. 添加参考文件（可选）

Skill 可以包含 Agent 按需加载的辅助文件：

```
my-skill/
├── SKILL.md                    # 主要 Skill 文档
├── references/
│   ├── api-docs.md             # Agent 可查阅的 API 参考
│   └── examples.md             # 示例输入/输出
├── templates/
│   └── config.yaml             # Agent 可使用的模板文件
└── scripts/
    └── setup.sh                # Agent 可执行的脚本
```

在你的 SKILL.md 中引用：

```markdown
API 详情请加载参考: `skill_view("my-skill", "references/api-docs.md")`
```

### 4. 测试

启动新会话并试用你的 Skill：

```bash
hermes chat -q "/my-skill 帮我做那件事"
```

Skill 自动出现 — 无需注册。放到 `~/.hermes/skills/` 即可使用。

:::info
Agent 也可以使用 `skill_manage` 自行创建和更新 Skill。解决复杂问题后，Hermes 可能会提议将方法保存为 Skill 供下次使用。
:::

---

## 按平台管理 Skill

控制哪些 Skill 在哪些平台上可用：

```bash
hermes skills
```

这会打开一个交互式 TUI，你可以按平台（CLI、Telegram、Discord 等）启用或禁用 Skill。当你只想在特定上下文中提供某些 Skill 时很有用 — 例如，在 Telegram 上禁用开发类 Skill。

---

## Skill 与记忆

两者都跨会话持久化，但用途不同：

| | Skill | 记忆 |
|---|---|---|
| **内容** | 程序性知识 — 如何做事 | 事实性知识 — 事物是什么 |
| **时机** | 按需加载，仅在相关时 | 自动注入每个会话 |
| **大小** | 可以很大（数百行） | 应该紧凑（仅关键事实） |
| **成本** | 加载前零 Token | 小额但持续的 Token 成本 |
| **示例** | "如何部署到 Kubernetes" | "用户偏好暗色模式，住在 PST 时区" |
| **创建者** | 你、Agent 或从 Hub 安装 | Agent，基于对话 |

**经验法则：** 如果你会放在参考文档中的内容，就是 Skill。如果你会写在便利贴上的内容，就是记忆。

---

## 技巧

**保持 Skill 聚焦。** 一个试图覆盖"所有 DevOps"的 Skill 会太长太模糊。一个覆盖"将 Python 应用部署到 Fly.io"的 Skill 足够具体，才真正有用。

**让 Agent 创建 Skill。** 在复杂的多步骤任务后，Hermes 经常会提议将方法保存为 Skill。说好 — 这些 Agent 编写的 Skill 捕获了精确的工作流，包括沿途发现的陷阱。

**使用分类。** 将 Skill 组织到子目录（`~/.hermes/skills/devops/`、`~/.hermes/skills/research/` 等）。这保持列表可管理，帮助 Agent 更快找到相关 Skill。

**Skill 过时时更新。** 如果你使用某个 Skill 时遇到它未覆盖的问题，告诉 Hermes 用你学到的内容更新 Skill。不被维护的 Skill 会成为负担。

---

*完整 Skill 参考 — frontmatter 字段、条件激活、外部目录等 — 见 [Skill 系统](/docs/user-guide/features/skills)。*

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/work-with-skills)
