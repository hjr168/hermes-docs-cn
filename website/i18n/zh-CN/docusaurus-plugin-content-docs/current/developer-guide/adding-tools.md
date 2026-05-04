---
sidebar_position: 2
title: "添加工具"
description: "如何为 Hermes Agent 添加新工具——schema、处理函数、注册和工具集"
---

# 添加工具

在编写工具之前，先问问自己：**这个功能应该是 [Skill（技能）](creating-skills.md) 吗？**

当功能可以用指令 + shell 命令 + 现有工具来表达时，做成 **Skill**（如 arXiv 搜索、git 工作流、Docker 管理、PDF 处理）。

当需要与 API key 端到端集成、自定义处理逻辑、二进制数据处理或流式传输时，做成 **Tool**（如浏览器自动化、TTS、视觉分析）。

## 概述

添加一个工具涉及 **2 个文件**：

1. **`tools/your_tool.py`** — 处理函数、schema、检查函数、`registry.register()` 调用
2. **`toolsets.py`** — 将工具名称添加到 `_HERMES_CORE_TOOLS`（或特定的工具集）

任何带有顶层 `registry.register()` 调用的 `tools/*.py` 文件会在启动时自动发现——无需手动维护导入列表。

## 第 1 步：创建工具文件

每个工具文件遵循相同的结构：

```python
# tools/weather_tool.py
"""天气工具 -- 查询指定地点的当前天气。"""

import json
import os
import logging

logger = logging.getLogger(__name__)


# --- 可用性检查 ---

def check_weather_requirements() -> bool:
    """如果工具的依赖可用则返回 True。"""
    return bool(os.getenv("WEATHER_API_KEY"))


# --- 处理函数 ---

def weather_tool(location: str, units: str = "metric") -> str:
    """获取指定地点的天气。返回 JSON 字符串。"""
    api_key = os.getenv("WEATHER_API_KEY")
    if not api_key:
        return json.dumps({"error": "WEATHER_API_KEY 未配置"})
    try:
        # ... 调用天气 API ...
        return json.dumps({"location": location, "temp": 22, "units": units})
    except Exception as e:
        return json.dumps({"error": str(e)})


# --- Schema ---

WEATHER_SCHEMA = {
    "name": "weather",
    "description": "获取指定地点的当前天气。",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "城市名称或坐标（例如 'London' 或 '51.5,-0.1'）"
            },
            "units": {
                "type": "string",
                "enum": ["metric", "imperial"],
                "description": "温度单位（默认：公制）",
                "default": "metric"
            }
        },
        "required": ["location"]
    }
}


# --- 注册 ---

from tools.registry import registry

registry.register(
    name="weather",
    toolset="weather",
    schema=WEATHER_SCHEMA,
    handler=lambda args, **kw: weather_tool(
        location=args.get("location", ""),
        units=args.get("units", "metric")),
    check_fn=check_weather_requirements,
    requires_env=["WEATHER_API_KEY"],
)
```

### 关键规则

:::danger 重要
- 处理函数**必须**返回 JSON 字符串（通过 `json.dumps()`），永远不要返回原始字典
- 错误**必须**以 `{"error": "消息"}` 的形式返回，永远不要作为异常抛出
- `check_fn` 在构建工具定义时调用——如果返回 `False`，工具会被静默排除
- `handler` 接收 `(args: dict, **kwargs)`，其中 `args` 是 LLM 的工具调用参数
:::

## 第 2 步：添加到工具集

在 `toolsets.py` 中添加工具名称：

```python
# 如果应该在所有平台上可用（CLI + 消息平台）：
_HERMES_CORE_TOOLS = [
    ...
    "weather",  # <-- 在此添加
]

# 或创建一个新的独立工具集：
"weather": {
    "description": "天气查询工具",
    "tools": ["weather"],
    "includes": []
},
```

## ~~第 3 步：添加发现导入~~（不再需要）

带有顶层 `registry.register()` 调用的工具模块会被 `tools/registry.py` 中的 `discover_builtin_tools()` 自动发现。无需维护手动导入列表——只需在 `tools/` 中创建你的文件，启动时就会自动加载。

## 异步处理函数

如果你的处理函数需要异步代码，使用 `is_async=True` 标记：

```python
async def weather_tool_async(location: str) -> str:
    async with aiohttp.ClientSession() as session:
        ...
    return json.dumps(result)

registry.register(
    name="weather",
    toolset="weather",
    schema=WEATHER_SCHEMA,
    handler=lambda args, **kw: weather_tool_async(args.get("location", "")),
    check_fn=check_weather_requirements,
    is_async=True,  # registry 会自动调用 _run_async()
)
```

registry 透明地处理异步桥接——你永远不需要自己调用 `asyncio.run()`。

## 需要 task\_id 的处理函数

管理每会话状态的工具通过 `**kwargs` 接收 `task_id`：

```python
def _handle_weather(args, **kw):
    task_id = kw.get("task_id")
    return weather_tool(args.get("location", ""), task_id=task_id)

registry.register(
    name="weather",
    ...
    handler=_handle_weather,
)
```

## Agent 循环拦截的工具

一些工具（`todo`、`memory`、`session_search`、`delegate_task`）需要访问每会话的 agent 状态。这些工具在到达 registry 之前被 `run_agent.py` 拦截。Registry 仍然持有它们的 schema，但如果拦截被绕过，`dispatch()` 会返回一个回退错误。

## 可选：设置向导集成

如果你的工具需要 API key，将其添加到 `hermes_cli/config.py`：

```python
OPTIONAL_ENV_VARS = {
    ...
    "WEATHER_API_KEY": {
        "description": "天气查询的 Weather API key",
        "prompt": "Weather API key",
        "url": "https://weatherapi.com/",
        "tools": ["weather"],
        "password": True,
    },
}
```

## 检查清单

- [ ] 创建了包含处理函数、schema、检查函数和注册的工具文件
- [ ] 在 `toolsets.py` 中添加到了适当的工具集
- [ ] 在 `model_tools.py` 中添加了发现导入
- [ ] 处理函数返回 JSON 字符串，错误以 `{"error": "..."}` 返回
- [ ] 可选：在 `hermes_cli/config.py` 的 `OPTIONAL_ENV_VARS` 中添加了 API key
- [ ] 可选：添加到 `toolset_distributions.py` 用于批处理
- [ ] 使用 `hermes chat -q "Use the weather tool for London"` 测试

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/adding-tools)
