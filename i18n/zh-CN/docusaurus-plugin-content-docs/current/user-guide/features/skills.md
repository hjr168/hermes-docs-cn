---
sidebar_position: 2
title: "Skills 系统"
description: "按需加载的知识文档 — 渐进式披露、Agent 管理的 Skills 和 Skills Hub"
---

# Skills 系统

Skills 是 Agent 在需要时可以加载的按需知识文档。它们遵循**渐进式披露**模式以最小化 token 使用，并与 [agentskills.io](https://agentskills.io/specification) 开放标准兼容。

所有 Skills 位于 **`~/.hermes/skills/`** — 主要目录和唯一真相来源。全新安装时，内置 Skills 从仓库复制。Hub 安装的和 Agent 创建的 Skills 也放在这里。Agent 可以修改或删除任何 Skill。

你还可以将 Hermes 指向**外部 Skill 目录** — 与本地目录一起扫描的额外文件夹。见下方[外部 Skill 目录](#external-skill-directories)。

另请参阅:

- [内置 Skills 目录](/docs/reference/skills-catalog)
- [官方可选 Skills 目录](/docs/reference/optional-skills-catalog)

## 使用 Skills

每个已安装的 Skill 自动作为斜杠命令可用:

```bash
# 在 CLI 或任何消息平台中:
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/plan design a rollout for migrating our auth provider

# 仅输入 Skill 名称即可加载它并让 Agent 询问你的需求:
/excalidraw
```

内置的 `plan` Skill 是一个具有自定义行为的 Skill 驱动斜杠命令的好例子。运行 `/plan [request]` 告诉 Hermes 在需要时检查上下文，编写 Markdown 实施计划而不是执行任务，并将结果保存在活动工作区/后端工作目录下的 `.hermes/plans/` 中。

你也可以通过自然对话与 Skills 交互:

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 渐进式披露

Skills 使用 token 高效的加载模式:

```
层级 0: skills_list()           → [{name, description, category}, ...]   （约 3k tokens）
层级 1: skill_view(name)        → 完整内容 + 元数据               （不定）
层级 2: skill_view(name, path)  → 特定参考文件                   （不定）
```

Agent 仅在实际需要时加载完整 Skill 内容。

## SKILL.md 格式

```markdown
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
platforms: [macos, linux]     # 可选 — 限制到特定操作系统平台
metadata:
  hermes:
    tags: [python, automation]
    category: devops
    fallback_for_toolsets: [web]    # 可选 — 条件激活（见下文）
    requires_toolsets: [terminal]   # 可选 — 条件激活（见下文）
    config:                          # 可选 — config.yaml 设置
      - key: my.setting
        description: "What this controls"
        default: "value"
        prompt: "Prompt for setup"
---

# Skill 标题

## 何时使用
此 Skill 的触发条件。

## 流程
1. 第一步
2. 第二步

## 陷阱
- 已知的失败模式和修复方法

## 验证
如何确认它已生效。
```

### 平台特定 Skills

Skills 可以使用 `platforms` 字段将自己限制到特定操作系统:

| 值 | 匹配 |
|----|------|
| `macos` | macOS (Darwin) |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # 仅 macOS（如 iMessage、Apple Reminders、FindMy）
platforms: [macos, linux]     # macOS 和 Linux
```

设置后，Skill 在不兼容平台上会自动从系统提示词、`skills_list()` 和斜杠命令中隐藏。如果省略，Skill 在所有平台上加载。

### 条件激活（后备 Skills）

Skills 可以根据当前会话中可用的工具自动显示或隐藏。这对**后备 Skills** 最有用 — 仅当高级工具不可用时才出现的免费或本地替代方案。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # 仅当这些 toolsets 不可用时显示
    requires_toolsets: [terminal]     # 仅当这些 toolsets 可用时显示
    fallback_for_tools: [web_search]  # 仅当这些特定工具不可用时显示
    requires_tools: [terminal]        # 仅当这些特定工具可用时显示
```

| 字段 | 行为 |
|------|------|
| `fallback_for_toolsets` | 列出的 toolsets 可用时 Skill **隐藏**。不可用时显示。 |
| `fallback_for_tools` | 相同，但检查单个工具而非 toolsets。 |
| `requires_toolsets` | 列出的 toolsets 不可用时 Skill **隐藏**。可用时显示。 |
| `requires_tools` | 相同，但检查单个工具。 |

**示例:** 内置的 `duckduckgo-search` Skill 使用 `fallback_for_toolsets: [web]`。当你设置了 `FIRECRAWL_API_KEY` 时，web toolset 可用，Agent 使用 `web_search` — DuckDuckGo Skill 保持隐藏。如果缺少 API 密钥，web toolset 不可用，DuckDuckGo Skill 自动作为后备出现。

没有任何条件字段的 Skills 行为与之前完全相同 — 它们始终显示。

## 加载时的安全设置

Skills 可以声明所需的环境变量而不会从发现中消失:

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

当遇到缺失值时，Hermes 仅在 Skill 实际加载到本地 CLI 时才安全地询问。你可以跳过设置继续使用 Skill。消息界面从不在聊天中询问密钥 — 它们告诉你改为使用 `hermes setup` 或 `~/.hermes/.env`。

设置完成后，声明的环境变量会**自动传递**到 `execute_code` 和 `terminal` 沙盒 — Skill 的脚本可以直接使用 `$TENOR_API_KEY`。对于非 Skill 环境变量，使用 `terminal.env_passthrough` 配置选项。详见[环境变量传递](/docs/user-guide/security#environment-variable-passthrough)。

### Skill 配置设置

Skills 还可以声明非机密的配置设置（路径、偏好）存储在 `config.yaml` 中:

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
```

设置存储在 config.yaml 的 `skills.config` 下。`hermes config migrate` 会提示未配置的设置，`hermes config show` 会显示它们。当 Skill 加载时，其已解析的配置值被注入到上下文中，使 Agent 自动知道配置的值。

详见 [Skill 设置](/docs/user-guide/configuration#skill-settings) 和 [创建 Skills — 配置设置](/docs/developer-guide/creating-skills#config-settings-configyaml) 了解详情。

## Skill 目录结构

```text
~/.hermes/skills/                  # 唯一真相来源
├── mlops/                         # 类别目录
│   ├── axolotl/
│   │   ├── SKILL.md               # 主指令文件（必需）
│   │   ├── references/            # 附加文档
│   │   ├── templates/             # 输出格式
│   │   ├── scripts/               # 可从 Skill 调用的辅助脚本
│   │   └── assets/                # 补充文件
│   └── vllm/
│       └── SKILL.md
├── devops/
│   └── deploy-k8s/                # Agent 创建的 Skill
│       ├── SKILL.md
│       └── references/
├── .hub/                          # Skills Hub 状态
│   ├── lock.json
│   ├── quarantine/
│   └── audit.log
└── .bundled_manifest              # 跟踪已播种的内置 Skills
```

## 外部 Skill 目录

如果你在 Hermes 之外维护 Skills — 例如，多个 AI 工具使用的共享 `~/.agents/skills/` 目录 — 你可以告诉 Hermes 也扫描那些目录。

在 `~/.hermes/config.yaml` 的 `skills` 部分下添加 `external_dirs`:

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

路径支持 `~` 展开和 `${VAR}` 环境变量替换。

### 工作原理

- **只读**: 外部目录仅用于 Skill 发现扫描。当 Agent 创建或编辑 Skill 时，它始终写入 `~/.hermes/skills/`。
- **本地优先**: 如果本地目录和外部目录存在相同 Skill 名称，本地版本胜出。
- **完全集成**: 外部 Skills 出现在系统提示词索引、`skills_list`、`skill_view` 和作为 `/skill-name` 斜杠命令 — 与本地 Skills 无异。
- **不存在的路径静默跳过**: 如果配置的目录不存在，Hermes 会在不报错的情况下忽略它。适用于可能不是每台机器都有的可选共享目录。

### 示例

```text
~/.hermes/skills/               # 本地（主要，读写）
├── devops/deploy-k8s/
│   └── SKILL.md
└── mlops/axolotl/
    └── SKILL.md

~/.agents/skills/               # 外部（只读，共享）
├── my-custom-workflow/
│   └── SKILL.md
└── team-conventions/
    └── SKILL.md
```

所有四个 Skills 出现在你的 Skill 索引中。如果你在本地创建名为 `my-custom-workflow` 的新 Skill，它会遮蔽外部版本。

## Agent 管理的 Skills（skill_manage 工具）

Agent 可以通过 `skill_manage` 工具创建、更新和删除自己的 Skills。这是 Agent 的**程序性记忆** — 当它弄清楚了一个非平凡的工作流程时，它会将方法保存为 Skill 以供将来复用。

### Agent 何时创建 Skills

- 成功完成复杂任务（5+ 次工具调用）后
- 遇到错误或死胡同并找到可行路径时
- 用户纠正了它的方法时
- 发现了非平凡的工作流程时

### 操作

| 操作 | 用途 | 关键参数 |
|------|------|----------|
| `create` | 从头创建新 Skill | `name`、`content`（完整 SKILL.md）、可选 `category` |
| `patch` | 定向修复（首选） | `name`、`old_string`、`new_string` |
| `edit` | 重大结构重写 | `name`、`content`（完整 SKILL.md 替换） |
| `delete` | 完全移除一个 Skill | `name` |
| `write_file` | 添加/更新支持文件 | `name`、`file_path`、`file_content` |
| `remove_file` | 移除一个支持文件 | `name`、`file_path` |

:::tip
更新时首选 `patch` 操作 — 它比 `edit` 更 token 高效，因为工具调用中只有更改的文本出现。
:::

## Skills Hub

从在线注册表、`skills.sh`、直接知名 Skill 端点和官方可选 Skills 浏览、搜索、安装和管理 Skills。

### 常用命令

```bash
hermes skills browse                              # 浏览所有 hub skills（官方优先）
hermes skills browse --source official            # 仅浏览官方可选 skills
hermes skills search kubernetes                   # 搜索所有来源
hermes skills search react --source skills-sh     # 搜索 skills.sh 目录
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect openai/skills/k8s           # 安装前预览
hermes skills install openai/skills/k8s           # 安装（带安全扫描）
hermes skills install official/security/1password
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills list --source hub                   # 列出 hub 安装的 skills
hermes skills check                               # 检查已安装的 hub skills 是否有上游更新
hermes skills update                              # 需要时重新安装有上游变更的 hub skills
hermes skills audit                               # 重新扫描所有 hub skills 的安全性
hermes skills uninstall k8s                       # 移除一个 hub skill
hermes skills reset google-workspace              # 解除内置 skill 的"用户修改"状态（见下文）
hermes skills reset google-workspace --restore    # 同时恢复内置版本，删除你的本地编辑
hermes skills publish skills/my-skill --to github --repo owner/repo
hermes skills snapshot export setup.json          # 导出 skill 配置
hermes skills tap add myorg/skills-repo           # 添加自定义 GitHub 来源
```

### 支持的 Hub 来源

| 来源 | 示例 | 备注 |
|------|------|------|
| `official` | `official/security/1password` | Hermes 附带的可选 Skills。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | 通过 `hermes skills search <query> --source skills-sh` 搜索。当 skills.sh slug 与仓库文件夹不同时，Hermes 会解析别名式 Skills。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | 从网站上的 `/.well-known/skills/index.json` 直接提供的 Skills。使用网站或文档 URL 搜索。 |
| `github` | `openai/skills/k8s` | 直接从 GitHub 仓库/路径安装和自定义 taps。 |
| `clawhub`、`lobehub`、`claude-marketplace` | 特定来源的标识符 | 社区或市场集成。 |

### 集成的 Hub 和注册表

Hermes 目前集成了以下 Skills 生态系统和发现来源:

#### 1. 官方可选 Skills（`official`）

这些在 Hermes 仓库本身中维护，安装时具有内置信任。

- 目录: [官方可选 Skills 目录](../../reference/optional-skills-catalog)
- 仓库中的来源: `optional-skills/`
- 示例:

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`）

这是 Vercel 的公共 Skills 目录。Hermes 可以直接搜索、检查 Skill 详情页面、解析别名式 slug 并从底层源仓库安装。

- 目录: [skills.sh](https://skills.sh/)
- CLI/工具仓库: [vercel-labs/skills](https://github.com/vercel-labs/skills)
- 官方 Vercel Skills 仓库: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 示例:

```bash
hermes skills search react --source skills-sh
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

#### 3. 知名 Skill 端点（`well-known`）

这是从发布 `/.well-known/skills/index.json` 的站点进行基于 URL 的发现。它不是一个单一的集中式 Hub — 它是一个网络发现约定。

- 示例在线端点: [Mintlify 文档 Skills 索引](https://mintlify.com/docs/.well-known/skills/index.json)
- 参考服务器实现: [vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 示例:

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. 直接 GitHub Skills（`github`）

Hermes 可以直接从 GitHub 仓库和基于 GitHub 的 taps 安装。当你已经知道仓库/路径或想添加自己的自定义源仓库时很有用。

默认 taps（无需任何设置即可浏览）:
- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [garrytan/gstack](https://github.com/garrytan/gstack)

- 示例:

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

#### 5. ClawHub（`clawhub`）

集成为社区来源的第三方 Skills 市场。

- 网站: [clawhub.ai](https://clawhub.ai/)
- Hermes 源 ID: `clawhub`

#### 6. Claude 市场风格仓库（`claude-marketplace`）

Hermes 支持发布 Claude 兼容插件/市场清单的市场仓库。

已知集成来源包括:
- [anthropics/skills](https://github.com/anthropics/skills)
- [aiskillstore/marketplace](https://github.com/aiskillstore/marketplace)

Hermes 源 ID: `claude-marketplace`

#### 7. LobeHub（`lobehub`）

Hermes 可以从 LobeHub 的公共目录搜索和转换 Agent 条目为可安装的 Hermes Skills。

- 网站: [LobeHub](https://lobehub.com/)
- 公共 Agent 索引: [chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- 支撑仓库: [lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes 源 ID: `lobehub`

### 安全扫描和 `--force`

所有通过 Hub 安装的 Skills 都会经过**安全扫描器**，检查数据泄露、提示注入、破坏性命令、供应链信号和其他威胁。

`hermes skills inspect ...` 现在还在可用时显示上游元数据:
- 仓库 URL
- skills.sh 详情页 URL
- 安装命令
- 每周安装量
- 上游安全审计状态
- well-known 索引/端点 URL

当你已审阅第三方 Skill 并想覆盖非危险的策略阻止时使用 `--force`:

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

重要行为:
- `--force` 可以覆盖 caution/warn 类型发现的策略阻止。
- `--force` **不能**覆盖 `dangerous` 扫描结论。
- 官方可选 Skills（`official/...`）被视为内置信任，不显示第三方警告面板。

### 信任级别

| 级别 | 来源 | 策略 |
|------|------|------|
| `builtin` | Hermes 附带 | 始终信任 |
| `official` | 仓库中的 `optional-skills/` | 内置信任，无第三方警告 |
| `trusted` | 受信任的注册表/仓库，如 `openai/skills`、`anthropics/skills` | 比社区来源更宽松的策略 |
| `community` | 其他所有来源（`skills.sh`、well-known 端点、自定义 GitHub 仓库、大多数市场） | 非危险发现可用 `--force` 覆盖；`dangerous` 结论保持阻止 |

### 更新生命周期

Hub 现在跟踪足够的来源信息以重新检查已安装 Skills 的上游副本:

```bash
hermes skills check          # 报告哪些已安装的 hub skills 上游有变更
hermes skills update         # 仅重新安装有可用更新的 skills
hermes skills update react   # 更新一个特定的已安装 hub skill
```

这使用存储的源标识符加上当前上游包内容哈希来检测偏移。

:::tip GitHub 速率限制
Skills Hub 操作使用 GitHub API，未认证用户有每小时 60 次请求的速率限制。如果你在安装或搜索期间看到速率限制错误，在 `.env` 文件中设置 `GITHUB_TOKEN` 可将限制提高到每小时 5,000 次请求。错误消息包含可操作提示。
:::

## 内置 Skill 更新（`hermes skills reset`）

Hermes 在仓库内的 `skills/` 目录中附带一组内置 Skills。在安装和每次 `hermes update` 时，一次同步传递将这些 Skill 复制到 `~/.hermes/skills/` 并在 `~/.hermes/skills/.bundled_manifest` 中记录一个清单，将每个 Skill 名称映射到同步时的内容哈希（**原始哈希**）。

在每次同步时，Hermes 重新计算本地副本的哈希并与原始哈希比较:

- **未更改** → 安全地拉取上游更改，复制新的内置版本，记录新的原始哈希。
- **已更改** → 被视为**用户修改**并永久跳过，因此你的编辑永远不会被覆盖。

这种保护很好，但有一个尖锐的边界。如果你编辑了一个内置 Skill，然后后来想放弃你的更改并回到内置版本，仅从 `~/.hermes/hermes-agent/skills/` 复制粘贴回去，清单仍然保存着上次成功同步运行时的*旧*原始哈希。你新复制的（当前内置哈希）与那个过时的原始哈希不匹配，所以同步持续将其标记为用户修改。

`hermes skills reset` 就是逃生舱:

```bash
# 安全: 清除此 skill 的清单条目。你的当前副本被保留，
# 但下次同步会以此为基准重新对齐，以便将来的更新正常工作。
hermes skills reset google-workspace

# 完全恢复: 同时删除你的本地副本并重新复制当前内置版本。
# 当你想要原始的上游 Skill 时使用。
hermes skills reset google-workspace --restore

# 非交互式（如在脚本或 TUI 模式中）— 跳过 --restore 确认。
hermes skills reset google-workspace --restore --yes
```

同样的命令在聊天中作为斜杠命令使用:

```text
/skills reset google-workspace
/skills reset google-workspace --restore
```

:::note 配置文件
每个配置文件在其自己的 `HERMES_HOME` 下有自己的 `.bundled_manifest`，因此 `hermes -p coder skills reset <name>` 仅影响该配置文件。
:::

### 斜杠命令（聊天中）

所有相同的命令都可以用 `/skills` 运行:

```text
/skills browse
/skills search react --source skills-sh
/skills search https://mintlify.com/docs --source well-known
/skills inspect skills-sh/vercel-labs/json-render/json-render-react
/skills install openai/skills/skill-creator --force
/skills check
/skills update
/skills reset google-workspace
/skills list
```

官方可选 Skills 仍使用类似 `official/security/1password` 和 `official/migration/openclaw-migration` 的标识符。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/skills)
