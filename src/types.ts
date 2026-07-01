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
 * 基于 Cloudflare Log Push http_requests 数据集的全量字段规范（specs/Field.md）
 * 排除已废弃字段：OriginResponseBytes、OriginResponseTime、WAFFlags、WAFMatchedVar
 */
export interface CFLogPayload {
  // ==================== AI 安全与内容识别 ====================
  /** AI 安全检测到的 Prompt 注入攻击可能性得分 */
  ai_security_injection_score: number | null;
  /** 请求中检测到的敏感个人信息（PII）类别列表 */
  ai_security_pii_categories: string[] | null;
  /** 请求中包含的 AI Token 数量 */
  ai_security_token_count: number | null;
  /** 检测到的不安全主题或违规内容类别 */
  ai_security_unsafe_topic_categories: string[] | null;

  // ==================== 机器人管理 ====================
  /** 触发的机器人检测启发式算法 ID 列表 */
  bot_detection_ids: string[] | null;
  /** 机器人检测分类标签列表 */
  bot_detection_tags: string[] | null;
  /** 客户端机器人评分（1-100，分数越低越可能是爬虫/攻击） */
  bot_score: number | null;
  /** 计算该 BotScore 的来源或特征方法 */
  bot_score_src: string | null;
  /** 机器人分类特征标签（如 verifiedBot） */
  bot_tags: string[] | null;
  /** 受信任的已知机器人分类（如搜索引擎、社交监控等） */
  verified_bot_category: string | null;

  // ==================== 缓存行为 ====================
  /** 缓存命中状态（hit, miss, expired, bypass, dynamic） */
  cache_cache_status: string | null;
  /** 从 Cloudflare 缓存中直接向客户端响应的字节数 */
  cache_response_bytes: number | null;
  /** 缓存响应的 HTTP 状态码 */
  cache_response_status: number | null;
  /** 该请求是否通过分层缓存（Tiered Cache）进行回源 */
  cache_tiered_fill: string | null;

  // ==================== 客户端连接与元数据 ====================
  /** 客户端的自治系统号（ASN） */
  client_asn: number | null;
  /** 客户端自治系统对应的服务商描述 */
  client_asn_description: string | null;
  /** 客户端 IP 对应的近似城市 */
  client_city: string | null;
  /** 客户端 IP 对应的 ISO-3166 两字母国家/地区代码 */
  client_country: string | null;
  /** 客户端设备类型（desktop, mobile, tablet 等） */
  client_device_type: string | null;
  /** 客户端真实 IP 地址 */
  client_ip: string | null;
  /** 客户端 IP 分类（tor, allowlist, noRecord 等） */
  client_ip_class: string | null;
  /** mTLS 客户端证书的指纹 */
  client_mtls_auth_cert_fingerprint: string | null;
  /** mTLS 身份验证状态 */
  client_mtls_auth_status: string | null;
  /** 客户端 IP 对应的二级行政区/省份代码 */
  client_region_code: string | null;
  /** 客户端发来的 HTTP 请求总字节数 */
  client_request_bytes: number | null;
  /** 客户端请求的主机名（如 blog.xxx.com） */
  client_request_host: string | null;
  /** HTTP 请求方法（GET, POST, OPTIONS 等） */
  client_request_method: string | null;
  /** 请求的 URI 路径（不含 Query 字符串） */
  client_request_path: string | null;
  /** 客户端使用的 HTTP 协议版本 */
  client_request_protocol: string | null;
  /** 请求的来源页面（Referer Header 值） */
  client_request_referer: string | null;
  /** 请求使用的协议方案（http 或 https） */
  client_request_scheme: string | null;
  /** 请求的来源类型（eyeball、edgeWorkerFetch 等） */
  client_request_source: string | null;
  /** 包含完整 Path 和 Query 的请求 URI */
  client_request_uri: string | null;
  /** 浏览器 User-Agent 字符串 */
  client_request_user_agent: string | null;
  /** 客户端协商使用的 SSL/TLS 密码套件 */
  client_ssl_cipher: string | null;
  /** 客户端使用的 SSL/TLS 协议版本（如 TLSv1.3） */
  client_ssl_protocol: string | null;
  /** 客户端发起请求的源端口号 */
  client_src_port: number | null;
  /** 客户端与 Cloudflare 节点之间的 TCP 往返时间（RTT），单位毫秒 */
  client_tcp_rtt_ms: number | null;
  /** 客户端发送的 X-Requested-With 标头 */
  client_x_requested_with: string | null;
  /** 自定义配置记录的 Cookie 内容（受自定义字段规则约束） */
  cookies: string | null;

  // ==================== 边缘节点响应 ====================
  /** 处理该请求的 CF 边缘节点机场代码（如 SJC, SHA） */
  edge_colo_code: string | null;
  /** 边缘节点内部数字 ID */
  edge_colo_id: number | null;
  /** 边缘路由操作类型 */
  edge_pathing_op: string | null;
  /** 路由决策的来源模块 */
  edge_pathing_src: string | null;
  /** 边缘路由状态码 */
  edge_pathing_status: string | null;
  /** 触发边缘速率限制后的处置动作 */
  edge_rate_limit_action: string | null;
  /** 被触发的速率限制规则 ID */
  edge_rate_limit_id: string | null;
  /** 边缘节点接收到请求的主机名（通常同 ClientRequestHost） */
  edge_request_host: string | null;
  /** 返回给客户端的响应体大小 */
  edge_response_body_bytes: number | null;
  /** 响应体的内容类型（Content-Type） */
  edge_response_content_type: string | null;
  /** Cloudflare 返回给客户端的最终 HTTP 状态码 */
  edge_response_status: number | null;
  /** 接收到请求时的时间戳 — Workers 中不可用，仅记录 */
  edge_start_timestamp: string | null;

