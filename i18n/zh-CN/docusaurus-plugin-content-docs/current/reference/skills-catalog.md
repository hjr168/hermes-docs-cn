---
sidebar_position: 5
title: "内置 Skill 目录"
description: "Hermes Agent 内置 Skill 清单"
---

# 内置 Skill 目录

Hermes 安装时会将大量内置 Skill（技能）库复制到 `~/.hermes/skills/` 目录。本页面收录了仓库中 `skills/` 目录下的所有内置 Skill。

## apple

Apple/macOS 专用 Skill — iMessage、提醒事项、备忘录、查找（FindMy）以及 macOS 自动化。这些 Skill 仅在 macOS 系统上加载。

| Skill | 描述 | 路径 |
|-------|------|------|
| `apple-notes` | 通过 macOS 上的 memo CLI 管理 Apple 备忘录（创建、查看、搜索、编辑）。 | `apple/apple-notes` |
| `apple-reminders` | 通过 remindctl CLI 管理 Apple 提醒事项（列出、添加、完成、删除）。 | `apple/apple-reminders` |
| `findmy` | 在 macOS 上通过 AppleScript 和屏幕截图使用"查找"App 追踪 Apple 设备和 AirTag。 | `apple/findmy` |
| `imessage` | 在 macOS 上通过 imsg CLI 发送和接收 iMessage/SMS。 | `apple/imessage` |

## autonomous-ai-agents

用于生成和协调自主 AI 编程 Agent（智能体）及多 Agent 工作流的 Skill — 运行独立的 Agent 进程、委派任务、协调并行工作流。

| Skill | 描述 | 路径 |
|-------|------|------|
| `claude-code` | 将编码任务委派给 Claude Code（Anthropic 的 CLI Agent）。适用于构建功能、重构、PR 审查和迭代编码。需要安装 claude CLI。 | `autonomous-ai-agents/claude-code` |
| `codex` | 将编码任务委派给 OpenAI Codex CLI Agent。适用于构建功能、重构、PR 审查和批量问题修复。需要 codex CLI 和 git 仓库。 | `autonomous-ai-agents/codex` |
| `hermes-agent` | 使用和扩展 Hermes Agent 的完整指南 — CLI 使用、设置、配置、生成额外 Agent、网关平台、Skill、语音、工具、配置文件和简洁的贡献者参考。在帮助用户配置 Hermes、排查问题时加载此 Skill…… | `autonomous-ai-agents/hermes-agent` |
| `opencode` | 将编码任务委派给 OpenCode CLI Agent，用于功能实现、重构、PR 审查和长时间运行的自主会话。需要安装 opencode CLI 并完成认证。 | `autonomous-ai-agents/opencode` |

## creative

创意内容生成 — ASCII 艺术、手绘风格图表、动画、音乐和视觉设计工具。

| Skill | 描述 | 路径 |
|-------|------|------|
| `architecture-diagram` | 生成深色主题的软件系统和云基础设施 SVG 图表，输出为包含内联 SVG 图形的独立 HTML 文件。语义化组件颜色（青色=前端、翡翠色=后端、紫色=数据库、琥珀色=云/AWS、玫瑰色=安全、橙色=消息总线），JetBrains Mono 字体…… | `creative/architecture-diagram` |
| `ascii-art` | 使用 pyfiglet（571 种字体）、cowsay、boxes、toilet、图片转 ASCII、远程 API（asciified、ascii.co.uk）和 LLM 回退生成 ASCII 艺术。无需 API 密钥。 | `creative/ascii-art` |
| `ascii-video` | ASCII 艺术视频制作流水线 — 支持任何格式。将视频/音频/图片/生成式输入转换为彩色 ASCII 字符视频输出（MP4、GIF、图片序列）。涵盖：视频转 ASCII、音频响应式音乐可视化器、生成式 ASCII 艺术动画、混合…… | `creative/ascii-video` |
| `excalidraw` | 使用 Excalidraw JSON 格式创建手绘风格图表。生成 .excalidraw 文件，用于架构图、流程图、时序图、概念图等。文件可在 excalidraw.com 打开或上传获取分享链接。 | `creative/excalidraw` |
| `ideation` | 通过创意约束生成项目想法。当用户说"我想做点什么"、"给我个项目想法"、"我好无聊"、"我该做什么"、"给我点灵感"或任何"有工具没方向"的变体时使用。适用于代码、艺术、硬件、写作、工具…… | `creative/creative-ideation` |
| `manim-video` | 使用 Manim Community Edition 的数学和技术动画制作流水线。创建 3Blue1Brown 风格的解说视频、算法可视化、公式推导、架构图和数据故事。当用户请求：动画解说、数学…… | `creative/manim-video` |
| `p5js` | 使用 p5.js 的交互式和生成式视觉艺术制作流水线。创建基于浏览器的素描、生成艺术、数据可视化、交互体验、3D 场景、音频响应视觉和动态图形 — 导出为 HTML、PNG、GIF、MP4 或 SVG。涵盖：2D…… | `creative/p5js` |
| `popular-web-designs` | 从真实网站提取的 54 套生产级设计系统。加载模板即可生成与 Stripe、Linear、Vercel、Notion、Airbnb 等网站视觉风格一致的 HTML/CSS。每个模板包含颜色、排版、组件、布局规则和实际…… | `creative/popular-web-designs` |
| `songwriting-and-ai-music` | 词曲创作技巧、AI 音乐生成提示词（以 Suno 为主）、改编技巧、语音技巧和经验总结。这些是工具和想法，不是规则。当艺术需要时，随时可以打破它们。 | `creative/songwriting-and-ai-music` |

