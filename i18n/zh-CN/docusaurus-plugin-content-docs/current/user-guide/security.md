---
sidebar_position: 8
title: "安全"
description: "安全模型、危险命令审批、用户授权、容器隔离和生产部署最佳实践"
---

# 安全

Hermes Agent 采用纵深防御安全模型。本页覆盖每个安全边界 —— 从命令审批到容器隔离再到消息平台上的用户授权。

## 概览

安全模型有七个层级：

1. **用户授权** — 谁可以与 Agent 对话（允许列表、私信配对）
2. **危险命令审批** — 破坏性操作需要人工介入
3. **容器隔离** — Docker/Singularity/Modal 沙箱及加固设置
4. **MCP 凭据过滤** — MCP 子进程的环境变量隔离
5. **上下文文件扫描** — 项目文件中的提示注入检测
6. **跨会话隔离** — 会话之间无法互相访问数据或状态；Cron 任务存储路径针对路径遍历攻击进行了加固
7. **输入净化** — 终端工具后端的工作目录参数根据允许列表进行验证，防止 Shell 注入

## 危险命令审批

执行任何命令前，Hermes 会根据精选的危险模式列表进行检查。如果匹配，用户必须显式批准。

### 审批模式

审批系统支持三种模式，通过 `~/.hermes/config.yaml` 中的 `approvals.mode` 配置：

```yaml
approvals:
  mode: manual    # manual | smart | off
  timeout: 60     # 等待用户响应的秒数（默认：60）
```

| 模式 | 行为 |
|------|------|
| **manual**（默认） | 始终提示用户审批危险命令 |
| **smart** | 使用辅助 LLM 评估风险。低风险命令（如 `python -c "print('hello')"`）自动批准。真正危险的命令自动拒绝。不确定的情况升级为手动提示。 |
| **off** | 禁用所有审批检查 — 等同于 `--yolo` 模式。所有命令直接执行，无提示。 |

:::warning
设置 `approvals.mode: off` 禁用所有安全提示。仅在受信任的环境中使用（CI/CD、容器等）。
:::

### YOLO 模式

YOLO 模式绕过当前会话中**所有**危险命令审批提示。有三种激活方式：

1. **CLI 标志**：使用 `hermes --yolo` 或 `hermes chat --yolo` 启动会话
2. **斜杠命令**：在会话中输入 `/yolo` 切换开关
3. **环境变量**：设置 `HERMES_YOLO_MODE=1`

`/yolo` 命令是一个**切换** — 每次使用翻转模式开关：

```
> /yolo
  ⚡ YOLO mode ON — all commands auto-approved. Use with caution.

> /yolo
  ⚠ YOLO mode OFF — dangerous commands will require approval.
```

YOLO 模式在 CLI 和网关会话中均可使用。内部实现是设置 `HERMES_YOLO_MODE` 环境变量，在每条命令执行前检查。

:::danger
YOLO 模式禁用会话的**所有**危险命令安全检查。仅在你完全信任生成的命令时使用（例如，一次性环境中经过充分测试的自动化脚本）。
:::

### 审批超时

当危险命令提示出现时，用户有可配置的时间来响应。如果在超时时间内没有响应，命令默认被**拒绝**（故障关闭）。

在 `~/.hermes/config.yaml` 中配置超时：

```yaml
approvals:
  timeout: 60  # 秒（默认：60）
```

### 什么操作会触发审批

以下模式会触发审批提示（定义在 `tools/approval.py` 中）：

