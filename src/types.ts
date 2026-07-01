/**
 * Cloudflare Worker 环境变量定义
 */
export interface Env {
  /** Fluent-Bit 接收端完整的 HTTP URL 路径 */
  FLUENTBIT_URL: string;
  /** Fluent-Bit 校验用的 Token，以请求头 FLUENTBIT_TOKEN 形式发送 */
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
