---
sidebar_position: 4
title: "Memory Providers（记忆提供者）"
description: "外部记忆提供者插件 — Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory"
---

# Memory Providers（记忆提供者）

Hermes Agent 内置 8 个外部记忆提供者插件，为 Agent 提供超越内置 MEMORY.md 和 USER.md 的持久化跨会话知识。同一时间只能激活**一个**外部提供者 — 内置记忆始终与之并存。

## 快速开始

```bash
hermes memory setup      # 交互式选择 + 配置
hermes memory status     # 查看当前激活的提供者
hermes memory off        # 禁用外部提供者
```

你也可以通过 `hermes plugins` → Provider Plugins → Memory Provider 选择激活的记忆提供者。

或在 `~/.hermes/config.yaml` 中手动设置：

```yaml
memory:
  provider: openviking   # 或 honcho, mem0, hindsight, holographic, retaindb, byterover, supermemory
```

## 工作原理

当记忆提供者激活时，Hermes 自动：

1. **注入提供者上下文**到系统提示（提供者所知的信息）
2. 在每轮之前**预取相关记忆**（后台，非阻塞）
3. 在每次响应后**同步对话轮次**到提供者
4. 在会话结束时**提取记忆**（对于支持此功能的提供者）
5. **镜像内置记忆写入**到外部提供者
6. **添加提供者特定工具**，使 Agent 可以搜索、存储和管理记忆

内置记忆（MEMORY.md / USER.md）继续完全正常工作。外部提供者是增量的。

## 可用提供者

### Honcho

AI 原生跨会话用户建模，具有辩证推理、会话范围上下文注入、语义搜索和持久结论。基础上下文现在包括会话摘要以及用户表示和对等卡片，让 Agent 了解已经讨论过的内容。

