---
sidebar_position: 3
title: "创建 Skill"
description: "如何为 Hermes Agent 创建 Skill — SKILL.md 格式、指南和发布"
---

# 创建 Skill

Skill 是为 Hermes Agent 添加新功能的首选方式。它们比工具更容易创建，不需要修改 Agent 代码，并且可以与社区分享。

## 应该是 Skill 还是 Tool？

制作 **Skill** 当：
- 能力可以表达为指令 + Shell 命令 + 现有工具
- 它封装了 Agent 可以通过 `terminal` 或 `web_extract` 调用的外部 CLI 或 API
- 不需要自定义 Python 集成或嵌入 Agent 的 API 密钥管理
- 示例：arXiv 搜索、Git 工作流、Docker 管理、PDF 处理、通过 CLI 工具的邮件

制作 **Tool** 当：
- 需要与 API 密钥、认证流程或多组件配置的端到端集成
- 需要每次必须精确执行的自定义处理逻辑
- 处理二进制数据、流式传输或实时事件
- 示例：浏览器自动化、TTS、视觉分析

## Skill 目录结构

捆绑的 Skill 位于 `skills/` 中，按类别组织。官方可选 Skill 使用 `optional-skills/` 中的相同结构：

```text
skills/
├── research/
│   └── arxiv/
│       ├── SKILL.md              # 必需：主要指令
│       └── scripts/              # 可选：辅助脚本
│           └── search_arxiv.py
├── productivity/
│   └── ocr-and-documents/
│       ├── SKILL.md
│       ├── scripts/
│       └── references/
└── ...
```

## SKILL.md 格式

```markdown
---
name: my-skill
description: 简要描述（显示在 Skill 搜索结果中）
version: 1.0.0
author: Your Name
license: MIT
platforms: [macos, linux]          # 可选 — 限制到特定操作系统平台
                                   #   有效值：macos、linux、windows
                                   #   省略则在所有平台加载（默认）
metadata:
  hermes:
    tags: [Category, Subcategory, Keywords]
    related_skills: [other-skill-name]
    requires_toolsets: [web]            # 可选 — 仅当这些工具集激活时显示
    requires_tools: [web_search]        # 可选 — 仅当这些工具可用时显示
    fallback_for_toolsets: [browser]    # 可选 — 当这些工具集激活时隐藏
    fallback_for_tools: [browser_navigate]  # 可选 — 当这些工具存在时隐藏
    config:                              # 可选 — Skill 需要的 config.yaml 设置
      - key: my.setting
        description: "此设置控制什么"
        default: "sensible-default"
        prompt: "设置的显示提示"
required_environment_variables:          # 可选 — Skill 需要的环境变量
  - name: MY_API_KEY
    prompt: "输入你的 API 密钥"
    help: "在 https://example.com 获取"
    required_for: "API 访问"
---

# Skill 标题

简要介绍。

## 何时使用
触发条件 — Agent 应该何时加载此 Skill？

## 快速参考
常用命令或 API 调用表格。

## 流程
Agent 遵循的逐步指令。

## 注意事项
已知失败模式及处理方式。

## 验证
Agent 如何确认它成功了。
```

### 平台特定 Skill

Skill 可以使用 `platforms` 字段限制自己到特定操作系统：

```yaml
platforms: [macos]            # 仅 macOS（如 iMessage、Apple Reminders）
platforms: [macos, linux]     # macOS 和 Linux
platforms: [windows]          # 仅 Windows
```

设置后，Skill 在不兼容平台上会自动从系统提示、`skills_list()` 和斜杠命令中隐藏。如果省略或为空，Skill 在所有平台加载（向后兼容）。

### 条件 Skill 激活

Skill 可以声明对特定工具或工具集的依赖。这控制 Skill 是否在给定会话的系统提示中出现。

```yaml
metadata:
  hermes:
    requires_toolsets: [web]           # 当 web 工具集不可用时隐藏
    requires_tools: [web_search]       # 当 web_search 工具不可用时隐藏
    fallback_for_toolsets: [browser]   # 当 browser 工具集可用时隐藏
    fallback_for_tools: [browser_navigate]  # 当 browser_navigate 可用时隐藏
```

