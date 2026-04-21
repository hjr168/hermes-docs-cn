---
sidebar_position: 1
title: "提示与最佳实践"
description: "充分利用 Hermes Agent 的实用建议 — 提示技巧、CLI 快捷方式、上下文文件、记忆、成本优化和安全"
---

# 提示与最佳实践

一组让你立即更高效使用 Hermes Agent 的实用技巧集合。每节针对不同方面 — 扫描标题跳到相关内容。

---

## 获得最佳结果

### 明确说明你想要什么

模糊的提示产生模糊的结果。不要说"修复代码"，而是说"修复 `api/handlers.py` 第 47 行的 TypeError — `process_request()` 函数从 `parse_body()` 收到了 `None`。" 你给的上下文越多，需要的迭代次数越少。

### 提前提供上下文

在请求前面加上相关细节：文件路径、错误消息、预期行为。一条精心编写的消息胜过三轮澄清。直接粘贴错误堆栈 — Agent 可以解析它们。

### 使用上下文文件处理重复指令

如果你发现自己重复相同的指令（"用制表符不要用空格"、"我们用 pytest"、"API 在 `/api/v2`"），把它们放在 `AGENTS.md` 文件中。Agent 每次会话自动读取它 — 设置后零工作量。

### 让 Agent 使用它的工具

不要试图引导每一步。说"找到并修复失败的测试"而不是"打开 `tests/test_foo.py`，看第 42 行，然后..."。Agent 有文件搜索、终端访问和代码执行 — 让它探索和迭代。

### 使用 Skill 处理复杂工作流

在写长提示解释如何做某事之前，检查是否已有 Skill。输入 `/skills` 浏览可用的 Skill，或直接调用如 `/axolotl` 或 `/github-pr-workflow`。

## CLI 高级用户技巧

### 多行输入

按 **Alt+Enter**（或 **Ctrl+J**）插入换行而不发送。这让你可以编写多行提示、粘贴代码块或在按 Enter 发送前组织复杂请求。

### 粘贴检测

CLI 自动检测多行粘贴。直接粘贴代码块或错误堆栈即可 — 它不会把每行作为单独消息发送。粘贴内容被缓冲并作为一条消息发送。

### 中断和重定向

按一次 **Ctrl+C** 中断 Agent 的响应。然后你可以输入新消息来重定向它。2 秒内双按 Ctrl+C 强制退出。当 Agent 开始走错方向时，这非常有用。

### 使用 `-c` 恢复会话

忘了上次会话的什么内容？运行 `hermes -c` 从你离开的地方精确恢复，完整对话历史已还原。你也可以按标题恢复：`hermes -r "my research project"`。

### 剪贴板图片粘贴

按 **Ctrl+V** 直接从剪贴板粘贴图片到聊天中。Agent 使用视觉能力分析截图、图表、错误弹窗或 UI 模型 — 无需先保存到文件。

### 斜杠命令自动补全

输入 `/` 并按 **Tab** 查看所有可用命令。包括内置命令（`/compress`、`/model`、`/title`）和每个已安装的 Skill。你不需要记住任何东西 — Tab 补全覆盖你。

:::tip
使用 `/verbose` 循环切换工具输出显示模式：**off → new → all → verbose**。"all" 模式适合观察 Agent 在做什么；"off" 对简单问答最干净。
:::

## 上下文文件

### AGENTS.md：你的项目大脑

在项目根目录创建 `AGENTS.md`，包含架构决策、编码约定和项目特定指令。它会自动注入到每次会话中，因此 Agent 始终知道你项目的规则。

```markdown
# 项目上下文
- 这是一个使用 SQLAlchemy ORM 的 FastAPI 后端
- 数据库操作始终使用 async/await
- 测试放在 tests/ 目录，使用 pytest-asyncio
- 永远不要提交 .env 文件
```

### SOUL.md：自定义个性

