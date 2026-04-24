---
sidebar_position: 4
title: "工具集参考"
description: "Hermes 核心、组合、平台和动态工具集的参考文档"
---

# 工具集参考

工具集（Toolsets）是工具的命名集合，用于控制 Agent 可以执行的操作。它们是按平台、按会话或按任务配置工具可用性的主要机制。

## 工具集的工作原理

每个工具恰好属于一个工具集。启用某个工具集时，该集合中的所有工具都会对 Agent 可用。工具集分为三种类型：

- **核心（Core）** — 单一逻辑分组的相关工具（例如，`file` 包含 `read_file`、`write_file`、`patch`、`search_files`）
- **组合（Composite）** — 将多个核心工具集组合在一起，用于常见场景（例如，`debugging` 包含 file、terminal 和 web 工具）
- **平台（Platform）** — 针对特定部署环境的完整工具配置（例如，`hermes-cli` 是交互式 CLI（命令行界面）会话的默认工具集）

## 配置工具集

### 按会话配置（CLI）

```bash
hermes chat --toolsets web,file,terminal
hermes chat --toolsets debugging        # 组合工具集 — 展开为 file + terminal + web
hermes chat --toolsets all              # 启用所有工具
```

### 按平台配置（config.yaml）

```yaml
toolsets:
  - hermes-cli          # CLI 的默认配置
  # - hermes-telegram   # Telegram 网关的覆盖配置
```

### 交互式管理

```bash
hermes tools                            # 基于 curses 的 UI 界面，按平台启用/禁用工具
```

或者在会话中：

```
/tools list
/tools disable browser
/tools enable rl
```

## 核心工具集

| 工具集 | 工具 | 用途 |
|---------|-------|---------|
| `browser` | `browser_back`、`browser_cdp`、`browser_click`、`browser_console`、`browser_dialog`、`browser_get_images`、`browser_navigate`、`browser_press`、`browser_scroll`、`browser_snapshot`、`browser_type`、`browser_vision`、`web_search` | 完整的浏览器自动化。包含 `web_search` 作为快速查询的备选方案。`browser_cdp` 和 `browser_dialog` 需要可达的 CDP 端点 — 仅在 `/browser connect` 激活、`browser.cdp_url` 已设置或 Browserbase 会话激活时出现。`browser_dialog` 与 `browser_snapshot` 添加的 `pending_dialogs` 和 `frame_tree` 字段一起工作，当 CDP 监督器附加时。 |
| `clarify` | `clarify` | 当 Agent 需要澄清时向用户提问。 |
| `code_execution` | `execute_code` | 运行以编程方式调用 Hermes 工具的 Python 脚本。 |
| `cronjob` | `cronjob` | 调度和管理周期性任务（Cron 定时任务）。 |
| `delegation` | `delegate_task` | 创建隔离的子 Agent 实例以进行并行工作。 |
| `feishu_doc` | `feishu_doc_read` | 读取飞书/Lark 文档内容。由飞书文档评论智能回复处理器使用。 |
| `feishu_drive` | `feishu_drive_add_comment`、`feishu_drive_list_comments`、`feishu_drive_list_comment_replies`、`feishu_drive_reply_comment` | 飞书/Lark 云文档评论操作。仅限评论 Agent 使用；不在 `hermes-cli` 或其他消息平台工具集中暴露。 |
| `file` | `patch`、`read_file`、`search_files`、`write_file` | 文件读取、写入、搜索和编辑。 |
| `homeassistant` | `ha_call_service`、`ha_get_state`、`ha_list_entities`、`ha_list_services` | 通过 Home Assistant 控制智能家居。仅在设置了 `HASS_TOKEN` 时可用。 |
| `image_gen` | `image_generate` | 通过 FAL.ai 进行文本生成图片。 |
| `memory` | `memory` | 跨会话的持久化记忆管理。 |
| `messaging` | `send_message` | 在会话中向其他平台（Telegram、Discord 等）发送消息。 |
| `moa` | `mixture_of_agents` | 通过混合智能体（Mixture of Agents）实现多模型共识。 |
| `rl` | `rl_check_status`、`rl_edit_config`、`rl_get_current_config`、`rl_get_results`、`rl_list_environments`、`rl_list_runs`、`rl_select_environment`、`rl_start_training`、`rl_stop_training`、`rl_test_inference` | 强化学习（RL）训练环境管理（Atropos）。 |
| `search` | `web_search` | 仅网页搜索（不含内容提取）。 |
| `session_search` | `session_search` | 搜索历史对话会话。 |
| `skills` | `skill_manage`、`skill_view`、`skills_list` | 技能（Skill）的增删改查和浏览。 |
| `terminal` | `process`、`terminal` | Shell 命令执行和后台进程管理。 |
| `todo` | `todo` | 会话内的任务列表管理。 |
| `tts` | `text_to_speech` | 文本转语音音频生成。 |
| `vision` | `vision_analyze` | 通过视觉模型进行图片分析。 |
| `web` | `web_extract`、`web_search` | 网页搜索和页面内容提取。 |

