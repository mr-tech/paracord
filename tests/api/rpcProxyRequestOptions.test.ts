import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

/**
 * Plan 001 WP-7 step 3, AC-7.3 (M8): every request option the local path carries onto
 * the request — `ApiRequest`'s constructor destructure less `data`/`headers` (already on
 * the wire) and `createForm` (resolved client-side, its own case below) — crosses the
 * proxy: `params`, `returnOnRateLimit`, `returnOnGlobalRateLimit`, `maxRateLimitRetry`.
 * Before this package all four are silently dropped in transit (M8, confirmed live at
 * `ee277b5` by A-2 and qa: `params` observable at the origin without server-side
 * introspection — the proxied receipt's path carries no query string at all).
 */

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

    // `Api#request`'s own `validateStatus` throws on a non-2xx status regardless of
    // `returnOnRateLimit` — the same shape `rateLimit429.test.ts` uses on the other two
    // paths. The discriminator here is that the *option reaching the proxy* is what
    // stops a second origin request: without it, the proxy's own `allowQueue` would
    // queue and retry the 429 against the same origin.
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
});
