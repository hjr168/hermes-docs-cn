---
sidebar_position: 12
sidebar_label: "内置 Plugin"
title: "内置 Plugin"
description: "随 Hermes Agent 一起发布、通过生命周期钩子自动运行的 Plugin — disk-cleanup 等"
---

# 内置 Plugin

Hermes 随仓库附带一小批 Plugin。它们位于 `<repo>/plugins/<name>/`，与 `~/.hermes/plugins/` 中用户安装的 Plugin 一起自动加载。它们使用与第三方 Plugin 相同的插件接口 — 钩子、工具、斜杠命令 — 只是在仓库内维护。

关于通用 Plugin 系统，参见 [Plugin](/docs/user-guide/features/plugins) 页面；关于如何编写自己的 Plugin，参见[构建 Hermes Plugin](/docs/guides/build-a-hermes-plugin)。

## 发现机制

`PluginManager` 按顺序扫描四个来源：

1. **Bundled（捆绑）** — `<repo>/plugins/<name>/`（本页文档所述）
2. **User（用户）** — `~/.hermes/plugins/<name>/`
3. **Project（项目）** — `./.hermes/plugins/<name>/`（需要 `HERMES_ENABLE_PROJECT_PLUGINS=1`）
4. **Pip entry points** — `hermes_agent.plugins`

名称冲突时，后面的来源优先 — 名为 `disk-cleanup` 的用户 Plugin 会替换捆绑版本。

`plugins/memory/` 和 `plugins/context_engine/` 被有意排除在捆绑扫描之外。这些目录使用自己的发现路径，因为 Memory Provider 和 Context Engine 是单选 Provider，通过 `hermes memory setup` / config 中的 `context.engine` 配置。

## 捆绑 Plugin 默认不启用

捆绑 Plugin 默认是禁用的。发现机制能找到它们（它们出现在 `hermes plugins list` 和交互式 `hermes plugins` UI 中），但在你明确启用之前不会加载：

```bash
hermes plugins enable disk-cleanup
```

或通过 `~/.hermes/config.yaml`：

```yaml
plugins:
  enabled:
    - disk-cleanup
```

这与用户安装的 Plugin 使用相同的机制。捆绑 Plugin 永远不会自动启用 — 无论是全新安装还是现有用户升级到更新版本的 Hermes。你始终需要明确选择启用。

要关闭捆绑 Plugin：

```bash
hermes plugins disable disk-cleanup
# 或：从 config.yaml 的 plugins.enabled 中移除
```

## 当前内置 Plugin

### disk-cleanup

自动跟踪并删除会话期间创建的临时文件 — 测试脚本、临时输出、Cron 日志、过期的 Chrome 配置文件 — 无需 Agent 记住调用工具。

**工作原理：**

| 钩子 | 行为 |
|---|---|
| `post_tool_call` | 当 `write_file` / `terminal` / `patch` 在 `HERMES_HOME` 或 `/tmp/hermes-*` 内创建匹配 `test_*`、`tmp_*` 或 `*.test.*` 的文件时，静默跟踪为 `test` / `temp` / `cron-output`。 |
| `on_session_end` | 如果在轮次中有测试文件被自动跟踪，运行安全的 `quick` 清理并记录一行摘要。否则保持静默。 |

**删除规则：**

| 类别 | 阈值 | 确认 |
|---|---|---|
| `test` | 每次会话结束 | 从不 |
| `temp` | 跟踪后 >7 天 | 从不 |
| `cron-output` | 跟踪后 >14 天 | 从不 |
| HERMES_HOME 下的空目录 | 始终 | 从不 |
| `research` | >30 天，超出最新 10 个 | 始终（仅 deep） |
| `chrome-profile` | 跟踪后 >14 天 | 始终（仅 deep） |
| 大于 500 MB 的文件 | 从不自动 | 始终（仅 deep） |

**斜杠命令** — `/disk-cleanup` 在 CLI 和 Gateway 会话中可用：

```
/disk-cleanup status                     # 分类汇总 + 最大的 10 个
/disk-cleanup dry-run                    # 预览而不删除
/disk-cleanup quick                      # 立即运行安全清理
/disk-cleanup deep                       # quick + 列出需要确认的项目
/disk-cleanup track <path> <category>    # 手动跟踪
/disk-cleanup forget <path>              # 停止跟踪（不删除）
```

**状态** — 所有数据位于 `$HERMES_HOME/disk-cleanup/`：

| 文件 | 内容 |
|---|---|
| `tracked.json` | 跟踪的路径，含类别、大小和时间戳 |
| `tracked.json.bak` | 上述文件的原子写入备份 |
| `cleanup.log` | 追加式的审计日志，记录每次跟踪/跳过/拒绝/删除 |

**安全性** — 清理只涉及 `HERMES_HOME` 或 `/tmp/hermes-*` 下的路径。Windows 挂载（`/mnt/c/...`）会被拒绝。众所周知的顶层状态目录（`logs/`、`memories/`、`sessions/`、`cron/`、`cache/`、`skills/`、`plugins/`、`disk-cleanup/` 本身）即使为空也从不删除 — 全新安装不会在第一次会话结束时被清空。

**启用：** `hermes plugins enable disk-cleanup`（或在 `hermes plugins` 中勾选）。

**禁用：** `hermes plugins disable disk-cleanup`。

## 添加捆绑 Plugin

捆绑 Plugin 的编写方式与任何其他 Hermes Plugin 完全相同 — 参见[构建 Hermes Plugin](/docs/guides/build-a-hermes-plugin)。唯一的区别是：

- 目录位于 `<repo>/plugins/<name>/` 而非 `~/.hermes/plugins/<name>/`
- 在 `hermes plugins list` 中 Manifest 来源报告为 `bundled`
- 同名用户 Plugin 会覆盖捆绑版本

Plugin 适合捆绑的条件：

- 没有可选依赖（或它们已经是 `pip install .[all]` 的依赖）
- 行为对大多数用户有益，且是 opt-out 而非 opt-in
- 逻辑绑定到生命周期钩子，否则 Agent 需要记住调用
- 它补充核心能力而不扩展模型可见的工具表面

反例 — 应保持为用户安装的 Plugin 而非捆绑：需要 API 密钥的第三方集成、小众工作流、大型依赖树、任何默认会显著改变 Agent 行为的东西。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/built-in-plugins)
