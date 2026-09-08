import {
  describe, it, expect, afterEach,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';

import type Api from '../../src/clients/Api/Api';

const INFORMATION_FREE = {
  status: 429,
  headers: { 'content-type': 'application/json' },
  body: { message: 'You are being rate limited.' },
} as const;

const SHARED_SCOPE = {
  status: 429,
  headers: { 'content-type': 'application/json', 'x-ratelimit-scope': 'shared', 'retry-after': '1' },
  body: { message: 'The resource is being rate limited.' },
} as const;

const OK = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: { ok: true },
} as const;

describe('information-free 429 backoff (AC-9.8)', () => {
  let origin: LoopbackApiOrigin | undefined;
  let api: Api | undefined;

  afterEach(async () => {
    api?.end();
    await origin?.close();
    origin = undefined;
    api = undefined;
  });
  it('gap_n lies in [0.8*s_n, 1.2*s_n + tick] for n = 1..3, and cannot be a flat schedule', async () => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([INFORMATION_FREE, INFORMATION_FREE, INFORMATION_FREE, INFORMATION_FREE, OK]);
    api = await createApiAgainstOrigin(origin);

    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);

    await origin.waitForAccept(4, 30000);
    const t = origin.requestCount;
    const gaps = [t[1]! - t[0]!, t[2]! - t[1]!, t[3]! - t[2]!];
    const TICK = 1000;
    const S = [1000, 2000, 4000];

    gaps.forEach((gap, i) => {
      expect(gap, `gap${i + 1} (observed ${gaps.join(', ')})`).toBeGreaterThanOrEqual(0.8 * S[i]!);
      expect(gap, `gap${i + 1} (observed ${gaps.join(', ')})`).toBeLessThanOrEqual(1.2 * S[i]! + TICK);
    });
  }, 40000);

  it('resets to s_1 after a non-information-free response, rather than continuing to grow', async () => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([INFORMATION_FREE, INFORMATION_FREE, SHARED_SCOPE, INFORMATION_FREE, OK]);
    api = await createApiAgainstOrigin(origin);

    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);

    await origin.waitForAccept(4, 15000);
    const [, , t2, t3] = origin.requestCount;

    const gapAfterReset = t3 - t2;
    expect(gapAfterReset).toBeGreaterThanOrEqual(0.8 * 1000);
    expect(gapAfterReset).toBeLessThan(3200);
  }, 20000);

  it('maxRateLimitRetry bounds the attempt count regardless of the schedule (AC-9.8)', async () => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([INFORMATION_FREE]);
    api = await createApiAgainstOrigin(origin);

    await expect(
      api.request('GET', '/channels/1', { local: true, maxRateLimitRetry: 2 }),
    ).rejects.toThrow();

    await new Promise((resolve) => { setTimeout(resolve, 300); });
    expect(origin.acceptCount).toBe(2);
  }, 15000);
});
