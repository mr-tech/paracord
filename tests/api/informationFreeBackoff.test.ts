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
 *
 * WP-7 step 7 (D-50, AC-7.7): all three cells below are commented out, not deleted —
 * including the `maxRateLimitRetry` cell — see
 * `tests/gateway/reconnect-backoff.test.ts`'s header for the owner's own words (the
 * ruling and its re-enable condition) and the D-50 register row; not restated per file.
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

  /*
  it('gap_n lies in [0.8*s_n, 1.2*s_n + tick] for n = 1..3, and cannot be a flat schedule', async () => {
    // Four information-free responses, not three: gap1 and gap2 alone do not
    // discriminate this schedule from a flat one, because the pre-fix flat 2s floor
    // and the fixed schedule's first two gaps overlap once a 1s queue tick and jitter
    // are allowed for — measured against an isolated pre-fix clone (qa-P001,
    // verification/001/wp9b-ac98-strengthened.spec.ts: pre-fix gaps [1995, 2000, 2004,
    // 2002] vs fixed [1994, 3004, 4008, 7004] — gap2 > gap1 resolves 2000 > 1995 on
    // the flat tree, 5ms of jitter deciding it). The fourth send's gap3 is what
    // separates them: gap1's own bound caps it at 2200, gap3's own bound floors it at
    // 3200, and gap1 <= 2200 < 3200 <= gap3 means no constant schedule can satisfy
    // both bounds at once — the per-gap bounds below are the whole discriminator, with
    // no separate ratio assertion needed on top of them.
    origin = await LoopbackApiOrigin.start();
    origin.setScript([INFORMATION_FREE, INFORMATION_FREE, INFORMATION_FREE, INFORMATION_FREE, OK]);
    api = await createApiAgainstOrigin(origin);

    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);

    await origin.waitForAccept(4, 30000);
    const t = origin.requestCount;
    const gaps = [t[1]! - t[0]!, t[2]! - t[1]!, t[3]! - t[2]!];
    // Bounds are stated per gap as [0.8*s_n, 1.2*s_n + tick] (AC-1.1's own form), with
    // s_n = computeBackoffMs's base (1000, 2000, 4000ms) and one 1000ms queue tick per
    // gap. Restated here from the plan, not imported from src (AC-9.5).
    const TICK = 1000;
    const S = [1000, 2000, 4000];

    gaps.forEach((gap, i) => {
      expect(gap, `gap${i + 1} (observed ${gaps.join(', ')})`).toBeGreaterThanOrEqual(0.8 * S[i]!);
      expect(gap, `gap${i + 1} (observed ${gaps.join(', ')})`).toBeLessThanOrEqual(1.2 * S[i]! + TICK);
    });
  }, 40000);

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

  it('maxRateLimitRetry bounds the attempt count regardless of the schedule (AC-9.8)', async () => {
    origin = await LoopbackApiOrigin.start();
    // A single scripted response repeats forever (LoopbackApiOrigin's peek semantics
    // once the queue is down to one item) — the server never stops being
    // information-free, so only the retry cap, not the schedule, can end this.
    origin.setScript([INFORMATION_FREE]);
    api = await createApiAgainstOrigin(origin);

    await expect(
      api.request('GET', '/channels/1', { local: true, maxRateLimitRetry: 2 }),
    ).rejects.toThrow();

    // Give the queue a moment in case of a stray requeue, then confirm exactly the
    // capped number of sends happened — allowQueue's own decrement, untouched by this
    // package, composes with the new schedule exactly as it did with the old flat
    // floor (neither reads or writes retriesLeft).
    await new Promise((resolve) => { setTimeout(resolve, 300); });
    expect(origin.acceptCount).toBe(2);
  }, 15000);
  */
});
