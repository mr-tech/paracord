import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

const OK_RESPONSE = { status: 200, body: { ok: true } };

describe('AC-7.3 — request options cross the proxy wire', () => {
  it('params reach the origin in the request path, exactly as the local path would send them', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    await api.request('GET', '/channels/1/messages', { local: true, params: { limit: 7 } });
    const localPath = origin.requestReceipts[0]!.path;

    await api.request('GET', '/channels/1/messages', { params: { limit: 7 } });
    const proxiedPath = origin.requestReceipts[1]!.path;

    expect(proxiedPath).toBe(localPath);
    expect(proxiedPath).toContain('limit=7');

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 10000);

  it.each([
    ['returnOnRateLimit', { returnOnRateLimit: true }],
    ['maxRateLimitRetry: 0', { maxRateLimitRetry: 0 }],
  ])('%s reaches the proxy\'s own ApiRequest — a 429 origin is not retried/queued (one origin request total)', async (_label, options) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse({
      status: 429,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-reset-after': '0.05',
        'retry-after': '0.05',
      },
      body: { message: 'rate limited', retry_after: 0.05 },
    });
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    await expect(api.request('POST', '/channels/1/messages', { ...options, data: { content: 'hi' } }))
      .rejects.toThrow();
    expect(origin.acceptCount).toBe(1);

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 10000);

  it('createForm\'s JSON-representable product (headers, params, plain-object data) resolves client-side and crosses the wire', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    await api.request('POST', '/channels/1/messages', {
      createForm: () => ({ data: { content: 'from a form' }, headers: { 'x-form': '1' }, params: { flag: true } }),
    });

    const receipt = origin.requestReceipts[0]!;
    expect(JSON.parse(receipt.body)).toEqual({ content: 'from a form' });
    expect(receipt.path).toContain('flag=true');
    expect(origin.receivedHeaders[0]!['x-form']).toBe('1');

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 10000);

  it.each([
    ['control: no options at all', {},
      { params: null, returnOnRateLimit: false, returnOnGlobalRateLimit: false, retriesLeft: null }],
    ['params only', { params: { limit: 7, after: 'abc' } },
      { params: JSON.stringify({ limit: 7, after: 'abc' }), returnOnRateLimit: false, returnOnGlobalRateLimit: false, retriesLeft: null }],
    ['returnOnRateLimit: true', { returnOnRateLimit: true },
      { params: null, returnOnRateLimit: true, returnOnGlobalRateLimit: false, retriesLeft: null }],
    ['returnOnGlobalRateLimit: true — no other cell drives this', { returnOnGlobalRateLimit: true },
      { params: null, returnOnRateLimit: false, returnOnGlobalRateLimit: true, retriesLeft: null }],
    ['maxRateLimitRetry: 0', { maxRateLimitRetry: 0 },
      { params: null, returnOnRateLimit: false, returnOnGlobalRateLimit: false, retriesLeft: 0 }],
    ['all four at once, each a distinct value', { params: { a: 1 }, returnOnRateLimit: true, returnOnGlobalRateLimit: true, maxRateLimitRetry: 2 },
      { params: JSON.stringify({ a: 1 }), returnOnRateLimit: true, returnOnGlobalRateLimit: true, retriesLeft: 2 }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as Array<[string, Record<string, unknown>, Record<string, any>]>)('%s reaches the proxy\'s own ApiRequest by value', async (_label, options, expected) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxyApi = rpc.server.apiClient as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seen: any[] = [];
    const realSend = proxyApi.sendRequest.bind(proxyApi);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proxyApi.sendRequest = (req: any, fromQueue?: boolean) => {
      seen.push({
        params: req.params === undefined ? null : JSON.stringify(req.params),
        returnOnRateLimit: req.returnOnRateLimit,
        returnOnGlobalRateLimit: req.returnOnGlobalRateLimit,
        retriesLeft: req.retriesLeft === undefined ? null : req.retriesLeft,
      });
      return realSend(req, fromQueue);
    };

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });
    await api.request('GET', '/channels/1/messages', options as never);

    expect(seen[0]).toEqual(expected);

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 20000);
});
