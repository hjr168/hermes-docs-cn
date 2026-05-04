---
sidebar_position: 8
title: "上下文文件"
description: "项目上下文文件——.hermes.md、AGENTS.md、CLAUDE.md、全局 SOUL.md 和 .cursorrules——自动注入到每次对话中"
---

# 上下文文件

Hermes Agent 会自动发现并加载影响其行为的上下文文件。其中一些是项目本地的，从你的工作目录中发现。`SOUL.md` 现在对于 Hermes 实例是全局的，仅从 `HERMES_HOME` 加载。

## 支持的上下文文件

| 文件 | 用途 | 发现方式 |
|------|------|----------|
| **.hermes.md** / **HERMES.md** | 项目指令（最高优先级） | 遍历至 git 根目录 |
| **AGENTS.md** | 项目指令、约定、架构 | 启动时从当前目录 + 子目录渐进发现 |
| **CLAUDE.md** | Claude Code 上下文文件（也会被检测） | 启动时从当前目录 + 子目录渐进发现 |
| **SOUL.md** | 此 Hermes 实例的全局个性和语气自定义 | 仅从 `HERMES_HOME/SOUL.md` |
| **.cursorrules** | Cursor IDE 编码约定 | 仅当前目录 |
| **.cursor/rules/\*.mdc** | Cursor IDE 规则模块 | 仅当前目录 |

:::info 优先级系统
每个会话只加载**一种**项目上下文类型（首次匹配优先）：`.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。**SOUL.md** 作为 Agent 身份始终独立加载（槽位 #1）。
:::

## AGENTS.md

`AGENTS.md` 是主要的项目上下文文件。它告诉 Agent 你的项目如何组织、应遵循什么约定以及任何特殊指令。

### 子目录渐进发现

在会话开始时，Hermes 将当前工作目录中的 `AGENTS.md` 加载到系统提示中。当 Agent 在会话期间导航到子目录时（通过 `read_file`、`terminal`、`search_files` 等），它会**渐进发现**这些目录中的上下文文件，并在它们变得相关时注入到对话中。

```
my-project/
├── AGENTS.md              ← 启动时加载（系统提示）
├── frontend/
│   └── AGENTS.md          ← 当 Agent 读取 frontend/ 文件时发现
├── backend/
│   └── AGENTS.md          ← 当 Agent 读取 backend/ 文件时发现
└── shared/
    └── AGENTS.md          ← 当 Agent 读取 shared/ 文件时发现
```

这种方式相比启动时加载所有内容有两个优势：
- **不会膨胀系统提示**——子目录提示仅在需要时出现
- **保持提示缓存**——系统提示在各轮对话中保持稳定

每个子目录在每个会话中最多检查一次。发现过程还会向上遍历父目录，因此读取 `backend/src/main.py` 会发现 `backend/AGENTS.md`，即使 `backend/src/` 没有自己的上下文文件。

:::info
子目录上下文文件会通过与启动上下文文件相同的[安全扫描](#安全提示注入防护)。恶意文件会被阻止。
:::

### AGENTS.md 示例

```markdown
# 项目上下文

这是一个 Next.js 14 Web 应用，后端使用 Python FastAPI。

## 架构
- 前端：Next.js 14，使用 App Router，位于 `/frontend`
- 后端：FastAPI，位于 `/backend`，使用 SQLAlchemy ORM
- 数据库：PostgreSQL 16
- 部署：Docker Compose 部署在 Hetzner VPS 上

## 约定
- 所有前端代码使用 TypeScript 严格模式
- Python 代码遵循 PEP 8，到处使用类型提示
- 所有 API 端点返回 `{data, error, meta}` 格式的 JSON
- 测试放在 `__tests__/` 目录（前端）或 `tests/`（后端）

