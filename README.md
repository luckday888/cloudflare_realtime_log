# Cloudflare 实时日志收集系统

## 项目说明

这是一个基于 Cloudflare Workers 的系统，用于从 Cloudflare 获取实时访问日志并转发到您的日志收集系统。该系统针对 Cloudflare Workers 免费版进行了优化，不依赖 Logpush 功能。

## 项目结构

```
cloudflare-realtime-log/
├── src/
│   ├── worker.js          # Cloudflare Worker 主入口
│   ├── handlers/
│   │   └── logHandler.js  # 日志处理逻辑
│   └── utils/
│       └── logProcessor.js # 日志解析和处理工具
├── wrangler.toml          # Cloudflare Workers 配置
└── package.json           # 项目依赖
```

## 功能说明

1. **日志接收**：通过代理转发请求，同时收集访问日志
2. **日志处理**：解析、格式化日志数据
3. **日志转发**：将处理后的日志发送到您的 Fluent-Bit 服务器
4. **实时性**：通过 Cloudflare Workers 实现低延迟日志处理

## 针对免费版的优化

由于 Cloudflare 免费版不支持 Logpush 功能，本系统通过以下方式实现日志收集：
- 通过代理转发请求的方式收集访问日志
- 在每个请求中收集完整的访问信息
- 使用 `ctx.waitUntil` 实现异步日志发送，不影响用户访问

## 配置说明

### 环境变量（在 Cloudflare Workers 控制台设置）：

- `FLUENT_BIT_URL`：Fluent-Bit 接收端点（必填）
- `FLUENT_BIT_TOKEN`：认证 Token（必填，用于安全验证）
- `X_CDN_SIGNATURE`：CDN 签名 Header（可选）

## 部署方法

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Cloudflare Workers

首先需要安装 wrangler CLI（如果还没有安装）：

```bash
npm install -g wrangler
```

然后登录到 Cloudflare：

```bash
wrangler login
```

### 3. 部署到 Cloudflare

```bash
npm run deploy
```

或者使用：

```bash
wrangler deploy
```

### 4. 设置环境变量

在 Cloudflare Workers 控制台中设置以下环境变量：
- `FLUENT_BIT_URL`：Fluent-Bit 接收端点
- `FLUENT_BIT_TOKEN`：认证 Token

## 使用方法

### 1. 配置 Cloudflare Worker 代理

由于免费版不支持 Logpush，您需要：
1. 将您的域名指向此 Cloudflare Worker
2. 所有请求都将通过此 Worker 进行代理和日志收集

### 2. 验证部署

您可以使用以下命令测试部署是否成功：

```bash
curl -X POST https://your-worker-url.com/ \
  -d "test=1" \
  -H "Content-Type: text/plain"
```

### 3. 监控和调试

- 查看 Cloudflare Workers 控制台中的日志输出
- 检查 Fluent-Bit 服务器是否收到日志
- 使用 `wrangler tail` 实时查看日志输出

## 重要说明

由于 Cloudflare 免费版不支持 Logpush 功能，本系统采用代理方式收集日志：
- 所有请求必须通过此 Worker 进行代理
- 仅在请求经过此 Worker 时才能收集日志
- 不支持直接从 Cloudflare 推送日志

## 技术特性

- **轻量级处理**：符合 Cloudflare 免费版 10ms CPU 限制
- **非阻塞设计**：使用 `ctx.waitUntil` 异步发送日志，不影响用户访问
- **容错机制**：Fluent-Bit 服务不可用时不会影响主请求流程
- **安全验证**：通过 Token 验证确保日志发送安全
- **数据完整性**：收集完整的访问日志信息包括 IP、地理位置、响应时间等