---
sidebar_position: 11
title: "Model Catalog"
description: "托管在文档站点的远程 JSON 清单，用于驱动 OpenRouter 和 Nous Portal 的精选模型选择器列表。"
---

# Model Catalog

Hermes 从一个与文档站点托管在一起的 JSON 清单中获取 **OpenRouter** 和 **Nous Portal** 的精选模型列表。这使得维护者无需发布新的 `hermes-agent` 版本即可更新选择器列表。

当清单不可达（离线、网络阻塞、托管失败）时，Hermes 会静默回退到 CLI 附带的内置快照。清单永远不会破坏选择器——最坏的情况是您看到的是与已安装版本捆绑的列表。

## 实时清单 URL

```
https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
```

每次合并到 `main` 分支时通过现有的 `deploy-site.yml` GitHub Pages 流水线发布。真实来源位于仓库的 `website/static/api/model-catalog.json`。

## 模式

```json
{
  "version": 1,
  "updated_at": "2026-04-25T22:00:00Z",
  "metadata": {},
  "providers": {
    "openrouter": {
      "metadata": {},
      "models": [
        {"id": "moonshotai/kimi-k2.6", "description": "recommended", "metadata": {}},
        {"id": "openai/gpt-5.4",       "description": ""}
      ]
    },
    "nous": {
      "metadata": {},
      "models": [
        {"id": "anthropic/claude-opus-4.7"},
        {"id": "moonshotai/kimi-k2.6"}
      ]
    }
  }
}
```

字段说明：

- **`version`** — 整数模式版本。未来模式会递增此值；Hermes 会拒绝不理解版本的清单，并回退到硬编码快照。
- **`metadata`** — 自由格式字典，位于清单、提供商和模型级别。任意键。Hermes 会忽略未知字段，因此您可以向条目添加注释（`"tier": "paid"`, `"tags": [...]` 等）而无需协调模式变更。
- **`description`** — 仅限 OpenRouter。驱动选择器徽章文本（`"recommended"`、`"free"` 或空）。Nous Portal 不使用此字段——免费层级门控由 Portal 的定价端点实时决定。
- **定价和上下文长度**不在清单中。这些在获取时来自实时提供商 API（`/v1/models` 端点，models.dev）。

## 获取行为

| 情况 | 行为 |
|---|---|
| `/model` 或 `hermes model` | 如果磁盘缓存过期则获取，否则使用缓存 |
| 磁盘缓存新鲜（< TTL） | 不产生网络请求 |
| 网络失败但有缓存 | 静默回退到缓存，记录一行日志 |
| 网络失败且无缓存 | 静默回退到内置快照 |
| 清单模式验证失败 | 视为不可达 |

缓存位置：`~/.hermes/cache/model_catalog.json`。

## 配置

```yaml
model_catalog:
  enabled: true
  url: https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
  ttl_hours: 24
  providers: {}
```

设置 `enabled: false` 可完全禁用远程获取，始终使用内置快照。

### 每个提供商的覆盖 URL

第三方可以使用相同的模式托管自己的精选列表。将提供商指向自定义 URL：

```yaml
model_catalog:
  providers:
    openrouter:
      url: https://example.com/my-openrouter-curation.json
```

覆盖清单只需填充它关心的提供商块。其他提供商继续针对主 URL 解析。

## 更新清单

维护者：

```bash
# 从内置硬编码列表重新生成（在 hermes_cli/models.py 中编辑
# OPENROUTER_MODELS 或 _PROVIDER_MODELS["nous"] 后保持清单同步）。
python scripts/build_model_catalog.py
```

然后将生成的 `website/static/api/model-catalog.json` 的更改 PR 到 `main` 分支。文档站点在合并时自动部署，新清单在几分钟内生效。

您也可以直接手动编辑 JSON 以进行不属于内置快照的细粒度元数据更改——生成器脚本是一个便捷工具，而非唯一真实来源。
