export async function sendLogToFluentBit(logData, env) {
  // 从环境变量获取配置
  const url = env?.FLUENT_BIT_URL;

  // 关键：默认地址为空，必须在运行时提供
  if (!url) {
    throw new Error('Fluent-Bit URL not configured. Please set FLUENT_BIT_URL in the environment.');
  }

  // 默认 header，Content-Type 必须为 application/json，其他 header 可以通过 env.FLUNENT_BIT_HEADERS（JSON 字符串）进行覆盖
  let headers = {
    'Content-Type': 'application/json',
  };

  // 如果 env 中提供了 FLUNENT_BIT_HEADERS（JSON 字符串），合并到 headers
  if (env?.FLUNENT_BIT_HEADERS) {
    try {
      const custom = JSON.parse(env.FLUNENT_BIT_HEADERS);
      headers = { ...headers, ...custom };
    } catch (e) {
      console.error('解析自定义 headers 失败:', e);
    }
  }

  // 如果提供了 X_CDN_SIGNATURE，加入 header
  if (env?.X_CDN_SIGNATURE) {
    headers['X-CDN-Signature'] = env.X_CDN_SIGNATURE;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('发送日志到fluent-bit失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
