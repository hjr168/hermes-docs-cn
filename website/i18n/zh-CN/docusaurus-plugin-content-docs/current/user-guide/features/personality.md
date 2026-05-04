---
sidebar_position: 9
title: "人格与 SOUL.md"
description: "使用全局 SOUL.md、内置人格和自定义角色定义来定制 Hermes Agent 的人格"
sidebar_label: 人格与 SOUL.md
---

# 人格与 SOUL.md

Hermes Agent 的人格完全可定制。`SOUL.md` 是**主要身份**——它是系统提示中的第一个内容，定义了 Agent 是谁。

- `SOUL.md` — 一个持久化的角色文件，存放在 `HERMES_HOME` 中，作为 Agent 的身份（系统提示中的第 #1 槽位）
- 内置或自定义 `/personality` 预设 — 会话级系统提示覆盖层

如果你想改变 Hermes 是谁——或者用完全不同的 Agent 角色替换它——编辑 `SOUL.md`。

## SOUL.md 的工作原理

Hermes 现在会自动在以下位置创建默认 `SOUL.md`：

```text
~/.hermes/SOUL.md
```

更准确地说，它使用当前实例的 `HERMES_HOME`，因此如果你使用自定义主目录运行 Hermes，它会使用：

```text
$HERMES_HOME/SOUL.md
```

### 重要行为

- **SOUL.md 是 Agent 的主要身份。** 它占据系统提示的第 #1 槽位，替换硬编码的默认身份。
- 如果尚不存在，Hermes 会自动创建一个初始 `SOUL.md`
- 现有的用户 `SOUL.md` 文件永远不会被覆盖
- Hermes 仅从 `HERMES_HOME` 加载 `SOUL.md`
- Hermes 不会在当前工作目录中查找 `SOUL.md`
- 如果 `SOUL.md` 存在但为空，或无法加载，Hermes 回退到内置默认身份
- 如果 `SOUL.md` 有内容，该内容在安全扫描和截断后被原样注入
- SOUL.md **不会**在上下文文件部分重复出现——它仅出现一次，作为身份

这使得 `SOUL.md` 成为真正的按用户或按实例的身份，而不仅仅是附加层。

## 为什么这样设计

这保持了人格的可预测性。

如果 Hermes 从你碰巧启动它的任何目录加载 `SOUL.md`，你的角色可能会在不同项目之间意外改变。通过仅从 `HERMES_HOME` 加载，角色属于 Hermes 实例本身。

这也使得教导用户更容易：
- "编辑 `~/.hermes/SOUL.md` 来更改 Hermes 的默认人格。"

## 在哪里编辑

对于大多数用户：

```bash
~/.hermes/SOUL.md
```

如果你使用自定义主目录：

```bash
$HERMES_HOME/SOUL.md
```

## SOUL.md 中应该放什么？

用于持久化的语气和人格指导，例如：
- 语气
- 沟通风格
- 直接程度
- 默认交互风格
- 风格上应避免什么
- Hermes 应如何处理不确定性、分歧或歧义

不太适合放：
- 一次性项目指令
- 文件路径
- 仓库约定
- 临时工作流细节

那些属于 `AGENTS.md`，而非 `SOUL.md`。

## 好的 SOUL.md 内容

一个好的 SOUL 文件应该：
- 跨上下文稳定
- 足够广泛以适用于多种对话
- 足够具体以实质性地塑造语气
- 专注于沟通和身份，而非特定任务的指令

### 示例

```markdown
# 人格

你是一位务实的高级工程师，品味独到。
你追求真实、清晰和有用，而非礼貌表演。

## 风格
- 直接但不冷漠
- 重实质轻废话
- 当某事是个坏主意时要敢于反驳
- 坦率承认不确定
- 解释简洁，除非深度有用

## 应避免的
- 阿谀奉承
- 夸张用语
- 如果用户的框架有误，不要重复它
- 对显而易见的事情过度解释

## 技术立场
- 简单系统优于巧妙系统
- 关注运维现实，而非理想化架构
- 将边缘情况视为设计的一部分，而非事后补救
```

## Hermes 注入到提示中的内容

`SOUL.md` 内容直接进入系统提示的第 #1 槽位——Agent 身份位置。不添加任何包装语言。

内容经过：
- 提示注入扫描
- 如果过大则截断

如果文件为空、仅含空白或无法读取，Hermes 回退到内置默认身份（"You are Hermes Agent, an intelligent AI assistant created by Nous Research..."）。此回退也适用于设置了 `skip_context_files` 的情况（例如在子代理/委托上下文中）。