| 模式 | 说明 |
|------|------|
| `rm -r` / `rm --recursive` | 递归删除 |
| `rm ... /` | 在根路径删除 |
| `chmod 777/666` / `o+w` / `a+w` | 全局/其他用户可写权限 |
| `chmod --recursive` 带不安全权限 | 递归全局/其他用户可写 |
| `chown -R root` / `chown --recursive root` | 递归更改所有者为 root |
| `mkfs` | 格式化文件系统 |
| `dd if=` | 磁盘复制 |
| `> /dev/sd` | 写入块设备 |
| `DROP TABLE/DATABASE` | SQL DROP |
| `DELETE FROM`（无 WHERE） | 无 WHERE 的 SQL DELETE |
| `TRUNCATE TABLE` | SQL TRUNCATE |
| `> /etc/` | 覆盖系统配置 |
| `systemctl stop/disable/mask` | 停止/禁用系统服务 |
| `kill -9 -1` | 终止所有进程 |
| `pkill -9` | 强制终止进程 |
| Fork 炸弹模式 | Fork 炸弹 |
| `bash -c` / `sh -c` / `zsh -c` / `ksh -c` | 通过 `-c` 标志执行 Shell 命令（包括组合标志如 `-lc`） |
| `python -e` / `perl -e` / `ruby -e` / `node -c` | 通过 `-e`/`-c` 标志执行脚本 |
| `curl ... \| sh` / `wget ... \| sh` | 管道远程内容到 Shell |
| `bash <(curl ...)` / `sh <(wget ...)` | 通过进程替换执行远程脚本 |
| `tee` 到 `/etc/`、`~/.ssh/`、`~/.hermes/.env` | 通过 tee 覆盖敏感文件 |
| `>` / `>>` 到 `/etc/`、`~/.ssh/`、`~/.hermes/.env` | 通过重定向覆盖敏感文件 |
| `xargs rm` | xargs 配合 rm |
| `find -exec rm` / `find -delete` | find 配合破坏性操作 |
| `cp`/`mv`/`install` 到 `/etc/` | 复制/移动文件到系统配置 |
| `sed -i` / `sed --in-place` 对 `/etc/` | 原地编辑系统配置 |
| `pkill`/`killall` hermes/gateway | 防止自我终止 |
| `gateway run` 配合 `&`/`disown`/`nohup`/`setsid` | 防止在服务管理器之外启动网关 |

:::info
**容器绕过**：在 `docker`、`singularity`、`modal` 或 `daytona` 后端运行时，危险命令检查被**跳过**，因为容器本身就是安全边界。容器内的破坏性命令无法伤害宿主机。
:::

### 审批流程（CLI）

在交互式 CLI 中，危险命令显示内联审批提示：

```
  ⚠️  DANGEROUS COMMAND: recursive delete
      rm -rf /tmp/old-project

      [o]nce  |  [s]ession  |  [a]lways  |  [d]eny

      Choice [o/s/a/D]:
```

四个选项：

- **once** — 允许本次执行
- **session** — 本次会话中允许此模式
- **always** — 添加到永久允许列表（保存到 `config.yaml`）
- **deny**（默认） — 阻止命令

### 审批流程（网关/消息平台）

在消息平台上，Agent 将危险命令详情发送到聊天并等待用户回复：

- 回复 **yes**、**y**、**approve**、**ok** 或 **go** 批准
- 回复 **no**、**n**、**deny** 或 **cancel** 拒绝

运行网关时 `HERMES_EXEC_ASK=1` 环境变量会自动设置。

### 永久允许列表

用 "always" 批准的命令保存到 `~/.hermes/config.yaml`：

```yaml
# 永久允许的危险命令模式
command_allowlist:
  - rm
  - systemctl
```

这些模式在启动时加载，在所有未来会话中静默批准。

:::tip
使用 `hermes config edit` 查看或移除永久允许列表中的模式。
:::

## 用户授权（网关）

运行消息网关时，Hermes 通过分层授权系统控制谁可以与 Bot 交互。

### 授权检查顺序

`_is_user_authorized()` 方法按以下顺序检查：

1. **平台级全部允许标志**（例如 `DISCORD_ALLOW_ALL_USERS=true`）
2. **私信配对已批准列表**（通过配对码批准的用户）
3. **平台特定允许列表**（例如 `TELEGRAM_ALLOWED_USERS=12345,67890`）
4. **全局允许列表**（`GATEWAY_ALLOWED_USERS=12345,67890`）
5. **全局全部允许**（`GATEWAY_ALLOW_ALL_USERS=true`）
6. **默认：拒绝**

