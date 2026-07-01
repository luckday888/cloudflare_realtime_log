import type { Env, CFLogPayload } from './types';

/**
 * 安全地将字符串转为数字，失败时返回 null
 */
function num(val: unknown): number | null {
  if (val === null || val === '' || val === undefined) return null;
  const n = typeof val === 'string' ? parseInt(val, 10) : typeof val === 'number' ? val : NaN;
  return isNaN(n) ? null : n;
}

/**
 * 从请求与响应中提取结构化日志数据
 * 基于 Cloudflare Log Push http_requests 数据集的全量字段规范
 *
 * 保留 13 个旧版兼容字段（ip / country / city / colo / method / url /
 *   userAgent / referer / status / duration_ms / protocol / tls_version），
 * 同时补全其余新字段（蛇形命名以区分）。
 *
 * 注意：需通过 Log Push 获取的字段（如 EdgeResponseBytes、OriginIP 等）
 * 已在类型定义中移除，仅保留 Workers 运行时可访问的字段。
 */
function extractLogData(
  request: Request,
  response: Response,
  duration: number,
): CFLogPayload {
  const startTime = Date.now();
  const cf: Record<string, unknown> = (request.cf ?? {}) as Record<
    string,
    unknown
  >;
  const headers = request.headers;

  // ========== 基础提取（来自 cf 对象） ==========
  const ip = (headers.get('CF-Connecting-IP') as string) || 'unknown';
  const country = (cf.country as string) || 'unknown';
  const city = (cf.city as string) || 'unknown';
  const colo = (cf.colo as string) || 'unknown';
  const protocol = (cf.httpProtocol as string) || 'unknown';
  const tlsVersion = (cf.tlsVersion as string) || 'unknown';

  // ========== 客户端元数据提取 ==========
  const clientAsn = num(cf.asn);
  const clientAsnDescription = (cf.asnOrganization as string) || null;
  const clientCity = (cf.city as string) || null;
  const clientCountry = (cf.country as string) || null;
  const clientDeviceType = (cf.deviceModel as string) || null;
  const clientIp = (headers.get('CF-Connecting-IP') as string) || null;
  const clientIpClass = (cf.clientIpClass as string) || null;
  const clientRegionCode = (cf.region as string) || null;
  const clientRequestBytes = num(request.headers.get('Content-Length'));
  const clientRequestHost = (cf.requestHost as string) || null;
  const clientRequestMethod = request.method || null;
  const parsedUrl = new URL(request.url);
  const clientRequestPath = parsedUrl.pathname || null;
  const clientRequestProtocol = (cf.httpProtocol as string) || null;
  const clientRequestReferer = (headers.get('Referer') as string) || null;
  const clientRequestScheme = parsedUrl.protocol.slice(0, -1) || null; // "https:" → "https"
  const clientRequestSource = (cf.type as string) || null;
  const clientRequestUri = request.url || null;
  const clientRequestUserAgent = (headers.get('User-Agent') as string) || null;
  const clientSslCipher = (cf.sslCipher as string) || null;
  const clientSslProtocol = (cf.tlsVersion as string) || null;
  const clientSrcPort = num(cf.srcPort);
  const clientTcpRttMs = num(cf.tcpRttMs);
  const clientXRequestedWith = (headers.get('X-Requested-With') as string) || null;
  const cookies = (headers.get('Cookie') as string) || null;

  // ========== AI 安全评分 ==========
  const aiSecurityInjectionScore = num(cf.aiSecurityInjectionScore);
  const aiSecurityPiiCategories = cf.aiSecurityPiiCategories
    ? (cf.aiSecurityPiiCategories as string).split(',')
    : null;
  const aiSecurityTokenCount = num(cf.aiSecurityTokenCount);
  const aiSecurityUnsafeTopicCategories = cf.aiSecurityUnsafeTopicCategories
    ? (cf.aiSecurityUnsafeTopicCategories as string).split(',')
    : null;

  // ========== 机器人管理 ==========
  const botDetectionIds = cf.botDetectionIds
    ? (cf.botDetectionIds as string).split(',')
    : null;
  const botDetectionTags = cf.botDetectionTags
    ? (cf.botDetectionTags as string).split(',')
    : null;
  const botScore = num(cf.botScore);
  const botScoreSrc = (cf.botScoreSrc as string) || null;
  const botTags = cf.botTags
    ? (cf.botTags as string).split(',')
    : null;
  const verifiedBotCategory = (cf.verifiedBotCategory as string) || null;

  // ========== 缓存行为 ==========
  const cacheCacheStatus = (cf.cacheCacheStatus as string) || null;
  const cacheResponseBytes = num(cf.cacheResponseBytes);
  const cacheResponseStatus = num(cf.cacheResponseStatus);
  const cacheTieredFill = (cf.cacheTieredFill as string) || null;

  // ========== WAF & 安全 ==========
  const wafAttackScore = num(cf.wafAttackScore);
  const wafRceAttackScore = num(cf.wafRceAttackScore);
  const wafSQLiAttackScore = num(cf.wafSQLiAttackScore);
  const wafXssAttackScore = num(cf.wafXssAttackScore);
  const securityAction = (cf.securityAction as string) || null;
  const securityActions = cf.securityActions
    ? (cf.securityActions as string).split(',')
    : null;
  const securityRuleDescription = (cf.securityRuleDescription as string) || null;
  const securityRuleId = (cf.securityRuleId as string) || null;
  const securityRuleIds = cf.securityRuleIds
    ? (cf.securityRuleIds as string).split(',')
    : null;
  const securitySources = cf.securitySources
    ? (cf.securitySources as string).split(',')
    : null;
  const ja3Hash = (cf.ja3Hash as string) || null;
  const ja4 = (cf.ja4 as string) || null;
  const ja4Signals = (cf.ja4Signals as string) || null;
  const jsDetectionPassed = cf.jsDetectionPassed !== undefined
    ? Boolean(cf.jsDetectionPassed)
    : null;
  const leakedCredentialCheckResult = (cf.leakedCredentialCheckResult as string) || null;
  const matchedFields = cf.matchedFields as Record<string, unknown> | undefined;
  const matchedRules = (matchedFields?.matchAll as string) || null;
  const fraudAttack = (cf.fraudAttack as string) || null;
  const fraudDetectionIds = cf.fraudDetectionIds
    ? (cf.fraudDetectionIds as string).split(',')
    : null;
  const fraudDetectionTags = cf.fraudDetectionTags
    ? (cf.fraudDetectionTags as string).split(',')
    : null;
  const fraudEmailRisk = (cf.fraudEmailRisk as string) || null;
  const fraudUserId = (cf.fraudUserId as string) || null;
  const firewallMatches = cf.firewallMatches as Record<string, unknown> | undefined;
  const firewallMatchesActions = firewallMatches?.actions
    ? (firewallMatches.actions as string).split(',')
    : null;
  const firewallMatchesRuleIds = firewallMatches?.ruleIds
    ? (firewallMatches.ruleIds as string).split(',')
    : null;
  const firewallMatchesSources = firewallMatches?.sources
    ? (firewallMatches.sources as string).split(',')
    : null;
  const mTlsAuthCertFingerprint = (cf.mtlsAuthCertFingerprint as string) || null;
  const mTlsAuthStatus = (cf.mtlsAuthStatus as string) || null;

  // ========== 边缘节点响应 ==========
  const edgeColoCode = (cf.colo as string) || null;
  const edgeColoId = num(cf.coloid);
  const edgePathingOp = (cf.edgePathingOp as string) || null;
  const edgePathingSrc = (cf.edgePathingSrc as string) || null;
  const edgePathingStatus = (cf.edgePathingStatus as string) || null;
  const edgeRateLimitAction = (cf.rateLimitAction as string) || null;
  const edgeRateLimitId = (cf.rateLimitId as string) || null;
  const edgeRequestHost = (cf.requestHost as string) || null;
  const edgeResponseBodyBytes = num(response.headers.get('Content-Length'));
  const edgeResponseContentType = response.headers.get('Content-Type') || null;
  const edgeResponseStatus = response.status || null;
  const edgeStartTimestamp = new Date(startTime).toISOString();

  // ========== 源站交互 ==========
  const originResponseDurationMs = duration; // Worker 计算的整体耗时作为近似值
  const originResponseStatus = response.status || null;

  // ========== 路由、Worker 与 Zone ==========
  const rayId = (headers.get('CF-Ray') as string) || null;
  const parentRayId = (headers.get('Parent-Ray-ID') as string) || null;
  const zoneId = (cf.zoneId as string) || null;
  const zoneName = (cf.zoneName as string) || null;
  const workerCpuTime = num(request.headers.get('Cf-Worker-Cpu-Time'));
  const workerScriptName = (cf.workerScriptName as string) || null;
  const workerStatus = (cf.workerStatus as string) || null;
  const workerSubrequest = (cf.workerSubrequest as string) === 'true'
    ? true
    : (cf.workerSubrequest as string) === 'false'
      ? false
      : null;
  const workerSubrequestCount = num(cf.workerSubrequestCount);
  const workerWallTimeUs = num(cf.workerWallTimeUs);

  // ========== 请求/响应 Headers 快照 ==========
  const requestHeaders: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    requestHeaders[key] = value;
  }

  // 从响应中捕获 Headers
  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    responseHeaders[key] = value;
  }

  // ========== 构建结果对象 ==========
  return {
    // --- AI 安全与内容识别 ---
    ai_security_injection_score: aiSecurityInjectionScore,
    ai_security_pii_categories: aiSecurityPiiCategories,
    ai_security_token_count: aiSecurityTokenCount,
    ai_security_unsafe_topic_categories: aiSecurityUnsafeTopicCategories,

    // --- 机器人管理 ---
    bot_detection_ids: botDetectionIds,
    bot_detection_tags: botDetectionTags,
    bot_score: botScore,
    bot_score_src: botScoreSrc,
    bot_tags: botTags,
    verified_bot_category: verifiedBotCategory,

    // --- 缓存行为 ---
    cache_cache_status: cacheCacheStatus,
    cache_response_bytes: cacheResponseBytes,
    cache_response_status: cacheResponseStatus,
    cache_tiered_fill: cacheTieredFill,

    // --- 客户端连接与元数据 ---
    client_asn: clientAsn,
    client_asn_description: clientAsnDescription,
    client_city: clientCity,
    client_country: clientCountry,
    client_device_type: clientDeviceType,
    client_ip: clientIp,
    client_ip_class: clientIpClass,
    client_mtls_auth_cert_fingerprint: mTlsAuthCertFingerprint,
    client_mtls_auth_status: mTlsAuthStatus,
    client_region_code: clientRegionCode,
    client_request_bytes: clientRequestBytes,
    client_request_host: clientRequestHost,
    client_request_method: clientRequestMethod,
    client_request_path: clientRequestPath,
    client_request_protocol: clientRequestProtocol,
    client_request_referer: clientRequestReferer,
    client_request_scheme: clientRequestScheme,
    client_request_source: clientRequestSource,
    client_request_uri: clientRequestUri,
    client_request_user_agent: clientRequestUserAgent,
    client_ssl_cipher: clientSslCipher,
    client_ssl_protocol: clientSslProtocol,
    client_src_port: clientSrcPort,
    client_tcp_rtt_ms: clientTcpRttMs,
    client_x_requested_with: clientXRequestedWith,
    cookies: cookies,

    // --- 边缘节点响应 ---
    edge_colo_code: edgeColoCode,
    edge_colo_id: edgeColoId,
    edge_pathing_op: edgePathingOp,
    edge_pathing_src: edgePathingSrc,
    edge_pathing_status: edgePathingStatus,
    edge_rate_limit_action: edgeRateLimitAction,
    edge_rate_limit_id: edgeRateLimitId,
    edge_request_host: edgeRequestHost,
    edge_response_body_bytes: edgeResponseBodyBytes,
    edge_response_content_type: edgeResponseContentType,
    edge_response_status: edgeResponseStatus,
    edge_start_timestamp: edgeStartTimestamp,

    // --- 源站交互 ---
    origin_response_duration_ms: originResponseDurationMs,
    origin_response_status: originResponseStatus,

    // --- 安全过滤与 WAF 处置 ---
    firewall_matches_actions: firewallMatchesActions,
    firewall_matches_rule_ids: firewallMatchesRuleIds,
    firewall_matches_sources: firewallMatchesSources,
    fraud_attack: fraudAttack,
    fraud_detection_ids: fraudDetectionIds,
    fraud_detection_tags: fraudDetectionTags,
    fraud_email_risk: fraudEmailRisk,
    fraud_user_id: fraudUserId,
    ja3_hash: ja3Hash,
    ja4: ja4,
    ja4_signals: ja4Signals,
    js_detection_passed: jsDetectionPassed,
    leaked_credential_check_result: leakedCredentialCheckResult,
    matched_rules: matchedRules,
    security_action: securityAction,
    security_actions: securityActions,
    security_rule_description: securityRuleDescription,
    security_rule_id: securityRuleId,
    security_rule_ids: securityRuleIds,
    security_sources: securitySources,
    waf_attack_score: wafAttackScore,
    waf_rce_attack_score: wafRceAttackScore,
    waf_sqli_attack_score: wafSQLiAttackScore,
    waf_xss_attack_score: wafXssAttackScore,

    // --- 自定义字段、路由与 Worker ---
    parent_ray_id: parentRayId,
    ray_id: rayId,
    request_headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : null,
    response_headers: Object.keys(responseHeaders).length > 0 ? responseHeaders : null,
    worker_cpu_time: workerCpuTime,
    worker_script_name: workerScriptName,
    worker_status: workerStatus,
    worker_subrequest: workerSubrequest,
    worker_subrequest_count: workerSubrequestCount,
    worker_wall_time_us: workerWallTimeUs,
    zone_id: zoneId,
    zone_name: zoneName,

    // --- 保留字段（向后兼容） ---
    timestamp: new Date().toISOString(),
    ip,
    country,
    city,
    colo,
    method: request.method,
    url: request.url,
    userAgent: headers.get('User-Agent') || '',
    referer: headers.get('Referer') || '',
    status: response.status,
    duration_ms: duration,
    protocol,
    tls_version: tlsVersion,
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
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(env.FLUENTBIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Fluent-Bit 通过该请求头识别/校验来源，不经过 Nginx 鉴权
          FLUENTBIT_TOKEN: env.FLUENTBIT_TOKEN,
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

    // 1. 转发请求到源站（直接透传，不修改）
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
