import {
  describe, it, expect, afterEach, vi,
} from 'vitest';

import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type { ScriptedResponse } from '../harness/loopbackApiOrigin';

/**
 * The Cloudflare 1015 answer Discord's edge gave statbot-interaction-handler on 2026-11-02:
 * status 429, a JSON body whose `retry_after` is in seconds, and no `X-RateLimit-*` or
 * `retry-after` headers (paracord handoff cloudflare-1015-backoff-coverage-2026-11-02.md).
 */
const CLOUDFLARE_1015_JSON: ScriptedResponse = {
  status: 429,
  headers: { 'content-type': 'application/json' },
  body: {
    title: 'Error 1015: You are being rate limited',
    status: 429,
    error_code: 1015,
    error_name: 'rate_limited',
    cloudflare_error: true,
    retryable: true,
    retry_after: 30,
    zone: 'discord.com',
  },
};

const OK: ScriptedResponse = { status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } };

const BODY_RETRY_AFTER_MS = 30_000;
// The request queue re-checks held requests once a second; two ticks and a margin.
const QUEUE_TICKS_MS = 2_500;

function sleep(ms: number) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

describe('Api 429 handling: a Cloudflare 1015 JSON body with retry_after in seconds', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the request until retry_after seconds have passed, then sends it once', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([CLOUDFLARE_1015_JSON, OK]);
    const api = await createApiAgainstOrigin(origin);

    const beforeRequest = Date.now();
    const pending = api.request('GET', '/channels/999', {
      local: true, returnOnRateLimit: false, returnOnGlobalRateLimit: false,
    }).catch((err: unknown) => err);

    await origin.waitForAccept(1);
    await sleep(200);
    const afterHandled = Date.now();

    // Any instant before beforeRequest + 30 000 ms precedes the hold's end, wherever in
    // [beforeRequest, afterHandled] the 429 was handled.
    vi.setSystemTime(beforeRequest + BODY_RETRY_AFTER_MS - 1);
    await sleep(QUEUE_TICKS_MS);
    expect(origin.acceptCount).toBe(1);

    vi.setSystemTime(afterHandled + BODY_RETRY_AFTER_MS + 1);
    await origin.waitForAccept(2, QUEUE_TICKS_MS + 1_000);
    expect(origin.acceptCount).toBe(2);

    const result = await pending;
    expect(result).toMatchObject({ status: 200 });

    api.end();
    await origin.close();
  }, 15_000);

  it('on the rpc rate-limit service path, also holds the request until retry_after seconds have passed', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([CLOUDFLARE_1015_JSON, OK]);
    const rpc = await LoopbackRpcServer.start();
    const api = await createApiAgainstOrigin(origin);
    await api.addRateLimitService({ port: rpc.port, host: '127.0.0.1', allowFallback: false });

    const beforeRequest = Date.now();
    const pending = api.request('GET', '/channels/999', {
      local: false, returnOnRateLimit: false, returnOnGlobalRateLimit: false,
    }).catch((err: unknown) => err);

    await origin.waitForAccept(1);
    await sleep(200);
    const afterHandled = Date.now();

    vi.setSystemTime(beforeRequest + BODY_RETRY_AFTER_MS - 1);
    await sleep(QUEUE_TICKS_MS);
    expect(origin.acceptCount).toBe(1);

    vi.setSystemTime(afterHandled + BODY_RETRY_AFTER_MS + 1);
    await origin.waitForAccept(2, QUEUE_TICKS_MS + 1_000);
    expect(origin.acceptCount).toBe(2);

    const result = await pending;
    expect(result).toMatchObject({ status: 200 });

    api.end();
    await origin.close();
    await rpc.close();
  }, 15_000);

  it('records current behaviour: the hold is per request, so a request to another route still sends at once', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([CLOUDFLARE_1015_JSON, OK, OK]);
    const api = await createApiAgainstOrigin(origin);

    const beforeRequest = Date.now();
    void api.request('GET', '/channels/999', {
      local: true, returnOnRateLimit: false, returnOnGlobalRateLimit: false,
    }).catch(() => undefined);
    await origin.waitForAccept(1);
    await sleep(200);

    void api.request('GET', '/guilds/123', { local: true }).catch(() => undefined);
    await origin.waitForAccept(2, QUEUE_TICKS_MS);
    expect(origin.acceptCount).toBe(2);

    vi.setSystemTime(beforeRequest + BODY_RETRY_AFTER_MS - 1);
    await sleep(QUEUE_TICKS_MS);
    expect(origin.acceptCount).toBe(2);

    api.end();
    await origin.close();
  }, 15_000);
});
