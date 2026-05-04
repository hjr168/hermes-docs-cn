---
sidebar_position: 9
title: "可选 Skill 目录"
description: "hermes-agent 官方可选 Skill — 通过 hermes skills install official/<category>/<skill> 安装"
---

# 可选 Skill 目录

官方可选 Skill（技能）随 hermes-agent 仓库一起发布，位于 `optional-skills/` 目录下，但**默认不启用**。需要显式安装：

```bash
hermes skills install official/<category>/<skill>
```

例如：

```bash
hermes skills install official/blockchain/solana
hermes skills install official/mlops/flash-attention
```

安装后，该 Skill 会出现在 Agent 的 Skill 列表中，并在检测到相关任务时自动加载。

卸载方式：

```bash
hermes skills uninstall <skill-name>
```

---

## 自主 AI Agent

| Skill | 描述 |
|-------|------|
| **blackbox** | 将编码任务委托给 Blackbox AI CLI Agent。多模型 Agent，内置评审器，通过多个 LLM 运行任务并选择最佳结果。 |
| **honcho** | 配置并使用 Honcho 记忆系统与 Hermes 集成 — 支持跨会话用户建模、多配置文件隔离、观测配置和辩证推理。 |

## 区块链

| Skill | 描述 |
|-------|------|
| **base** | 查询 Base（以太坊 L2）区块链数据及 USD 定价 — 钱包余额、代币信息、交易详情、Gas 分析、合约检查、巨鲸检测和实时网络状态。无需 API 密钥。 |
| **solana** | 查询 Solana 区块链数据及 USD 定价 — 钱包余额、代币组合、交易详情、NFT、巨鲸检测和实时网络状态。无需 API 密钥。 |

## 沟通

| Skill | 描述 |
|-------|------|
| **one-three-one-rule** | 结构化沟通框架，用于提案和决策制定。 |

## 创意

| Skill | 描述 |
|-------|------|
| **blender-mcp** | 通过与 blender-mcp 插件的 Socket 连接，直接从 Hermes 控制 Blender。创建 3D 对象、材质、动画，并运行任意 Blender Python (bpy) 代码。 |
| **concept-diagrams** | 生成简洁的、支持亮/暗模式的 SVG 图表，以独立 HTML 文件输出，使用统一的可视化语言（9 种语义色彩梯度，自动暗色模式）。适用于物理示意图、化学反应机理、数学曲线、物理对象（飞机、涡轮机、智能手机）、平面图、截面图、生命周期/流程叙事以及中心辐射系统图。内置 15 个示例图表。 |
| **meme-generation** | 通过选择模板并使用 Pillow 叠加文字来生成真实的 Meme 图片。生成实际的 `.png` Meme 文件。 |

## DevOps

| Skill | 描述 |
|-------|------|
| **cli** | 通过 inference.sh CLI (infsh) 运行 150+ AI 应用 — 图像生成、视频创建、LLM、搜索、3D 和社交自动化。 |
| **docker-management** | 管理 Docker 容器、镜像、卷、网络和 Compose 编排 — 生命周期操作、调试、清理和 Dockerfile 优化。 |

## 邮件

| Skill | 描述 |
|-------|------|
| **agentmail** | 通过 AgentMail 为 Agent 提供专属邮箱。使用 Agent 拥有的邮箱地址自主发送、接收和管理邮件。 |

## 健康

| Skill | 描述 |
|-------|------|
| **fitness-nutrition** | 健身训练计划和营养追踪器。通过 wger 按肌肉、器械或类别搜索 690+ 种训练动作。通过 USDA FoodData Central 查询 380,000+ 种食物的宏量营养素和热量。计算 BMI、TDEE、单次最大重量、宏量营养素分配和体脂率 — 纯 Python 实现，无需 pip 安装。 |
| **neuroskill-bci** | 脑机接口 (BCI) 集成，用于神经科学研究工作流。 |

## MCP

| Skill | 描述 |
|-------|------|
| **fastmcp** | 使用 Python 中的 FastMCP 构建、测试、检查、安装和部署 MCP 服务器。涵盖将 API 或数据库封装为 MCP 工具、暴露资源或提示、以及部署。 |

## 迁移

| Skill | 描述 |
|-------|------|
| **openclaw-migration** | 将用户的 OpenClaw 自定义配置迁移到 Hermes Agent。导入记忆、SOUL.md、命令允许列表、用户 Skill 和选定的工作区资产。 |

## MLOps

最大的可选类别 — 覆盖从数据整理到生产推理的完整 ML 流水线。

