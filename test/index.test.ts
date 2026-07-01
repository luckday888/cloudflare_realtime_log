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
      },
    });

    fetchMock
      .get('https://example.com')
      .intercept({ method: 'POST', path: '/test' })
      .reply(201, 'created');

    let capturedBody: string | undefined;
    fetchMock
      .get('http://localhost:9880')
      .intercept({
        method: 'POST',
        path: '/cf.logs',
        headers: {
          'X-Auth-Token': 'test-token',
        },
      })
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
    expect(body.ip).toBe('1.2.3.4');
    expect(body.method).toBe('POST');
    expect(body.userAgent).toBe('test-agent');
    expect(body.referer).toBe('https://referer.com');
    expect(body.status).toBe(201);
    expect(body.duration_ms).toBeGreaterThanOrEqual(0);
    expect(body.url).toBe('https://example.com/test');
  });

  it('当 request.cf 缺失时，相关字段应降级为 unknown', async () => {
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
  });
});