  // ==================== 源站交互 ====================
  /** 等待源站响应的时长 */
  origin_response_duration_ms: number | null;
  /** 源站返回的原始 HTTP 状态码 */
  origin_response_status: number | null;

  // ==================== 安全过滤与 WAF 处置 ====================
  /** 匹配的防火墙规则动作数组 */
  firewall_matches_actions: string[] | null;
  /** 匹配的防火墙规则 ID 数组 */
  firewall_matches_rule_ids: string[] | null;
  /** 匹配的防火墙安全源数组 */
  firewall_matches_sources: string[] | null;
  /** 检测到的欺诈攻击类型 */
  fraud_attack: string | null;
  /** 欺诈检测匹配 ID 数组 */
  fraud_detection_ids: string[] | null;
  /** 欺诈检测规则标签 */
  fraud_detection_tags: string[] | null;
  /** 检测到的关联电子邮件风险级别 */
  fraud_email_risk: string | null;
  /** 关联的恶意用户识别 ID */
  fraud_user_id: string | null;
  /** 客户端 TLS 握手指纹（JA3） */
  ja3_hash: string | null;
  /** 新一代 TLS 客户端指纹（JA4） */
  ja4: string | null;
  /** JA4 客户端指纹相关信号指标 */
  ja4_signals: string | null;
  /** 是否通过了 JavaScript 安全质询拦截 */
  js_detection_passed: boolean | null;
  /** 凭据泄漏检查结果 */
  leaked_credential_check_result: string | null;
  /** 匹配到的所有 WAF/防火墙规则 */
  matched_rules: string | null;
  /** 安全防护对该请求采取的第一类动作（block, challenge, allow 等） */
  security_action: string | null;
  /** 安全防护应用的所有动作集合 */
  security_actions: string[] | null;
  /** 触发的安全规则描述 */
  security_rule_description: string | null;
  /** 触发的主安全规则 ID */
  security_rule_id: string | null;
  /** 触发的所有安全规则 ID 数组 */
  security_rule_ids: string[] | null;
  /** 安全事件的来源子系统（如 waf, rateLimit 等） */
  security_sources: string[] | null;
  /** WAF 总体攻击评分 */
  waf_attack_score: number | null;
  /** 针对远程代码执行（RCE）的攻击评分 */
  waf_rce_attack_score: number | null;
  /** 针对 SQL 注入（SQLi）的攻击评分 */
  waf_sqli_attack_score: number | null;
  /** 针对跨站脚本（XSS）的攻击评分 */
  waf_xss_attack_score: number | null;

  // ==================== 自定义字段、路由与 Worker ====================
  /** 如果该请求是由 Worker 发起的子请求，此字段表示父级请求的 RayID */
  parent_ray_id: string | null;
  /** 本请求的全局唯一标识符 */
  ray_id: string | null;
  /** 用户自定义记录的请求 Header 数组 */
  request_headers: Record<string, string> | null;
  /** 用户自定义记录的响应 Header 数组 */
  response_headers: Record<string, string> | null;
  /** Worker 执行消耗的 CPU 时间（微秒） */
  worker_cpu_time: number | null;
  /** 处理该请求的 Worker 脚本名称 */
  worker_script_name: string | null;
  /** Worker 脚本的最终执行状态（如 ok, exception 等） */
  worker_status: string | null;
  /** 该请求本身是否是 Worker 发起的子请求（true 或 false） */
  worker_subrequest: boolean | null;
  /** 该请求在生命周期内发起的子请求总数 */
  worker_subrequest_count: number | null;
  /** Worker 执行对应的挂钟时间（微秒） */
  worker_wall_time_us: number | null;
  /** 站点在 Cloudflare 上的 Zone 唯一标识 ID */
  zone_id: string | null;
  /** 站点的顶级域名（如 xxx.com） */
  zone_name: string | null;

  // ==================== 保留字段（向后兼容旧版调用方） ====================
  /** ISO 8601 UTC 时间戳 */
  timestamp: string;
  /** 客户端真实 IP（CF-Connecting-IP） */
  ip: string;
  /** 国家/地区代码（如 "CN"、"US"） */
  country: string;
  /** 城市名称（如 "Shanghai"） */
  city: string;
  /** Cloudflare 边缘数据中心代码（如 "SHA"） */
  colo: string;
  /** HTTP 请求方法 */
  method: string;
  /** 完整请求 URL */
  url: string;
  /** 浏览器 User-Agent 字符串 */
  userAgent: string;
  /** Referer 标头值 */
  referer: string;
  /** 源站返回的 HTTP 状态码 */
  status: number;
  /** 请求耗时（毫秒） */
  duration_ms: number;
  /** HTTP 协议版本（HTTP/2、HTTP/3） */
  protocol: string;
  /** TLS 协议版本（TLSv1.2、TLSv1.3） */
  tls_version: string;
}
