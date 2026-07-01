# Cloudflare 日志分流项目

## 项目背景
本项目旨在为使用 Cloudflare 免费计划的用户提供一种方案，通过 Cloudflare Workers 将 CDN 访问日志异步发送到自建日志收集系统（loki+Grafana+fluent‑bit）。

## 核心功能（MVP）
1. **异步将 Cloudflare CDN 的访问日志** 发送到自建日志搜集系统。
2. **非 JSON 日志自动转换** 为 JSON 格式。
3. **敏感信息加密**，防止上传到公共仓库时泄露。
4. **可自定义 Fluent‑Bit 地址** 并支持 **多重 Header** 配置。
5. **支持 HTTP 与 HTTPS**。

> **关键改动**：Fluent‑Bit 的默认地址已移除，**必须通过环境变量 FLUENT_BIT_URL 配置**。若未提供，系统将抛出错误并终止请求。

## 配置说明
- **Fluent‑Bit 地址**：默认为空，运行时 **必须** 在 Cloudflare Workers 环境变量 `FLUENT_BIT_URL` 或 `wrangler.toml` 的环境变量中配置合法 URL。
- **Header**：默认仅包含 `Content-Type: application/json`。若需添加其它 Header，使用 `FLUNENT_BIT_HEADERS` 环境变量，内容为 JSON 字符串，例如：
  ```bash
  wrangler secret put FLUNENT_BIT_HEADERS '"{\"X-Custom-Header\":\"value\"}"'
  ```
- **X‑CDN‑Signature**：若需要该 Header，请在 Cloudflare Workers Secrets 中添加 `X_CDN_SIGNATURE`。
- **敏感信息加密**：目前使用 Base64 编码占位，后续可替换为 AES 等安全加密算法。

## 开发与部署使用说明
> **⚠️ 前提**：本项目仅在 Cloudflare Workers 环境中运行，且需要 Node.js 18+ 与 Wrangler 3+。

### 1. 克隆仓库
```bash
git clone https://github.com/your-username/cloudflare_realtime_log.git
cd cloudflare_realtime_log
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
| 变量 | 说明 | 如何配置 |
|------|------|-----------|
| `FLUENT_BIT_URL` | Fluent‑Bit 接收日志的 URL（必填） | 通过 `wrangler.toml` 或 `wrangler secret put` 设置 |
| `FLUNENT_BIT_HEADERS` | 自定义 Header，JSON 字符串 | 通过 `wrangler secret put FLUNENT_BIT_HEADERS` 设置 |
| `X_CDN_SIGNATURE` | 可选的 CDN 签名 Header | 通过 `wrangler secret put X_CDN_SIGNATURE` 设置 |

**示例**：
```bash
# 1. 设置 Fluent‑Bit URL
wrangler secret put FLUENT_BIT_URL "https://your-fluent-bit:8092"

# 2. （可选）自定义 Header
wrangler secret put FLUNENT_BIT_HEADERS '"{\"X-APP\":\"cloudflare-logs\"}"'

# 3. 设置 CDN 签名（如果需要）
wrangler secret put X_CDN_SIGNATURE '6z9z0NbGSI5jDxnaiax8Ga87r5cfK2Eox7oTojzwh5ekCxDIz65Ld5wRRP2zu0GL'
```

### 4. 本地调试
> 通过 `wrangler dev` 启动本地模拟环境，您可以在 Workers 控制台或日志中验证功能。
```bash
npm run dev
```

**测试日志 POST**（假设日志为 key=value 形式）：
```bash
curl -X POST http://127.0.0.1:8787 -d "remote=10.0.0.1 edge=cloudflare-zhang" -H "Content-Type: text/plain"
```

### 5. 生产部署
> 请确保已在 Cloudflare Workers Dashboard 配置好 **域名路由** 与 **Secrets**。
```bash
# 生产环境部署
npm run deploy
```
> Wrangler 会自动上传 Workers 脚本并应用您在 `wrangler.toml` 中的 `route` 配置。

### 6. 验证日志转发
- 在 Cloudflare Workers 控制台查看 Worker 日志，确认无错误。
- 在 Fluent‑Bit、Grafana 或 Loki 中查看是否收到并解析日志。

### 7. CI/CD（可选）
如需将该 Worker 与 GitHub Actions 集成：
```yaml
# .github/workflows/deploy.yml
name: Deploy Cloudflare Worker
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          secret: FLUENT_BIT_URL,FLUNENT_BIT_HEADERS,X_CDN_SIGNATURE
```

### 8. 运行日志处理单元测试（可选）
> 目前未提供单元测试，若需要可自行在 `tests/` 目录编写 Jest/uvu 等测试脚本。

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

---

如有任何问题，欢迎在 Issues 中反馈。