## data-science

数据科学工作流 Skill — 交互式探索、Jupyter 笔记本、数据分析和可视化。

| Skill | 描述 | 路径 |
|-------|------|------|
| `jupyter-live-kernel` | 使用实时 Jupyter 内核通过 hamelnb 进行有状态的迭代式 Python 执行。当任务涉及探索、迭代或检查中间结果时加载此 Skill — 数据科学、ML 实验开发、API 探索或逐步构建复杂代码。使用…… | `data-science/jupyter-live-kernel` |

## devops

DevOps（开发运维）和基础设施自动化 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `webhook-subscriptions` | 创建和管理 Webhook 订阅，用于事件驱动的 Agent 激活。当用户希望外部服务自动触发 Agent 运行时使用。 | `devops/webhook-subscriptions` |

## dogfood

用于测试 Hermes Agent 本身的内部测试和 QA（质量保证）Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `dogfood` | 系统化的探索性 QA 测试 Web 应用 — 发现 Bug、收集证据并生成结构化报告。 | `dogfood` |

## email

用于在终端发送、接收、搜索和管理电子邮件的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `himalaya` | 通过 IMAP/SMTP 管理电子邮件的 CLI 工具。使用 himalaya 在终端列出、阅读、撰写、回复、转发、搜索和整理邮件。支持多账户和使用 MML（MIME Meta Language）撰写邮件。 | `email/himalaya` |

## gaming

用于设置、配置和管理游戏服务器、模组包和游戏相关基础设施的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `minecraft-modpack-server` | 从 CurseForge/Modrinth 服务器整合包 zip 文件搭建模组 Minecraft 服务器。涵盖 NeoForge/Forge 安装、Java 版本、JVM 调优、防火墙、局域网配置、备份和启动脚本。 | `gaming/minecraft-modpack-server` |
| `pokemon-player` | 通过无头模拟器自主游玩 Pokemon 游戏。启动游戏服务器，从内存读取结构化游戏状态，做出策略决策并发送按键输入 — 全部在终端完成。 | `gaming/pokemon-player` |

## github

GitHub 工作流 Skill，用于管理仓库、Pull Request、代码审查、Issue 和 CI/CD 流水线。

