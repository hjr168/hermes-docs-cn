---
title: 同步日志
description: Hermes Agent 中文文档同步记录
---

# 同步日志

记录每次从上游 NousResearch/hermes-agent 同步文档的时间与更新内容。

---

## 2026-04-26

**版本更新：v0.11.0 — Interface 版本（2026-04-23）**

上游发布 v0.11.0 版本，主要更新：
- 全新 React/Ink TUI（`hermes --tui`）
- 可插拔传输层架构 + 原生 AWS Bedrock
- 5 条新推理路径（NVIDIA NIM、Arcee AI、Step Plan、Gemini CLI OAuth、Vercel ai-gateway）
- GPT-5.5 via Codex OAuth
- QQBot（第 17 个消息平台）
- 插件系统大幅扩展（新增多个钩子）
- `/steer` 运行中 Agent 引导
- Webhook 直传模式
- 仪表盘插件系统 + 实时主题切换

中文博客已更新：`blog/v0.11.0-interface.md`

**同步上游更改：约 15 个文件**

| 文件 | 更新内容 |
|------|----------|
| `user-guide/features/hooks.md` | 新增 `pre_gateway_dispatch` 钩子和 `duration_ms` 参数到 `post_tool_call` 回调 |
| `user-guide/features/fallback-providers.md` | 移除 `flush_memories` 辅助任务配置 |
| `user-guide/configuration.md` | 辅助任务 Provider 列表新增 `azure-foundry`、新增视频教程、移除 `flush_memories` 配置示例 |
| `reference/cli-commands.md` | `hermes setup` 新增 `--quick` 和 `--reconfigure` 选项、Provider 列表新增 `azure-foundry` |
| `developer-guide/context-compression-and-caching.md` | `cache_ttl` 配置从 `model.cache_ttl` 移至 `prompt_caching.cache_ttl` |
| `developer-guide/architecture.md` | 图表框线调整 |
| `integrations/providers.md` | Copilot 新增运行时凭据刷新和重试机制说明 |

**新增文档：**
- `guides/azure-foundry.md` - Azure AI Foundry 集成指南（待翻译）
- `user-guide/features/spotify.md` - Spotify 控制功能（待翻译）
- `user-guide/features/extending-the-dashboard.md` - Dashboard 扩展指南（待翻译）

**版本状态：** 上游无新增版本发布

---

## 2026-04-24

**同步上游更改：16 个文件更新 + 133 个新 Skill 文档**

| 文件 | 更新内容 |
|------|----------|
| `user-guide/features/browser.md` | 新增 `browser_dialog` 工具文档：响应原生 JS 对话框（alert/confirm/prompt/beforeunload）、跨域 iframe 支持、frame_tree 字段说明 |
| `user-guide/configuration.md` | 新增工具输出截断限制配置（`tool_output.max_bytes/max_lines/max_line_length`）、新增 `browser.cdp_url` 和 `browser.dialog_policy` 配置 |
| `user-guide/tui.md` | TUI details_mode 从 `compact/verbose` 改为 `hidden/collapsed/expanded`、新增 per-section 配置和运行时切换 |
| `reference/tools-reference.md` | 内置工具从 53 个增至 55 个（新增 `browser_dialog`）、浏览器工具从 10 个增至 12 个 |
| `reference/toolsets-reference.md` | `browser` 工具集新增 `browser_dialog` 工具 |
| `user-guide/features/cron.md` | 任务 `model` 和 `provider` 可为 null，执行时从全局配置解析 |
| `user-guide/docker.md` | 新增容器内直接运行 `/opt/hermes/.venv/bin/hermes` 说明 |
| `user-guide/features/rl-training.md` | Atropos 和 Tinker 添加链接，WANDB_API_KEY 说明更新 |
| `user-guide/messaging/discord.md` | 新增 `DISCORD_COMMAND_SYNC_POLICY` 环境变量 |
| `reference/environment-variables.md` | 新增 `DISCORD_COMMAND_SYNC_POLICY` 环境变量 |
| `developer-guide/agent-loop.md` | `_api_call_with_interrupt` → `_interruptible_api_call` |
| `developer-guide/adding-providers.md` | 同上 |
| `guides/daily-briefing-bot.md` | 新增创建 Cron 任务前的模型/提供商配置说明 |

**新增 Skill 文档（133 个）：**
上游新增了大量 Skill 分类页面文档，包括 autonomous-ai-agents、creative、data-science、devops、dogfood、email、gaming、github、media、mlops、note-taking、productivity、red-teaming、research、smart-home、social-media、software-development 等分类下的 133 个新文档。这些文档目前无中文翻译，待后续处理。

**版本状态：** 上游无新增版本发布（最新 v0.10.0）

---

## 2026-04-23

**同步上游更改：8 个文件**

| 文件 | 更新内容 |
|------|----------|
| `user-guide/messaging/wecom.md` | 新增扫码创建 Bot 流程（`hermes gateway setup`）和手动配置备选方案 |
| `user-guide/sessions.md` | 新增 `auto_prune` 自动清理功能：按 `retention_days` 自动清理旧会话、VACUUM 回收空间 |
| `user-guide/features/fallback-providers.md` | 备用机制从"每会话单次"改为"每轮次"：主模型每轮恢复，轮次内最多触发一次 |
| `user-guide/features/memory-providers.md` | Hindsight 配置新增 `retain_context`、`retain_tags`、`retain_source`、`retain_user_prefix`、`retain_assistant_prefix` |
| `user-guide/configuration.md` | 新增 Exa 搜索配置说明（`EXA_API_KEY`、category 过滤） |
| `integrations/providers.md` | 新增 GMI Cloud 提供商（`https://api.gmi-serving.com/v1`） |
| `reference/cli-commands.md` | 新增 `--ignore-user-config` 和 `--ignore-rules` 全局选项 |
| `developer-guide/contributing.md` | Node.js 要求 18+ → 20+，新增 git-lfs 扩展要求 |

**版本状态：** 上游无新增版本发布（最新 v0.10.0）

---

## 2026-04-21

**同步上游更改：36 个文件，3 个新增**

| 类别 | 更新内容 |
|------|----------|
| Getting Started | `installation.md`、`nix-setup.md`、`quickstart.md` 等大幅更新 |
| Guides | 新增 `github-pr-review-agent.md`、`webhook-github-pr-review.md` |
| Features | `api-server.md`、`browser.md` 等新增功能文档 |
| Reference | `faq.md`、`optional-skills-catalog.md` 等更新 |

**版本状态：** 无新版本

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/)
