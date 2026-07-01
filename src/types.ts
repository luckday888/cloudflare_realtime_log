/**
 * Cloudflare Worker 环境变量定义
 */
export interface Env {
  /** Fluent-Bit 接收端完整的 HTTP URL 路径 */
  FLUENTBIT_URL: string;
  /** 用于验证请求合规性的安全 Token */
  FLUENTBIT_TOKEN: string;
}

/**
 * 发送到 Fluent-Bit 的日志载荷结构
 */
export interface CFLogPayload {
  timestamp: string;
  ip: string;
  country: string;
  city: string;
  colo: string;
  method: string;
  url: string;
  userAgent: string;
  referer: string;
  status: number;
  duration_ms: number;
  protocol: string;
  tls_version: string;
}