| Skill | 描述 |
|-------|------|
| **accelerate** | 最简单的分布式训练 API。只需 4 行代码即可为任何 PyTorch 脚本添加分布式支持。统一支持 DeepSpeed/FSDP/Megatron/DDP 的 API。 |
| **chroma** | 开源嵌入数据库。存储嵌入向量和元数据，执行向量搜索和全文搜索。简洁的 4 函数 API，适用于 RAG 和语义搜索。 |
| **faiss** | Facebook 开发的高效稠密向量相似度搜索和聚类库。支持数十亿级向量、GPU 加速以及多种索引类型（Flat、IVF、HNSW）。 |
| **flash-attention** | 使用 Flash Attention 优化 Transformer 注意力机制，实现 2-4 倍加速和 10-20 倍内存缩减。支持 PyTorch SDPA、flash-attn 库、H100 FP8 和滑动窗口。 |
| **guidance** | 使用正则表达式和语法控制 LLM 输出，保证生成有效的 JSON/XML/代码，强制结构化格式，并使用 Guidance（Microsoft Research 的约束生成框架）构建多步工作流。 |
| **hermes-atropos-environments** | 构建、测试和调试用于 Atropos 训练的 Hermes Agent RL 环境。涵盖 HermesAgentBaseEnv 接口、奖励函数、Agent 循环集成和评估。 |
| **huggingface-tokenizers** | 基于 Rust 的快速分词器，适用于研究和生产。不到 20 秒即可完成 1GB 文本的分词。支持 BPE、WordPiece 和 Unigram 算法。 |
| **instructor** | 使用 Pydantic 验证从 LLM 响应中提取结构化数据，自动重试失败的提取，并流式传输部分结果。 |
| **lambda-labs** | 用于 ML 训练和推理的预留及按需 GPU 云实例。支持 SSH 访问、持久文件系统和多节点集群。 |
| **llava** | 大型语言和视觉助手 — 结合 CLIP 视觉与 LLaMA 语言模型的视觉指令微调和基于图像的对话。 |
| **nemo-curator** | GPU 加速的 LLM 训练数据整理。模糊去重（快 16 倍）、质量过滤（30+ 启发式规则）、语义去重、PII 脱敏。基于 RAPIDS 扩展。 |
| **pinecone** | 面向生产 AI 的托管向量数据库。自动扩缩容、混合搜索（稠密 + 稀疏）、元数据过滤，低延迟（p95 低于 100ms）。 |
| **pytorch-lightning** | 高级 PyTorch 框架，提供 Trainer 类、自动分布式训练（DDP/FSDP/DeepSpeed）、回调机制和最小化样板代码。 |
| **qdrant** | 高性能向量相似度搜索引擎。基于 Rust 驱动，支持快速最近邻搜索、带过滤的混合搜索和可扩展的向量存储。 |
| **saelens** | 使用 SAELens 训练和分析稀疏自编码器 (SAE)，将神经网络激活分解为可解释的特征。 |
| **simpo** | 简单偏好优化 — DPO 的无参考模型替代方案，性能更优（在 AlpacaEval 2.0 上提升 6.4 分）。无需参考模型。 |
| **slime** | 使用 Megatron+SGLang 框架进行 LLM 后训练中的强化学习。自定义数据生成工作流和紧密的 Megatron-LM 集成，用于 RL 扩展。 |
| **tensorrt-llm** | 使用 NVIDIA TensorRT 优化 LLM 推理以获得最大吞吐量。在 A100/H100 上比 PyTorch 快 10-100 倍，支持量化（FP8/INT4）和连续批处理。 |
| **torchtitan** | PyTorch 原生分布式 LLM 预训练，支持 4D 并行（FSDP2、TP、PP、CP）。使用 Float8 和 torch.compile 从 8 个 GPU 扩展到 512+ 个 GPU。 |

## 生产力

| Skill | 描述 |
|-------|------|
| **canvas** | Canvas LMS 集成 — 使用 API Token 认证获取已注册课程和作业。 |
| **memento-flashcards** | 间隔重复记忆卡片系统，用于学习和知识巩固。 |
| **siyuan** | 思源笔记 API — 在自托管知识库中搜索、阅读、创建和管理块与文档。 |
| **telephony** | 为 Hermes 赋予电话能力 — 配置 Twilio 号码、发送/接收 SMS/MMS、拨打电话，以及通过 Bland.ai 或 Vapi 发起 AI 驱动的外呼。 |

## 研究

| Skill | 描述 |
|-------|------|
| **bioinformatics** | bioSkills 和 ClawBio 提供的 400+ 生物信息学 Skill 入口。涵盖基因组学、转录组学、单细胞分析、变异检测、药物基因组学、宏基因组学和结构生物学。 |
| **domain-intel** | 使用 Python 标准库进行被动域名侦察。子域名发现、SSL 证书检查、WHOIS 查询、DNS 记录和批量多域名分析。无需 API 密钥。 |
| **duckduckgo-search** | 通过 DuckDuckGo 免费搜索网页 — 文本、新闻、图片、视频。无需 API 密钥。 |
| **gitnexus-explorer** | 使用 GitNexus 索引代码库，并通过 Web UI 和 Cloudflare 隧道提供交互式知识图谱服务。 |
| **parallel-cli** | Parallel CLI 供应商 Skill — Agent 原生网页搜索、提取、深度研究、数据增强和监控。 |
| **qmd** | 使用 qmd 本地搜索个人知识库、笔记、文档和会议记录 — 混合检索引擎，结合 BM25、向量搜索和 LLM 重排序。 |
| **scrapling** | 使用 Scrapling 进行网页抓取 — HTTP 获取、隐身浏览器自动化、Cloudflare 绕过以及通过 CLI 和 Python 进行爬虫抓取。 |

## 安全

| Skill | 描述 |
|-------|------|
| **1password** | 设置和使用 1Password CLI (op)。安装 CLI、启用桌面应用集成、登录，以及为命令读取/注入密钥。 |
| **oss-forensics** | 开源软件取证 — 分析软件包、依赖项和供应链风险。 |
| **sherlock** | OSINT 用户名搜索，覆盖 400+ 社交网络。通过用户名追踪社交媒体账户。 |

---

## 贡献可选 Skill

要向仓库添加新的可选 Skill：

1. 在 `optional-skills/<category>/<skill-name>/` 下创建目录
2. 添加包含标准 frontmatter（name、description、version、author）的 `SKILL.md` 文件
3. 在 `references/`、`templates/` 或 `scripts/` 子目录中包含所需的支撑文件
4. 提交 Pull Request — Skill 合并后将自动出现在本目录中

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/optional-skills-catalog)
