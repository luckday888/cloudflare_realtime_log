/**
 * Utility functions for processing logs in Cloudflare Worker
 */

/**
 * Validates and sanitizes log data
 * @param {Object} logData - Raw log data to validate
 * @returns {Object} Validated and sanitized log data
 */
export function validateAndSanitizeLogData(logData) {
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
export function formatForFluentBit(logData) {
  // Apply any specific formatting needed for Fluent-Bit
  return {
    ...logData,
    // Ensure timestamp is in correct ISO format
    timestamp: new Date(logData.timestamp).toISOString()
  };
}