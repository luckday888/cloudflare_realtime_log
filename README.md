# Cloudflare Fluent-Bit Logger

基于 Cloudflare Workers 的实时日志转发代理，用于在 Cloudflare 免费版限制下收集网站访问日志，并通过 HTTP 协议异步推送到自建的 Fluent-Bit 接收端。

## 架构

```text
[用户客户端] ────(HTTP/HTTPS)────> [Cloudflare Worker] ────(普通请求)────> [源站服务器]
                                         │ (获取响应后)
                                         ├─ 返回响应给客户端
                                         │ (异步 waitUntil)
                                         └─(HTTP POST + Token)───> [自建 Fluent-Bit] (in_http 插件)
```

## 功能特性

- **透明代理**：保留原始请求方法、路径与 Header，将请求转发至源站。
- **元数据提取**：收集客户端 IP、地理位置、TLS 版本、User-Agent、响应状态码、响应耗时等。
- **异步非阻塞**：使用 `ctx.waitUntil` 在响应返回后后台发送日志，不增加页面加载延迟。
- **安全验证**：通过 `X-Auth-Token` 头部保护 Fluent-Bit HTTP 接口。
- **容灾设计**：Fluent-Bit 端异常时静默失败，不影响源站访问。
- **轻量级**：代码保持轻量，适配 Cloudflare 免费版 10ms CPU 限制。

## 项目结构

```
cloudflare-realtime-log/
├── src/
│   ├── index.ts    # Worker 主入口
│   └── types.ts    # TypeScript 类型定义
├── test/
│   └── index.test.ts   # Vitest 单元测试
├── fluent-bit.conf     # Fluent-Bit 接收端配置样例
├── wrangler.toml       # Wrangler 配置文件
├── package.json
├── tsconfig.json
└── README.md
```

## 前置要求

- Node.js >= 18
- npm 或 pnpm
- Cloudflare 账号与 Wrangler CLI

## 安装依赖

```bash
npm install
```

## 配置

### 1. 本地环境变量（开发测试用）

在项目根目录创建 `.dev.vars`：

```
FLUENTBIT_URL=http://your-fluentbit-server-ip:9880/cf.logs
FLUENTBIT_TOKEN=your-secure-shared-token
```

### 2. 生产环境变量

推荐使用 Wrangler Secret 设置敏感信息：

```bash
wrangler secret put FLUENTBIT_URL
wrangler secret put FLUENTBIT_TOKEN
```

## 本地开发

```bash
npm run dev
```

## 运行测试

```bash
npm run test
```

## 类型检查

```bash
npm run typecheck
```

## 部署

```bash
npm run deploy
```

## Fluent-Bit 接收端配置

参考项目根目录下的 `fluent-bit.conf`。启动命令示例：

```bash
fluent-bit -c fluent-bit.conf
```

> 注意：`in_http` 插件本身不直接支持按 Header 鉴权，建议在生产环境通过 Nginx/Caddy 等反向代理校验 `X-Auth-Token` 后再转发到 Fluent-Bit。

## 日志字段说明

| 字段        | 说明                                  |
| ----------- | ------------------------------------- |
| timestamp   | ISO 8601 格式 UTC 时间戳              |
| ip          | 客户端真实 IP (CF-Connecting-IP)      |
| country     | 国家/地区代码 (request.cf.country)      |
| city        | 城市 (request.cf.city)                |
| colo        | Cloudflare 边缘数据中心 (request.cf.colo) |
| method      | HTTP 请求方法                          |
| url         | 完整请求 URL                           |
| userAgent   | User-Agent 字符串                      |
| referer     | Referer 来源页面                       |
| status      | 源站返回的 HTTP 状态码                 |
| duration_ms | 源站请求耗时（毫秒）                    |
| protocol    | HTTP 协议版本                          |
| tls_version | TLS 版本                               |

## 注意事项

- Cloudflare 免费版每次请求 CPU 时间上限为 10ms，请避免在 Worker 中执行复杂计算。
- 发送日志的超时时间设置为 2500ms，超时后自动取消请求。
- 所有日志发送异常均被捕获并静默处理，不会影响源站响应。
