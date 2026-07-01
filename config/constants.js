// 配置常量
// 默认使用 HTTPS；如果需要使用 HTTP，请在 Cloudflare Workers 环境变量 FLUENT_BIT_URL 里自行配置
// 注意：默认地址已设置为空，运行时必须通过环境变量或配置文件提供合法 URL
export const FLUENT_BIT_URL = '';

// 默认 header，Content-Type 必须为 application/json，其他 header 可以通过 env.FLUNENT_BIT_HEADERS（JSON 字符串）进行覆盖
export const FLUENT_BIT_HEADERS = {
  'Content-Type': 'application/json',
};

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};