| | |
|---|---|
| **最适合** | 需要跨会话上下文的多 Agent 系统、用户-Agent 对齐 |
| **需要** | `pip install honcho-ai` + [API key](https://app.honcho.dev) 或自托管实例 |
| **数据存储** | Honcho Cloud 或自托管 |
| **费用** | Honcho 定价（云）/ 免费（自托管） |

**工具 (5):** `honcho_profile`（读/更新对等卡片）、`honcho_search`（语义搜索）、`honcho_context`（会话上下文 — 摘要、表示、卡片、消息）、`honcho_reasoning`（LLM 合成）、`honcho_conclude`（创建/删除结论）

**架构：** 两层上下文注入 — 基础层（会话摘要 + 表示 + 对等卡片，按 `contextCadence` 刷新）加辩证补充（LLM 推理，按 `dialecticCadence` 刷新）。辩证根据是否存在基础上下文自动选择冷启动提示（通用用户事实）或热提示（会话范围上下文）。

**三个正交配置旋钮**独立控制成本和深度：

- `contextCadence` — 基础层刷新频率（API 调用频率）
- `dialecticCadence` — 辩证 LLM 触发频率（LLM 调用频率）
- `dialecticDepth` — 每次辩证调用的 `.chat()` 轮数（1-3，推理深度）

**设置向导：**
```bash
hermes honcho setup        # (旧命令)
# 或
hermes memory setup        # 选择 "honcho"
```

**配置：** `$HERMES_HOME/honcho.json`（Profile 本地）或 `~/.honcho/config.json`（全局）。解析顺序：`$HERMES_HOME/honcho.json` > `~/.hermes/honcho.json` > `~/.honcho/config.json`。参见[配置参考](https://github.com/hermes-ai/hermes-agent/blob/main/plugins/memory/honcho/README.md)和 [Honcho 集成指南](https://docs.honcho.dev/v3/guides/integrations/hermes)。

<details>
<summary>完整配置参考</summary>

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `apiKey` | -- | 来自 [app.honcho.dev](https://app.honcho.dev) 的 API Key |
| `baseUrl` | -- | 自托管 Honcho 的基础 URL |
| `peerName` | -- | 用户对等身份 |
| `aiPeer` | 主机键 | AI 对等身份（每个 Profile 一个） |
| `workspace` | 主机键 | 共享工作区 ID |
| `contextTokens` | `null`（无限制） | 每轮自动注入上下文的 Token 预算。在词边界截断 |
| `contextCadence` | `1` | `context()` API 调用之间的最小轮数（基础层刷新） |
| `dialecticCadence` | `2` | `peer.chat()` LLM 调用之间的最小轮数。推荐 1–5。仅适用于 `hybrid`/`context` 模式 |
| `dialecticDepth` | `1` | 每次辩证调用的 `.chat()` 轮数。限制在 1-3。第 0 轮：冷/热提示，第 1 轮：自审计，第 2 轮：调和 |
| `dialecticDepthLevels` | `null` | 可选的每轮推理级别数组，如 `["minimal", "low", "medium"]`。覆盖比例默认值 |
| `dialecticReasoningLevel` | `'low'` | 基础推理级别：`minimal`、`low`、`medium`、`high`、`max` |
| `dialecticDynamic` | `true` | 为 `true` 时，模型可通过工具参数按调用覆盖推理级别 |
| `dialecticMaxChars` | `600` | 注入到系统提示的辩证结果最大字符数 |
| `recallMode` | `'hybrid'` | `hybrid`（自动注入 + 工具）、`context`（仅注入）、`tools`（仅工具） |
| `writeFrequency` | `'async'` | 何时刷新消息：`async`（后台线程）、`turn`（同步）、`session`（结束时批量）或整数 N |
| `saveMessages` | `true` | 是否将消息持久化到 Honcho API |
| `observationMode` | `'directional'` | `directional`（全部开启）或 `unified`（共享池）。用 `observation` 对象覆盖 |
| `messageMaxChars` | `25000` | 每条消息的最大字符数（超出时分块） |
| `dialecticMaxInputChars` | `10000` | `peer.chat()` 辩证查询输入的最大字符数 |
| `sessionStrategy` | `'per-directory'` | `per-directory`、`per-repo`、`per-session`、`global` |

</details>

<details>
<summary>最简 honcho.json（云）</summary>

```json
{
  "apiKey": "your-key-from-app.honcho.dev",
  "hosts": {
    "hermes": {
      "enabled": true,
      "aiPeer": "hermes",
      "peerName": "your-name",
      "workspace": "hermes"
    }
  }
}
```

</details>

<details>
<summary>最简 honcho.json（自托管）</summary>

```json
{
  "baseUrl": "http://localhost:8000",
  "hosts": {
    "hermes": {
      "enabled": true,
      "aiPeer": "hermes",
      "peerName": "your-name",
      "workspace": "hermes"
    }
  }
}
```

</details>

:::tip 从 `hermes honcho` 迁移
如果你之前使用 `hermes honcho setup`，你的配置和所有服务端数据都完好无损。只需通过设置向导重新启用，或手动设置 `memory.provider: honcho` 通过新系统重新激活。
:::

**多 Agent / Profile：**

每个 Hermes Profile 获得自己的 Honcho AI 对等方，同时共享同一个工作区 — 所有 Profile 看到相同的用户表示，但每个 Agent 构建自己的身份和观察。

```bash
hermes profile create coder --clone   # 创建 honcho 对等方 "coder"，从默认 Profile 继承配置
```

`--clone` 的作用：在 `honcho.json` 中创建 `hermes.coder` 主机块，`aiPeer: "coder"`，共享 `workspace`，继承 `peerName`、`recallMode`、`writeFrequency`、`observation` 等。对等方在 Honcho 中立即创建，确保在第一条消息前就存在。

对于 Honcho 设置之前创建的 Profile：

```bash
hermes honcho sync   # 扫描所有 Profile，为缺失的创建主机块
```

这从默认 `hermes` 主机块继承设置，为每个 Profile 创建新的 AI 对等方。幂等操作 — 跳过已有主机块的 Profile。

<details>
<summary>完整 honcho.json 示例（多 Profile）</summary>

```json
{
  "apiKey": "your-key",
  "workspace": "hermes",
  "peerName": "eri",
  "hosts": {
    "hermes": {
      "enabled": true,
      "aiPeer": "hermes",
      "workspace": "hermes",
      "peerName": "eri",
      "recallMode": "hybrid",
      "writeFrequency": "async",
      "sessionStrategy": "per-directory",
      "observation": {
        "user": { "observeMe": true, "observeOthers": true },
        "ai": { "observeMe": true, "observeOthers": true }
      },
      "dialecticReasoningLevel": "low",
      "dialecticDynamic": true,
      "dialecticCadence": 3,
      "dialecticDepth": 1,
      "dialecticMaxChars": 600,
      "contextCadence": 1,
      "messageMaxChars": 25000,
      "saveMessages": true
    },
    "hermes.coder": {
      "enabled": true,
      "aiPeer": "coder",
      "workspace": "hermes",
      "peerName": "eri",
      "recallMode": "tools",
      "observation": {
        "user": { "observeMe": true, "observeOthers": false },
        "ai": { "observeMe": true, "observeOthers": true }
      }
    },
    "hermes.writer": {
      "enabled": true,
      "aiPeer": "writer",
      "workspace": "hermes",
      "peerName": "eri"
    }
  },
  "sessions": {
    "/home/user/myproject": "myproject-main"
  }
}
```

</details>

参见[配置参考](https://github.com/hermes-ai/hermes-agent/blob/main/plugins/memory/honcho/README.md)和 [Honcho 集成指南](https://docs.honcho.dev/v3/guides/integrations/hermes)。


---

### OpenViking

火山引擎（字节跳动）的上下文数据库，具有文件系统风格的知识层次结构、分层检索和自动记忆提取（6 个类别）。

| | |
|---|---|
| **最适合** | 需要结构化浏览的自托管知识管理 |
| **需要** | `pip install openviking` + 运行中的服务器 |
| **数据存储** | 自托管（本地或云） |
| **费用** | 免费（开源，AGPL-3.0） |

**工具：** `viking_search`（语义搜索）、`viking_read`（分层：摘要/概述/全文）、`viking_browse`（文件系统导航）、`viking_remember`（存储事实）、`viking_add_resource`（导入 URL/文档）

**设置：**
```bash
# 先启动 OpenViking 服务器
pip install openviking
openviking-server

# 然后配置 Hermes
hermes memory setup    # 选择 "openviking"
# 或手动：
hermes config set memory.provider openviking
echo "OPENVIKING_ENDPOINT=http://localhost:1933" >> ~/.hermes/.env
```

**核心特性：**
- 分层上下文加载：L0（~100 Token）→ L1（~2k）→ L2（全文）
- 会话提交时自动记忆提取（Profile、偏好、实体、事件、案例、模式）
- `viking://` URI 方案用于层次化知识浏览

---

### Mem0

服务端 LLM 事实提取，具有语义搜索、重排序和自动去重。

| | |
|---|---|
| **最适合** | 免动手记忆管理 — Mem0 自动处理提取 |
| **需要** | `pip install mem0ai` + API Key |
| **数据存储** | Mem0 Cloud |
| **费用** | Mem0 定价 |

**工具：** `mem0_profile`（所有存储的记忆）、`mem0_search`（语义搜索 + 重排序）、`mem0_conclude`（存储原始事实）

**设置：**
```bash
hermes memory setup    # 选择 "mem0"
# 或手动：
hermes config set memory.provider mem0
echo "MEM0_API_KEY=your-key" >> ~/.hermes/.env
```

**配置：** `$HERMES_HOME/mem0.json`

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `user_id` | `hermes-user` | 用户标识符 |
| `agent_id` | `hermes` | Agent 标识符 |

---

### Hindsight

具有知识图谱、实体解析和多策略检索的长期记忆。`hindsight_reflect` 工具提供其他提供者所没有的跨记忆综合能力。自动保留完整对话轮次（包括工具调用），具有会话级文档跟踪。

| | |
|---|---|
| **最适合** | 需要实体关系的知识图谱式召回 |
| **需要** | 云：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 的 API Key。本地：LLM API Key（OpenAI、Groq、OpenRouter 等） |
| **数据存储** | Hindsight Cloud 或本地嵌入式 PostgreSQL |
| **费用** | Hindsight 定价（云）或免费（本地） |

**工具：** `hindsight_retain`（带实体提取存储）、`hindsight_recall`（多策略搜索）、`hindsight_reflect`（跨记忆综合）

**设置：**
```bash
hermes memory setup    # 选择 "hindsight"
# 或手动：
hermes config set memory.provider hindsight
echo "HINDSIGHT_API_KEY=your-key" >> ~/.hermes/.env
```

设置向导会自动安装依赖，并只安装所选模式所需的（云模式 `hindsight-client`，本地模式 `hindsight-all`）。需要 `hindsight-client >= 0.4.22`（如果过时会在会话启动时自动升级）。

**本地模式 UI：** `hindsight-embed -p hermes ui start`

**配置：** `$HERMES_HOME/hindsight/config.json`

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `mode` | `cloud` | `cloud` 或 `local` |
| `bank_id` | `hermes` | 记忆库标识符 |
| `recall_budget` | `mid` | 召回彻底度：`low` / `mid` / `high` |
| `memory_mode` | `hybrid` | `hybrid`（上下文 + 工具）、`context`（仅自动注入）、`tools`（仅工具） |
| `auto_retain` | `true` | 自动保留对话轮次 |
| `auto_recall` | `true` | 每轮之前自动召回记忆 |
| `retain_async` | `true` | 在服务器上异步处理保留 |
| `retain_context` | `conversation between Hermes Agent and the User` | 保留记忆的上下文标签 |
| `retain_tags` | — | 应用于保留记忆的默认标签；与每次调用的工具标签合并 |
| `retain_source` | — | 附加到保留记忆的可选 `metadata.source` |
| `retain_user_prefix` | `User` | 自动保留转录中用户轮次使用的标签 |
| `retain_assistant_prefix` | `Assistant` | 自动保留转录中助手轮次使用的标签 |
| `recall_tags` | — | 召回时过滤的标签 |

完整配置参考参见[插件 README](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/hindsight/README.md)。

---

### Holographic

本地 SQLite 事实存储，具有 FTS5 全文搜索、信任评分和 HRR（Holographic Reduced Representations，全息降维表示）用于组合代数查询。

| | |
|---|---|
| **最适合** | 需要高级检索的纯本地记忆，无外部依赖 |
| **需要** | 无（SQLite 始终可用）。NumPy 为 HRR 代数的可选依赖。 |
| **数据存储** | 本地 SQLite |
| **费用** | 免费 |

**工具：** `fact_store`（9 个操作：add、search、probe、related、reason、contradict、update、remove、list）、`fact_feedback`（有用/无用评分，训练信任分数）

**设置：**
```bash
hermes memory setup    # 选择 "holographic"
# 或手动：
hermes config set memory.provider holographic
```

**配置：** `config.yaml` 中的 `plugins.hermes-memory-store`

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `db_path` | `$HERMES_HOME/memory_store.db` | SQLite 数据库路径 |
| `auto_extract` | `false` | 会话结束时自动提取事实 |
| `default_trust` | `0.5` | 默认信任分数（0.0-1.0） |

**独有能力：**
- `probe` — 实体特定代数召回（关于某人/某物的所有事实）
- `reason` — 跨多个实体的组合 AND 查询
- `contradict` — 自动检测冲突事实
- 信任评分，非对称反馈（+0.05 有用 / -0.10 无用）

---

### RetainDB

云端记忆 API，具有混合搜索（向量 + BM25 + 重排序）、7 种记忆类型和增量压缩。

| | |
|---|---|
| **最适合** | 已在使用 RetainDB 基础设施的团队 |
| **需要** | RetainDB 账户 + API Key |
| **数据存储** | RetainDB Cloud |
| **费用** | $20/月 |

**工具：** `retaindb_profile`（用户档案）、`retaindb_search`（语义搜索）、`retaindb_context`（任务相关上下文）、`retaindb_remember`（带类型 + 重要性存储）、`retaindb_forget`（删除记忆）

**设置：**
```bash
hermes memory setup    # 选择 "retaindb"
# 或手动：
hermes config set memory.provider retaindb
echo "RETAINDB_API_KEY=your-key" >> ~/.hermes/.env
```

---

### ByteRover

通过 `brv` CLI 实现持久记忆 — 层次化知识树，具有分层检索（模糊文本 → LLM 驱动搜索）。本地优先，可选云同步。

| | |
|---|---|
| **最适合** | 想要便携、本地优先记忆和 CLI 的开发者 |
| **需要** | ByteRover CLI（`npm install -g byterover-cli` 或[安装脚本](https://byterover.dev)） |
| **数据存储** | 本地（默认）或 ByteRover Cloud（可选同步） |
| **费用** | 免费（本地）或 ByteRover 定价（云） |

**工具：** `brv_query`（搜索知识树）、`brv_curate`（存储事实/决策/模式）、`brv_status`（CLI 版本 + 树统计）

**设置：**
```bash
# 先安装 CLI
curl -fsSL https://byterover.dev/install.sh | sh

# 然后配置 Hermes
hermes memory setup    # 选择 "byterover"
# 或手动：
hermes config set memory.provider byterover
```

**核心特性：**
- 自动预压缩提取（在上下文压缩丢弃之前保存洞察）
- 知识树存储在 `$HERMES_HOME/byterover/`（按 Profile 范围）
- SOC2 Type II 认证云同步（可选）

---

### Supermemory

语义长期记忆，具有 Profile 召回、语义搜索、显式记忆工具和通过 Supermemory 图 API 的会话结束对话导入。

| | |
|---|---|
| **最适合** | 需要用户画像和会话级图构建的语义召回 |
| **需要** | `pip install supermemory` + [API Key](https://supermemory.ai) |
| **数据存储** | Supermemory Cloud |
| **费用** | Supermemory 定价 |

**工具：** `supermemory_store`（保存显式记忆）、`supermemory_search`（语义相似搜索）、`supermemory_forget`（按 ID 或最佳匹配查询遗忘）、`supermemory_profile`（持久档案 + 近期上下文）

**设置：**
```bash
hermes memory setup    # 选择 "supermemory"
# 或手动：
hermes config set memory.provider supermemory
echo 'SUPERMEMORY_API_KEY=***' >> ~/.hermes/.env
```

**配置：** `$HERMES_HOME/supermemory.json`

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `container_tag` | `hermes` | 用于搜索和写入的容器标签。支持 `{identity}` 模板实现 Profile 范围标签。 |
| `auto_recall` | `true` | 在轮次之前注入相关记忆上下文 |
| `auto_capture` | `true` | 每次响应后存储清理后的用户-助手轮次 |
| `max_recall_results` | `10` | 格式化到上下文中的最大召回项数 |
| `profile_frequency` | `50` | 在第一轮和每 N 轮包含档案事实 |
| `capture_mode` | `all` | 默认跳过微小或琐碎的轮次 |
| `search_mode` | `hybrid` | 搜索模式：`hybrid`、`memories` 或 `documents` |
| `api_timeout` | `5.0` | SDK 和导入请求超时 |

**环境变量：** `SUPERMEMORY_API_KEY`（必需）、`SUPERMEMORY_CONTAINER_TAG`（覆盖配置）。

**核心特性：**
- 自动上下文围栏 — 从捕获的轮次中剥离召回的记忆，防止递归记忆污染
- 会话结束对话导入，用于更丰富的图级知识构建
- 档案事实在第一轮和可配置间隔注入
- 琐碎消息过滤（跳过 "ok"、"thanks" 等）
- **Profile 范围容器** — 在 `container_tag` 中使用 `{identity}`（如 `hermes-{identity}` → `hermes-coder`）以隔离每个 Hermes Profile 的记忆
- **多容器模式** — 启用 `enable_custom_container_tags` 并配置 `custom_containers` 列表，让 Agent 跨命名容器读/写。自动操作（同步、预取）保持在主容器上。

<details>
<summary>多容器示例</summary>

```json
{
  "container_tag": "hermes",
  "enable_custom_container_tags": true,
  "custom_containers": ["project-alpha", "shared-knowledge"],
  "custom_container_instructions": "使用 project-alpha 存储编码上下文。"
}
```

</details>

**支持：** [Discord](https://supermemory.link/discord) · [support@supermemory.com](mailto:support@supermemory.com)

---

## 提供者对比

| 提供者 | 存储 | 费用 | 工具数 | 依赖 | 独特功能 |
|----------|---------|------|-------|-------------|----------------|
| **Honcho** | 云 | 付费 | 5 | `honcho-ai` | 辩证用户建模 + 会话范围上下文 |
| **OpenViking** | 自托管 | 免费 | 5 | `openviking` + 服务器 | 文件系统层次 + 分层加载 |
| **Mem0** | 云 | 付费 | 3 | `mem0ai` | 服务端 LLM 提取 |
| **Hindsight** | 云/本地 | 免费/付费 | 3 | `hindsight-client` | 知识图谱 + reflect 综合 |
| **Holographic** | 本地 | 免费 | 2 | 无 | HRR 代数 + 信任评分 |
| **RetainDB** | 云 | $20/月 | 5 | `requests` | 增量压缩 |
| **ByteRover** | 本地/云 | 免费/付费 | 3 | `brv` CLI | 预压缩提取 |
| **Supermemory** | 云 | 付费 | 4 | `supermemory` | 上下文围栏 + 会话图导入 + 多容器 |

## Profile 隔离

每个提供者的数据按 [Profile](/docs/user-guide/profiles) 隔离：

- **本地存储提供者**（Holographic、ByteRover）使用 `$HERMES_HOME/` 路径，每个 Profile 不同
- **配置文件提供者**（Honcho、Mem0、Hindsight、Supermemory）将配置存储在 `$HERMES_HOME/`，每个 Profile 有自己的凭据
- **云提供者**（RetainDB）自动派生 Profile 范围的项目名称
- **环境变量提供者**（OpenViking）通过每个 Profile 的 `.env` 文件配置

## 构建记忆提供者

参见[开发者指南：记忆提供者插件](/docs/developer-guide/memory-provider-plugin)了解如何创建自己的提供者。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/features/memory-providers)
