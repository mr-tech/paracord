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

/**
 * WP-9b step 6 (D-17), AC-9.8, socket form (b) — the information-free schedule's
 * gaps, observed over real loopback sockets on the real clock: growing, not flat, and
 * reset by any response that is not itself information-free.
 */
describe('information-free 429 backoff (AC-9.8)', () => {
  let origin: LoopbackApiOrigin | undefined;
  let api: Api | undefined;

  afterEach(async () => {
    api?.end();
    await origin?.close();
    origin = undefined;
    api = undefined;
  });

  it('gaps between sends grow: gap 2 is no earlier than 0.8s, gap 3 is no earlier than 1.6s (0.8 * s_n)', async () => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([INFORMATION_FREE, INFORMATION_FREE, INFORMATION_FREE, OK]);
    api = await createApiAgainstOrigin(origin);

    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);

    await origin.waitForAccept(3, 10000);
    const [t0, t1, t2] = origin.requestCount;

    const gap1 = t1 - t0;
    const gap2 = t2 - t1;

    // s_1 = 1s (d_1), s_2 = 2s (d_2); the tick is the floor, so a gap can run a little
    // over its ceiling but never meaningfully under 0.8 * s_n.
    expect(gap1).toBeGreaterThanOrEqual(0.8 * 1000);
    expect(gap2).toBeGreaterThanOrEqual(0.8 * 2000);
    expect(gap2).toBeGreaterThan(gap1);
  }, 15000);

  it('resets to s_1 after a non-information-free response, rather than continuing to grow', async () => {
    origin = await LoopbackApiOrigin.start();
    // send1/2: information-free (count 0->1->2, gaps ~d_1~1s then ~d_2~2s). send3:
    // shared-scope, real timing — resets the count to 0 regardless of what it was.
    // send4: information-free again — if the reset did not happen, this is the *third*
    // consecutive information-free hit and its gap would grow to ~d_3~4s; reset, it is
    // the first again and the gap from send3 is ~d_1~1s.
    origin.setScript([INFORMATION_FREE, INFORMATION_FREE, SHARED_SCOPE, INFORMATION_FREE, OK]);
    api = await createApiAgainstOrigin(origin);

    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);

    await origin.waitForAccept(4, 15000);
    const [, , t2, t3] = origin.requestCount;

    const gapAfterReset = t3 - t2;
    expect(gapAfterReset).toBeGreaterThanOrEqual(0.8 * 1000);
    // Well under d_3's floor (0.8 * 4000 = 3200ms) — the discriminating bound between
    // "reset to s_1" and "continued to s_3".
    expect(gapAfterReset).toBeLessThan(3200);
  }, 20000);
});
