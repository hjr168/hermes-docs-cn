---
sidebar_position: 8
title: "代码执行"
description: "通过 RPC 工具访问实现程序化 Python 执行 — 将多步工作流压缩到单次交互中"
sidebar_label: 代码执行
---

# 代码执行（程序化工具调用）

`execute_code` 工具让 Agent 可以编写调用 Hermes 工具的 Python 脚本，将多步工作流压缩到单次 LLM 交互中。脚本在 Agent 主机上的子进程中运行，通过 Unix 域套接字 RPC 与 Hermes 通信。

## 工作原理

1. Agent 使用 `from hermes_tools import ...` 编写 Python 脚本
2. Hermes 生成包含 RPC 函数的 `hermes_tools.py` 存根模块
3. Hermes 打开 Unix 域套接字并启动 RPC 监听线程
4. 脚本在子进程中运行——工具调用通过套接字传回 Hermes
5. 仅脚本的 `print()` 输出返回给 LLM；中间工具结果不会进入上下文窗口

```python
# Agent 可以编写如下脚本：
from hermes_tools import web_search, web_extract

results = web_search("Python 3.13 新特性", limit=5)
for r in results["data"]["web"]:
    content = web_extract([r["url"]])
    # ... 过滤和处理 ...
print(summary)
```

**脚本内可用的工具：** `web_search`、`web_extract`、`read_file`、`write_file`、`search_files`、`patch`、`terminal`（仅前台）。

## Agent 何时使用此工具

Agent 在以下情况下使用 `execute_code`：

- **3 次以上工具调用**，中间有处理逻辑
- 批量数据过滤或条件分支
- 对结果进行循环

核心优势：中间工具结果不会进入上下文窗口——只有最终的 `print()` 输出返回，大幅减少令牌使用量。

## 实用示例

### 数据处理管道

```python
from hermes_tools import search_files, read_file
import json

# 查找所有配置文件并提取数据库设置
matches = search_files("database", path=".", file_glob="*.yaml", limit=20)
configs = []
for match in matches.get("matches", []):
    content = read_file(match["path"])
    configs.append({"file": match["path"], "preview": content["content"][:200]})

print(json.dumps(configs, indent=2))
```

### 多步网络研究

```python
from hermes_tools import web_search, web_extract
import json

# 在一次交互中搜索、提取和摘要
results = web_search("Rust async 运行时对比 2025", limit=5)
summaries = []
for r in results["data"]["web"]:
    page = web_extract([r["url"]])
    for p in page.get("results", []):
        if p.get("content"):
            summaries.append({
                "title": r["title"],
                "url": r["url"],
                "excerpt": p["content"][:500]
            })

print(json.dumps(summaries, indent=2))
```

### 批量文件重构

```python
from hermes_tools import search_files, read_file, patch

# 查找所有使用已废弃 API 的 Python 文件并修复
matches = search_files("old_api_call", path="src/", file_glob="*.py")
fixed = 0
for match in matches.get("matches", []):
    result = patch(
        path=match["path"],
        old_string="old_api_call(",
        new_string="new_api_call(",
        replace_all=True
    )
    if "error" not in str(result):
        fixed += 1

print(f"在 {len(matches.get('matches', []))} 个匹配中修复了 {fixed} 个文件")
```

### 构建和测试管道

```python
from hermes_tools import terminal, read_file
import json

# 运行测试，解析结果并报告
result = terminal("cd /project && python -m pytest --tb=short -q 2>&1", timeout=120)
output = result.get("output", "")

# 解析测试输出
passed = output.count(" passed")
failed = output.count(" failed")
errors = output.count(" error")

report = {
    "passed": passed,
    "failed": failed,
    "errors": errors,
    "exit_code": result.get("exit_code", -1),
    "summary": output[-500:] if len(output) > 500 else output
}

print(json.dumps(report, indent=2))
```

## 执行模式

`execute_code` 有两种执行模式，通过 `~/.hermes/config.yaml` 中的 `code_execution.mode` 控制：

| 模式 | 工作目录 | Python 解释器 |
|------|-------------------|--------------------|
| **`project`**（默认） | 会话的工作目录（与 `terminal()` 相同） | 活动的 `VIRTUAL_ENV` / `CONDA_PREFIX` python，回退到 Hermes 自身的 python |
| `strict` | 与用户项目隔离的临时暂存目录 | `sys.executable`（Hermes 自身的 python） |

**何时使用 `project`：** 你需要 `import pandas`、`from my_project import foo` 或相对路径如 `open(".env")` 以与 `terminal()` 相同的方式工作。这几乎总是你想要的。

**何时切换到 `strict`：** 你需要最大的可重现性——你希望每次会话使用相同的解释器，无论用户激活了哪个虚拟环境，并且你希望脚本与项目树隔离（不会通过相对路径意外读取项目文件）。

```yaml
# ~/.hermes/config.yaml
code_execution:
  mode: project   # 或 "strict"
```

