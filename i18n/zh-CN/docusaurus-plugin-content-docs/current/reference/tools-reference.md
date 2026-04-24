---
sidebar_position: 3
title: "内置工具参考"
description: "Hermes 内置工具的权威参考，按工具集分组"
---

# 内置工具参考

本页记录了 Hermes 工具注册表中全部 55 个内置工具，按工具集（toolset）分组。工具的可用性因平台、凭证和已启用的工具集而异。

**快速统计：** 12 个浏览器工具、4 个文件工具、10 个 RL 工具、4 个 Home Assistant 工具、2 个终端工具、2 个 Web 工具、5 个飞书工具，以及 15 个其他工具集中的独立工具。

:::tip MCP 工具
除内置工具外，Hermes 还可以从 MCP（Model Context Protocol，模型上下文协议）服务器动态加载工具。MCP 工具会带有服务器名称前缀（例如，`github` MCP 服务器的 `github_create_issue`）。有关配置详情，请参阅 [MCP 集成](/docs/user-guide/features/mcp)。
:::

## `browser` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `browser_back` | 在浏览器历史中导航回上一页。需要先调用 browser_navigate。 | — |
| `browser_cdp` | 发送原始 Chrome DevTools Protocol (CDP) 命令。用于 browser_navigate、browser_click、browser_console 等未覆盖的浏览器操作的逃生通道。仅在会话开始时可达到 CDP 端点时可用 — 通过 `/browser connect` 或 `browser.cdp_url` 配置。参见 https://chromedevtools.github.io/devtools-protocol/ | — |
| `browser_dialog` | 响应原生 JavaScript 对话框（alert / confirm / prompt / beforeunload）。先调用 `browser_snapshot` — 待处理对话框出现在其 `pending_dialogs` 字段中。然后调用 `browser_dialog(action='accept'|'dismiss')`。与 `browser_cdp` 相同的可用性（Browserbase 或 `/browser connect`）。 | — |
| `browser_click` | 通过快照中的 ref ID（如 '@e5'）点击元素。ref ID 显示在快照输出的方括号中。需要先调用 browser_navigate 和 browser_snapshot。 | — |
| `browser_console` | 获取当前页面的浏览器控制台输出和 JavaScript 错误。返回 console.log/warn/error/info 消息以及未捕获的 JS 异常。用于检测静默 JavaScript 错误、失败的 API 调用和应用程序警告。需要先调用… | — |
| `browser_get_images` | 获取当前页面上所有图片的列表，包括其 URL 和 alt 文本。适用于查找需要用视觉工具分析的图片。需要先调用 browser_navigate。 | — |
| `browser_navigate` | 在浏览器中导航到指定 URL。初始化会话并加载页面。必须先于其他浏览器工具调用。对于简单的信息检索，建议使用 web_search 或 web_extract（更快、更便宜）。当你需要… | — |
| `browser_press` | 按下键盘按键。适用于提交表单（Enter）、导航（Tab）或键盘快捷键。需要先调用 browser_navigate。 | — |
| `browser_scroll` | 向指定方向滚动页面。用于显示当前视口下方或上方可能隐藏的更多内容。需要先调用 browser_navigate。 | — |
| `browser_snapshot` | 获取当前页面可访问性树（accessibility tree）的文本快照。返回带有 ref ID（如 @e1、@e2）的交互元素，供 browser_click 和 browser_type 使用。full=false（默认）：紧凑视图，仅显示交互元素。full=true：完整… | — |
| `browser_type` | 在通过 ref ID 标识的输入框中输入文本。先清空字段，再输入新文本。需要先调用 browser_navigate 和 browser_snapshot。 | — |
| `browser_vision` | 截取当前页面的屏幕截图并使用视觉 AI 进行分析。当你需要以视觉方式理解页面内容时使用——特别适用于验证码（CAPTCHA）、视觉验证挑战、复杂布局，或文本快照… | — |

## `clarify` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `clarify` | 当你在继续之前需要用户澄清、反馈或决策时，向用户提问。支持两种模式：1. **多选** — 提供最多 4 个选项。用户可以选择其中一个，或通过第 5 个"其他"选项输入自定义答案。2.… | — |

## `code_execution` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `execute_code` | 运行可以编程方式调用 Hermes 工具的 Python 脚本。适用于以下场景：需要 3 次以上工具调用并在其间加入处理逻辑、需要过滤/精简大量工具输出后再进入上下文、需要条件分支（… | — |

## `cronjob` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `cronjob` | 统一的定时任务管理器。使用 `action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"` 或 `"remove"` 来管理任务。支持绑定一个或多个 Skill 的 Skill 型任务，`skills=[]` 在更新时会清除已绑定的 Skill。Cron（定时任务）运行在全新的会话中，没有当前聊天的上下文。 | — |