| Skill | 描述 | 路径 |
|-------|------|------|
| `codebase-inspection` | 使用 pygount 检查和分析代码库，统计代码行数、语言构成和代码与注释比例。当被要求检查代码行数、仓库大小、语言组成或代码库统计时使用。 | `github/codebase-inspection` |
| `github-auth` | 使用 git（通用可用）或 gh CLI 为 Agent 设置 GitHub 认证。涵盖 HTTPS 令牌、SSH 密钥、凭证助手和 gh auth — 具有自动检测流程以选择正确的方法。 | `github/github-auth` |
| `github-code-review` | 通过分析 git diff、在 PR 上留下行内评论来审查代码变更，进行彻底的推送前审查。使用 gh CLI 或回退到 git + GitHub REST API 通过 curl 操作。 | `github/github-code-review` |
| `github-issues` | 创建、管理、分类和关闭 GitHub Issue。搜索现有 Issue、添加标签、分配人员并关联到 PR。使用 gh CLI 或回退到 git + GitHub REST API 通过 curl 操作。 | `github/github-issues` |
| `github-pr-workflow` | 完整的 Pull Request 生命周期 — 创建分支、提交变更、发起 PR、监控 CI 状态、自动修复失败并合并。使用 gh CLI 或回退到 git + GitHub REST API 通过 curl 操作。 | `github/github-pr-workflow` |
| `github-repo-management` | 克隆、创建、派生、配置和管理 GitHub 仓库。管理远程仓库、密钥、Release 和工作流。使用 gh CLI 或回退到 git + GitHub REST API 通过 curl 操作。 | `github/github-repo-management` |

## leisure

用于发现和日常任务的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `find-nearby` | 使用 OpenStreetMap 查找附近的地点（餐厅、咖啡馆、酒吧、药房等）。支持坐标、地址、城市、邮编或 Telegram 位置分享。无需 API 密钥。 | `leisure/find-nearby` |

## mcp

用于操作 MCP（Model Context Protocol，模型上下文协议）服务器、工具和集成的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `mcporter` | 使用 mcporter CLI 列出、配置、认证和调用 MCP 服务器/工具（HTTP 或 stdio），包括临时服务器、配置编辑和 CLI/类型生成。 | `mcp/mcporter` |
| `native-mcp` | 内置 MCP（Model Context Protocol）客户端，连接外部 MCP 服务器、发现其工具并注册为 Hermes Agent 原生工具。支持 stdio 和 HTTP 传输，具有自动重连、安全过滤和零配置工具注入。 | `mcp/native-mcp` |

## media

用于处理媒体内容的 Skill — YouTube 字幕、GIF 搜索、音乐生成和音频可视化。

| Skill | 描述 | 路径 |
|-------|------|------|
| `gif-search` | 使用 curl 从 Tenor 搜索和下载 GIF。除 curl 和 jq 外无其他依赖。适用于查找表情 GIF、创建视觉内容和在聊天中发送 GIF。 | `media/gif-search` |
| `heartmula` | 设置和运行 HeartMuLa，开源音乐生成模型系列（类 Suno）。从歌词 + 标签生成完整歌曲，支持多语言。 | `media/heartmula` |
| `songsee` | 通过 CLI 从音频文件生成频谱图和音频特征可视化（mel、chroma、MFCC、tempogram 等）。适用于音频分析、音乐制作调试和可视化文档。 | `media/songsee` |
| `youtube-content` | 获取 YouTube 视频字幕并将其转换为结构化内容（章节、摘要、推文串、博客文章）。当用户分享 YouTube URL 或视频链接、要求总结视频、请求字幕或想从任何 YouTube 视频提取和重新格式化内容时使用…… | `media/youtube-content` |

## mlops

通用 ML（机器学习）运维工具 — 模型中心管理、数据集操作和工作流编排。

| Skill | 描述 | 路径 |
|-------|------|------|
| `huggingface-hub` | Hugging Face Hub CLI（hf）— 搜索、下载和上传模型及数据集，管理仓库，使用 SQL 查询数据集，部署推理端点，管理 Spaces 和存储桶。 | `mlops/huggingface-hub` |

## mlops/cloud

GPU 云服务商和用于 ML 工作负载的无服务器计算平台。

| Skill | 描述 | 路径 |
|-------|------|------|
| `modal-serverless-gpu` | 用于运行 ML 工作负载的无服务器 GPU 云平台。当需要按需 GPU 访问而无需基础设施管理、将 ML 模型部署为 API 或运行具有自动扩展的批处理任务时使用。 | `mlops/cloud/modal` |

## mlops/evaluation

模型评估基准、实验追踪和可解释性工具。

