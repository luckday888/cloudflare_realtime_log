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
- **全量字段提取**：覆盖 Cloudflare Log Push `http_requests` 数据集约 80 个字段（AI 安全评分、机器人管理、WAF、缓存、源站交互等）。
- **异步非阻塞**：使用 `ctx.waitUntil` 在响应返回后后台发送日志，不增加页面加载延迟。
- **安全验证**：通过 `FLUENTBIT_TOKEN` 请求头保护 Fluent-Bit HTTP 接口。
- **容灾设计**：Fluent-Bit 端异常时静默失败，不影响源站访问。
- **轻量级**：代码保持轻量，适配 Cloudflare 免费版 10ms CPU 限制。

## 项目结构

```
cloudflare-realtime-log/
├── src/
│   ├── index.ts          # Worker 主入口（extractLogData / sendLogToFLuentBit / fetch）
│   └── types.ts          # TypeScript 类型定义（CFLogPayload 全量字段）
├── test/
│   └── index.test.ts     # Vitest 单元测试
├── wrangler.toml         # Wrangler 配置文件
├── vitest.config.ts      # Vitest 配置
├── tsconfig.json
└── package.json
```

## 前置要求

- Node.js >= 18
- npm 或 pnpm
- Cloudflare 账号（需已添加域名到 Cloudflare）
- Wrangler CLI

## 安装依赖

```bash
npm install
```

---

## Cloudflare Workers 部署指南（详细步骤）

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

验证安装：

```bash
wrangler --version
```

### 2. 登录 Cloudflare 账号

```bash
wrangler login
```

浏览器会自动打开 Cloudflare 授权页面，点击 **Allow** 完成授权。验证登录状态：

```bash
wrangler whoami
```

### 3. 配置 `wrangler.toml`

编辑项目根目录下的 `wrangler.toml`，填入你的域名信息：

```toml
name = "cloudflare-realtime-log"
main = "src/index.ts"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

# ⚠️ 关键配置：将 Worker 绑定到要收集日志的路由
# pattern 匹配请求路径，zone_name 必须是你 Cloudflare 账号中托管的域名
routes = [
  { pattern = "yourdomain.com/*",      zone_name = "yourdomain.com" },
  { pattern = "*.yourdomain.com/*",    zone_name = "yourdomain.com" },
]

[vars]
# 生产环境配置（敏感信息请使用 wrangler secret put 设置，不要写在这里）
# FLUENTBIT_URL = "http://your-fluentbit-server:9880/cf.logs"
```

**路由配置说明：**

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `pattern` | 请求匹配规则，支持通配符 | `yourdomain.com/*`、`api.yourdomain.com/v1/*` |
| `zone_name` | Cloudflare 账号中对应的域名 Zone，必须与账号中托管的域名一致 | `yourdomain.com` |
| `zone_id` | 可选，Zone 的数字 ID（可在 CF Dashboard → Overview 右侧找到） | `a]b2c3d4e5...` |

> **注意**：`pattern` 中的域名必须是 `zone_name` 的子域或根域，否则部署会失败。

### 4. 设置环境变量（Secrets）

生产环境中，敏感信息应通过 Wrangler Secrets 注入，不写入代码或配置文件：

```bash
# 设置 Fluent-Bit 接收端 URL（非敏感，也可写入 wrangler.toml 的 [vars]）
wrangler secret put FLUENTBIT_URL
# 输入: http://your-fluentbit-server-ip:9880/cf.logs

# 设置 Fluent-Bit 验证 Token（敏感，必须用 secret）
wrangler secret put FLUENTBIT_TOKEN
# 输入: your-secure-shared-token
```

查看已设置的 Secrets：

```bash
wrangler secret list
```

删除 Secret：

```bash
wrangler secret delete FLUENTBIT_TOKEN
```

### 5. 部署 Worker

```bash
npm run deploy
# 或
wrangler deploy
```

部署成功后会输出类似：

```
Published cloudflare-realtime-log (x.xx sec)
  https://cloudflare-realtime-log.your-subdomain.workers.dev
  https://yourdomain.com/*  (route)
```

### 6. Cloudflare DNS 配置