## 重要说明
- 不要直接修改迁移文件——使用 Alembic 命令
- `.env.local` 文件包含真实的 API 密钥，不要提交它
- 前端端口是 3000，后端是 8000，数据库是 5432
```

## SOUL.md

`SOUL.md` 控制 Agent 的个性、语气和沟通风格。详见[个性](/docs/user-guide/features/personality)页面。

**位置：**

- `~/.hermes/SOUL.md`
- 或 `$HERMES_HOME/SOUL.md`（如果你使用自定义主目录运行 Hermes）

重要细节：

- 如果 `SOUL.md` 不存在，Hermes 会自动创建一个默认的
- Hermes 仅从 `HERMES_HOME` 加载 `SOUL.md`
- Hermes 不会在工作目录中查找 `SOUL.md`
- 如果文件为空，`SOUL.md` 的内容不会添加到提示中
- 如果文件有内容，内容会在扫描和截断后原样注入

## .cursorrules

Hermes 兼容 Cursor IDE 的 `.cursorrules` 文件和 `.cursor/rules/*.mdc` 规则模块。如果这些文件存在于你的项目根目录，且没有更高优先级的上下文文件（`.hermes.md`、`AGENTS.md` 或 `CLAUDE.md`），它们将作为项目上下文被加载。

这意味着你现有的 Cursor 约定在使用 Hermes 时会自动生效。

## 上下文文件如何被加载

### 启动时（系统提示）

上下文文件由 `agent/prompt_builder.py` 中的 `build_context_files_prompt()` 加载：

1. **扫描工作目录**——检查 `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`（首次匹配优先）
2. **读取内容**——每个文件以 UTF-8 文本读取
3. **安全扫描**——检查内容是否包含提示注入模式
4. **截断**——超过 20,000 字符的文件会被首尾截断（70% 头部，20% 尾部，中间有标记）
5. **组装**——所有部分组合在 `# 项目上下文` 标题下
6. **注入**——组装后的内容添加到系统提示中

### 会话进行中（渐进发现）

`agent/subdirectory_hints.py` 中的 `SubdirectoryHintTracker` 监视工具调用参数中的文件路径：

1. **路径提取**——每次工具调用后，从参数中提取文件路径（`path`、`workdir`、shell 命令）
2. **祖先遍历**——检查该目录及最多 5 个父目录（在已访问的目录处停止）
3. **提示加载**——如果找到 `AGENTS.md`、`CLAUDE.md` 或 `.cursorrules`，则加载（每个目录首次匹配）
4. **安全扫描**——与启动文件相同的提示注入扫描
5. **截断**——每个文件上限 8,000 字符
6. **注入**——附加到工具结果中，以便模型自然地在上下文中看到

最终的提示部分大致如下：

```text
# 项目上下文

以下项目上下文文件已加载，应当遵循：

## AGENTS.md

[你的 AGENTS.md 内容]

## .cursorrules

[你的 .cursorrules 内容]

[你的 SOUL.md 内容]
```

注意 SOUL 内容是直接插入的，没有额外的包装文本。

## 安全：提示注入防护

所有上下文文件在包含之前都会被扫描以检测潜在的提示注入。扫描器检查以下内容：

- **指令覆盖尝试**："ignore previous instructions"、"disregard your rules"
- **欺骗模式**："do not tell the user"
- **系统提示覆盖**："system prompt override"
- **隐藏 HTML 注释**：`<!-- ignore instructions -->`
- **隐藏 div 元素**：`<div style="display:none">`
- **凭据泄露**：`curl ... $API_KEY`
- **敏感文件访问**：`cat .env`、`cat credentials`
- **不可见字符**：零宽空格、双向覆盖、字连接符

如果检测到任何威胁模式，文件将被阻止：

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

:::warning
此扫描器可以防御常见的注入模式，但不能替代在共享仓库中审查上下文文件。对于非你创建的项目，务必验证 AGENTS.md 的内容。
:::

## 大小限制

| 限制 | 值 |
|------|------|
| 每文件最大字符数 | 20,000（约 7,000 tokens） |
| 头部截断比例 | 70% |
| 尾部截断比例 | 20% |
| 截断标记 | 10%（显示字符计数并建议使用文件工具） |

当文件超过 20,000 字符时，截断消息如下：

```
[...truncated AGENTS.md: kept 14000+4000 of 25000 chars. Use file tools to read the full file.]
```

## 编写有效上下文文件的建议

:::tip AGENTS.md 最佳实践
1. **保持简洁**——控制在 20K 字符以内；Agent 每轮都会读取它
2. **使用标题结构化**——使用 `##` 分区组织架构、约定、重要说明
3. **包含具体示例**——展示首选的代码模式、API 格式、命名约定
4. **提及不要做什么**——"不要直接修改迁移文件"
5. **列出关键路径和端口**——Agent 在终端命令中会用到这些
6. **随项目演进更新**——过时的上下文比没有上下文更糟糕
:::

### 子目录级上下文

对于 Monorepo，将子目录特定的指令放在嵌套的 AGENTS.md 文件中：

```markdown
<!-- frontend/AGENTS.md -->
# 前端上下文

- 使用 `pnpm` 而不是 `npm` 管理包
- 组件放在 `src/components/`，页面放在 `src/app/`
- 使用 Tailwind CSS，不要使用内联样式
- 使用 `pnpm test` 运行测试
```

```markdown
<!-- backend/AGENTS.md -->
# 后端上下文

- 使用 `poetry` 管理依赖
- 使用 `poetry run uvicorn main:app --reload` 运行开发服务器
- 所有端点都需要 OpenAPI 文档字符串
- 数据库模型在 `models/`，模式定义在 `schemas/`
```

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/context-files)
