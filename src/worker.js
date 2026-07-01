/**
 * Cloudflare Worker for real-time log forwarding to Fluent-Bit
 * Implements the core proxy and logging functionality as specified in PRD and SPEC
 * Optimized for Cloudflare Workers Free Tier (no Logpush support)
 */

/**
 * Environment interface for Cloudflare Worker
 * @typedef {Object} Env
 * @property {string} FLUENT_BIT_URL - Fluent-Bit HTTP endpoint URL
 * @property {string} FLUENT_BIT_TOKEN - Authentication token for Fluent-Bit
 */

/**
 * Log payload structure for Fluent-Bit
 * @typedef {Object} CFLogPayload
 * @property {string} timestamp - ISO 8601 formatted timestamp
 * @property {string} ip - Client IP address
 * @property {string} country - Country code
 * @property {string} city - City name
 * @property {string} colo - Cloudflare edge datacenter
 * @property {string} method - HTTP method
 * @property {string} url - Full request URL
 * @property {string} userAgent - User-Agent string
 * @property {string} referer - Referer URL
 * @property {number} status - HTTP status code
 * @property {number} duration_ms - Request duration in milliseconds
 * @property {string} protocol - HTTP protocol version
 * @property {string} tls_version - TLS version
 */

/**
 * Extracts log data from request and response
 * @param {Request} request - Incoming request
 * @param {Response} response - Response from origin server
 * @param {number} duration - Duration of request in milliseconds
 * @returns {CFLogPayload} Formatted log payload
 */
function extractLogData(request, response, duration) {
  // Extract client IP from CF-Connecting-IP header
  const ip = request.headers.get('CF-Connecting-IP') || '';

  // Extract Cloudflare metadata (if available)
  const cf = request.cf || {};

  // Extract User-Agent and Referer
  const userAgent = request.headers.get('User-Agent') || '';
  const referer = request.headers.get('Referer') || '';

  return {
    timestamp: new Date().toISOString(),
    ip,
    country: cf.country || '',
    city: cf.city || '',
    colo: cf.colo || '',
    method: request.method,
    url: request.url,
    userAgent,
    referer,
    status: response.status,
    duration_ms: duration,
    protocol: request.headers.get('HTTP-Version') || request.headers.get('Protocol') || '',
    tls_version: cf.tlsVersion || ''
  };
}

/**
 * Sends log data to Fluent-Bit
 * @param {CFLogPayload} payload - Log data to send
 * @param {Env} env - Environment variables
 * @returns {Promise<void>}
 */
async function sendLogToFluentBit(payload, env) {
  try {
    // Validate environment variables
    if (!env.FLUENT_BIT_URL || !env.FLUENT_BIT_TOKEN) {
      console.warn('Fluent-Bit URL or Token not configured');
      return;
    }

    // Set up timeout for the request to Fluent-Bit
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    const response = await fetch(env.FLUENT_BIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': env.FLUENT_BIT_TOKEN,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log success or failure (but don't throw)
    if (!response.ok) {
      console.warn(`Failed to send log to Fluent-Bit: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    // Silent fail - don't throw to avoid affecting main request flow
    console.warn('Error sending log to Fluent-Bit:', error.message);
  }
}

/**
 * Main fetch handler for Cloudflare Worker
 * @param {Request} request - Incoming HTTP request
 * @param {Env} env - Environment variables
 * @param {Object} ctx - Context object
 * @returns {Promise<Response>}
 */
export default {
  async fetch(request, env, ctx) {
    // Record start time for duration calculation
    const startTime = Date.now();

    try {
      // Forward the request to the origin server
      const response = await fetch(request);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Extract log data
      const logData = extractLogData(request, response, duration);

      // Asynchronously send log data to Fluent-Bit using waitUntil
      // This ensures the log sending doesn't block the response to the client
      ctx.waitUntil(sendLogToFluentBit(logData, env));

      // Return the response from the origin server to the client
      return response;
    } catch (error) {
      // In case of error, still return the response to the client
      // but log the error for debugging
      console.error('Error in Cloudflare Worker:', error);
      throw error;
    }
  }
};