## `delegation` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `delegate_task` | 生成一个或多个子 Agent（智能体）在隔离的上下文中处理任务。每个子 Agent 拥有独立的对话、终端会话和工具集。仅返回最终摘要——中间工具结果不会进入你的上下文窗口。两个… | — |

## `feishu_doc` 工具集

作用域限于飞书文档评论智能回复处理器（`gateway/platforms/feishu_comment.py`）。不在 `hermes-cli` 或常规飞书聊天适配器上暴露。

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `feishu_doc_read` | 根据 file_type 和 token 读取飞书/Lark 文档（Docx、Doc 或 Sheet）的完整文本内容。 | 飞书应用凭证 |

## `feishu_drive` 工具集

作用域限于飞书文档评论处理器。管理云盘文件的评论读写操作。

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `feishu_drive_add_comment` | 在飞书/Lark 文档或文件上添加顶级评论。 | 飞书应用凭证 |
| `feishu_drive_list_comments` | 列出飞书/Lark 文件上的全文档评论，最新的排在前面。 | 飞书应用凭证 |
| `feishu_drive_list_comment_replies` | 列出特定飞书评论线程的回复（全文档或局部选区）。 | 飞书应用凭证 |
| `feishu_drive_reply_comment` | 在飞书评论线程中发布回复，可选 `@` 提及。 | 飞书应用凭证 |

## `file` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `patch` | 对文件进行定向查找替换编辑。在终端中替代 sed/awk 使用。使用模糊匹配（9 种策略），因此微小的空白/缩进差异不会导致失败。返回统一差异格式（unified diff）。编辑后自动运行语法检查… | — |
| `read_file` | 带行号和分页功能读取文本文件。在终端中替代 cat/head/tail 使用。输出格式：'LINE_NUM\|CONTENT'。文件未找到时会建议相似文件名。使用 offset 和 limit 处理大文件。注意：无法读取图片或… | — |
| `search_files` | 搜索文件内容或按名称查找文件。在终端中替代 grep/rg/find/ls 使用。基于 Ripgrep，比 shell 等效命令更快。内容搜索（target='content'）：文件内正则搜索。输出模式：带行号的完整匹配… | — |
| `write_file` | 将内容写入文件，完全替换已有内容。在终端中替代 echo/cat heredoc 使用。自动创建父目录。**会覆盖整个文件** — 如需定向编辑请使用 'patch'。 | — |

## `homeassistant` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `ha_call_service` | 调用 Home Assistant（家庭助手）服务来控制设备。使用 ha_list_services 发现各域可用的服务及其参数。 | — |
| `ha_get_state` | 获取单个 Home Assistant 实体的详细状态，包括所有属性（亮度、颜色、温度设定值、传感器读数等）。 | — |
| `ha_list_entities` | 列出 Home Assistant 实体。可按域（light、switch、climate、sensor、binary_sensor、cover、fan 等）或区域名称（客厅、厨房、卧室等）进行过滤。 | — |
| `ha_list_services` | 列出可用的 Home Assistant 服务（动作），用于设备控制。显示每种设备类型可执行的操作及其接受的参数。用于发现通过 ha_list_entities 找到的设备的控制方式。 | — |

:::note
**Honcho 工具**（`honcho_profile`、`honcho_search`、`honcho_context`、`honcho_reasoning`、`honcho_conclude`）已不再是内置工具。它们可通过 Honcho 记忆提供者插件（`plugins/memory/honcho/`）使用。有关安装和使用方法，请参阅[记忆提供者](../user-guide/features/memory-providers.md)。
:::

## `image_gen` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `image_generate` | 使用 FAL.ai 从文本提示生成高质量图片。底层模型可由用户配置（默认：FLUX 2 Klein 9B，亚秒级生成），Agent 无法选择模型。返回单个图片 URL。使用… | FAL_KEY |

## `memory` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `memory` | 将重要信息保存到跨会话持久化的记忆中。你的记忆会在会话启动时出现在系统提示中——这是你在对话之间记住用户和环境信息的方式。何时保存… | — |

## `messaging` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `send_message` | 向已连接的消息平台发送消息，或列出可用的发送目标。**重要：** 当用户要求发送到特定频道或个人（而非仅平台名称）时，先调用 send_message(action='list') 查看可用目标… | — |

## `moa` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `mixture_of_agents` | 将困难问题路由到多个前沿 LLM（大语言模型）进行协作。进行 5 次 API 调用（4 个参考模型 + 1 个聚合器），使用最大推理力度——请谨慎使用，仅用于真正困难的问题。最适用于：复杂数学、高级算法… | OPENROUTER_API_KEY |

