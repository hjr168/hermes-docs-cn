---
sidebar_position: 13
title: "委托与并行工作"
description: "何时以及如何使用子 Agent 委托 — 并行研究、代码审查和多文件工作的模式"
---

# 委托与并行工作

Hermes 可以生成隔离的子 Agent 并行处理任务。每个子 Agent 获得自己的对话、终端会话和工具集。只有最终摘要返回 — 中间工具调用永远不会进入你的上下文窗口。

完整功能参考，参见[子 Agent 委托](/docs/user-guide/features/delegation)。

---

## 何时委托

**适合委托的场景：**
- 推理密集的子任务（调试、代码审查、研究综合）
- 会在你的上下文中充斥中间数据的任务
- 并行独立工作流（同时研究 A 和 B）
- 需要 Agent 在无偏见下全新切入的任务

**应该用其他方式的场景：**
- 单个工具调用 → 直接使用工具
- 步骤间有逻辑的机械多步工作 → `execute_code`
- 需要用户交互的任务 → 子 Agent 不能使用 `clarify`
- 快速文件编辑 → 直接做

---

## 模式：并行研究

同时研究三个话题并获取结构化摘要：

```
并行研究以下三个话题：
1. WebAssembly 在浏览器外的当前状态
2. 2025 年 RISC-V 服务器芯片采用情况
3. 实用量子计算应用

关注近期发展和主要参与者。
```

在幕后，Hermes 使用：

```python
delegate_task(tasks=[
    {
        "goal": "研究 2025 年浏览器外的 WebAssembly",
        "context": "关注：运行时（Wasmtime、Wasmer）、云/边缘用例、WASI 进展",
        "toolsets": ["web"]
    },
    {
        "goal": "研究 RISC-V 服务器芯片采用情况",
        "context": "关注：出货的服务器芯片、采用该架构的云服务商、软件生态",
        "toolsets": ["web"]
    },
    {
        "goal": "研究实用量子计算应用",
        "context": "关注：纠错突破、现实用例、关键公司",
        "toolsets": ["web"]
    }
])
```

三个任务并发运行。每个子 Agent 独立搜索 Web 并返回摘要。父 Agent 然后将它们综合成一份连贯的简报。

---

## 模式：代码审查

委托安全审查给一个全新上下文的子 Agent，让它无预设地审视代码：

```
审查 src/auth/ 的认证模块是否有安全问题。
检查 SQL 注入、JWT 验证问题、密码处理
和会话管理。修复发现的任何问题并运行测试。
```

关键是 `context` 字段 — 它必须包含子 Agent 需要的一切：

```python
delegate_task(
    goal="审查 src/auth/ 的安全问题并修复发现的问题",
    context="""项目位于 /home/user/webapp。Python 3.11、Flask、PyJWT、bcrypt。
    认证文件：src/auth/login.py、src/auth/jwt.py、src/auth/middleware.py
    测试命令：pytest tests/auth/ -v
    关注：SQL 注入、JWT 验证、密码哈希、会话管理。
    修复发现的问题并验证测试通过。""",
    toolsets=["terminal", "file"]
)
```

:::warning 上下文问题
子 Agent 对你的对话**一无所知**。它们从完全空白开始。如果你委托"修复我们讨论的那个 bug"，子 Agent 不知道你指的是什么 bug。始终明确传递文件路径、错误消息、项目结构和约束。
:::

---

## 模式：比较方案

并行评估同一问题的多种方案，然后选择最佳的：

```
我需要为我们的 Django 应用添加全文搜索。并行评估三种方案：
1. PostgreSQL tsvector（内置）
2. 通过 django-elasticsearch-dsl 的 Elasticsearch
3. 通过 meilisearch-python 的 Meilisearch

对每种：设置复杂度、查询能力、资源需求和
维护开销。比较它们并推荐一种。
```

每个子 Agent 独立研究一个选项。因为它们是隔离的，不会有交叉影响 — 每个评估独立基于自身优点。父 Agent 获得所有三个摘要并进行比较。

---

## 模式：多文件重构

将大型重构任务拆分到并行子 Agent，每个处理代码库的不同部分：

```python
delegate_task(tasks=[
    {
        "goal": "将所有 API 端点处理器重构为使用新的响应格式",
        "context": """项目位于 /home/user/api-server。
        文件：src/handlers/users.py、src/handlers/auth.py、src/handlers/billing.py
        旧格式：return {"data": result, "status": "ok"}
        新格式：return APIResponse(data=result, status=200).to_dict()
        导入：from src.responses import APIResponse
        之后运行测试：pytest tests/handlers/ -v""",
        "toolsets": ["terminal", "file"]
    },
    {
        "goal": "更新所有客户端 SDK 方法以处理新的响应格式",
        "context": """项目位于 /home/user/api-server。
        文件：sdk/python/client.py、sdk/python/models.py
        旧解析：result = response.json()["data"]
        新解析：result = response.json()["data"]（相同键，但添加状态码检查）
        同时更新 sdk/python/tests/test_client.py""",
        "toolsets": ["terminal", "file"]
    },
    {
        "goal": "更新 API 文档以反映新的响应格式",
        "context": """项目位于 /home/user/api-server。
        文档位于：docs/api/。格式：带代码示例的 Markdown。
        将所有响应示例从旧格式更新为新格式。
        在 docs/api/overview.md 中添加 'Response Format' 章节解释架构。""",
        "toolsets": ["terminal", "file"]
    }
])
```