| 字段 | 行为 |
|------|------|
| `requires_toolsets` | 当列出的**任一**工具集**不可用**时隐藏 Skill |
| `requires_tools` | 当列出的**任一**工具**不可用**时隐藏 Skill |
| `fallback_for_toolsets` | 当列出的**任一**工具集**可用**时隐藏 Skill |
| `fallback_for_tools` | 当列出的**任一**工具**可用**时隐藏 Skill |

**`fallback_for_*` 用例：** 创建一个在主要工具不可用时作为替代方案的 Skill。例如，带 `fallback_for_tools: [web_search]` 的 `duckduckgo-search` Skill 只在 Web 搜索工具（需要 API 密钥）未配置时显示。

**`requires_*` 用例：** 创建只在某些工具存在时有意义的 Skill。例如，带 `requires_toolsets: [web]` 的 Web 抓取工作流 Skill 在 Web 工具被禁用时不会出现在提示中。

### 环境变量要求

Skill 可以声明它们需要的环境变量。当通过 `skill_view` 加载 Skill 时，其必需变量会自动注册以传递到沙箱执行环境（终端、execute_code）。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: "Tenor API key"               # 提示用户时显示
    help: "在 https://tenor.com 获取你的密钥"  # 帮助文本或 URL
    required_for: "GIF 搜索功能"   # 哪个功能需要此变量
```

每个条目支持：
- `name`（必需）— 环境变量名
- `prompt`（可选）— 询问用户时的提示文本
- `help`（可选）— 帮助文本或获取值的 URL
- `required_for`（可选）— 描述哪个功能需要此变量

用户也可以在 `config.yaml` 中手动配置传递变量：

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_VAR
    - ANOTHER_VAR
```

参见 `skills/apple/` 了解仅限 macOS 的 Skill 示例。

## 加载时安全设置

当 Skill 需要 API 密钥或 Token 时使用 `required_environment_variables`。缺失值**不会**从发现中隐藏 Skill。相反，Hermes 在本地 CLI 中加载 Skill 时会安全地提示用户。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: 从 https://developers.google.com/tenor 获取密钥
    required_for: full functionality
```

用户可以跳过设置并继续加载 Skill。Hermes 永远不会向模型暴露原始密钥值。Gateway 和消息会话显示本地设置指南，而不是在消息中收集密钥。

:::tip 沙箱传递
当你的 Skill 被加载时，任何已设置的声明 `required_environment_variables` 会**自动传递**到 `execute_code` 和 `terminal` 沙箱 — 包括 Docker 和 Modal 等远程后端。你的 Skill 脚本可以访问 `$TENOR_API_KEY`（或 Python 中的 `os.environ["TENOR_API_KEY"]`），用户无需额外配置。详情参见[环境变量传递](/docs/user-guide/security#environment-variable-passthrough)。
:::

旧版 `prerequisites.env_vars` 仍然支持作为向后兼容别名。

### 配置设置（config.yaml）

Skill 可以声明存储在 `config.yaml` 的 `skills.config` 命名空间中的非机密设置。与环境变量（存储在 `.env` 中的密钥）不同，配置设置用于路径、偏好和其他非敏感值。

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: 插件数据目录路径
        default: "~/myplugin-data"
        prompt: 插件数据目录路径
      - key: myplugin.domain
        description: 插件操作的领域
        default: ""
        prompt: 插件领域（如 AI/ML 研究）
```

每个条目支持：
- `key`（必需）— 设置的点路径（如 `myplugin.path`）
- `description`（必需）— 解释设置控制什么
- `default`（可选）— 用户未配置时的默认值
- `prompt`（可选）— `hermes config migrate` 期间显示的提示文本；默认为 `description`

**工作方式：**

1. **存储：** 值写入 `config.yaml` 的 `skills.config.<key>`：
   ```yaml
   skills:
     config:
       myplugin:
         path: ~/my-data
   ```

2. **发现：** `hermes config migrate` 扫描所有启用的 Skill，找到未配置的设置，提示用户。设置也出现在 `hermes config show` 的 "Skill Settings" 下。

3. **运行时注入：** 当 Skill 加载时，其配置值被解析并附加到 Skill 消息：
   ```
   [Skill config (from ~/.hermes/config.yaml):
     myplugin.path = /home/user/my-data
   ]
   ```
   Agent 看到配置值而无需自己读取 `config.yaml`。