希望 Hermes 拥有稳定的默认语气？编辑 `~/.hermes/SOUL.md`（或使用自定义 Hermes 主目录时的 `$HERMES_HOME/SOUL.md`）。Hermes 现在会自动创建一个启动 SOUL，并使用该全局文件作为实例范围的个性来源。

完整说明请参见[使用 SOUL.md 与 Hermes](/docs/guides/use-soul-with-hermes)。

```markdown
# Soul
You are a senior backend engineer. Be terse and direct.
Skip explanations unless asked. Prefer one-liners over verbose solutions.
Always consider error handling and edge cases.
```

使用 `SOUL.md` 做持久个性。使用 `AGENTS.md` 做项目特定指令。

### .cursorrules 兼容性

已经有 `.cursorrules` 或 `.cursor/rules/*.mdc` 文件？Hermes 也会读取它们。不需要重复你的编码约定 — 它们从工作目录自动加载。

### 发现机制

Hermes 在会话开始时从当前工作目录加载顶层 `AGENTS.md`。子目录的 `AGENTS.md` 文件在工具调用期间懒加载（通过 `subdirectory_hints.py`）并注入到工具结果中 — 它们不会预先加载到系统提示中。

:::tip
保持上下文文件聚焦且简洁。每个字符都计入你的 Token 预算，因为它们会注入到每条消息中。
:::

## 记忆与 Skill

### 记忆 vs Skill：各放什么

**记忆**用于事实：你的环境、偏好、项目位置和 Agent 了解到的关于你的信息。**Skill** 用于流程：多步骤工作流、工具特定指令和可复用方法。用记忆存"什么"，用 Skill 存"怎么做"。

### 何时创建 Skill

如果你发现一个需要 5+ 步骤且会重复做的任务，让 Agent 为它创建 Skill。说"把你刚才做的保存为名为 `deploy-staging` 的 Skill。" 下次只需输入 `/deploy-staging`，Agent 加载完整流程。

### 管理记忆容量

记忆故意设有限制（MEMORY.md 约 2,200 字符，USER.md 约 1,375 字符）。当满了时，Agent 会合并条目。你可以说"清理你的记忆"或"替换旧的 Python 3.9 备注 — 我们现在用 3.12 了。"

### 让 Agent 记住

在一次高效的会话后，说"记住这些供下次使用"，Agent 会保存关键要点。你也可以具体指定："保存到记忆中，我们的 CI 使用 GitHub Actions 和 `deploy.yml` 工作流。"

:::warning
记忆是冻结的快照 — 会话期间做的更改在下次会话开始前不会出现在系统提示中。Agent 会立即写入磁盘，但提示缓存在会话期间不会失效。
:::

## 性能与成本

### 不要破坏提示缓存

大多数 LLM Provider 缓存系统提示前缀。如果你保持系统提示稳定（相同的上下文文件、相同的记忆），会话中后续消息会获得**缓存命中**，显著更便宜。避免在会话中途更改模型或系统提示。

### 在达到限制前使用 /compress

长会话累积 Token。当你注意到响应变慢或被截断时，运行 `/compress`。这会摘要对话历史，保留关键上下文的同时大幅减少 Token 数量。使用 `/usage` 检查你的当前状态。

### 委派以实现并行工作

需要同时研究三个主题？让 Agent 使用 `delegate_task` 进行并行子任务。每个子 Agent 用自己的上下文独立运行，只有最终摘要返回 — 大幅减少主对话的 Token 使用。

### 使用 execute_code 进行批量操作

不要逐个运行终端命令，让 Agent 写一个脚本一次完成所有操作。"写一个 Python 脚本将所有 `.jpeg` 文件重命名为 `.jpg` 并运行"比逐个重命名文件更便宜更快。

### 选择合适的模型

使用 `/model` 在会话中途切换模型。复杂推理和架构决策使用前沿模型（Claude Sonnet/Opus、GPT-4o）。简单任务如格式化、重命名或样板代码生成切换到更快的模型。

