---
sidebar_position: 8
title: "记忆提供商插件"
description: "如何为 Hermes Agent 构建记忆提供商插件"
---

# 构建记忆提供商插件

记忆提供商插件为 Hermes Agent 提供超越内置 MEMORY.md 和 USER.md 的持久跨会话知识。本指南介绍如何构建一个。

:::tip
记忆提供商是两种**提供商插件**类型之一。另一种是[上下文引擎插件](/docs/developer-guide/context-engine-plugin)，它替换内置的上下文压缩器。两者遵循相同模式：单选、配置驱动、通过 `hermes plugins` 管理。
:::

## 目录结构

每个记忆提供商位于 `plugins/memory/<name>/`：

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider 实现 + register() 入口点
├── plugin.yaml      # 元数据（名称、描述、钩子）
└── README.md        # 设置说明、配置参考、工具
```

## MemoryProvider ABC

你的插件实现 `agent/memory_provider.py` 中的 `MemoryProvider` 抽象基类：

```python
from agent.memory_provider import MemoryProvider

class MyMemoryProvider(MemoryProvider):
    @property
    def name(self) -> str:
        return "my-provider"

    def is_available(self) -> bool:
        """检查此提供商是否可以激活。不要进行网络调用。"""
        return bool(os.environ.get("MY_API_KEY"))

    def initialize(self, session_id: str, **kwargs) -> None:
        """在 Agent 启动时调用一次。

        kwargs 始终包含：
          hermes_home (str): 活跃的 HERMES_HOME 路径。用于存储。
        """
        self._api_key = os.environ.get("MY_API_KEY", "")
        self._session_id = session_id

    # ... 实现其余方法
```

## 必需方法

### 核心生命周期

| 方法 | 调用时机 | 必须实现？ |
|------|----------|-----------|
| `name`（属性） | 始终 | **是** |
| `is_available()` | Agent 初始化，激活前 | **是** — 无网络调用 |
| `initialize(session_id, **kwargs)` | Agent 启动 | **是** |
| `get_tool_schemas()` | 初始化后，用于工具注入 | **是** |
| `handle_tool_call(name, args)` | Agent 使用你的工具时 | **是**（如果你有工具） |

### 配置

| 方法 | 用途 | 必须实现？ |
|------|------|-----------|
| `get_config_schema()` | 为 `hermes memory setup` 声明配置字段 | **是** |
| `save_config(values, hermes_home)` | 将非机密配置写入原生位置 | **是**（除非纯环境变量） |

### 可选钩子

| 方法 | 调用时机 | 用例 |
|------|----------|------|
| `system_prompt_block()` | 系统提示组装 | 静态提供商信息 |
| `prefetch(query)` | 每次 API 调用前 | 返回召回的上下文 |
| `queue_prefetch(query)` | 每轮之后 | 为下一轮预热 |
| `sync_turn(user, assistant)` | 每轮完成后 | 持久化对话 |
| `on_session_end(messages)` | 对话结束 | 最终提取/刷新 |
| `on_pre_compress(messages)` | 上下文压缩前 | 在丢弃前保存洞察 |
| `on_memory_write(action, target, content)` | 内置记忆写入 | 镜像到你的后端 |
| `shutdown()` | 进程退出 | 清理连接 |

## 配置 Schema

`get_config_schema()` 返回 `hermes memory setup` 使用的字段描述符列表：

```python
def get_config_schema(self):
    return [
        {
            "key": "api_key",
            "description": "My Provider API key",
            "secret": True,           # → 写入 .env
            "required": True,
            "env_var": "MY_API_KEY",   # 显式环境变量名
            "url": "https://my-provider.com/keys",  # 获取地址
        },
        {
            "key": "region",
            "description": "Server region",
            "default": "us-east",
            "choices": ["us-east", "eu-west", "ap-south"],
        },
        {
            "key": "project",
            "description": "Project identifier",
            "default": "hermes",
        },
    ]
```

带 `secret: True` 和 `env_var` 的字段写入 `.env`。非机密字段传递给 `save_config()`。

:::tip 最小化 vs 完整 Schema
`get_config_schema()` 中的每个字段都会在 `hermes memory setup` 期间提示。有多个选项的提供商应保持 Schema 最小 — 仅包含用户**必须**配置的字段（API 密钥、必需凭证）。在配置文件参考（如 `$HERMES_HOME/myprovider.json`）中记录可选设置，而不是在设置期间全部提示。这保持设置向导快速，同时仍支持高级配置。参见 Supermemory 提供商的示例 — 它只提示 API 密钥；所有其他选项在 `supermemory.json` 中。
:::

## 保存配置

```python
def save_config(self, values: dict, hermes_home: str) -> None:
    """将非机密配置写入你的原生位置。"""
    import json
    from pathlib import Path
    config_path = Path(hermes_home) / "my-provider.json"
    config_path.write_text(json.dumps(values, indent=2))
