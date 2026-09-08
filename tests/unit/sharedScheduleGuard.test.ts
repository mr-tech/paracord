import { describe, it, expect } from 'vitest';
import computeRateLimitRetryTarget from '../../src/clients/Api/structures/rateLimitRetryTarget';
import { markReady, recordClose, isEligible } from '../../src/clients/Paracord/failureCounter';

function sMs(n: number): number {
  return Math.min(60000, 1000 * 2 ** (n - 1));
}

const ATTEMPTS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('AC-9.12: computeBackoffMs consumers stay within [0.8*s_n, 1.2*s_n] together', () => {
  describe.each(ATTEMPTS)('attempt n = %i', (n) => {
    const lower = 0.8 * sMs(n);
    const upper = 1.2 * sMs(n);

    it(`rateLimitRetryTarget.ts (AC-9.8's information-free retry curve): wait in [${lower}, ${upper}]ms`, () => {
      const { target } = computeRateLimitRetryTarget(0, 0, undefined, n - 1);
      const wait = target;

      expect(wait).toBeGreaterThanOrEqual(lower);
      expect(wait).toBeLessThanOrEqual(upper);
    });

    it(`failureCounter.ts (AC-1.1's gateway reconnect curve): wait in [${lower}, ${upper}]ms`, () => {
      const key = {};
      markReady(key);
      recordClose(key, 'transport', 0);
      for (let i = 0; i < n; i += 1) {
        recordClose(key, 'transport', 0);
      }

      expect(isEligible(key, lower - 0.001), `wait must be >= ${lower}ms`).toBe(false);
      expect(isEligible(key, upper), `wait must be <= ${upper}ms`).toBe(true);
    });

    it(`rateLimitRetryTarget.ts: repeated draws at n = ${n} are not all identical (the jitter is live)`, () => {
      const DRAWS = 8;
      const waits = new Set(
        Array.from({ length: DRAWS }, () => computeRateLimitRetryTarget(0, 0, undefined, n - 1).target),
      );

      expect(waits.size, `all ${DRAWS} draws returned the same wait — jitter is not being applied`)
        .toBeGreaterThan(1);
    });
  });
});