:::tip
定期运行 `/usage` 查看 Token 消耗。运行 `/insights` 获取过去 30 天使用模式的更广泛视图。
:::

## 消息平台技巧

### 设置主频道

在你偏好的 Telegram 或 Discord 聊天中使用 `/sethome` 将其指定为主频道。Cron 任务结果和定时任务输出会投递到这里。没有它，Agent 没有地方发送主动消息。

### 使用 /title 组织会话

用 `/title auth-refactor` 或 `/title research-llm-quantization` 为你的会话命名。命名的会话很容易用 `hermes sessions list` 找到和用 `hermes -r "auth-refactor"` 恢复。未命名的会话堆积起来变得无法区分。

### DM 配对实现团队访问

不要手动收集用户 ID 做白名单，启用 DM 配对。当团队成员给 Bot 发私信时，他们会获得一次性配对码。你用 `hermes pairing approve telegram XKGH5N7P` 批准 — 简单且安全。

### 工具进度显示模式

使用 `/verbose` 控制你看到多少工具活动。在消息平台上，少即是多 — 保持"new"只看新的工具调用。在 CLI 中，"all" 给你一个令人满意的所有 Agent 操作的实时视图。

:::tip
在消息平台上，会话在空闲后自动重置（默认：24 小时）或每天凌晨 4 点。如果需要更长的会话，在 `~/.hermes/config.yaml` 中按平台调整。
:::

## 安全

### 对不受信任的代码使用 Docker

在处理不受信任的仓库或运行不熟悉的代码时，使用 Docker 或 Daytona 作为你的终端后端。在 `.env` 中设置 `TERMINAL_BACKEND=docker`。容器内的破坏性命令不会损害你的宿主系统。

```bash
# 在你的 .env 中：
TERMINAL_BACKEND=docker
TERMINAL_DOCKER_IMAGE=hermes-sandbox:latest
```

### 避免 Windows 编码陷阱

在 Windows 上，一些默认编码（如 `cp125x`）无法表示所有 Unicode 字符，这可能在测试或脚本中写文件时导致 `UnicodeEncodeError`。

- 优先使用显式 UTF-8 编码打开文件：

```python
with open("results.txt", "w", encoding="utf-8") as f:
    f.write("✓ All good\n")
```

- 在 PowerShell 中，你也可以将当前会话切换为 UTF-8：

```powershell
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
```

这使 PowerShell 和子进程使用 UTF-8，帮助避免 Windows 特有的失败。

### 选择"始终"前先审查

当 Agent 触发危险命令审批（`rm -rf`、`DROP TABLE` 等）时，你有四个选项：**一次**、**会话**、**始终**、**拒绝**。选择"始终"前要仔细考虑 — 它会永久将该模式加入白名单。在你感到舒适之前先用"会话"。

### 命令审批是你的安全网

Hermes 在执行前检查每个命令是否匹配精心管理的危险模式列表。包括递归删除、SQL DROP、管道 curl 到 shell 等。不要在生产环境禁用它 — 它的存在是有原因的。

:::warning
在容器后端（Docker、Singularity、Modal、Daytona）中运行时，危险命令检查会被**跳过**，因为容器就是安全边界。确保你的容器镜像已正确锁定。
:::

### 对消息 Bot 使用白名单

永远不要在有终端访问的 Bot 上设置 `GATEWAY_ALLOW_ALL_USERS=true`。始终使用平台特定白名单（`TELEGRAM_ALLOWED_USERS`、`DISCORD_ALLOWED_USERS`）或 DM 配对来控制谁可以与你的 Agent 交互。

```bash
# 推荐：每个平台明确的白名单
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=123456789012345678

# 或使用跨平台白名单
GATEWAY_ALLOWED_USERS=123456789,987654321
```

---

*有你认为应该出现在这里的提示？提交 Issue 或 PR — 欢迎社区贡献。*

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/tips)
