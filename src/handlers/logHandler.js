/**
 * Log handling functions for Cloudflare Worker
 */

/**
 * Handles the logging process
 * @param {Object} params - Parameters for log handling
 * @param {Object} params.request - Incoming request
 * @param {Object} params.response - Response from origin server
 * @param {number} params.duration - Request duration in milliseconds
 * @param {Object} params.env - Environment variables
 * @param {Object} params.ctx - Context object
 * @returns {Promise<void>}
 */
export async function handleLog(params) {
  const { request, response, duration, env, ctx } = params;

  try {
    // Extract log data
    const logData = extractLogData(request, response, duration);

    // Validate and sanitize
    const sanitizedData = validateAndSanitizeLogData(logData);

    // Format for Fluent-Bit
    const formattedData = formatForFluentBit(sanitizedData);

    // Send to Fluent-Bit asynchronously
    ctx.waitUntil(sendLogToFluentBit(formattedData, env));
  } catch (error) {
    console.warn('Error in log handling:', error.message);
  }
}

/**
 * Extracts log data from request and response
 * @param {Request} request - Incoming request
 * @param {Response} response - Response from origin server
 * @param {number} duration - Duration of request in milliseconds
 * @returns {Object} Formatted log payload
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
 * @param {Object} payload - Log data to send
 * @param {Object} env - Environment variables
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
 * Validates and sanitizes log data
 * @param {Object} logData - Raw log data to validate
 * @returns {Object} Validated and sanitized log data
 */
function validateAndSanitizeLogData(logData) {
  // Ensure all required fields are present
  const sanitized = {
    timestamp: logData.timestamp || new Date().toISOString(),
    ip: logData.ip || '',
    country: logData.country || '',
    city: logData.city || '',
    colo: logData.colo || '',
    method: logData.method || 'GET',
    url: logData.url || '',
    userAgent: logData.userAgent || '',
    referer: logData.referer || '',
    status: logData.status || 0,
    duration_ms: logData.duration_ms || 0,
    protocol: logData.protocol || '',
    tls_version: logData.tls_version || ''
  };

  // Sanitize URL to prevent injection
  try {
    if (sanitized.url) {
      const url = new URL(sanitized.url);
      sanitized.url = url.href;
    }
  } catch (error) {
    // If URL is invalid, keep the original (but log the error)
    console.warn('Invalid URL in log data:', sanitized.url);
  }

  return sanitized;
}

/**
 * Formats log data for Fluent-Bit
 * @param {Object} logData - Raw log data
 * @returns {Object} Formatted log data for Fluent-Bit
 */
function formatForFluentBit(logData) {
  // Apply any specific formatting needed for Fluent-Bit
  return {
    ...logData,
    // Ensure timestamp is in correct ISO format
    timestamp: new Date(logData.timestamp).toISOString()
  };
}