| Skill | 描述 | 路径 |
|-------|------|------|
| `evaluating-llms-harness` | 跨 60+ 学术基准（MMLU、HumanEval、GSM8K、TruthfulQA、HellaSwag）评估 LLM。当需要基准测试模型质量、比较模型、报告学术结果或追踪训练进度时使用。EleutherAI、HuggingFace 和各大实验室使用的行业标准…… | `mlops/evaluation/lm-evaluation-harness` |
| `weights-and-biases` | 使用 W&B 追踪 ML 实验，支持自动日志记录、实时训练可视化、超参数扫描优化和模型注册表管理 — 协作式 MLOps 平台。 | `mlops/evaluation/weights-and-biases` |

## mlops/inference

模型服务、量化（GGUF/GPTQ）、结构化输出、推理优化和模型手术工具，用于部署和运行 LLM。

| Skill | 描述 | 路径 |
|-------|------|------|
| `llama-cpp` | 使用 llama.cpp 在 CPU、Apple Silicon、AMD/Intel GPU 或 NVIDIA 上运行 LLM 推理 — 以及 GGUF 模型转换和量化（2-8 位，支持 K-quant 和 imatrix）。涵盖 CLI、Python 绑定、OpenAI 兼容服务器和 Ollama/LM Studio 集成。用于边缘部署…… | `mlops/inference/llama-cpp` |
| `obliteratus` | 使用 OBLITERATUS 从开源 LLM 中移除拒绝行为 — 机制可解释性技术（差值均值、SVD、白化 SVD、LEACE、SAE 分解等）来剔除安全护栏同时保留推理能力。9 种 CLI 方法、28 个分析模块、116 个模型预设…… | `mlops/inference/obliteratus` |
| `outlines` | 在生成过程中保证有效的 JSON/XML/代码结构，使用 Pydantic 模型实现类型安全输出，支持本地模型（Transformers、vLLM），并通过 Outlines（dottxt.ai 的结构化生成库）最大化推理速度。 | `mlops/inference/outlines` |
| `serving-llms-vllm` | 使用 vLLM 的 PagedAttention 和连续批处理提供高吞吐量的 LLM 服务。当部署生产级 LLM API、优化推理延迟/吞吐量或在有限 GPU 内存下服务模型时使用。支持 OpenAI 兼容端点、量化（GPTQ/AWQ/FP8）…… | `mlops/inference/vllm` |

## mlops/models

特定模型架构 — 计算机视觉（CLIP、SAM、Stable Diffusion）、语音（Whisper）和音频生成（AudioCraft）。

| Skill | 描述 | 路径 |
|-------|------|------|
| `audiocraft-audio-generation` | 用于音频生成的 PyTorch 库，包括文本转音乐（MusicGen）和文本转音效（AudioGen）。当需要从文本描述生成音乐、创建音效或执行旋律条件音乐生成时使用。 | `mlops/models/audiocraft` |
| `clip` | OpenAI 的连接视觉与语言的模型。支持零样本图像分类、图文匹配和跨模态检索。在 4 亿图文对上训练。用于图像搜索、内容审核或无需微调的视觉语言任务。最适合通用…… | `mlops/models/clip` |
| `segment-anything-model` | 具有零样本迁移能力的基础图像分割模型。当需要使用点、框或掩码作为提示分割图像中的任何对象，或自动生成图像中所有对象掩码时使用。 | `mlops/models/segment-anything` |
| `stable-diffusion-image-generation` | 通过 HuggingFace Diffusers 使用 Stable Diffusion 模型的先进文本生成图片。当需要从文本提示生成图片、执行图生图转换、图像修复或构建自定义扩散流水线时使用。 | `mlops/models/stable-diffusion` |
| `whisper` | OpenAI 的通用语音识别模型。支持 99 种语言、转录、翻译为英文和语言识别。六种模型大小，从 tiny（3900 万参数）到 large（15.5 亿参数）。用于语音转文字、播客转录或多语言音频处理…… | `mlops/models/whisper` |

## mlops/research

用于使用声明式编程构建和优化 AI 系统的 ML 研究框架。

| Skill | 描述 | 路径 |
|-------|------|------|
| `dspy` | 使用声明式编程构建复杂 AI 系统，自动优化提示词，使用 DSPy（斯坦福 NLP 的系统化 LM 编程框架）创建模块化 RAG（检索增强生成）系统和 Agent。 | `mlops/research/dspy` |

## mlops/training

微调、RLHF/DPO/GRPO 训练、分布式训练框架和优化工具。