### 平台允许列表

在 `~/.hermes/.env` 中以逗号分隔设置允许的用户 ID：

```bash
# 平台特定允许列表
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=111222333444555666
WHATSAPP_ALLOWED_USERS=15551234567
SLACK_ALLOWED_USERS=U01ABC123

# 跨平台允许列表（所有平台都会检查）
GATEWAY_ALLOWED_USERS=123456789

# 平台级全部允许（谨慎使用）
DISCORD_ALLOW_ALL_USERS=true

# 全局全部允许（极度谨慎使用）
GATEWAY_ALLOW_ALL_USERS=true
```

:::warning
如果**没有配置任何允许列表**且未设置 `GATEWAY_ALLOW_ALL_USERS`，**所有用户都会被拒绝**。网关在启动时记录警告：

```
No user allowlists configured. All unauthorized users will be denied.
Set GATEWAY_ALLOW_ALL_USERS=true in ~/.hermes/.env to allow open access,
or configure platform allowlists (e.g., TELEGRAM_ALLOWED_USERS=your_id).
```
:::

### 私信配对系统

为了更灵活的授权，Hermes 包含基于配对码的系统。无需预先知道用户 ID，未知用户会收到一次性配对码，Bot 所有者通过 CLI 批准。

**工作原理：**

1. 未知用户向 Bot 发送私信
2. Bot 回复一个 8 字符的配对码
3. Bot 所有者在 CLI 上运行 `hermes pairing approve <platform> <code>`
4. 用户被永久批准使用该平台

在 `~/.hermes/config.yaml` 中控制如何处理未授权私信：

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` 是默认值。未授权私信获得配对码回复。
- `ignore` 静默丢弃未授权私信。
- 平台部分覆盖全局默认值，因此你可以在 Telegram 上保持配对，同时让 WhatsApp 静默。

**安全特性**（基于 OWASP + NIST SP 800-63-4 指导）：

| 特性 | 详情 |
|------|------|
| 配对码格式 | 8 字符，来自 32 字符无歧义字母表（不含 0/O/1/I） |
| 随机性 | 密码学安全（`secrets.choice()`） |
| 配对码有效期 | 1 小时过期 |
| 速率限制 | 每用户每 10 分钟 1 次请求 |
| 待处理上限 | 每平台最多 3 个待处理配对码 |
| 锁定 | 5 次失败批准尝试 → 1 小时锁定 |
| 文件安全 | 所有配对数据文件 `chmod 0600` |
| 日志 | 配对码从不输出到 stdout |

**配对 CLI 命令：**

```bash
# 列出待处理和已批准的用户
hermes pairing list

# 批准配对码
hermes pairing approve telegram ABC12DEF

# 撤销用户访问权限
hermes pairing revoke telegram 123456789

# 清除所有待处理配对码
hermes pairing clear-pending
```

**存储：** 配对数据存储在 `~/.hermes/pairing/` 中，按平台的 JSON 文件：
- `{platform}-pending.json` — 待处理配对请求
- `{platform}-approved.json` — 已批准用户
- `_rate_limits.json` — 速率限制和锁定跟踪

## 容器隔离

使用 `docker` 终端后端时，Hermes 对每个容器应用严格的安全加固。

### Docker 安全标志

每个容器使用以下标志运行（定义在 `tools/environments/docker.py` 中）：

```python
_SECURITY_ARGS = [
    "--cap-drop", "ALL",                          # 丢弃所有 Linux 能力
    "--cap-add", "DAC_OVERRIDE",                  # Root 可写入绑定挂载的目录
    "--cap-add", "CHOWN",                         # 包管理器需要文件所有权
    "--cap-add", "FOWNER",                        # 包管理器需要文件所有权
    "--security-opt", "no-new-privileges",         # 阻止权限提升
    "--pids-limit", "256",                         # 限制进程数
    "--tmpfs", "/tmp:rw,nosuid,size=512m",         # 大小受限的 /tmp
    "--tmpfs", "/var/tmp:rw,noexec,nosuid,size=256m",  # 不可执行的 /var/tmp
    "--tmpfs", "/run:rw,noexec,nosuid,size=64m",   # 不可执行的 /run
]
```

### 资源限制

容器资源可在 `~/.hermes/config.yaml` 中配置：

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_forward_env: []  # 仅显式允许列表；为空保持密钥不出容器
  container_cpu: 1        # CPU 核心数
  container_memory: 5120  # MB（默认 5GB）
  container_disk: 51200   # MB（默认 50GB，需要 XFS 上的 overlay2）
  container_persistent: true  # 跨会话持久化文件系统
```