确保你的域名 DNS 记录正确配置：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名 Zone
3. 进入 **DNS → Records**
4. 确认以下记录存在：

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|---------|
| A / CNAME | `yourdomain.com` | 源站 IP 或 CNAME | **已代理**（橙色云朵 ☁️） |
| CNAME | `*`（通配符，可选） | 源站 IP 或 CNAME | **已代理**（橙色云朵 ☁️） |

> **重要**：只有开启了 Cloudflare 代理（橙色云朵）的 DNS 记录，请求才会经过 Worker。灰色云朵（DNS Only）不会触发 Worker。

### 7. SSL/TLS 设置

在 Cloudflare Dashboard → **SSL/TLS** → **Overview**：

| 设置项 | 推荐值 | 说明 |
|--------|--------|------|
| 加密模式 | **Full (strict)** | Worker 到源站全程 HTTPS，源站需有有效证书 |
| Always Use HTTPS | **开启** | 自动将 HTTP 重定向到 HTTPS |
| Minimum TLS Version | **TLS 1.2** | 安全性要求 |

### 8. 验证部署

部署后，访问你的网站，检查 Worker 是否正常工作：

```bash
# 查看 Worker 实时日志
wrangler tail

# 或查看最近 10 条日志
wrangler tail --format=pretty
```

访问网站后应看到类似输出：

```
[2024-xx-xx xx:xx:xx] GET https://yourdomain.com/ - Ok
```

### 9. 通过 Cloudflare Dashboard 管理

- **查看 Worker 状态**：Dashboard → Workers & Pages → 选择 `cloudflare-realtime-log`
- **查看路由绑定**：Dashboard → Workers & Pages → Worker → Triggers
- **查看实时日志**：Dashboard → Workers & Pages → Worker → Logs → Real-time Logs
- **编辑环境变量**：Dashboard → Workers & Pages → Worker → Settings → Variables and Secrets

---

## Fluent-Bit 接收端配置

参考项目根目录下的 `fluent-bit.conf`。启动命令示例：

```bash
fluent-bit -c fluent-bit.conf
```

### Nginx 反向代理鉴权（推荐）

Fluent-Bit `in_http` 插件不直接支持 Header 鉴权，建议前置 Nginx 校验 Token：

