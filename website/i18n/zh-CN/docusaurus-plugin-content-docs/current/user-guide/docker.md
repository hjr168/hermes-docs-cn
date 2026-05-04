---
sidebar_position: 7
title: "Docker"
description: "在 Docker 中运行 Hermes Agent 及将 Docker 用作终端后端"
---

# Hermes Agent — Docker

Docker 与 Hermes Agent 有两种不同的交互方式：

1. **在 Docker 中运行 Hermes** — Agent 本身在容器内运行（本页的重点）
2. **Docker 作为终端后端** — Agent 在宿主机上运行但在 Docker 沙箱中执行命令（参见[配置 → terminal.backend](./configuration.md)）

本页涵盖选项 1。容器将所有用户数据（配置、API 密钥、会话、Skill、记忆）存储在从宿主机挂载到 `/opt/data` 的单一目录中。镜像本身是无状态的，可以通过拉取新版本升级而不丢失任何配置。

## 快速开始

如果你是第一次运行 Hermes Agent，在宿主机上创建数据目录并以交互模式启动容器运行设置向导：

```sh
mkdir -p ~/.hermes
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent setup
```

这会进入设置向导，提示你输入 API 密钥并写入 `~/.hermes/.env`。你只需要做一次。强烈建议此时设置一个聊天系统供网关使用。

## 以网关模式运行

配置完成后，以后台模式运行容器作为持久化网关（Telegram、Discord、Slack、WhatsApp 等）：

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  nousresearch/hermes-agent gateway run
```

端口 8642 暴露网关的 [OpenAI 兼容 API 服务器](./api-server.md)和健康检查端点。如果你只使用聊天平台（Telegram、Discord 等），这是可选的；但如果要让 Dashboard 或外部工具访问网关，则必须开放。

在面向互联网的机器上开放任何端口都有安全风险。除非你了解风险，否则不应这样做。

## 运行 Dashboard

内置的 Web Dashboard 可以作为独立容器与网关一起运行。

要将 Dashboard 作为独立容器运行，将其指向网关的健康检查端点，以便它能跨容器检测网关状态：

```sh
docker run -d \
  --name hermes-dashboard \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 9119:9119 \
  -e GATEWAY_HEALTH_URL=http://$HOST_IP:8642 \
  nousresearch/hermes-agent dashboard
```

将 `$HOST_IP` 替换为运行网关容器的机器 IP 地址（例如 `192.168.1.100`），或者如果两个容器共享网络，使用 Docker 网络主机名（参见下文的 [Compose 示例](#docker-compose-example)）。

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `GATEWAY_HEALTH_URL` | 网关 API 服务器的基础 URL，例如 `http://gateway:8642` | *（未设置 — 仅本地 PID 检查）* |
| `GATEWAY_HEALTH_TIMEOUT` | 健康探测超时秒数 | `3` |

没有 `GATEWAY_HEALTH_URL` 时，Dashboard 回退到本地进程检测 —— 仅在网关运行在同一容器或同一宿主机时有效。

## 交互式运行（CLI 聊天）

要针对运行中的数据目录开启交互式聊天会话：

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent
```

或者，如果你已经在运行中的容器中打开了终端（例如通过 Docker Desktop），直接运行：

```sh
/opt/hermes/.venv/bin/hermes
```

## 持久化卷

`/opt/data` 卷是所有 Hermes 状态的唯一权威来源。它映射到宿主机的 `~/.hermes/` 目录，包含：

| 路径 | 内容 |
|------|------|
| `.env` | API 密钥和密钥 |
| `config.yaml` | 所有 Hermes 配置 |
| `SOUL.md` | Agent 个性/身份 |
| `sessions/` | 对话历史 |
| `memories/` | 持久记忆存储 |
| `skills/` | 已安装的 Skill |
| `cron/` | 定时任务定义 |
| `hooks/` | 事件钩子 |
| `logs/` | 运行时日志 |
| `skins/` | 自定义 CLI 皮肤 |

:::warning
切勿同时对同一数据目录运行两个 Hermes **网关**容器 —— 会话文件和记忆存储不支持并发写入。Dashboard 容器与网关并行运行是安全的，因为 Dashboard 只读取数据。
:::

## 环境变量转发

API 密钥从容器的 `/opt/data/.env` 中读取。你也可以直接传递环境变量：

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e OPENAI_API_KEY="sk-..." \
  nousresearch/hermes-agent
```

直接的 `-e` 标志覆盖 `.env` 中的值。适用于你不希望密钥存在于磁盘上的 CI/CD 或密钥管理器集成场景。