### 文件系统持久化

- **持久模式**（`container_persistent: true`）：从 `~/.hermes/sandboxes/docker/<task_id>/` 绑定挂载 `/workspace` 和 `/root`
- **临时模式**（`container_persistent: false`）：工作区使用 tmpfs — 清理时所有内容丢失

:::tip
对于生产网关部署，使用 `docker`、`modal` 或 `daytona` 后端将 Agent 命令与宿主机隔离。这完全消除了危险命令审批的需要。
:::

:::warning
如果你向 `terminal.docker_forward_env` 添加变量名，这些变量会被故意注入容器供终端命令使用。这对任务特定的凭据如 `GITHUB_TOKEN` 很有用，但也意味着容器中运行的代码可以读取和泄露它们。
:::

## 终端后端安全对比

| 后端 | 隔离性 | 危险命令检查 | 适用场景 |
|------|--------|-------------|---------|
| **local** | 无 — 在宿主机运行 | ✅ 是 | 开发、受信任用户 |
| **ssh** | 远程机器 | ✅ 是 | 在独立服务器上运行 |
| **docker** | 容器 | ❌ 跳过（容器即边界） | 生产网关 |
| **singularity** | 容器 | ❌ 跳过 | HPC 环境 |
| **modal** | 云沙箱 | ❌ 跳过 | 可扩展的云隔离 |
| **daytona** | 云沙箱 | ❌ 跳过 | 持久化云工作区 |

## 环境变量透传 {#environment-variable-passthrough}

`execute_code` 和 `terminal` 都会从子进程中剥离敏感环境变量，防止 LLM 生成的代码窃取凭据。但声明了 `required_environment_variables` 的 Skill 需要合法访问这些变量。

### 工作原理

两种机制允许特定变量通过沙箱过滤器：

**1. Skill 作用域透传（自动）**

当 Skill 被加载（通过 `skill_view` 或 `/skill` 命令）并声明了 `required_environment_variables` 时，环境中实际设置的变量会自动注册为透传。未设置的变量（仍处于需要配置状态）**不会**注册。

```yaml
# 在 Skill 的 SKILL.md frontmatter 中
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
```

加载此 Skill 后，`TENOR_API_KEY` 会透传到 `execute_code`、`terminal`（local）**以及远程后端（Docker、Modal）** — 无需手动配置。

:::info Docker 与 Modal
在 v0.5.1 之前，Docker 的 `forward_env` 是独立于 Skill 透传的系统。现在它们已合并 — Skill 声明的环境变量会自动转发到 Docker 容器和 Modal 沙箱中，无需手动添加到 `docker_forward_env`。
:::

**2. 配置透传（手动）**

对于没有 Skill 声明的环境变量，在 `config.yaml` 的 `terminal.env_passthrough` 中添加：

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

### 凭据文件透传（OAuth Token 等） {#credential-file-passthrough}

