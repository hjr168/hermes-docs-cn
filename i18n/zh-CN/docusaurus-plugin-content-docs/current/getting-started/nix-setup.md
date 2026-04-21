---
sidebar_position: 3
title: "Nix 与 NixOS 安装配置"
description: "使用 Nix 安装和部署 Hermes Agent —— 从一条 `nix run` 到完全声明式的 NixOS 模块和容器模式"
---

# Nix 与 NixOS 安装配置

Hermes Agent 提供了一个 Nix Flake（Nix 的包管理单元），支持三个层级的集成：

| 层级 | 适用对象 | 你能得到什么 |
|-------|-------------|--------------|
| **`nix run` / `nix profile install`** | 所有 Nix 用户（macOS、Linux） | 预编译的二进制文件及全部依赖 —— 之后按标准 CLI 工作流使用 |
| **NixOS 模块（原生模式）** | NixOS 服务器部署 | 声明式配置、加固的 systemd 服务、托管密钥管理 |
| **NixOS 模块（容器模式）** | 需要自我修改的 Agent | 以上全部，外加一个持久化的 Ubuntu 容器，Agent 可以在其中运行 `apt`/`pip`/`npm install` |

:::info 与标准安装有什么不同
`curl | bash` 安装器会自行管理 Python、Node 和各种依赖。Nix Flake 替代了所有这些 —— 每个 Python 依赖都是由 [uv2nix](https://github.com/pyproject-nix/uv2nix) 构建的 Nix derivation（构建产物），运行时工具（Node.js、git、ripgrep、ffmpeg）也被包装进二进制文件的 PATH 中。没有运行时 pip，没有 venv 激活，也没有 `npm install`。

**对于非 NixOS 用户**，这只是安装步骤不同。安装之后的操作（`hermes setup`、`hermes gateway install`、编辑配置）与标准安装完全一致。

**对于 NixOS 模块用户**，整个生命周期都不同：配置位于 `configuration.nix` 中，密钥通过 sops-nix/agenix 管理，服务是一个 systemd unit，CLI 配置命令会被阻止。你用管理其他 NixOS 服务的方式来管理 Hermes。
:::

## 前提条件

- **已启用 Flakes 的 Nix** —— 推荐 [Determinate Nix](https://install.determinate.systems)（默认启用 Flakes）
- **API 密钥** —— 你要使用的服务所需的密钥（至少需要 OpenRouter 或 Anthropic 的密钥）

---

## 快速开始（所有 Nix 用户）

无需克隆仓库。Nix 会自动获取、构建并运行一切：

```bash
# 直接运行（首次使用时构建，之后使用缓存）
nix run github:NousResearch/hermes-agent -- setup
nix run github:NousResearch/hermes-agent -- chat

# 或者持久安装
nix profile install github:NousResearch/hermes-agent
hermes setup
hermes chat
```

执行 `nix profile install` 后，`hermes`、`hermes-agent` 和 `hermes-acp` 就在你的 PATH 上了。之后的工作流与[标准安装](./installation.md)完全一致 —— `hermes setup` 引导你选择提供商，`hermes gateway install` 设置 launchd（macOS）或 systemd 用户服务，配置存放在 `~/.hermes/` 中。

<details>
<summary><strong>从本地克隆构建</strong></summary>

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
nix build
./result/bin/hermes setup
```

</details>

---

## NixOS 模块

Flake 导出了 `nixosModules.default` —— 一个完整的 NixOS 服务模块，以声明式方式管理用户创建、目录、配置生成、密钥、文档和服务生命周期。

:::note
此模块需要 NixOS。对于非 NixOS 系统（macOS、其他 Linux 发行版），请使用上方的 `nix profile install` 和标准 CLI 工作流。
:::

### 添加 Flake 输入

```nix
# /etc/nixos/flake.nix（或你的系统 Flake）
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    hermes-agent.url = "github:NousResearch/hermes-agent";
  };

  outputs = { nixpkgs, hermes-agent, ... }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        hermes-agent.nixosModules.default
        ./configuration.nix
      ];
    };
  };
}
```

### 最小配置

```nix
# configuration.nix
{ config, ... }: {
  services.hermes-agent = {
    enable = true;
    settings.model.default = "anthropic/claude-sonnet-4";
    environmentFiles = [ config.sops.secrets."hermes-env".path ];
    addToSystemPackages = true;
  };
}
```

就这样。`nixos-rebuild switch` 会创建 `hermes` 用户、生成 `config.yaml`、连接密钥，然后启动网关 —— 网关是一个长期运行的服务，将 Agent 连接到消息平台（Telegram、Discord 等）并监听传入消息。

:::warning 密钥是必需的
上面的 `environmentFiles` 假设你已经配置了 [sops-nix](https://github.com/Mic92/sops-nix) 或 [agenix](https://github.com/ryantm/agenix)。该文件应至少包含一个 LLM（大语言模型）提供商密钥（例如 `OPENROUTER_API_KEY=sk-or-...`）。完整设置请参见[密钥管理](#secrets-management)。如果你还没有密钥管理器，可以先用一个普通文件作为起点 —— 只需确保它不是全局可读的：

```bash
echo "OPENROUTER_API_KEY=sk-or-your-key" | sudo install -m 0600 -o hermes /dev/stdin /var/lib/hermes/env
```

```nix
services.hermes-agent.environmentFiles = [ "/var/lib/hermes/env" ];
```
:::

:::tip addToSystemPackages
设置 `addToSystemPackages = true` 会做两件事：将 `hermes` CLI 加入系统 PATH，**同时**全局设置 `HERMES_HOME`，使交互式 CLI 能与网关服务共享状态（会话、Skills、Cron）。不设置的话，在终端中运行 `hermes` 会创建一个独立的 `~/.hermes/` 目录。
:::

:::info 容器感知 CLI
当 `container.enable = true` 且 `addToSystemPackages = true` 时，主机上的**每条** `hermes` 命令都会自动路由到托管容器中。这意味着你的交互式 CLI 会话在与网关服务相同的环境中运行 —— 可以访问容器中安装的所有包和工具。

- 路由是透明的：`hermes chat`、`hermes sessions list`、`hermes version` 等命令实际上都在容器中执行
- 所有 CLI 标志原样传递
- 如果容器未运行，CLI 会短暂重试（交互使用时显示转圈等待 5 秒，脚本模式静默等待 10 秒），然后以明确的错误信息失败 —— 不会静默回退
- 开发 Hermes 代码库的开发者，设置 `HERMES_DEV=1` 可绕过容器路由，直接运行本地代码

设置 `container.hostUsers` 可为指定用户创建 `~/.hermes` 符号链接指向服务状态目录，使主机 CLI 和容器共享会话、配置和记忆：

```nix
services.hermes-agent = {
  container.enable = true;
  container.hostUsers = [ "your-username" ];
  addToSystemPackages = true;
};
```

列在 `hostUsers` 中的用户会自动被加入 `hermes` 组以获得文件权限访问。

**Podman 用户注意：** NixOS 服务以 root 身份运行容器。Docker 用户通过 `docker` 组的 socket 获得访问权限，但 Podman 的 rootful 容器需要 sudo。为容器运行时授予免密 sudo：

```nix
security.sudo.extraRules = [{
  users = [ "your-username" ];
  commands = [{
    command = "/run/current-system/sw/bin/podman";
    options = [ "NOPASSWD" ];
  }];
}];
```

CLI 会自动检测何时需要 sudo 并透明地使用它。不配置这个，你就需要手动运行 `sudo hermes chat`。
:::

### 验证是否正常运行

执行 `nixos-rebuild switch` 后，检查服务是否正在运行：

```bash
# 检查服务状态
systemctl status hermes-agent