| Skill | 描述 | 路径 |
|-------|------|------|
| `axolotl` | 使用 Axolotl 微调 LLM 的专家指南 — YAML 配置、100+ 模型、LoRA/QLoRA、DPO/KTO/ORPO/GRPO、多模态支持。 | `mlops/training/axolotl` |
| `fine-tuning-with-trl` | 使用 TRL 通过强化学习微调 LLM — SFT 用于指令调优、DPO 用于偏好对齐、PPO/GRPO 用于奖励优化和奖励模型训练。当需要 RLHF、根据偏好对齐模型或从人类反馈训练时使用。与 HuggingFace 配合使用…… | `mlops/training/trl-fine-tuning` |
| `peft-fine-tuning` | 使用 LoRA、QLoRA 和 25+ 种方法对 LLM 进行参数高效微调。当需要在有限 GPU 内存下微调大型模型（7B-70B）、训练不到 1% 的参数且精度损失极小，或用于多适配器服务时使用。HuggingFace 官方库…… | `mlops/training/peft` |
| `pytorch-fsdp` | 使用 PyTorch FSDP 进行全分片数据并行训练的专家指南 — 参数分片、混合精度、CPU 卸载、FSDP2。 | `mlops/training/pytorch-fsdp` |
| `unsloth` | 使用 Unsloth 快速微调的专家指南 — 训练速度提升 2-5 倍、内存减少 50-80%、LoRA/QLoRA 优化。 | `mlops/training/unsloth` |

## note-taking

笔记 Skill，用于保存信息、辅助研究和协作进行多会话规划。

| Skill | 描述 | 路径 |
|-------|------|------|
| `obsidian` | 在 Obsidian 库中读取、搜索和创建笔记。 | `note-taking/obsidian` |

## productivity

用于文档创建、演示文稿、电子表格和其他生产力工作流的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `google-workspace` | 为 Hermes 集成 Gmail、日历、云端硬盘、通讯录、表格和文档。使用 Hermes 管理的 OAuth2 设置，优先使用 Google Workspace CLI（`gws`）以获得更广泛的 API 覆盖，否则回退到 Python 客户端库。 | `productivity/google-workspace` |
| `linear` | 通过 GraphQL API 管理 Linear Issue、项目和团队。创建、更新、搜索和整理 Issue。使用 API 密钥认证（无需 OAuth）。所有操作通过 curl 完成 — 无额外依赖。 | `productivity/linear` |
| `nano-pdf` | 使用 nano-pdf CLI 通过自然语言指令编辑 PDF。修改文本、修正拼写错误、更新标题和对特定页面进行内容更改，无需手动编辑。 | `productivity/nano-pdf` |
| `notion` | Notion API，通过 curl 创建和管理页面、数据库和块。直接从终端搜索、创建、更新和查询 Notion 工作区。 | `productivity/notion` |
| `ocr-and-documents` | 从 PDF 和扫描文档中提取文本。远程 URL 使用 web_extract，本地文本型 PDF 使用 pymupdf，OCR/扫描文档使用 marker-pdf。DOCX 使用 python-docx，PPTX 请参阅 powerpoint Skill。 | `productivity/ocr-and-documents` |
| `powerpoint` | 任何时候涉及 .pptx 文件时使用此 Skill — 作为输入、输出或两者兼有。包括：创建幻灯片、演示文稿或 PPT；读取、解析或从任何 .pptx 文件中提取文本（即使提取的内容将用于其他地方，如…… | `productivity/powerpoint` |

## red-teaming

用于 LLM 红队测试（Red Teaming）、越狱和安全过滤器绕过研究的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `godmode` | 使用 G0DM0D3 技术越狱 API 服务的 LLM — Parseltongue 输入混淆（33 种技术）、GODMODE CLASSIC 系统提示模板、ULTRAPLINIAN 多模型竞速、编码升级和 Hermes 原生预填充/系统提示集成。当用户想要绕过…… | `red-teaming/godmode` |

## research

用于学术研究、论文发现、文献综述、市场数据、内容监控和科学知识检索的 Skill。