4. **手动设置：** 用户也可以直接设置值：
   ```bash
   hermes config set skills.config.myplugin.path ~/my-data
   ```

:::tip 何时使用哪个
使用 `required_environment_variables` 处理 API 密钥、Token 和其他**密钥**（存储在 `~/.hermes/.env`，不向模型显示）。使用 `config` 处理**路径、偏好和非敏感设置**（存储在 `config.yaml`，在 config show 中可见）。
:::

### 凭证文件要求（OAuth Token 等）

使用 OAuth 或基于文件的凭证的 Skill 可以声明需要挂载到远程沙箱的文件。这适用于作为**文件**（非环境变量）存储的凭证 — 通常是设置脚本生成的 OAuth Token 文件。

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token（由设置脚本创建）
  - path: google_client_secret.json
    description: Google OAuth2 客户端凭证
```

每个条目支持：
- `path`（必需）— 相对于 `~/.hermes/` 的文件路径
- `description`（可选）— 解释文件是什么以及如何创建

加载时，Hermes 检查这些文件是否存在。缺失文件触发 `setup_needed`。现有文件会自动：
- **挂载到 Docker** 容器作为只读绑定挂载
- **同步到 Modal** 沙箱（创建时 + 每次命令前，所以会话中期的 OAuth 也能工作）
- **本地**后端无需特殊处理即可用

:::tip 何时使用哪个
使用 `required_environment_variables` 处理简单的 API 密钥和 Token（存储在 `~/.hermes/.env` 中的字符串）。使用 `required_credential_files` 处理 OAuth Token 文件、客户端密钥、服务账户 JSON、证书或任何作为磁盘文件的凭证。
:::

参见 `skills/productivity/google-workspace/SKILL.md` 了解使用两者的完整示例。

## Skill 指南

### 无外部依赖

优先使用标准库 Python、curl 和现有 Hermes 工具（`web_extract`、`terminal`、`read_file`）。如果需要依赖，在 Skill 中记录安装步骤。

### 渐进式披露

将最常用的工作流放在前面。边缘情况和高级用法放在底部。这保持常见任务的 Token 使用量低。

### 包含辅助脚本

对于 XML/JSON 解析或复杂逻辑，在 `scripts/` 中包含辅助脚本 — 不要期望 LLM 每次都内联编写解析器。

### 测试

运行 Skill 并验证 Agent 正确遵循指令：

```bash
hermes chat --toolsets skills -q "Use the X skill to do Y"
```

## Skill 应该放在哪里？

捆绑 Skill（在 `skills/` 中）随每个 Hermes 安装发布。它们应该**对大多数用户广泛有用**：

- 文档处理、Web 研究、常见开发工作流、系统管理
- 被广泛人群定期使用

如果你的 Skill 是官方的但不是所有人都需要（如付费服务集成、重量级依赖），放在 **`optional-skills/`** — 随仓库发布，可通过 `hermes skills browse` 发现（标记为"official"），以内置信任安装。

如果你的 Skill 是专业的、社区贡献的或小众的，更适合 **Skill Hub** — 上传到注册表并通过 `hermes skills install` 分享。

## 发布 Skill

### 到 Skill Hub

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

### 到自定义仓库

将你的仓库添加为 tap：

```bash
hermes skills tap add owner/repo
```

用户然后可以从你的仓库搜索和安装。

## 安全扫描

所有 Hub 安装的 Skill 都经过安全扫描器检查：

- 数据泄露模式
- 提示注入尝试
- 破坏性命令
- Shell 注入

信任级别：
- `builtin` — 随 Hermes 发布（始终可信）
- `official` — 来自仓库的 `optional-skills/`（内置信任，无第三方警告）
- `trusted` — 来自 openai/skills、anthropics/skills
- `community` — 非危险发现可用 `--force` 覆盖；`dangerous` 结论保持阻止

Hermes 现在可以从多个外部发现模型消费第三方 Skill：
- 直接 GitHub 标识符（如 `openai/skills/k8s`）
- `skills.sh` 标识符（如 `skills-sh/vercel-labs/json-render/json-render-react`）
- 从 `/.well-known/skills/index.json` 提供的知名端点

如果你希望你的 Skill 可以在不使用特定于 GitHub 的安装器的情况下被发现，考虑除了在仓库或市场发布外，还从知名端点提供它们。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/creating-skills)
