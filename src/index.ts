import type { Env, CFLogPayload } from './types';

/**
 * 从请求与响应中提取结构化日志数据
 * 保持轻量，避免正则或复杂计算，以符合 Cloudflare 免费版 10ms CPU 限制
 */
function extractLogData(
  request: Request,
  response: Response,
  duration: number,
): CFLogPayload {
  const cf: Record<string, unknown> = (request.cf ?? {}) as Record<
    string,
    unknown
  >;
  const headers = request.headers;

  return {
    timestamp: new Date().toISOString(),
    ip: (headers.get('CF-Connecting-IP') as string) || 'unknown',
    country: (cf.country as string) || 'unknown',
    city: (cf.city as string) || 'unknown',
    colo: (cf.colo as string) || 'unknown',
    method: request.method,
    url: request.url,
    userAgent: headers.get('User-Agent') || '',
    referer: headers.get('Referer') || '',
    status: response.status,
    duration_ms: duration,
    protocol: (cf.httpProtocol as string) || 'unknown',
    tls_version: (cf.tlsVersion as string) || 'unknown',
  };
}

/**
 * 异步发送日志到自建 Fluent-Bit 接收端
 * 所有异常均被捕获，仅记录日志，不抛出，避免影响主请求流程
 */
async function sendLogToFluentBit(
  payload: CFLogPayload,
  env: Env,
): Promise<void> {
  try {
    if (!env.FLUENTBIT_URL || !env.FLUENTBIT_TOKEN) {
      console.warn('FLUENTBIT_URL or FLUENTBIT_TOKEN is not configured');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(env.FLUENTBIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': env.FLUENTBIT_TOKEN,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(
          `Fluent-Bit returned non-2xx status: ${response.status} ${response.statusText}`,
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Failed to send log to Fluent-Bit:', message);
  }
}

/**
 * Cloudflare Worker 主入口
 * 透明代理源站请求，并在响应返回后异步推送访问日志到 Fluent-Bit
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const startTime = Date.now();

    // 1. 转发请求到源站
    const response = await fetch(request);

    // 2. 计算耗时
    const duration = Date.now() - startTime;

    // 3. 提取日志数据
    const logData = extractLogData(request, response, duration);

    // 4. 异步发送日志，不阻塞响应
    ctx.waitUntil(sendLogToFluentBit(logData, env));

    // 5. 立即返回源站响应给客户端
    return response;
  },
};