# 查看日志（Ctrl+C 停止）
journalctl -u hermes-agent -f

# 如果 addToSystemPackages 为 true，测试 CLI
hermes version
hermes config       # 显示生成的配置
```

### 选择部署模式

模块支持两种模式，通过 `container.enable` 控制：

| | **原生模式**（默认） | **容器模式** |
|---|---|---|
| 运行方式 | 主机上加固的 systemd 服务 | 持久化 Ubuntu 容器，bind-mount（绑定挂载） `/nix/store` |
| 安全性 | `NoNewPrivileges`、`ProtectSystem=strict`、`PrivateTmp` | 容器隔离，以非特权用户身份运行 |
| Agent 能否自行安装包 | 不能 —— 只能使用 Nix 提供的 PATH 上的工具 | 可以 —— `apt`、`pip`、`npm` 安装在重启后仍然保留 |
| 配置选项 | 相同 | 相同 |
| 适用场景 | 标准部署，最大安全性，可复现性 | Agent 需要运行时安装包、可变环境、实验性工具 |

要启用容器模式，只需添加一行：

```nix
{
  services.hermes-agent = {
    enable = true;
    container.enable = true;
    # ... 其余配置相同
  };
}
```

:::info
容器模式会通过 `mkDefault` 自动启用 `virtualisation.docker.enable`。如果你使用 Podman，设置 `container.backend = "podman"` 并将 `virtualisation.docker.enable` 设为 `false`。
:::

---

## 配置

### 声明式设置

`settings` 选项接受任意属性集，会被渲染为 `config.yaml`。它支持跨多个模块定义的深度合并（通过 `lib.recursiveUpdate`），所以你可以将配置拆分到不同文件中：

```nix
# base.nix
services.hermes-agent.settings = {
  model.default = "anthropic/claude-sonnet-4";
  toolsets = [ "all" ];
  terminal = { backend = "local"; timeout = 180; };
};

