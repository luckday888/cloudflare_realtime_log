/* 日志处理工具函数
 * 该文件提供日志转换、加密和统一处理的功能。
 * 1. convertToJSON: 将非 JSON 格式的日志字符串转换为 JSON 对象。
 * 2. encryptSensitiveData: 对敏感字段进行加密（目前使用 Base64 编码作为占位实现，后续可替换为真正的加密算法）。
 * 3. processLog: 对原始日志字符串进行完整处理，包括转换、时间戳添加和敏感信息加密。
 */

export function convertToJSON(logLine) {
  try {
    if (logLine.trim().startsWith('{')) {
      return JSON.parse(logLine);
    }
    const logObject = {};
    const pairs = logLine.trim().split(/\s+/);
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        logObject[key] = value;
      }
    });
    return logObject;
  } catch (error) {
    console.error('日志解析失败:', error);
    return null;
  }
}

export function encryptSensitiveData(data) {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return btoa(data);
  } catch (e) {
    console.error('加密失败:', e);
    return data;
  }
}

export function processLog(rawLog) {
  const logObject = convertToJSON(rawLog);
  if (!logObject) {
    return null;
  }
  // 统一添加处理时间戳
  logObject.processedAt = new Date().toISOString();
  // 对每个字符串字段进行加密
  Object.keys(logObject).forEach(key => {
    const val = logObject[key];
    if (typeof val === 'string') {
      logObject[key] = encryptSensitiveData(val);
    }
  });
  return logObject;
}