## 组合工具集

这些工具集会展开为多个核心工具集，为常见场景提供便捷的简写方式：

| 工具集 | 展开为 | 使用场景 |
|---------|-----------|----------|
| `debugging` | `web` + `file` + `process`、`terminal`（通过 `includes`）— 实际包含 `patch`、`process`、`read_file`、`search_files`、`terminal`、`web_extract`、`web_search`、`write_file` | 调试会话 — 文件访问、终端和网页搜索，无需浏览器或任务委派的开销。 |
| `safe` | `image_generate`、`vision_analyze`、`web_extract`、`web_search` | 只读研究和媒体生成。无文件写入、无终端访问、无代码执行。适用于不受信任或受限的环境。 |

## 平台工具集

平台工具集定义了部署目标的完整工具配置。大多数消息平台使用与 `hermes-cli` 相同的工具集：

| 工具集 | 与 `hermes-cli` 的差异 |
|---------|-------------------------------|
| `hermes-cli` | 完整工具集 — 包含 `clarify` 在内的全部 36 个核心工具。交互式 CLI 会话的默认配置。 |
| `hermes-acp` | 移除 `clarify`、`cronjob`、`image_generate`、`send_message`、`text_to_speech` 和 homeassistant 工具。专注于 IDE 环境中的编码任务。 |
| `hermes-api-server` | 移除 `clarify`、`send_message` 和 `text_to_speech`。添加其他所有工具 — 适用于无法进行用户交互的编程式访问场景。 |
| `hermes-telegram` | 与 `hermes-cli` 相同。 |
| `hermes-discord` | 与 `hermes-cli` 相同。 |
| `hermes-slack` | 与 `hermes-cli` 相同。 |
| `hermes-whatsapp` | 与 `hermes-cli` 相同。 |
| `hermes-signal` | 与 `hermes-cli` 相同。 |
| `hermes-matrix` | 与 `hermes-cli` 相同。 |
| `hermes-mattermost` | 与 `hermes-cli` 相同。 |
| `hermes-email` | 与 `hermes-cli` 相同。 |
| `hermes-sms` | 与 `hermes-cli` 相同。 |
| `hermes-bluebubbles` | 与 `hermes-cli` 相同。 |
| `hermes-dingtalk` | 与 `hermes-cli` 相同。 |
| `hermes-feishu` | 与 `hermes-cli` 相同。注意：`feishu_doc` / `feishu_drive` 工具集仅由文档评论处理器使用，不由常规飞书聊天适配器使用。 |
| `hermes-qqbot` | 与 `hermes-cli` 相同。 |
| `hermes-wecom` | 与 `hermes-cli` 相同。 |
| `hermes-wecom-callback` | 与 `hermes-cli` 相同。 |
| `hermes-weixin` | 与 `hermes-cli` 相同。 |
| `hermes-homeassistant` | 与 `hermes-cli` 相同，并始终启用 `homeassistant` 工具集。 |
| `hermes-webhook` | 与 `hermes-cli` 相同。 |
| `hermes-gateway` | 内部网关编排工具集 — 当网关需要接受任意消息来源时，使用最广泛的工具集合的并集。 |

## 动态工具集

### MCP 服务器工具集

每个已配置的 MCP 服务器会在运行时生成一个 `mcp-<server>` 工具集。例如，如果你配置了一个 `github` MCP 服务器，就会创建一个 `mcp-github` 工具集，包含该服务器暴露的所有工具。

```yaml
# config.yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
```

这会创建一个 `mcp-github` 工具集，你可以在 `--toolsets` 或平台配置中引用它。

### 插件工具集

插件可以通过插件初始化期间的 `ctx.register_tool()` 注册自己的工具集。这些工具集与内置工具集一起出现，可以使用相同的方式启用/禁用。

### 自定义工具集

在 `config.yaml` 中定义自定义工具集，创建项目专用的工具集合：

```yaml
toolsets:
  - hermes-cli
custom_toolsets:
  data-science:
    - file
    - terminal
    - code_execution
    - web
    - vision
```

### 通配符

- `all` 或 `*` — 展开为所有已注册的工具集（内置 + 动态 + 插件）

## 与 `hermes tools` 命令的关系

`hermes tools` 命令提供了一个基于 curses 的 UI 界面，用于按平台启用或禁用单个工具。它在工具级别操作（比工具集更细粒度），并持久化到 `config.yaml`。即使工具集已启用，被禁用的工具也会被过滤掉。

另见：[工具参考](./tools-reference.md)，了解各个工具及其参数的完整列表。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/toolsets-reference)
