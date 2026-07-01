import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { fetchMock } from 'cloudflare:test';
import worker from '../src/index';

const createEnv = () => ({
  FLUENTBIT_URL: 'http://localhost:9880/cf.logs',
  FLUENTBIT_TOKEN: 'test-token',
});

describe('Cloudflare Worker 日志转发', () => {
  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  it('应透明代理源站请求并返回响应', async () => {
    const request = new Request('https://example.com/hello', {
      method: 'GET',
      headers: { 'User-Agent': 'test-agent' },
    });

    fetchMock
      .get('https://example.com')
      .intercept({ method: 'GET', path: '/hello' })
      .reply(200, 'origin response');

    fetchMock
      .get('http://localhost:9880')
      .intercept({ method: 'POST', path: '/cf.logs' })
      .reply(200, 'logged');

    const env = createEnv();
    const waitUntil = vi.fn((promise: Promise<void>) => promise);
    const ctx = { waitUntil } as unknown as ExecutionContext;

    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('origin response');
    expect(waitUntil).toHaveBeenCalledOnce();
  });

  it('应通过 waitUntil 异步发送日志到 Fluent-Bit', async () => {
    const request = new Request('https://example.com/test', {
      method: 'POST',
      headers: {
        'User-Agent': 'test-agent',
        'CF-Connecting-IP': '1.2.3.4',
        Referer: 'https://referer.com',
        'CF-Ray': 'abc123def456',
      },
    });

    fetchMock
      .get('https://example.com')
      .intercept({ method: 'POST', path: '/test' })
      .reply(201, 'created');

    let capturedBody: string | undefined;
    fetchMock
      .get('http://localhost:9880')
      .intercept({ method: 'POST', path: '/cf.logs' })
      .reply(200, (opts: any) => {
        capturedBody = opts.body as string;
        return 'logged';
      });

    const env = createEnv();
    const waitUntilTasks: Promise<void>[] = [];
    const waitUntil = vi.fn((promise: Promise<void>) => {
      waitUntilTasks.push(promise);
      return promise;
    });
    const ctx = { waitUntil } as unknown as ExecutionContext;

    await worker.fetch(request, env, ctx);

    expect(waitUntil).toHaveBeenCalledOnce();
    expect(waitUntilTasks.length).toBe(1);

    await Promise.all(waitUntilTasks);

    expect(capturedBody).toBeDefined();
    const body = JSON.parse(capturedBody!);

    // --- 基础兼容字段 ---
    expect(body.ip).toBe('1.2.3.4');
    expect(body.method).toBe('POST');
    expect(body.userAgent).toBe('test-agent');
    expect(body.referer).toBe('https://referer.com');
    expect(body.status).toBe(201);
    expect(body.duration_ms).toBeGreaterThanOrEqual(0);
    expect(body.url).toBe('https://example.com/test');
    expect(body.timestamp).toBeDefined();
    expect(body.colo).toBeDefined();

    // --- 新字段验证 ---
    expect(body.ray_id).toBe('abc123def456');
    expect(body.client_ip).toBe('1.2.3.4');
    expect(body.client_request_host).toBeDefined();
    expect(body.client_request_method).toBe('POST');
    expect(body.client_request_path).toBe('/test');
    expect(body.request_headers).toBeDefined();

    // --- null fallback 验证（Workers 不可用的字段） ---
    expect(body.ai_security_injection_score).toBe(null);
    expect(body.bot_score).toBe(null);
    expect(body.cache_cache_status).toBe(null);
    expect(body.waf_attack_score).toBe(null);
    expect(body.ja3_hash).toBe(null);
    expect(body.zone_id).toBe(null);
  });

  it('当 request.cf 缺失时，相关字段应降级为 unknown / null', async () => {
    const request = new Request('https://example.com/no-cf');

    fetchMock
      .get('https://example.com')
      .intercept({ method: 'GET', path: '/no-cf' })
      .reply(200, 'ok');

    let capturedBody: string | undefined;
    fetchMock
      .get('http://localhost:9880')
      .intercept({ method: 'POST', path: '/cf.logs' })
      .reply(200, (opts: any) => {
        capturedBody = opts.body as string;
        return 'logged';
      });

    const env = createEnv();
    const waitUntilTasks: Promise<void>[] = [];
    const waitUntil = vi.fn((promise: Promise<void>) => {
      waitUntilTasks.push(promise);
      return promise;
    });
    const ctx = { waitUntil } as unknown as ExecutionContext;

    await worker.fetch(request, env, ctx);
    await Promise.all(waitUntilTasks);

    expect(capturedBody).toBeDefined();
    const body = JSON.parse(capturedBody!);
    expect(body.country).toBe('unknown');
    expect(body.city).toBe('unknown');
    expect(body.colo).toBe('unknown');
    expect(body.tls_version).toBe('unknown');

    // 蛇形命名字段也应 fallback 为 null/empty
    expect(body.client_country).toBe(null);
    expect(body.client_city).toBe(null);
    expect(body.client_ip).toBe(null);
    expect(body.client_ssl_protocol).toBe(null);
    expect(body.protocol).toBe('unknown');
    expect(body.ai_security_injection_score).toBe(null);
    expect(body.waf_attack_score).toBe(null);
    expect(body.security_rule_id).toBe(null);
  });
});