## 安全扫描

`SOUL.md` 与其他承载上下文的文件一样，在包含之前会进行提示注入模式扫描。

这意味着你应该保持其专注于角色/语气，而不是试图偷偷加入奇怪的元指令。

## SOUL.md 与 AGENTS.md 的区别

这是最重要的区别。

### SOUL.md
用于：
- 身份
- 语气
- 风格
- 沟通默认设置
- 人格层面的行为

### AGENTS.md
用于：
- 项目架构
- 编码约定
- 工具偏好
- 仓库特定的工作流
- 命令、端口、路径、部署说明

一个有用的规则：
- 如果它应该跟随你到任何地方，它属于 `SOUL.md`
- 如果它属于一个项目，它属于 `AGENTS.md`

## SOUL.md 与 `/personality` 的区别

`SOUL.md` 是你的持久化默认人格。

`/personality` 是一个会话级覆盖层，用于更改或补充当前系统提示。

所以：
- `SOUL.md` = 基线语气
- `/personality` = 临时模式切换

示例：
- 保持一个务实的默认 SOUL，然后在辅导对话中使用 `/personality teacher`
- 保持一个简洁的 SOUL，然后在头脑风暴时使用 `/personality creative`

## 内置人格

Hermes 附带内置人格，你可以通过 `/personality` 切换。

| 名称 | 说明 |
|------|-------------|
| **helpful** | 友好的通用助手 |
| **concise** | 简短、直截了当的回复 |
| **technical** | 详细、准确的技术专家 |
| **creative** | 创新、跳出框架的思维 |
| **teacher** | 耐心的教育者，提供清晰示例 |
| **kawaii** | 可爱的表达，闪亮和热情 ★ |
| **catgirl** | 猫娘表情，喵~ |
| **pirate** | Hermes 船长，精通技术的海盗 |
| **shakespeare** | 戏剧性的诗意散文 |
| **surfer** | 完全放松的兄弟氛围 |
| **noir** | 硬汉侦探叙述 |
| **uwu** | 最大程度的可爱 uwu 语 |
| **philosopher** | 对每个查询进行深度思考 |
| **hype** | 最大能量和热情！！！ |

## 通过命令切换人格

### CLI

```text
/personality
/personality concise
/personality technical
```

### 消息平台

```text
/personality teacher
```

这些是方便的覆盖层，但你的全局 `SOUL.md` 仍然给 Hermes 提供持久化的默认人格，除非覆盖层有实质性地改变它。

## 在配置中定义自定义人格

你还可以在 `~/.hermes/config.yaml` 的 `agent.personalities` 下定义命名的自定义人格。

```yaml
agent:
  personalities:
    codereviewer: >
      你是一位细致的代码审查者。识别 bug、安全问题、
      性能关注点和不清晰的设计选择。精准且有建设性。
```

然后切换到它：

```text
/personality codereviewer
```

## 推荐工作流

一个强大的默认设置是：

1. 在 `~/.hermes/SOUL.md` 中保持一个深思熟虑的全局 `SOUL.md`
2. 将项目指令放在 `AGENTS.md` 中
3. 仅在需要临时模式切换时使用 `/personality`

这给你带来：
- 稳定的语气
- 项目特定的行为在它该在的地方
- 需要时的临时控制

## 人格如何与完整提示交互

在高层次上，提示栈包括：
1. **SOUL.md**（Agent 身份——如果 SOUL.md 不可用则使用内置回退）
2. 工具感知行为指导
3. 记忆/用户上下文
4. 技能指导
5. 上下文文件（`AGENTS.md`、`.cursorrules`）
6. 时间戳
7. 平台特定的格式提示
8. 可选的系统提示覆盖层如 `/personality`

`SOUL.md` 是基础——其他一切都建立在它之上。

## 相关文档

- [上下文文件](/docs/user-guide/features/context-files)
- [配置](/docs/user-guide/configuration)
- [技巧与最佳实践](/docs/guides/tips)
- [SOUL.md 指南](/docs/guides/use-soul-with-hermes)

## CLI 外观与对话人格的区别

对话人格和 CLI 外观是独立的：

- `SOUL.md`、`agent.system_prompt` 和 `/personality` 影响 Hermes 如何说话
- `display.skin` 和 `/skin` 影响 Hermes 在终端中的外观

关于终端外观，请参阅[皮肤与主题](./skins.md)。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/personality)
