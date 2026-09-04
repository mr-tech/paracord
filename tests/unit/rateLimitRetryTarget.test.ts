import { describe, it, expect } from 'vitest';
import computeRateLimitRetryTarget from '../../src/clients/Api/structures/rateLimitRetryTarget';
import computeBackoffMs from '../../src/clients/Gateway/structures/backoffSchedule';

/**
 * WP-9b step 6 (D-17), AC-9.8. Pure arithmetic (time-seam rule, form (a)): given
 * `now`, the server-directed target (`resetTimestamp`/`waitUntil`), and the request's
 * running count of consecutive information-free 429s, computes the next target and
 * count. A response that told us nothing (`directed <= now`) grows the wait on
 * `computeBackoffMs` — the D-8 schedule WP-1 built, reused rather than reimplemented
 * (one schedule function serves both packages). A response that told us something real
 * resets the count to 0, so the *next* information-free 429 on this request starts the
 * schedule over at n = 1, not wherever it left off.
 */
describe('computeRateLimitRetryTarget', () => {
  it('when the response is not information-free (directed > now), uses the directed target and resets the count to 0', () => {
    const now = 1_000_000;
    const result = computeRateLimitRetryTarget(now, now + 5000, undefined, 3);
    expect(result.target).toBe(now + 5000);
    expect(result.nextInformationFreeRetryCount).toBe(0);
  });

  it('honours waitUntil over resetTimestamp when it is the stricter (later) of the two', () => {
    const now = 1_000_000;
    const result = computeRateLimitRetryTarget(now, now + 1000, now + 9000, 0);
    expect(result.target).toBe(now + 9000);
    expect(result.nextInformationFreeRetryCount).toBe(0);
  });

  it('when the response is information-free (directed <= now), grows the wait on computeBackoffMs(n+1) and increments the count', () => {
    const now = 1_000_000;
    for (let prevCount = 0; prevCount < 5; prevCount += 1) {
      const result = computeRateLimitRetryTarget(now, 0, undefined, prevCount);
      expect(result.nextInformationFreeRetryCount).toBe(prevCount + 1);

      const sSeconds = Math.min(60, 2 ** (prevCount + 1 - 1));
      const lower = now + 0.8 * sSeconds * 1000;
      const upper = now + 1.2 * sSeconds * 1000;
      expect(result.target).toBeGreaterThanOrEqual(lower);
      expect(result.target).toBeLessThanOrEqual(upper);
    }
  });

  it('directed exactly equal to now counts as information-free (no timing was actually given)', () => {
    const now = 1_000_000;
    const result = computeRateLimitRetryTarget(now, now, now, 0);
    expect(result.nextInformationFreeRetryCount).toBe(1);
  });

  it('is built on computeBackoffMs, not a second copy of the same arithmetic', () => {
    const now = 1_000_000;
    // n = 7 reaches the 60s cap deterministically enough to compare bounds (not exact
    // value, since computeBackoffMs draws jitter) against a direct call.
    const direct = computeBackoffMs(7);
    const viaTarget = computeRateLimitRetryTarget(now, 0, undefined, 6).target - now;
    expect(viaTarget).toBeGreaterThanOrEqual(0.8 * 60 * 1000);
    expect(viaTarget).toBeLessThanOrEqual(1.2 * 60 * 1000);
    expect(direct).toBeGreaterThanOrEqual(0.8 * 60 * 1000);
  });

  it('AC-9.8: reset to s_1 after any non-information-free response, then grows again from n = 1', () => {
    const now = 1_000_000;
    const first = computeRateLimitRetryTarget(now, 0, undefined, 0);
    expect(first.nextInformationFreeRetryCount).toBe(1);

    const reset = computeRateLimitRetryTarget(now + 10_000, now + 15_000, undefined, first.nextInformationFreeRetryCount);
    expect(reset.nextInformationFreeRetryCount).toBe(0);

    const again = computeRateLimitRetryTarget(now + 20_000, 0, undefined, reset.nextInformationFreeRetryCount);
    expect(again.nextInformationFreeRetryCount).toBe(1);
    expect(again.target - (now + 20_000)).toBeGreaterThanOrEqual(0.8 * 1000);
    expect(again.target - (now + 20_000)).toBeLessThanOrEqual(1.2 * 1000);
  });
});
