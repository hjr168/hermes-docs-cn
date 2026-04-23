---
title: 同步日志
description: Hermes Agent 中文文档同步记录
---

# 同步日志

记录每次从上游 NousResearch/hermes-agent 同步文档的时间与更新内容。

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