`project` 模式的回退行为：如果 `VIRTUAL_ENV` / `CONDA_PREFIX` 未设置、损坏或指向低于 3.8 的 Python，解析器会干净地回退到 `sys.executable`——它不会让 Agent 失去可用的解释器。

安全关键的不变量在两种模式下完全相同：

- 环境清理（API 密钥、令牌、凭证被清除）
- 工具白名单（脚本不能递归调用 `execute_code`、`delegate_task` 或 MCP 工具）
- 资源限制（超时、输出上限、工具调用上限）

切换模式改变的是脚本在哪里运行和哪个解释器运行它们，而不是它们能访问哪些凭证或调用哪些工具。

## 资源限制

| 资源 | 限制 | 说明 |
|----------|-------|-------|
| **超时** | 5 分钟（300秒） | 脚本先被 SIGTERM 终止，5 秒宽限期后 SIGKILL |
| **标准输出** | 50 KB | 输出被截断并显示 `[output truncated at 50KB]` 提示 |
| **标准错误** | 10 KB | 非零退出时包含在输出中用于调试 |
| **工具调用** | 每次执行 50 次 | 达到限制时返回错误 |

所有限制都可通过 `config.yaml` 配置：

```yaml
# ~/.hermes/config.yaml
code_execution:
  mode: project      # project（默认）| strict
  timeout: 300       # 每个脚本最大秒数（默认：300）
  max_tool_calls: 50 # 每次执行最大工具调用次数（默认：50）
```

## 脚本内工具调用的工作原理

当你的脚本调用 `web_search("query")` 这样的函数时：

1. 调用被序列化为 JSON 并通过 Unix 域套接字发送到父进程
2. 父进程通过标准的 `handle_function_call` 处理器分发
3. 结果通过套接字返回
4. 函数返回解析后的结果

这意味着脚本内的工具调用行为与普通工具调用完全一致——相同的速率限制、相同的错误处理、相同的能力。唯一限制是 `terminal()` 仅支持前台模式（不支持 `background` 或 `pty` 参数）。

## 错误处理

当脚本失败时，Agent 会收到结构化的错误信息：

- **非零退出码**：stderr 包含在输出中，Agent 可以看到完整的追溯信息
- **超时**：脚本被终止，Agent 看到 `"Script timed out after 300s and was killed."`
- **中断**：如果用户在执行期间发送了新消息，脚本被终止，Agent 看到 `[execution interrupted — user sent a new message]`
- **工具调用限制**：当达到 50 次调用限制时，后续工具调用返回错误消息

响应始终包含 `status`（success/error/timeout/interrupted）、`output`、`tool_calls_made` 和 `duration_seconds`。

## 安全性

:::danger 安全模型
子进程在**最小化环境**中运行。API 密钥、令牌和凭证默认被清除。脚本仅通过 RPC 通道访问工具——除非明确允许，否则无法从环境变量读取密钥。
:::

名称中包含 `KEY`、`TOKEN`、SECRET、`PASSWORD`、CREDENTIAL、`PASSWD` 或 `AUTH` 的环境变量被排除。仅传递安全的系统变量（`PATH`、`HOME`、`LANG`、`SHELL`、`PYTHONPATH`、`VIRTUAL_ENV` 等）。

### 技能环境变量透传

当技能在其 frontmatter 中声明了 `required_environment_variables` 时，这些变量在技能加载后**自动透传**到 `execute_code` 和 `terminal` 子进程。这让技能可以使用其声明的 API 密钥，而不会削弱任意代码的安全态势。

对于非技能用例，你可以在 `config.yaml` 中显式设置允许列表：

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

完整详情请参阅[安全指南](/docs/user-guide/security#environment-variable-passthrough)。

Hermes 始终将脚本和自动生成的 `hermes_tools.py` RPC 存根写入临时暂存目录，执行后清理。在 `strict` 模式下脚本也在暂存目录中运行；在 `project` 模式下它在会话的工作目录中运行（暂存目录保留在 `PYTHONPATH` 上以确保导入仍然解析）。子进程在其自己的进程组中运行，因此可以在超时或中断时干净地终止。

## execute_code 与 terminal 的对比

| 用例 | execute_code | terminal |
|----------|-------------|----------|
| 带工具调用的多步工作流 | ✅ | ❌ |
| 简单 shell 命令 | ❌ | ✅ |
| 过滤/处理大型工具输出 | ✅ | ❌ |
| 运行构建或测试套件 | ❌ | ✅ |
| 循环搜索结果 | ✅ | ❌ |
| 交互式/后台进程 | ❌ | ✅ |
| 需要环境中的 API 密钥 | ⚠️ 仅通过[透传](/docs/user-guide/security#environment-variable-passthrough) | ✅（大多数会透传） |

**经验法则：** 当你需要程序化调用 Hermes 工具并在调用间加入逻辑时使用 `execute_code`。使用 `terminal` 运行 shell 命令、构建和进程。

## 平台支持

代码执行需要 Unix 域套接字，仅在 **Linux 和 macOS** 上可用。在 Windows 上自动禁用——Agent 回退到常规的顺序工具调用。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/code-execution)