| Skill | 描述 | 路径 |
|-------|------|------|
| `arxiv` | 使用免费的 REST API 从 arXiv 搜索和检索学术论文。无需 API 密钥。按关键词、作者、类别或 ID 搜索。结合 web_extract 或 ocr-and-documents Skill 阅读完整论文内容。 | `research/arxiv` |
| `blogwatcher` | 使用 blogwatcher-cli 工具监控博客和 RSS/Atom 订阅源的更新。添加博客、扫描新文章、追踪阅读状态和按类别过滤。 | `research/blogwatcher` |
| `llm-wiki` | Karpathy 的 LLM Wiki — 构建和维护一个持久的、相互链接的 Markdown 知识库。导入来源、查询编译后的知识并检查一致性。 | `research/llm-wiki` |
| `polymarket` | 查询 Polymarket 预测市场数据 — 搜索市场、获取价格、订单簿和价格历史。通过公共 REST API 只读访问，无需 API 密钥。 | `research/polymarket` |
| `research-paper-writing` | 撰写 ML/AI 研究论文的端到端流水线 — 从实验设计到分析、起草、修订和提交。涵盖 NeurIPS、ICML、ICLR、ACL、AAAI、COLM。集成自动化实验监控、统计分析、迭代式写作和引用验证…… | `research/research-paper-writing` |

## smart-home

用于控制智能家居设备的 Skill — 灯光、开关、传感器和家庭自动化系统。

| Skill | 描述 | 路径 |
|-------|------|------|
| `openhue` | 通过 OpenHue CLI 控制 Philips Hue 灯光、房间和场景。开关灯、调整亮度、颜色、色温并激活场景。 | `smart-home/openhue` |

## social-media

用于与社交平台交互的 Skill — 发帖、阅读、监控和账号操作。

| Skill | 描述 | 路径 |
|-------|------|------|
| `xitter` | 通过 x-cli 终端客户端使用官方 X API 凭证与 X/Twitter 交互。用于发帖、阅读时间线、搜索推文、点赞、转发、书签、提及和用户查询。 | `social-media/xitter` |

## software-development

通用软件工程 Skill — 规划、审查、调试和测试驱动开发。

| Skill | 描述 | 路径 |
|-------|------|------|
| `plan` | Hermes 的规划模式 — 检查上下文，将 Markdown 计划写入当前工作区的 `.hermes/plans/` 目录，不执行工作。 | `software-development/plan` |
| `requesting-code-review` | 提交前验证流水线 — 静态安全扫描、基线感知质量门禁、独立审查子 Agent 和自动修复循环。在代码变更后、提交、推送或发起 PR 之前使用。 | `software-development/requesting-code-review` |
| `subagent-driven-development` | 当执行包含独立任务的实施计划时使用。为每个任务分派新的 delegate_task，进行两阶段审查（规格合规性然后代码质量）。 | `software-development/subagent-driven-development` |
| `systematic-debugging` | 当遇到任何 Bug、测试失败或意外行为时使用。4 阶段根因调查 — 在理解问题之前不做任何修复。 | `software-development/systematic-debugging` |
| `test-driven-development` | 当实现任何功能或修复 Bug 时，在编写实现代码之前使用。强制执行测试优先的红-绿-重构循环。 | `software-development/test-driven-development` |
| `writing-plans` | 当你有多步骤任务的需求规格或要求时使用。创建包含小粒度任务、精确文件路径和完整代码示例的综合实施计划。 | `software-development/writing-plans` |


---

# 可选 Skill

可选 Skill 随仓库一起发布在 `optional-skills/` 目录下，但**默认不激活**。它们涵盖较重或小众的使用场景。使用以下命令安装：

```bash
hermes skills install official/<category>/<skill>
```

## autonomous-ai-agents

| Skill | 描述 | 路径 |
|-------|------|------|
| `blackbox` | 将编码任务委派给 Blackbox AI CLI Agent。多模型 Agent，内置评判器，通过多个 LLM 运行任务并选择最佳结果。需要 blackbox CLI 和 Blackbox AI API 密钥。 | `autonomous-ai-agents/blackbox` |

## blockchain

| Skill | 描述 | 路径 |
|-------|------|------|
| `base` | 查询 Base（以太坊 L2）区块链数据及美元定价 — 钱包余额、代币信息、交易详情、Gas 分析、合约检查、巨鲸检测和实时网络统计。使用 Base RPC + CoinGecko。无需 API 密钥。 | `blockchain/base` |
| `solana` | 查询 Solana 区块链数据及美元定价 — 钱包余额、代币投资组合及估值、交易详情、NFT、巨鲸检测和实时网络统计。使用 Solana RPC + CoinGecko。无需 API 密钥。 | `blockchain/solana` |