```nginx
server {
    listen 9880;
    server_name fluentbit.yourdomain.com;

    location /cf.logs {
        # 校验 Worker 发送的 Token
        if ($http_fluentbit_token != "your-secure-shared-token") {
            return 403;
        }

        proxy_pass http://127.0.0.1:9880;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 本地开发

```bash
npm run dev
```

开发环境使用 `.dev.vars` 文件注入环境变量：

```
FLUENTBIT_URL=http://localhost:9880/cf.logs
FLUENTBIT_TOKEN=dev-token
```

## 运行测试

```bash
npm run test
```

## 类型检查

```bash
npm run typecheck
```

---

## 日志字段说明

Worker 提取约 **80 个字段**，涵盖以下分类：

### AI 安全与内容识别
| 字段 | 说明 |
|------|------|
| `ai_security_injection_score` | Prompt 注入攻击可能性得分 |
| `ai_security_pii_categories` | 敏感个人信息（PII）类别列表 |
| `ai_security_token_count` | AI Token 数量 |
| `ai_security_unsafe_topic_categories` | 不安全主题分类 |

### 机器人管理
| 字段 | 说明 |
|------|------|
| `bot_score` | 客户端机器人评分（1-100，越低越像爬虫） |
| `bot_score_src` | BotScore 计算来源 |
| `bot_detection_ids` / `bot_detection_tags` | 检测算法 ID 与分类标签 |
| `verified_bot_category` | 受信任已知机器人分类 |

### 缓存行为
| 字段 | 说明 |
|------|------|
| `cache_cache_status` | 缓存命中状态（hit / miss / expired / bypass / dynamic） |
| `cache_response_bytes` | 缓存响应字节数 |
| `cache_response_status` | 缓存响应 HTTP 状态码 |

### 客户端连接与元数据
| 字段 | 说明 |
|------|------|
| `client_ip` | 客户端真实 IP |
| `client_country` / `client_city` / `client_region_code` | 地理位置 |
| `client_asn` / `client_asn_description` | ASN 自治系统号 |
| `client_device_type` | 设备类型（desktop / mobile / tablet） |
| `client_ssl_cipher` / `client_ssl_protocol` | SSL/TLS 信息 |
| `client_tcp_rtt_ms` | TCP 往返时间（毫秒） |
| `client_request_host` / `client_request_path` / `client_request_uri` | 请求信息 |
| `client_request_bytes` | 请求总字节数 |
| `cookies` | Cookie 内容 |

### 边缘节点响应
| 字段 | 说明 |
|------|------|
| `edge_colo_code` / `edge_colo_id` | 边缘节点机场代码与 ID |
| `edge_response_status` | Cloudflare 返回给客户端的最终 HTTP 状态码 |
| `edge_response_body_bytes` | 响应体大小 |
| `edge_response_content_type` | 响应 Content-Type |
| `edge_time_to_first_byte_ms` | TTFB（毫秒） |
| `edge_pathing_op` / `edge_pathing_src` / `edge_pathing_status` | 路由决策信息 |
| `edge_rate_limit_action` / `edge_rate_limit_id` | 速率限制信息 |

### 源站交互
| 字段 | 说明 |
|------|------|
| `origin_response_status` | 源站返回的原始 HTTP 状态码 |
| `origin_response_duration_ms` | 等待源站响应时长（毫秒） |

### 安全过滤与 WAF 处置
| 字段 | 说明 |
|------|------|
| `security_action` | 安全防护主动作（block / challenge / allow） |
| `security_rule_id` / `security_rule_ids` | 触发的安全规则 ID |
| `waf_attack_score` | WAF 总体攻击评分 |
| `waf_sqli_attack_score` / `waf_xss_attack_score` / `waf_rce_attack_score` | 分类攻击评分 |
| `ja3_hash` / `ja4` | TLS 客户端指纹 |
| `firewall_matches_actions` / `firewall_matches_rule_ids` | 防火墙匹配规则 |
| `fraud_attack` / `fraud_user_id` | 欺诈检测信息 |

### 路由、Worker 与 Zone
| 字段 | 说明 |
|------|------|
| `ray_id` | 全局唯一请求 ID |
| `zone_id` / `zone_name` | Zone 标识与域名 |
| `worker_cpu_time` | Worker CPU 时间（微秒） |
| `worker_script_name` | Worker 脚本名称 |
| `worker_subrequest_count` | 子请求总数 |

### 兼容字段（向后兼容）
| 字段 | 说明 |
|------|------|
| `timestamp` | ISO 8601 UTC 时间戳 |
| `ip` / `country` / `city` / `colo` | 基础地理位置 |
| `method` / `url` / `userAgent` / `referer` | 请求基本信息 |
| `status` / `duration_ms` / `protocol` / `tls_version` | 响应与协议信息 |

> 完整字段规范参见 [specs/Field.md](specs/Field.md)。

---

## 常见问题排查

### Worker 没有收到请求

- 确认 DNS 记录已开启 Cloudflare 代理（橙色云朵 ☁️）
- 检查 `wrangler.toml` 中的 `routes` 配置是否与实际访问的域名匹配
- 运行 `wrangler tail` 查看实时日志

### Fluent-Bit 收不到日志

- 检查 `FLUENTBIT_URL` 是否可达：`curl -X POST http://your-server:9880/cf.logs`
- 检查 `FLUENTBIT_TOKEN` 是否与 Nginx 校验的 Token 一致
- 查看 Worker 日志中是否有 `Failed to send log to Fluent-Bit` 错误

### 部署时报错 "zone not found"

- 确认 `wrangler.toml` 中的 `zone_name` 与 Cloudflare 账号中托管的域名完全一致
- 可使用 `zone_id` 替代 `zone_name`，在 Dashboard → Overview 右侧找到 Zone ID

### Worker 超时或 CPU 超限

- Cloudflare 免费版限制每次请求 CPU 时间 ≤ 10ms
- 如频繁超限，检查是否在 Worker 中引入了重型依赖
- 可考虑升级到 Workers Paid 计划（$5/月，CPU 限制提升至 50ms）

---

## 注意事项

- Cloudflare 免费版每次请求 CPU 时间上限为 10ms，请避免在 Worker 中执行复杂计算。
- 发送日志的超时时间设置为 60 秒，超时后自动取消请求。
- 所有日志发送异常均被捕获并静默处理，不会影响源站响应。
- 部分 Cloudflare 特有字段（如 Bot 管理、WAF 评分等）仅在开启对应付费功能后才有值，否则为 `null`。