某些 Skill 需要**文件**（不仅仅是环境变量）在沙箱中 — 例如，Google Workspace 将 OAuth Token 存储为活跃 Profile 的 `HERMES_HOME` 下的 `google_token.json`。Skill 在 frontmatter 中声明这些：

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials
```

加载时，Hermes 检查这些文件是否存在于活跃 Profile 的 `HERMES_HOME` 中，并注册它们以供挂载：

- **Docker**：只读绑定挂载（`-v host:container:ro`）
- **Modal**：沙箱创建时挂载 + 每条命令前同步（处理会话中的 OAuth 设置）
- **Local**：无需操作（文件已经可访问）

你也可以在 `config.yaml` 中手动列出凭据文件：

```yaml
terminal:
  credential_files:
    - google_token.json
    - my_custom_oauth_token.json
```

路径相对于 `~/.hermes/`。文件挂载到容器内的 `/root/.hermes/`。

### 各沙箱过滤内容

| 沙箱 | 默认过滤 | 透传覆盖 |
|------|---------|---------|
| **execute_code** | 阻塞名称包含 `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD`、`AUTH` 的变量；仅允许安全前缀变量 | ✅ 透传变量绕过两项检查 |
| **terminal**（local） | 阻塞显式的 Hermes 基础设施变量（Provider 密钥、网关 Token、工具 API 密钥） | ✅ 透传变量绕过阻止列表 |
| **terminal**（Docker） | 默认无宿主机环境变量 | ✅ 透传变量 + `docker_forward_env` 通过 `-e` 转发 |
| **terminal**（Modal） | 默认无宿主机环境变量/文件 | ✅ 凭据文件挂载；环境变量透传通过同步 |
| **MCP** | 阻塞除安全系统变量 + 显式配置的 `env` 之外的所有内容 | ❌ 不受透传影响（使用 MCP `env` 配置） |

### 安全考量

- 透传只影响你或你的 Skill 显式声明的变量 — 默认安全态势对任意 LLM 生成的代码不变
- 凭据文件以**只读**方式挂载到 Docker 容器
- Skills Guard 在安装前扫描 Skill 内容中的可疑环境访问模式
- 缺失/未设置的变量永远不会被注册（你无法泄露不存在的东西）
- Hermes 基础设施密钥（Provider API 密钥、网关 Token）不应添加到 `env_passthrough` — 它们有专门的机制

## MCP 凭据处理

MCP（Model Context Protocol）服务器子进程接收**过滤后的环境**以防止意外凭据泄露。

### 安全环境变量

只有这些变量从宿主机透传到 MCP stdio 子进程：

```
PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR
```

加上所有 `XDG_*` 变量。所有其他环境变量（API 密钥、Token、密钥）都被**剥离**。

在 MCP 服务器的 `env` 配置中显式定义的变量会透传：

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_..."  # 仅传递这个
```

### 凭据脱敏

MCP 工具的错误消息在返回给 LLM 前会被净化。以下模式替换为 `[REDACTED]`：

- GitHub PAT（`ghp_...`）
- OpenAI 风格密钥（`sk-...`）
- Bearer Token
- `token=`、`key=`、`API_KEY=`、`password=`、`secret=` 参数

### 网站访问策略

你可以通过 Web 和浏览器工具限制 Agent 访问哪些网站。这有助于防止 Agent 访问内部服务、管理面板或其他敏感 URL。

```yaml
# 在 ~/.hermes/config.yaml 中
security:
  website_blocklist:
    enabled: true
    domains:
      - "*.internal.company.com"
      - "admin.example.com"
    shared_files:
      - "/etc/hermes/blocked-sites.txt"
```

当请求被屏蔽的 URL 时，工具返回错误说明域名被策略屏蔽。屏蔽列表在 `web_search`、`web_extract`、`browser_navigate` 及所有支持 URL 的工具中强制执行。