## creative

| Skill | 描述 | 路径 |
|-------|------|------|
| `blender-mcp` | 通过与 blender-mcp 插件的 socket 连接直接从 Hermes 控制 Blender。创建 3D 对象、材质、动画并运行任意 Blender Python（bpy）代码。 | `creative/blender-mcp` |
| `meme-generation` | 通过选择模板并使用 Pillow 叠加文字来生成真正的表情包图片。输出实际的 .png 表情包文件。 | `creative/meme-generation` |

## devops

| Skill | 描述 | 路径 |
|-------|------|------|
| `docker-management` | 管理 Docker 容器、镜像、卷、网络和 Compose 编排 — 生命周期操作、调试、清理和 Dockerfile 优化。 | `devops/docker-management` |

## email

| Skill | 描述 | 路径 |
|-------|------|------|
| `agentmail` | 通过 AgentMail 为 Agent 提供专用电子邮件收件箱。自主发送、接收和管理邮件，使用 Agent 专属邮箱地址（如 hermes-agent@agentmail.to）。 | `email/agentmail` |

## health

| Skill | 描述 | 路径 |
|-------|------|------|
| `neuroskill-bci` | 连接到运行中的 NeuroSkill 实例，将用户实时的认知和情绪状态（注意力、放松、心情、认知负荷、困倦度、心率、HRV、睡眠阶段和 40+ 项衍生 EXG 指标）纳入响应。需要 BCI 可穿戴设备（Muse 2/S 或 OpenBCI）和 NeuroSkill 桌面应用。 | `health/neuroskill-bci` |

## mcp

| Skill | 描述 | 路径 |
|-------|------|------|
| `fastmcp` | 使用 Python 中的 FastMCP 构建、测试、检查、安装和部署 MCP 服务器。当创建新的 MCP 服务器、将 API 或数据库封装为 MCP 工具、暴露资源或提示词，或准备 FastMCP 服务器进行 HTTP 部署时使用。 | `mcp/fastmcp` |

## migration

| Skill | 描述 | 路径 |
|-------|------|------|
| `openclaw-migration` | 将用户的 OpenClaw 自定义配置迁移到 Hermes Agent。从 ~/.openclaw 导入兼容 Hermes 的记忆、SOUL.md、命令白名单、用户 Skill 和选定的工作区资产，然后报告无法迁移的内容及原因。 | `migration/openclaw-migration` |

## productivity

| Skill | 描述 | 路径 |
|-------|------|------|
| `telephony` | 为 Hermes 赋予电话能力 — 配置和持久化一个 Twilio 号码、发送和接收 SMS/MMS、拨打直连电话，以及通过 Bland.ai 或 Vapi 发起 AI 驱动的外呼。 | `productivity/telephony` |

## research

| Skill | 描述 | 路径 |
|-------|------|------|
| `bioinformatics` | 来自 bioSkills 和 ClawBio 的 400+ 生物信息学 Skill 网关。涵盖基因组学、转录组学、单细胞、变异检测、药物基因组学、宏基因组学、结构生物学等。 | `research/bioinformatics` |
| `qmd` | 使用 qmd 在本地搜索个人知识库、笔记、文档和会议记录 — 混合检索引擎，结合 BM25、向量搜索和 LLM 重排序。支持 CLI 和 MCP 集成。 | `research/qmd` |

## security

| Skill | 描述 | 路径 |
|-------|------|------|
| `1password` | 设置和使用 1Password CLI（op）。当安装 CLI、启用桌面应用集成、登录以及为命令读取/注入密钥时使用。 | `security/1password` |
| `oss-forensics` | 针对 GitHub 仓库的供应链调查、证据恢复和取证分析。涵盖已删除提交恢复、强制推送检测、IOC 提取、多源证据收集和结构化取证报告。 | `security/oss-forensics` |
| `sherlock` | 跨 400+ 社交网络的 OSINT（开源情报）用户名搜索。按用户名追踪社交媒体账号。 | `security/sherlock` |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/reference/skills-catalog)