```

对于纯环境变量的提供商，保留默认的空操作。

## 插件入口点

```python
def register(ctx) -> None:
    """由记忆插件发现系统调用。"""
    ctx.register_memory_provider(MyMemoryProvider())
```

## plugin.yaml

```yaml
name: my-provider
version: 1.0.0
description: "简要描述此提供商的功能。"
hooks:
  - on_session_end    # 列出你实现的钩子
```

## 线程契约

**`sync_turn()` 必须是非阻塞的。** 如果你的后端有延迟（API 调用、LLM 处理），在守护线程中运行工作：

```python
def sync_turn(self, user_content, assistant_content):
    def _sync():
        try:
            self._api.ingest(user_content, assistant_content)
        except Exception as e:
            logger.warning("Sync failed: %s", e)

    if self._sync_thread and self._sync_thread.is_alive():
        self._sync_thread.join(timeout=5.0)
    self._sync_thread = threading.Thread(target=_sync, daemon=True)
    self._sync_thread.start()
```

## 配置文件隔离

所有存储路径**必须**使用 `initialize()` 中的 `hermes_home` kwarg，而非硬编码 `~/.hermes`：

```python
# 正确 — 配置文件范围隔离
from hermes_constants import get_hermes_home
data_dir = get_hermes_home() / "my-provider"

# 错误 — 所有配置文件共享
data_dir = Path("~/.hermes/my-provider").expanduser()
```

## 测试

参见 `tests/agent/test_memory_plugin_e2e.py` 了解使用真实 SQLite 提供商的完整端到端测试模式。

```python
from agent.memory_manager import MemoryManager

mgr = MemoryManager()
mgr.add_provider(my_provider)
mgr.initialize_all(session_id="test-1", platform="cli")

# 测试工具路由
result = mgr.handle_tool_call("my_tool", {"action": "add", "content": "test"})

# 测试生命周期
mgr.sync_all("user msg", "assistant msg")
mgr.on_session_end([])
mgr.shutdown_all()
```

## 添加 CLI 命令

记忆提供商插件可以注册自己的 CLI 子命令树（如 `hermes my-provider status`、`hermes my-provider config`）。这使用基于约定的发现系统 — 无需修改核心文件。

### 工作方式

1. 在插件目录中添加 `cli.py` 文件
2. 定义 `register_cli(subparser)` 函数来构建 argparse 树
3. 记忆插件系统在启动时通过 `discover_plugin_cli_commands()` 发现它
4. 你的命令出现在 `hermes <provider-name> <subcommand>` 下

**活跃提供商门控：** 你的 CLI 命令只在你的提供商是配置中的活跃 `memory.provider` 时出现。如果用户没有配置你的提供商，你的命令不会显示在 `hermes --help` 中。

### 示例

```python
# plugins/memory/my-provider/cli.py

def my_command(args):
    """由 argparse 分发的处理器。"""
    sub = getattr(args, "my_command", None)
    if sub == "status":
        print("Provider is active and connected.")
    elif sub == "config":
        print("Showing config...")
    else:
        print("Usage: hermes my-provider <status|config>")

def register_cli(subparser) -> None:
    """构建 hermes my-provider argparse 树。

    在 argparse 设置时由 discover_plugin_cli_commands() 调用。
    """
    subs = subparser.add_subparsers(dest="my_command")
    subs.add_parser("status", help="Show provider status")
    subs.add_parser("config", help="Show provider config")
    subparser.set_defaults(func=my_command)
```

### 参考实现

参见 `plugins/memory/honcho/cli.py` 了解完整示例，包含 13 个子命令、跨配置文件管理（`--target-profile`）和配置读写。

### 带 CLI 的目录结构

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider 实现 + register()
├── plugin.yaml      # 元数据
├── cli.py           # register_cli(subparser) — CLI 命令
└── README.md        # 设置说明
```

## 单提供商规则

同一时间只有**一个**外部记忆提供商可以激活。如果用户尝试注册第二个，MemoryManager 会拒绝并发出警告。这防止工具 Schema 膨胀和冲突的后端。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/developer-guide/memory-provider-plugin)