详见配置指南中的[网站屏蔽列表](/docs/user-guide/configuration#website-blocklist)。

### SSRF 防护

所有支持 URL 的工具（网页搜索、网页提取、视觉、浏览器）在获取 URL 前验证 URL 以防止服务器端请求伪造（SSRF）攻击。被屏蔽的地址包括：

- **私有网络**（RFC 1918）：`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`
- **回环地址**：`127.0.0.0/8`、`::1`
- **链路本地**：`169.254.0.0/16`（包括 `169.254.169.254` 的云元数据）
- **CGNAT / 共享地址空间**（RFC 6598）：`100.64.0.0/10`（Tailscale、WireGuard VPN）
- **云元数据主机名**：`metadata.google.internal`、`metadata.goog`
- **保留、多播和未指定地址**

SSRF 防护始终启用且无法禁用。DNS 失败被视为已屏蔽（故障关闭）。重定向链在每个跳转点重新验证，防止基于重定向的绕过。

### Tirith 预执行安全扫描

Hermes 集成 [tirith](https://github.com/sheeki03/tirith) 在执行前进行内容级命令扫描。Tirith 检测纯模式匹配无法发现的威胁：

- 同形异义 URL 欺骗（国际化域名攻击）
- 管道到解释器模式（`curl | bash`、`wget | sh`）
- 终端注入攻击

Tirith 首次使用时从 GitHub Releases 自动安装，带 SHA-256 校验和验证（如果有 cosign 则还验证来源签名）。

```yaml
# 在 ~/.hermes/config.yaml 中
security:
  tirith_enabled: true       # 启用/禁用 tirith 扫描（默认：true）
  tirith_path: "tirith"      # tirith 二进制文件路径（默认：PATH 查找）
  tirith_timeout: 5          # 子进程超时秒数
  tirith_fail_open: true     # tirith 不可用时允许执行（默认：true）
```

当 `tirith_fail_open` 为 `true`（默认）时，如果 tirith 未安装或超时，命令继续执行。在高安全环境中设为 `false` 可在 tirith 不可用时阻止命令。

Tirith 的判定集成到审批流程中：安全命令通过，而可疑和被阻止的命令触发用户审批，附带完整的 tirith 发现（严重性、标题、描述、更安全的替代方案）。用户可以批准或拒绝 — 默认选择是拒绝，以保持无人值守场景的安全。

### 上下文文件注入防护

上下文文件（AGENTS.md、.cursorrules、SOUL.md）在包含到系统提示前会扫描提示注入。扫描器检查：

- 忽略/ disregarding 之前的指令
- 带有可疑关键词的隐藏 HTML 注释
- 试图读取密钥（`.env`、`credentials`、`.netrc`）的尝试
- 通过 `curl` 窃取凭据
- 不可见 Unicode 字符（零宽空格、双向覆盖）

被阻止的文件显示警告：

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

## 生产部署最佳实践

### 网关部署清单

1. **设置显式允许列表** — 生产中绝不使用 `GATEWAY_ALLOW_ALL_USERS=true`
2. **使用容器后端** — 在 config.yaml 中设置 `terminal.backend: docker`
3. **限制资源** — 设置适当的 CPU、内存和磁盘限制
4. **安全存储密钥** — 将 API 密钥放在 `~/.hermes/.env` 中并设置正确文件权限
5. **启用私信配对** — 尽可能使用配对码代替硬编码用户 ID
6. **定期审查命令允许列表** — 定期审计 config.yaml 中的 `command_allowlist`
7. **设置 `MESSAGING_CWD`** — 不要让 Agent 从敏感目录操作
8. **不以 root 运行** — 永远不以 root 身份运行网关
9. **监控日志** — 检查 `~/.hermes/logs/` 中的未授权访问尝试
10. **保持更新** — 定期运行 `hermes update` 获取安全补丁

### 保护 API 密钥

```bash
# 设置 .env 文件的正确权限
chmod 600 ~/.hermes/.env

# 为不同服务使用独立密钥
# 永远不要将 .env 文件提交到版本控制
```

### 网络隔离

为获得最大安全性，在独立机器或 VM 上运行网关：

```yaml
terminal:
  backend: ssh
  ssh_host: "agent-worker.local"
  ssh_user: "hermes"
  ssh_key: "~/.ssh/hermes_agent_key"
```

这将网关的消息连接与 Agent 的命令执行分开。

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/docs/user-guide/security)
