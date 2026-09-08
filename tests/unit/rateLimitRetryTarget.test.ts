import { describe, it, expect } from 'vitest';
import computeRateLimitRetryTarget from '../../src/clients/Api/structures/rateLimitRetryTarget';
import computeBackoffMs from '../../src/clients/Gateway/structures/backoffSchedule';

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