# personality.nix
services.hermes-agent.settings = {
  display = { compact = false; personality = "kawaii"; };
  memory = { memory_enabled = true; user_profile_enabled = true; };
};
```

两者在评估时会进行深度合并。Nix 声明的键始终优先于磁盘上已有的 `config.yaml` 中的同名键，但**Nix 不触及的用户添加的键会被保留**。这意味着如果 Agent 或手动编辑添加了 `skills.disabled` 或 `streaming.enabled` 这样的键，它们会在 `nixos-rebuild switch` 后继续存在。

:::note 模型命名
`settings.model.default` 使用你的提供商期望的模型标识符。使用 [OpenRouter](https://openrouter.ai)（默认）时，格式类似 `"anthropic/claude-sonnet-4"` 或 `"google/gemini-3-flash"`。如果直接使用某个提供商（Anthropic、OpenAI），需设置 `settings.model.base_url` 指向其 API，并使用其原生模型 ID（例如 `"claude-sonnet-4-20250514"`）。未设置 `base_url` 时，Hermes 默认使用 OpenRouter。
:::

:::tip 查看可用配置键
运行 `nix build .#configKeys && cat result` 可以查看从 Python 的 `DEFAULT_CONFIG` 中提取的所有叶节点配置键。你可以将现有的 `config.yaml` 粘贴到 `settings` 属性集中 —— 结构是一一对应的。
:::

<details>
<summary><strong>完整示例：常用自定义设置</strong></summary>

```nix
{ config, ... }: {
  services.hermes-agent = {
    enable = true;
    container.enable = true;

    # ── 模型 ──────────────────────────────────────────────────────────
    settings = {
      model = {
        base_url = "https://openrouter.ai/api/v1";
        default = "anthropic/claude-opus-4.6";
      };
      toolsets = [ "all" ];
      max_turns = 100;
      terminal = { backend = "local"; cwd = "."; timeout = 180; };
      compression = {
        enabled = true;
        threshold = 0.85;
        summary_model = "google/gemini-3-flash-preview";
      };
      memory = { memory_enabled = true; user_profile_enabled = true; };
      display = { compact = false; personality = "kawaii"; };
      agent = { max_turns = 60; verbose = false; };
    };

    # ── 密钥 ────────────────────────────────────────────────────────
    environmentFiles = [ config.sops.secrets."hermes-env".path ];

    # ── 文档 ──────────────────────────────────────────────────────
    documents = {
      "USER.md" = ./documents/USER.md;
    };

    # ── MCP 服务器 ────────────────────────────────────────────────────
    mcpServers.filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };

    # ── 容器选项 ──────────────────────────────────────────────────────
    container = {
      image = "ubuntu:24.04";
      backend = "docker";
      hostUsers = [ "your-username" ];
      extraVolumes = [ "/home/user/projects:/projects:rw" ];
      extraOptions = [ "--gpus" "all" ];
    };

    # ── 服务调优 ─────────────────────────────────────────────────────────
    addToSystemPackages = true;
    extraArgs = [ "--verbose" ];
    restart = "always";
    restartSec = 5;
  };
}
```

</details>

### 逃生舱：使用自己的配置文件

如果你更想在 Nix 之外完全管理 `config.yaml`，使用 `configFile`：

```nix
services.hermes-agent.configFile = /etc/hermes/config.yaml;
```

这会完全绕过 `settings` —— 不合并、不生成。文件在每次激活时原样复制到 `$HERMES_HOME/config.yaml`。

### 自定义速查表

Nix 用户最常自定义的内容快速参考：