:::tip
每个子 Agent 获得自己的终端会话。它们可以在同一项目目录中工作而不会相互冲突 — 只要它们编辑不同的文件。如果两个子 Agent 可能接触同一文件，在并行工作完成后再自己处理该文件。
:::

---

## 模式：收集后分析

使用 `execute_code` 进行机械数据收集，然后委托推理密集的分析：

```python
# 第 1 步：机械收集（execute_code 更适合 — 不需要推理）
execute_code("""
from hermes_tools import web_search, web_extract

results = []
for query in ["AI funding Q1 2026", "AI startup acquisitions 2026", "AI IPOs 2026"]:
    r = web_search(query, limit=5)
    for item in r["data"]["web"]:
        results.append({"title": item["title"], "url": item["url"], "desc": item["description"]})

# 提取最相关的前 5 个的完整内容
urls = [r["url"] for r in results[:5]]
content = web_extract(urls)

# 保存用于分析步骤
import json
with open("/tmp/ai-funding-data.json", "w") as f:
    json.dump({"search_results": results, "extracted": content["results"]}, f)
print(f"收集了 {len(results)} 个结果，提取了 {len(content['results'])} 个页面")
""")

# 第 2 步：推理密集分析（委托更适合）
delegate_task(
    goal="分析 AI 融资数据并撰写市场报告",
    context=""/tmp/ai-funding-data.json 中的原始数据包含关于 2026 年 Q1 AI 融资、
    收购和 IPO 的搜索结果和提取的网页。
    撰写结构化市场报告：关键交易、趋势、重要参与者和展望。重点关注超过 1 亿美元的交易。""",
    toolsets=["terminal", "file"]
)
```

这通常是最有效的模式：`execute_code` 廉价地处理 10+ 次顺序工具调用，然后子 Agent 在干净的上下文中完成单一的昂贵推理任务。

---

## 工具集选择

根据子 Agent 需要的功能选择工具集：

| 任务类型 | 工具集 | 原因 |
|-----------|----------|-----|
| Web 研究 | `["web"]` | 仅 web_search + web_extract |
| 代码工作 | `["terminal", "file"]` | Shell 访问 + 文件操作 |
| 全栈 | `["terminal", "file", "web"]` | 除消息外的所有功能 |
| 只读分析 | `["file"]` | 只能读取文件，无 Shell |

限制工具集让子 Agent 保持专注，防止意外的副作用（如研究子 Agent 运行 Shell 命令）。

---

## 约束

- **默认 3 个并行任务**：批处理默认 3 个并发子 Agent（可通过 config.yaml 中的 `delegation.max_concurrent_children` 配置，无硬上限，只有 1 的下限）
- **嵌套委托是可选的**：叶子子 Agent（默认）不能调用 `delegate_task`、`clarify`、`memory`、`send_message` 或 `execute_code`。编排器子 Agent（`role="orchestrator"`）保留 `delegate_task` 以进一步委托，但仅在 `delegation.max_spawn_depth` 从默认值 1 提高时（支持 1-3）；其他四个仍被阻止。也可通过 `delegation.orchestrator_enabled: false` 全局禁用。

### 调优并发和深度

| 配置 | 默认值 | 范围 | 效果 |
|--------|---------|-------|--------|
| `max_concurrent_children` | 3 | >=1 | 每次 `delegate_task` 调用的并行批处理大小 |
| `max_spawn_depth` | 1 | 1-3 | 可以进一步委托多少层嵌套 |

示例：运行 30 个并行工作器和嵌套子 Agent：

```yaml
delegation:
  max_concurrent_children: 30
  max_spawn_depth: 2
```

- **独立终端** — 每个子 Agent 获得自己的终端会话，有独立的工作目录和状态
- **无对话历史** — 子 Agent 只看到你放在 `goal` 和 `context` 中的内容
- **默认 50 次迭代** — 简单任务设置更低的 `max_iterations` 以节省成本

---

## 技巧

**目标要具体。** "修复 bug" 太模糊。"修复 api/handlers.py 第 47 行 process_request() 从 parse_body() 接收 None 时的 TypeError" 给子 Agent 足够的信息工作。

**包含文件路径。** 子 Agent 不知道你的项目结构。始终包含相关文件的绝对路径、项目根目录和测试命令。

**用委托做上下文隔离。** 有时你需要全新视角。委托迫使你清晰地描述问题，子 Agent 在没有对话中累积的假设下切入。

**检查结果。** 子 Agent 摘要只是摘要。如果子 Agent 说"修复了 bug 且测试通过"，自己运行测试或阅读 diff 来验证。

---

*完整委托参考 — 所有参数、ACP 集成和高级配置 — 见[子 Agent 委托](/docs/user-guide/features/delegation)。*

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/guides/delegation-patterns)
