---
sidebar_position: 3
sidebar_label: "Git Worktree"
title: "Git Worktree"
description: "使用 Git Worktree 和隔离检出在同一仓库上安全运行多个 Hermes Agent"
---

# Git Worktree

Hermes Agent 经常用于大型、长期维护的仓库。当你需要：

- 在同一项目上**并行运行多个 Agent**，或
- 将实验性重构与主分支隔离时，

Git **Worktree** 是给每个 Agent 独立检出副本的最安全方式，无需复制整个仓库。

本页展示如何将 Worktree 与 Hermes 结合使用，使每个会话拥有干净、隔离的工作目录。

## 为什么在 Hermes 中使用 Worktree？

Hermes 将**当前工作目录**视为项目根目录：

- CLI：你运行 `hermes` 或 `hermes chat` 的目录
- 消息网关：由 `MESSAGING_CWD` 设置的目录

如果你在**同一检出目录**中运行多个 Agent，它们的变更可能互相干扰：

- 一个 Agent 可能删除或重写另一个 Agent 正在使用的文件。
- 更难区分哪些变更属于哪个实验。

使用 Worktree，每个 Agent 获得：

- **自己的分支和工作目录**
- **自己的 Checkpoint Manager 历史记录**用于 `/rollback`

另见：[检查点与 /rollback](./checkpoints-and-rollback.md)。

## 快速开始：创建 Worktree

从你的主仓库（包含 `.git/`）创建一个功能分支的新 Worktree：

```bash
# 从主仓库根目录
cd /path/to/your/repo

# 在 ../repo-feature 中创建新分支和 Worktree
git worktree add ../repo-feature feature/hermes-experiment
```

这会创建：

- 新目录：`../repo-feature`
- 新分支：`feature/hermes-experiment` 在该目录中检出

现在你可以进入新 Worktree 并在那里运行 Hermes：

```bash
cd ../repo-feature

# 在 Worktree 中启动 Hermes
hermes
```

Hermes 会：

- 将 `../repo-feature` 视为项目根目录。
- 使用该目录进行上下文文件、代码编辑和工具操作。
- 使用**独立的检查点历史**，`/rollback` 的作用范围限定在此 Worktree。

## 并行运行多个 Agent

你可以创建多个 Worktree，每个有自己的分支：

```bash
cd /path/to/your/repo

git worktree add ../repo-experiment-a feature/hermes-a
git worktree add ../repo-experiment-b feature/hermes-b
```

在不同的终端中：

```bash
# 终端 1
cd ../repo-experiment-a
hermes

# 终端 2
cd ../repo-experiment-b
hermes
```

每个 Hermes 进程：

- 在自己的分支上工作（`feature/hermes-a` vs `feature/hermes-b`）。
- 在不同的影子仓库哈希下写入检查点（从 Worktree 路径派生）。
- 可以独立使用 `/rollback` 而不影响另一个。

这在以下场景特别有用：

- 运行批量重构。
- 尝试同一任务的不同方案。
- CLI + 网关会话同时对接同一上游仓库。

## 安全清理 Worktree

实验完成后：

1. 决定保留还是放弃工作。
2. 如果要保留：
   - 像往常一样将分支合并到主分支。
3. 移除 Worktree：

```bash
cd /path/to/your/repo

# 移除 Worktree 目录及其引用
git worktree remove ../repo-feature
```

注意事项：

- `git worktree remove` 会拒绝移除有未提交变更的 Worktree，除非你强制执行。
- 移除 Worktree**不会**自动删除分支；你可以使用普通的 `git branch` 命令删除或保留分支。
- 移除 Worktree 时 `~/.hermes/checkpoints/` 下的 Hermes 检查点数据不会自动清理，但通常很小。

## 最佳实践

- **每个 Hermes 实验一个 Worktree**
  - 为每项重大变更创建专属分支/Worktree。
  - 这使差异更聚焦，PR 更小且易于审查。
- **以实验命名分支**
  - 例如 `feature/hermes-checkpoints-docs`、`feature/hermes-refactor-tests`。
- **频繁提交**
  - 使用 Git 提交标记高级里程碑。
  - 在工具驱动的编辑之间使用[检查点和 /rollback](./checkpoints-and-rollback.md) 作为安全网。
- **使用 Worktree 时避免从裸仓库根目录运行 Hermes**
  - 优先使用 Worktree 目录，使每个 Agent 有清晰的范围。

## 使用 `hermes -w`（自动 Worktree 模式）

Hermes 内置了 `-w` 标志，可以**自动创建带有自己分支的一次性 Git Worktree**。你无需手动设置 Worktree —— 只需 `cd` 到你的仓库并运行：

```bash
cd /path/to/your/repo
hermes -w
```

Hermes 会：

- 在仓库内的 `.worktrees/` 下创建临时 Worktree。
- 检出一个隔离的分支（例如 `hermes/hermes-<hash>`）。
- 在该 Worktree 内运行完整的 CLI 会话。

这是获得 Worktree 隔离的最简单方式。你也可以结合单次查询使用：

```bash
hermes -w -q "Fix issue #123"
```

对于并行 Agent，打开多个终端并在每个中运行 `hermes -w` —— 每次调用都会自动获得自己的 Worktree 和分支。

## 总结

- 使用 **Git Worktree** 为每个 Hermes 会话提供独立的干净检出。
- 使用**分支**捕获实验的高级历史。
- 使用**检查点 + `/rollback`** 在每个 Worktree 内从错误中恢复。

这种组合为你提供：

- 不同 Agent 和实验之间不会互相干扰的强保证。
- 快速迭代周期，轻松从错误编辑中恢复。
- 干净、可审查的 Pull Request。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/git-worktrees)
