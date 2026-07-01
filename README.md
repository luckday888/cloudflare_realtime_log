# Cloudflare 实时日志转发

## 项目概述

本项目基于 Cloudflare Workers 开发，旨在将 CDN 访问日志异步发送至自建日志收集系统（如 loki + Grafana + fluent‑bit）。
Worker 能够：

- 解析非 JSON 日志（`key=value` 形式）并转换为 JSON。
- 对所有字符串字段做 Base64（占位）加密，防止敏感信息泄露。
- 通过 Cloudflare Workers Secrets 配置 HTTP Header（含可选 `X‑CDN‑Signature`）。
- 通过 GitHub Actions 自动在每次推送到 `main` 分支时部署。

## 功能亮点

| 功能              | 描述                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| 异步转发          | 使用 `fetch` 发送日志，推送过程不会阻塞请求。                             |
| 自动 JSON 转换    | 解析 `key=value` 形式的日志。                                             |
| Header 自定义     | 通过 `FLUNENT_BIT_HEADERS`（JSON 字符串）秘密配置任意 Header。            |
| Secret‑Based 配置 | 所有关键配置均存放在 Cloudflare Workers Secrets，代码仓库不包含敏感信息。 |
| CI/CD 友好        | GitHub Actions `deploy.yml` 仅需三条 Secret 即可完成自动部署。            |

## 环境要求

- Node.js **18+**（本地开发）
- Wrangler CLI **3+**
- Cloudflare Workers 账户与 Worker Namespace
- Fluent‑Bit 实例（支持 HTTPS，亦可使用 HTTP）

## 本地安装 & 开发

```bash
# 克隆仓库
git clone https://github.com/your-username/cloudflare_realtime_log.git
cd cloudflare_realtime_log

# 安装依赖
npm ci

# 本地启动（热重载）
npm run dev
```

Worker 本地地址：`http://127.0.0.1:8787`
可直接发送日志进行测试：

```bash
curl -X POST http://127.0.0.1:8787 \
  -d "remote=10.0.0.1 edge=cloudflare-zhang" \
  -H "Content-Type: text/plain"
```

返回示例（已 Base64 编码）：

```json
{
  "success": true,
  "data": {
    "remote": "MTExLjIuMzQ=",
    "edge": "Y2ZsbGVmcmEuamVhbGxldA==",
    "processedAt": "2024-08-01T12:34:56.789Z"
  }
}
```

## 配置

在 Workers 控制台或通过 `wrangler secret put` 设置以下 Secrets：

| Secret                | 作用                        | 示例                                                               |
| --------------------- | --------------------------- | ------------------------------------------------------------------ |
| `FLUENT_BIT_URL`      | Fluent‑Bit 接收端点（必填） | `https://your-fluent-bit:8092`                                     |
| `FLUNENT_BIT_HEADERS` | 需要的自定义 Header（可选） | `{"X-APP":"cloudflare-logs"}`                                      |
| `X_CDN_SIGNATURE`     | CDN 签名 Header（可选）     | `6z9z0NbGSI5jDxnaiax8Ga87r5cfK2Eox7oTojzwh5ekCxDIz65Ld5wRRP2zu0GL` |

> **提示**：所有配置均存放在 Secrets，仓库中不存放任何敏感信息。

## 使用方法

- **部署后**：向 `https://your-domain.com/*` 发送 `POST` 请求即可。
- **日志格式**：
  - JSON：直接发送对象。
  - `key=value`：任意数量键值对，用空格分隔。
- **请求示例**：

```bash
curl -X POST https://your-domain.com/* \
  -d "remote=10.0.0.1 edge=cloudflare-zhang" \
  -H "Content-Type: text/plain"
```

Worker 会返回包含解析后的日志、发送结果与 `success` 标记的 JSON。

## 生产部署

编辑 `wrangler.toml`（已包含）：

```toml
name = "cloudflare-realtime-log"
main = "src/worker.js"
compatibility_date = "2023-12-01"

[env.production]
name = "cloudflare-realtime-log"
route = "your-domain.com/*"
```

使用 Wrangler 发布：

```bash
npm run deploy
```

## CI / GitHub Actions

工作流文件位于 `.github/workflows/deploy.yml`，每次推送到 `main` 时自动部署。
只需在 **Repository Settings → Secrets** 添加以下三条 Secret：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `FLUENT_BIT_URL,FLUNENT_BIT_HEADERS,X_CDN_SIGNATURE`

## 验证

1. **Worker 控制台**：检查无错误，返回 `success:true`。
2. **Fluent‑Bit / Loki / Grafana**：确认日志已被接收并索引。

## 目录结构

```
cloudflare-realtime-log/
├── src/                 # 源代码目录
│   ├── worker.js        # Cloudflare Worker 主脚本
│   ├── utils/           # 工具函数
│   │   └── logProcessor.js  # 负责日志解析、加密和时间戳处理
│   └── handlers/        # 业务处理器
│       └── logHandler.js   # 调用 logProcessor 并发送日志至 Fluent‑Bit
├── config/              # 配置文件
│   ├── constants.js     # 常量配置（Fluent‑Bit 地址、Header、日志级别）
└── docs/                # 文档目录
    └── PRD.md
```

## 贡献

欢迎提交 Issue 与 PR，所有变更请使用描述性提交信息。
