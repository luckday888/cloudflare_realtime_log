// Cloudflare Worker 主文件

import { handleLogBatch, sendLogToFluentBit } from './handlers/logHandler.js';
import { processLog } from './utils/logProcessor.js';

/**
 * Cloudflare Worker 入口点
 */
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'POST') {
      try {
        const body = await request.text();
        // 支持单行或多行日志（以\n分隔）
        const logBatch = body.split('\n').filter(Boolean);

        if (logBatch.length > 1) {
          const results = await handleLogBatch(logBatch, env);
          return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          const logData = processLog(body);
          if (logData) {
            const result = await sendLogToFluentBit(logData, env);
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response('Invalid log format', { status: 400 });
          }
        }
      } catch (error) {
        console.error('处理请求时出错:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    return new Response('Cloudflare Realtime Log Forwarder');
  },
};