| 我想要... | 选项 | 示例 |
|---|---|---|
| 更换 LLM 模型 | `settings.model.default` | `"anthropic/claude-sonnet-4"` |
| 使用不同的提供商端点 | `settings.model.base_url` | `"https://openrouter.ai/api/v1"` |
| 添加 API 密钥 | `environmentFiles` | `[ config.sops.secrets."hermes-env".path ]` |
| 给 Agent 设定个性 | `${services.hermes-agent.stateDir}/.hermes/SOUL.md` | 直接管理该文件 |
| 添加 MCP 工具服务器 | `mcpServers.<name>` | 参见 [MCP 服务器](#mcp-servers) |
| 将主机目录挂载到容器 | `container.extraVolumes` | `[ "/data:/data:rw" ]` |
| 向容器传递 GPU 访问 | `container.extraOptions` | `[ "--gpus" "all" ]` |
| 使用 Podman 替代 Docker | `container.backend` | `"podman"` |
| 在主机 CLI 和容器间共享状态 | `container.hostUsers` | `[ "sidbin" ]` |
| 向服务 PATH 添加工具（仅原生模式） | `extraPackages` | `[ pkgs.pandoc pkgs.imagemagick ]` |
| 使用自定义基础镜像 | `container.image` | `"ubuntu:24.04"` |
| 覆盖 Hermes 包 | `package` | `inputs.hermes-agent.packages.${system}.default.override { ... }` |
| 更改状态目录 | `stateDir` | `"/opt/hermes"` |
| 设置 Agent 工作目录 | `workingDirectory` | `"/home/user/projects"` |

---

## 密钥管理 {#secrets-management}

:::danger 切勿将 API 密钥放在 `settings` 或 `environment` 中
Nix 表达式中的值最终会出现在 `/nix/store` 中，这是全局可读的。请始终使用 `environmentFiles` 配合密钥管理器。
:::

`environment`（非机密变量）和 `environmentFiles`（机密文件）在激活时（`nixos-rebuild switch`）会合并到 `$HERMES_HOME/.env` 中。Hermes 每次启动时都会读取此文件，所以更改只需执行 `systemctl restart hermes-agent` 即可生效 —— 无需重新创建容器。

### sops-nix

```nix
{
  sops = {
    defaultSopsFile = ./secrets/hermes.yaml;
    age.keyFile = "/home/user/.config/sops/age/keys.txt";
    secrets."hermes-env" = { format = "yaml"; };
  };

  services.hermes-agent.environmentFiles = [
    config.sops.secrets."hermes-env".path
  ];
}
```

密钥文件包含键值对：

```yaml
# secrets/hermes.yaml（用 sops 加密）
hermes-env: |
    OPENROUTER_API_KEY=sk-or-...
    TELEGRAM_BOT_TOKEN=123456:ABC...
    ANTHROPIC_API_KEY=sk-ant-...
```

### agenix

```nix
{
  age.secrets.hermes-env.file = ./secrets/hermes-env.age;

  services.hermes-agent.environmentFiles = [
    config.age.secrets.hermes-env.path
  ];
}
```

### OAuth / 认证种子

对于需要 OAuth（开放授权）的平台（如 Discord），使用 `authFile` 在首次部署时种子凭据：

```nix
{
  services.hermes-agent = {
    authFile = config.sops.secrets."hermes/auth.json".path;
    # authFileForceOverwrite = true;  # 每次激活都覆盖
  };
}
```

文件只在 `auth.json` 不存在时才会被复制（除非设置 `authFileForceOverwrite = true`）。运行时的 OAuth 令牌刷新会写入状态目录，在重建后保留。

---

## 文档

`documents` 选项将文件安装到 Agent 的工作目录（即 `workingDirectory`，Agent 将其作为工作空间读取）。Hermes 按约定查找特定文件名：

- **`USER.md`** —— 关于 Agent 交互的用户上下文信息。
- 你放在这里的其他文件对 Agent 来说都是工作空间文件。

Agent 身份文件是独立的：Hermes 从 `$HERMES_HOME/SOUL.md` 加载其主 `SOUL.md`，在 NixOS 模块中即 `${services.hermes-agent.stateDir}/.hermes/SOUL.md`。将 `SOUL.md` 放在 `documents` 中只会创建一个工作空间文件，不会替换主角色文件。

```nix
{
  services.hermes-agent.documents = {
    "USER.md" = ./documents/USER.md;  # 路径引用，从 Nix store 复制
  };
}
```

值可以是内联字符串或路径引用。文件在每次 `nixos-rebuild switch` 时安装。

---

## MCP 服务器 {#mcp-servers}

`mcpServers` 选项以声明式方式配置 [MCP（Model Context Protocol，模型上下文协议）](https://modelcontextprotocol.io) 服务器。每个服务器使用 **stdio**（本地命令）或 **HTTP**（远程 URL）传输方式。

### Stdio 传输（本地服务器）

```nix
{
  services.hermes-agent.mcpServers = {
    filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };
    github = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-github" ];
      env.GITHUB_PERSONAL_ACCESS_TOKEN = "\${GITHUB_TOKEN}"; # 从 .env 中解析
    };
  };
}
```

:::tip
`env` 值中的环境变量在运行时从 `$HERMES_HOME/.env` 中解析。使用 `environmentFiles` 注入密钥 —— 切勿将令牌直接放在 Nix 配置中。
:::

### HTTP 传输（远程服务器）

```nix
{
  services.hermes-agent.mcpServers.remote-api = {
    url = "https://mcp.example.com/v1/mcp";
    headers.Authorization = "Bearer \${MCP_REMOTE_API_KEY}";
    timeout = 180;
  };
}
```

### 带有 OAuth 的 HTTP 传输

对于使用 OAuth 2.1 的服务器，设置 `auth = "oauth"`。Hermes 实现了完整的 PKCE 流程 —— 元数据发现、动态客户端注册、令牌交换和自动刷新。

```nix
{
  services.hermes-agent.mcpServers.my-oauth-server = {
    url = "https://mcp.example.com/mcp";
    auth = "oauth";
  };
}
```

令牌存储在 `$HERMES_HOME/mcp-tokens/<server-name>.json` 中，在重启和重建后保留。

<details>
<summary><strong>无头服务器上的初始 OAuth 授权</strong></summary>

首次 OAuth 授权需要基于浏览器的授权流程。在无头部署中，Hermes 会将授权 URL 输出到 stdout/日志，而不是打开浏览器。

**方案 A：交互式引导** —— 通过 `docker exec`（容器模式）或 `sudo -u hermes`（原生模式）运行一次流程：

```bash
# 容器模式
docker exec -it hermes-agent \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth

# 原生模式
sudo -u hermes HERMES_HOME=/var/lib/hermes/.hermes \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
```

容器使用 `--network=host`，所以 `127.0.0.1` 上的 OAuth 回调监听器可以从主机浏览器访问。

**方案 B：预种子令牌** —— 在工作站上完成流程，然后复制令牌：

```bash
hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
scp ~/.hermes/mcp-tokens/my-oauth-server{,.client}.json \
    server:/var/lib/hermes/.hermes/mcp-tokens/
# 确保执行: chown hermes:hermes, chmod 0600
```

</details>

### 采样（服务器发起的 LLM 请求）

某些 MCP 服务器可以请求 Agent 进行 LLM 补全：

```nix
{
  services.hermes-agent.mcpServers.analysis = {
    command = "npx";
    args = [ "-y" "analysis-server" ];
    sampling = {
      enabled = true;
      model = "google/gemini-3-flash";
      max_tokens_cap = 4096;
      timeout = 30;
      max_rpm = 10;
    };
  };
}
```

---

## 托管模式

当 Hermes 通过 NixOS 模块运行时，以下 CLI 命令会被**阻止**，并显示描述性错误信息引导你编辑 `configuration.nix`：

| 被阻止的命令 | 原因 |
|---|---|
| `hermes setup` | 配置是声明式的 —— 编辑 Nix 配置中的 `settings` |
| `hermes config edit` | 配置由 `settings` 生成 |
| `hermes config set <key> <value>` | 配置由 `settings` 生成 |
| `hermes gateway install` | systemd 服务由 NixOS 管理 |
| `hermes gateway uninstall` | systemd 服务由 NixOS 管理 |

这可以防止 Nix 声明与磁盘实际状态之间产生偏差。检测使用两个信号：

1. **`HERMES_MANAGED=true`** 环境变量 —— 由 systemd 服务设置，对网关进程可见
2. **`.managed` 标记文件** 位于 `HERMES_HOME` 中 —— 由激活脚本设置，对交互式 Shell 可见（例如 `docker exec -it hermes-agent hermes config set ...` 也会被阻止）

要更改配置，编辑你的 Nix 配置并运行 `sudo nixos-rebuild switch`。

---

## 容器架构

:::info
本节仅在使用 `container.enable = true` 时相关。原生模式部署可跳过。
:::

启用容器模式后，Hermes 在一个持久化的 Ubuntu 容器中运行，Nix 构建的二进制文件以只读方式从主机 bind-mount 进来：

```
主机                                    容器
────                                    ─────────
/nix/store/...-hermes-agent-0.1.0  ──►  /nix/store/... (只读)
~/.hermes -> /var/lib/hermes/.hermes       (符号链接桥接，按 hostUsers 配置)
/var/lib/hermes/                    ──►  /data/          (读写)
  ├── current-package -> /nix/store/...    (符号链接，每次重建时更新)
  ├── .gc-root -> /nix/store/...           (防止 nix-collect-garbage)
  ├── .container-identity                  (sha256 哈希，触发重建)
  ├── .hermes/                             (HERMES_HOME)
  │   ├── .env                             (由 environment + environmentFiles 合并)
  │   ├── config.yaml                      (Nix 生成，激活时深度合并)
  │   ├── .managed                         (标记文件)
  │   ├── .container-mode                  (路由元数据：backend, exec_user 等)
  │   ├── state.db, sessions/, memories/   (运行时状态)
  │   └── mcp-tokens/                      (MCP 服务器的 OAuth 令牌)
  ├── home/                                ──►  /home/hermes    (读写)
  └── workspace/                           (MESSAGING_CWD)
      ├── SOUL.md                          (来自 documents 选项)
      └── (Agent 创建的文件)

容器可写层 (apt/pip/npm):                /usr, /usr/local, /tmp
```

Nix 构建的二进制文件能在 Ubuntu 容器内工作是因为 `/nix/store` 被 bind-mount 了 —— 它自带解释器和所有依赖，不依赖容器的系统库。容器入口点通过 `current-package` 符号链接解析：`/data/current-package/bin/hermes gateway run --replace`。执行 `nixos-rebuild switch` 时，只更新符号链接 —— 容器继续运行。

### 不同场景下的数据持久性

| 事件 | 容器是否重建？ | `/data`（状态） | `/home/hermes` | 可写层（`apt`/`pip`/`npm`） |
|---|---|---|---|---|
| `systemctl restart hermes-agent` | 否 | 保留 | 保留 | 保留 |
| `nixos-rebuild switch`（代码变更） | 否（符号链接更新） | 保留 | 保留 | 保留 |
| 主机重启 | 否 | 保留 | 保留 | 保留 |
| `nix-collect-garbage` | 否（有 GC root） | 保留 | 保留 | 保留 |
| 镜像变更（`container.image`） | **是** | 保留 | 保留 | **丢失** |
| 卷/选项变更 | **是** | 保留 | 保留 | **丢失** |
| `environment`/`environmentFiles` 变更 | 否 | 保留 | 保留 | 保留 |

容器只在**身份哈希**变更时才会被重建。哈希包含：schema 版本、镜像、`extraVolumes`、`extraOptions` 和入口点脚本。环境变量、设置、文档或 Hermes 包本身的变更**不会**触发重建。

:::warning 可写层丢失
当身份哈希变更时（镜像升级、新增卷、新增容器选项），容器会被销毁并从 `container.image` 的新拉取中重建。可写层中任何 `apt install`、`pip install` 或 `npm install` 的包都会丢失。`/data` 和 `/home/hermes` 中的状态会被保留（这些是 bind mount）。

如果 Agent 依赖特定的包，考虑将它们打包到自定义镜像中（`container.image = "my-registry/hermes-base:latest"`），或者在 Agent 的 SOUL.md 中编写安装脚本。
:::

### GC Root 保护

`preStart` 脚本在 `${stateDir}/.gc-root` 创建一个 GC root，指向当前的 Hermes 包。这可以防止 `nix-collect-garbage` 移除正在运行的二进制文件。如果 GC root 因某种原因失效，重启服务会重新创建它。

---

## 开发

### 开发 Shell

Flake 提供了一个开发 Shell，包含 Python 3.11、uv、Node.js 和所有运行时工具：

```bash
cd hermes-agent
nix develop

# Shell 提供：
#   - Python 3.11 + uv（依赖在首次进入时安装到 .venv）
#   - Node.js 20, ripgrep, git, openssh, ffmpeg 在 PATH 上
#   - Stamp 文件优化：依赖未变时重新进入几乎是即时的

hermes setup
hermes chat
```

### direnv（推荐）

项目自带的 `.envrc` 会自动激活开发 Shell：

```bash
cd hermes-agent
direnv allow    # 只需执行一次
# 后续进入几乎是即时的（stamp 文件跳过依赖安装）
```

### Flake 检查

Flake 包含在 CI 和本地运行的构建时验证：

```bash
# 运行所有检查
nix flake check

# 单独运行各项检查
nix build .#checks.x86_64-linux.package-contents   # 二进制文件存在 + 版本
nix build .#checks.x86_64-linux.entry-points-sync  # pyproject.toml ↔ Nix 包同步
nix build .#checks.x86_64-linux.cli-commands        # gateway/config 子命令
nix build .#checks.x86_64-linux.managed-guard       # HERMES_MANAGED 阻止修改
nix build .#checks.x86_64-linux.bundled-skills      # 包中包含 Skills
nix build .#checks.x86_64-linux.config-roundtrip    # 合并脚本保留用户键
```

<details>
<summary><strong>每项检查验证什么</strong></summary>

| 检查项 | 验证内容 |
|---|---|
| `package-contents` | `hermes` 和 `hermes-agent` 二进制文件存在且 `hermes version` 可运行 |
| `entry-points-sync` | `pyproject.toml` 中每个 `[project.scripts]` 条目在 Nix 包中都有对应的封装二进制 |
| `cli-commands` | `hermes --help` 暴露了 `gateway` 和 `config` 子命令 |
| `managed-guard` | `HERMES_MANAGED=true hermes config set ...` 输出 NixOS 错误信息 |
| `bundled-skills` | Skills 目录存在、包含 SKILL.md 文件、封装中设置了 `HERMES_BUNDLED_SKILLS` |
| `config-roundtrip` | 7 种合并场景：全新安装、Nix 覆盖、用户键保留、混合合并、MCP 增量合并、嵌套深度合并、幂等性 |

</details>

---

## 选项参考

### 核心

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enable` | `bool` | `false` | 启用 hermes-agent 服务 |
| `package` | `package` | `hermes-agent` | 要使用的 hermes-agent 包 |
| `user` | `str` | `"hermes"` | 系统用户 |
| `group` | `str` | `"hermes"` | 系统组 |
| `createUser` | `bool` | `true` | 自动创建用户/组 |
| `stateDir` | `str` | `"/var/lib/hermes"` | 状态目录（`HERMES_HOME` 父目录） |
| `workingDirectory` | `str` | `"${stateDir}/workspace"` | Agent 工作目录（`MESSAGING_CWD`） |
| `addToSystemPackages` | `bool` | `false` | 将 `hermes` CLI 加入系统 PATH 并全局设置 `HERMES_HOME` |

### 配置

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `settings` | `attrs`（深度合并） | `{}` | 声明式配置，渲染为 `config.yaml`。支持任意嵌套；多个定义通过 `lib.recursiveUpdate` 合并 |
| `configFile` | `null` 或 `path` | `null` | 指向现有 `config.yaml` 的路径。设置后完全覆盖 `settings` |

### 密钥与环境

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `environmentFiles` | `listOf str` | `[]` | 包含密钥的环境文件路径。在激活时合并到 `$HERMES_HOME/.env` |
| `environment` | `attrsOf str` | `{}` | 非机密环境变量。**在 Nix store 中可见** —— 不要放置密钥 |
| `authFile` | `null` 或 `path` | `null` | OAuth 凭据种子。仅在首次部署时复制 |
| `authFileForceOverwrite` | `bool` | `false` | 激活时始终从 `authFile` 覆盖 `auth.json` |

### 文档

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `documents` | `attrsOf (either str path)` | `{}` | 工作空间文件。键为文件名，值为内联字符串或路径。激活时安装到 `workingDirectory` |

### MCP 服务器

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mcpServers` | `attrsOf submodule` | `{}` | MCP 服务器定义，合并到 `settings.mcp_servers` |
| `mcpServers.<name>.command` | `null` 或 `str` | `null` | 服务器命令（stdio 传输） |
| `mcpServers.<name>.args` | `listOf str` | `[]` | 命令参数 |
| `mcpServers.<name>.env` | `attrsOf str` | `{}` | 服务器进程的环境变量 |
| `mcpServers.<name>.url` | `null` 或 `str` | `null` | 服务器端点 URL（HTTP/StreamableHTTP 传输） |
| `mcpServers.<name>.headers` | `attrsOf str` | `{}` | HTTP 头，例如 `Authorization` |
| `mcpServers.<name>.auth` | `null` 或 `"oauth"` | `null` | 认证方式。`"oauth"` 启用 OAuth 2.1 PKCE |
| `mcpServers.<name>.enabled` | `bool` | `true` | 启用或禁用此服务器 |
| `mcpServers.<name>.timeout` | `null` 或 `int` | `null` | 工具调用超时时间（秒，默认：120） |
| `mcpServers.<name>.connect_timeout` | `null` 或 `int` | `null` | 连接超时时间（秒，默认：60） |
| `mcpServers.<name>.tools` | `null` 或 `submodule` | `null` | 工具过滤（`include`/`exclude` 列表） |
| `mcpServers.<name>.sampling` | `null` 或 `submodule` | `null` | 服务器发起的 LLM 请求的采样配置 |

### 服务行为

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `extraArgs` | `listOf str` | `[]` | `hermes gateway` 的额外参数 |
| `extraPackages` | `listOf package` | `[]` | 服务 PATH 上的额外包（仅原生模式） |
| `restart` | `str` | `"always"` | systemd `Restart=` 策略 |
| `restartSec` | `int` | `5` | systemd `RestartSec=` 值 |

### 容器

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `container.enable` | `bool` | `false` | 启用 OCI 容器模式 |
| `container.backend` | `enum ["docker" "podman"]` | `"docker"` | 容器运行时 |
| `container.image` | `str` | `"ubuntu:24.04"` | 基础镜像（运行时拉取） |
| `container.extraVolumes` | `listOf str` | `[]` | 额外卷挂载（`host:container:mode`） |
| `container.extraOptions` | `listOf str` | `[]` | 传递给 `docker create` 的额外参数 |
| `container.hostUsers` | `listOf str` | `[]` | 交互式用户，会获得指向服务 stateDir 的 `~/.hermes` 符号链接，并自动加入 `hermes` 组 |

---

## 目录布局

### 原生模式

```
/var/lib/hermes/                     # stateDir（属主 hermes:hermes，权限 0750）
├── .hermes/                         # HERMES_HOME
│   ├── config.yaml                  # Nix 生成（每次重建时深度合并）
│   ├── .managed                     # 标记：CLI 配置修改被阻止
│   ├── .env                         # 由 environment + environmentFiles 合并
│   ├── auth.json                    # OAuth 凭据（种子后自管理）
│   ├── gateway.pid
│   ├── state.db
│   ├── mcp-tokens/                  # MCP 服务器的 OAuth 令牌
│   ├── sessions/
│   ├── memories/
│   ├── skills/
│   ├── cron/
│   └── logs/
├── home/                            # Agent HOME
└── workspace/                       # MESSAGING_CWD
    ├── SOUL.md                      # 来自 documents 选项
    └── (Agent 创建的文件)
```

### 容器模式

相同的布局，挂载到容器中：

| 容器路径 | 主机路径 | 模式 | 说明 |
|---|---|---|---|
| `/nix/store` | `/nix/store` | `只读` | Hermes 二进制 + 所有 Nix 依赖 |
| `/data` | `/var/lib/hermes` | `读写` | 所有状态、配置、工作空间 |
| `/home/hermes` | `${stateDir}/home` | `读写` | 持久化 Agent 主目录 —— `pip install --user`、工具缓存 |
| `/usr`、`/usr/local`、`/tmp` | （可写层） | `读写` | `apt`/`pip`/`npm` 安装 —— 重启后保留，重建时丢失 |

---

## 更新

```bash
# 更新 Flake 输入
nix flake update hermes-agent --flake /etc/nixos

# 重建
sudo nixos-rebuild switch
```

在容器模式下，`current-package` 符号链接会被更新，Agent 在重启时使用新的二进制文件。无需重建容器，不会丢失已安装的包。

---

## 故障排除

:::tip Podman 用户
下面所有 `docker` 命令对 `podman` 同样适用。如果你设置了 `container.backend = "podman"`，请相应替换。
:::

### 服务日志

```bash
# 两种模式使用相同的 systemd unit
journalctl -u hermes-agent -f

# 容器模式：也可直接查看
docker logs -f hermes-agent
```

### 容器检查

```bash
systemctl status hermes-agent
docker ps -a --filter name=hermes-agent
docker inspect hermes-agent --format='{{.State.Status}}'
docker exec -it hermes-agent bash
docker exec hermes-agent readlink /data/current-package
docker exec hermes-agent cat /data/.container-identity
```

### 强制重建容器

如果你需要重置可写层（全新 Ubuntu）：

```bash
sudo systemctl stop hermes-agent
docker rm -f hermes-agent
sudo rm /var/lib/hermes/.container-identity
sudo systemctl start hermes-agent
```

### 验证密钥是否加载

如果 Agent 启动了但无法通过 LLM 提供商认证，检查 `.env` 文件是否正确合并：

```bash
# 原生模式
sudo -u hermes cat /var/lib/hermes/.hermes/.env

# 容器模式
docker exec hermes-agent cat /data/.hermes/.env
```

### GC Root 验证

```bash
nix-store --query --roots $(docker exec hermes-agent readlink /data/current-package)
```

### 常见问题

| 症状 | 原因 | 解决方案 |
|---|---|---|
| `Cannot save configuration: managed by NixOS` | CLI 守卫已激活 | 编辑 `configuration.nix` 并执行 `nixos-rebuild switch` |
| 容器意外重建 | `extraVolumes`、`extraOptions` 或 `image` 发生了变更 | 正常现象 —— 可写层重置。重新安装包或使用自定义镜像 |
| `hermes version` 显示旧版本 | 容器未重启 | `systemctl restart hermes-agent` |
| `/var/lib/hermes` 权限被拒绝 | 状态目录权限为 `0750 hermes:hermes` | 使用 `docker exec` 或 `sudo -u hermes` |
| `nix-collect-garbage` 删除了 Hermes | GC root 丢失 | 重启服务（preStart 会重建 GC root） |
| `no container with name or ID "hermes-agent"`（Podman） | Podman rootful 容器对普通用户不可见 | 为 podman 添加免密 sudo（参见[容器感知 CLI](#container-aware-cli)章节） |
| `unable to find user hermes` | 容器仍在启动（入口点尚未创建用户） | 等待几秒后重试 —— CLI 会自动重试 |

---
> 📝 本文由 AI 翻译，如有疑问请参考[英文原版](/getting-started/nix-setup)