## Docker Compose 示例 {#docker-compose-example}

对于同时运行网关和 Dashboard 的持久化部署，`docker-compose.yaml` 很方便：

```yaml
services:
  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: hermes
    restart: unless-stopped
    command: gateway run
    ports:
      - "8642:8642"
    volumes:
      - ~/.hermes:/opt/data
    networks:
      - hermes-net
    # 取消注释以转发特定环境变量而非使用 .env 文件：
    # environment:
    #   - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    #   - OPENAI_API_KEY=${OPENAI_API_KEY}
    #   - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2.0"

  dashboard:
    image: nousresearch/hermes-agent:latest
    container_name: hermes-dashboard
    restart: unless-stopped
    command: dashboard --host 0.0.0.0
    ports:
      - "9119:9119"
    volumes:
      - ~/.hermes:/opt/data
    environment:
      - GATEWAY_HEALTH_URL=http://hermes:8642
    networks:
      - hermes-net
    depends_on:
      - hermes
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

networks:
  hermes-net:
    driver: bridge
```

使用 `docker compose up -d` 启动，`docker compose logs -f` 查看日志。

## 资源限制

Hermes 容器需要适度的资源。推荐的最低配置：

| 资源 | 最低 | 推荐 |
|------|------|------|
| 内存 | 1 GB | 2–4 GB |
| CPU | 1 核心 | 2 核心 |
| 磁盘（数据卷） | 500 MB | 2+ GB（随会话/Skill 增长） |

浏览器自动化（Playwright/Chromium）是最消耗内存的功能。如果你不需要浏览器工具，1 GB 足够。启用浏览器工具时，至少分配 2 GB。

在 Docker 中设置限制：

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  --memory=4g --cpus=2 \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

## Dockerfile 做了什么

官方镜像基于 `debian:13.4`，包含：

- Python 3 及所有 Hermes 依赖（`pip install -e ".[all]"`）
- Node.js + npm（用于浏览器自动化和 WhatsApp 桥接）
- Playwright 及 Chromium（`npx playwright install --with-deps chromium`）
- ripgrep 和 ffmpeg 作为系统工具
- WhatsApp 桥接（`scripts/whatsapp-bridge/`）

入口脚本（`docker/entrypoint.sh`）在首次运行时初始化数据卷：
- 创建目录结构（`sessions/`、`memories/`、`skills/` 等）
- 如果没有 `.env`，复制 `.env.example` → `.env`
- 如果缺少 `config.yaml`，复制默认版本
- 如果缺少 `SOUL.md`，复制默认版本
- 使用基于清单的方式同步捆绑的 Skill（保留用户编辑）
- 然后用你传递的任何参数运行 `hermes`

## 升级

拉取最新镜像并重建容器。你的数据目录不受影响。

```sh
docker pull nousresearch/hermes-agent:latest
docker rm -f hermes
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

或使用 Docker Compose：

```sh
docker compose pull
docker compose up -d
```

## Skill 和凭据文件

当使用 Docker 作为执行环境时（不是上面的方法，而是 Agent 在 Docker 沙箱中运行命令时），Hermes 自动将 Skill 目录（`~/.hermes/skills/`）和 Skill 声明的任何凭据文件以只读卷的方式绑定挂载到容器中。这意味着 Skill 脚本、模板和引用文件在沙箱内无需手动配置即可使用。

SSH 和 Modal 后端也会进行相同的同步 —— Skill 和凭据文件在每条命令前通过 rsync 或 Modal 挂载 API 上传。

## 故障排除

### 容器立即退出

检查日志：`docker logs hermes`。常见原因：
- 缺少或无效的 `.env` 文件 — 先以交互模式运行完成设置
- 端口冲突（如果使用了暴露端口）

### "Permission denied" 错误

容器默认以 root 运行。如果宿主机的 `~/.hermes/` 由非 root 用户创建，权限应该没问题。如果遇到错误，确保数据目录可写：

```sh
chmod -R 755 ~/.hermes
```

### 浏览器工具不工作

Playwright 需要共享内存。在 Docker run 命令中添加 `--shm-size=1g`：

```sh
docker run -d \
  --name hermes \
  --shm-size=1g \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

### 网络问题后网关不重连

`--restart unless-stopped` 标志处理大多数瞬时故障。如果网关卡住，重启容器：

```sh
docker restart hermes
```

### 检查容器健康

```sh
docker logs --tail 50 hermes          # 最近日志
docker run -it --rm nousresearch/hermes-agent:latest version     # 验证版本
docker stats hermes                    # 资源使用情况
```

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/docker)