## `rl` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `rl_check_status` | 获取训练运行的状态和指标。**有速率限制：** 对同一运行强制执行最少 30 分钟的检查间隔。返回 WandB 指标：step、state、reward_mean、loss、percent_correct。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_edit_config` | 更新配置字段。先使用 rl_get_current_config() 查看所选环境的所有可用字段。每个环境有不同的可配置选项。基础设施设置（tokenizer、URL、lora_rank、learning_ra… | TINKER_API_KEY, WANDB_API_KEY |
| `rl_get_current_config` | 获取当前环境配置。仅返回可修改的字段：group_size、max_token_length、total_steps、steps_per_eval、use_wandb、wandb_name、max_num_workers。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_get_results` | 获取已完成训练运行的最终结果和指标。返回最终指标和训练权重路径。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_list_environments` | 列出所有可用的 RL（强化学习）环境。返回环境名称、路径和描述。提示：使用文件工具读取 file_path 来了解每个环境的工作方式（验证器、数据加载、奖励）。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_list_runs` | 列出所有训练运行（进行中和已完成）及其状态。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_select_environment` | 选择用于训练的 RL 环境。加载环境的默认配置。选择后，使用 rl_get_current_config() 查看设置，使用 rl_edit_config() 进行修改。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_start_training` | 使用当前环境和配置启动新的 RL 训练运行。大多数训练参数（lora_rank、learning_rate 等）是固定的。在启动前使用 rl_edit_config() 设置 group_size、batch_size、wandb_project。**警告：** 训练… | TINKER_API_KEY, WANDB_API_KEY |
| `rl_stop_training` | 停止正在运行的训练任务。当指标表现不佳、训练停滞或你想尝试不同设置时使用。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_test_inference` | 对任何环境进行快速推理测试。使用 OpenRouter 运行少量推理 + 评分步骤。默认：3 步 x 16 次完成 = 每个模型 48 次推演，测试 3 个模型 = 总计 144 次。测试环境加载、提示构建、推理… | TINKER_API_KEY, WANDB_API_KEY |

## `session_search` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `session_search` | 搜索你对过去对话的长期记忆。这是你的回忆功能——每个过去的会话都可以被搜索，此工具会总结发生的内容。**主动使用此工具的场景：** - 用户说"我们之前做过这个"、"还记得那次"、"上次… | — |

## `skills` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `skill_manage` | 管理 Skill（技能）（创建、更新、删除）。Skill 是你的程序性记忆——针对反复出现的任务类型的可复用方法。新 Skill 保存在 ~/.hermes/skills/；已存在的 Skill 可以在其所在位置修改。操作：create（完整 SKILL.m… | — |
| `skill_view` | Skill 允许加载关于特定任务和工作流的信息，以及脚本和模板。加载 Skill 的完整内容或访问其链接的文件（参考、模板、脚本）。首次调用返回 SKILL.md 内容以及… | — |
| `skills_list` | 列出可用的 Skill（名称 + 描述）。使用 skill_view(name) 加载完整内容。 | — |

## `terminal` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `process` | 管理通过 terminal(background=true) 启动的后台进程。操作：'list'（显示全部）、'poll'（检查状态 + 新输出）、'log'（带分页的完整输出）、'wait'（阻塞直到完成或超时）、'kill'（终止）、'write'（发送… | — |
| `terminal` | 在 Linux 环境中执行 shell 命令。文件系统在调用之间持久存在。设置 `background=true` 用于长时间运行的服务器。设置 `notify_on_complete=true`（需配合 `background=true`）可在进程完成时获得自动通知——无需轮询。不要使用 cat/head/tail — 请使用 read_file。不要使用 grep/rg/find — 请使用 search_files。 | — |

## `todo` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `todo` | 管理当前会话的任务列表。用于 3 步以上的复杂任务或用户提供多个任务时。不带参数调用以读取当前列表。写入：- 提供 'todos' 数组来创建/更新条目 - merge=… | — |

## `vision` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `vision_analyze` | 使用 AI 视觉分析图片。提供全面的描述并回答关于图片内容的特定问题。 | — |

## `web` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `web_search` | 搜索关于任何主题的网络信息。返回最多 5 个相关结果，包含标题、URL 和描述。 | EXA_API_KEY 或 PARALLEL_API_KEY 或 FIRECRAWL_API_KEY 或 TAVILY_API_KEY |
| `web_extract` | 从网页 URL 提取内容。以 Markdown 格式返回页面内容。也支持 PDF URL — 直接传入 PDF 链接即可转换为 Markdown 文本。5000 字符以下的页面返回完整 Markdown；更大的页面由 LLM 生成摘要。 | EXA_API_KEY 或 PARALLEL_API_KEY 或 FIRECRAWL_API_KEY 或 TAVILY_API_KEY |

## `tts` 工具集

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `text_to_speech` | 将文本转换为语音音频。返回一个 MEDIA: 路径，平台会将其作为语音消息发送。在 Telegram 上以语音气泡播放，在 Discord/WhatsApp 上作为音频附件发送。在 CLI（命令行界面）模式下，保存到 ~/voice-memos/。语音和提供者… | — |


---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/tools-reference)
