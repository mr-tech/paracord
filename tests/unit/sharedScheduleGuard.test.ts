import { describe, it, expect } from 'vitest';
import computeRateLimitRetryTarget from '../../src/clients/Api/structures/rateLimitRetryTarget';
import { markReady, recordClose, isEligible } from '../../src/clients/Paracord/failureCounter';

/**
 * AC-9.12 (shared-schedule guard). `computeBackoffMs`
 * (`src/clients/Gateway/structures/backoffSchedule.ts`) has two consumers — the class
 * enumerated by `grep -rc computeBackoffMs src/`: `failureCounter.ts` (the gateway
 * reconnect curve) and `rateLimitRetryTarget.ts` (the information-free 429 retry
 * curve). Both derive their wait for attempt n from the same three constants, so a
 * change to any of them moves both curves together with nothing to catch it if either
 * consumer is tested in isolation. This fixture drives both consumers' own wait
 * derivation for n = 1..7 against one literal bound per row, so a constant change
 * fails every row of both at once.
 *
 * `BASE_MILLISECONDS`, `CAP_MILLISECONDS` and `JITTER_RATIO` are private to
 * `backoffSchedule.ts` and stay so — the bound below is written as literals (1000,
 * doubling, 60000, 0.2), never imported, so it does not read `computeBackoffMs`'s own
 * arithmetic back at itself (expectations independence).
 *
 * A magnitude bound alone cannot see `JITTER_RATIO` collapse to 0 — the bound
 * `[0.8·s_n, 1.2·s_n]` *is* the jitter envelope, and a jitter-free draw of exactly
 * `s_n` sits at its centre, inside it. Each row therefore also asserts spread (repeated
 * draws are not all identical) on the one consumer whose wait is directly readable.
 */

/** s_n in milliseconds: 1000 * 2^(n-1), capped at 60000. Restated, not imported. */
function sMs(n: number): number {
  return Math.min(60000, 1000 * 2 ** (n - 1));
}

const ATTEMPTS = [1, 2, 3, 4, 5, 6, 7];

describe('AC-9.12: computeBackoffMs consumers stay within [0.8*s_n, 1.2*s_n] together', () => {
  describe.each(ATTEMPTS)('attempt n = %i', (n) => {
    const lower = 0.8 * sMs(n);
    const upper = 1.2 * sMs(n);

    it(`rateLimitRetryTarget.ts (AC-9.8's information-free retry curve): wait in [${lower}, ${upper}]ms`, () => {
      // now = 0, resetTimestamp = 0, waitUntil = undefined -> "directed" is 0, the
      // information-free branch, with the request already at count n-1 so this
      // response is its n-th consecutive information-free 429.
      const { target } = computeRateLimitRetryTarget(0, 0, undefined, n - 1);
      const wait = target;

      expect(wait).toBeGreaterThanOrEqual(lower);
      expect(wait).toBeLessThanOrEqual(upper);
    });

    it(`failureCounter.ts (AC-1.1's gateway reconnect curve): wait in [${lower}, ${upper}]ms`, () => {
      // A fresh key per row, so each attempt count is driven from a clean state
      // rather than accumulating across rows. markReady + one transport close
      // consumes the ready-reset (n stays 0, no backoff — the "first close after
      // success" cell of the failure-counter table); n more transport closes then
      // walk the failure count to n. closedAt is 0 throughout: recordClose
      // recomputes notBefore fresh each call (closedAt + computeBackoffMs(current
      // n)), so only the final call's n matters.
      const key = {};
      markReady(key);
      recordClose(key, 'transport', 0);
      for (let i = 0; i < n; i += 1) {
        recordClose(key, 'transport', 0);
      }

      // notBefore is not publicly readable; bound it with isEligible probes at the
      // interval's edges instead (still pure arithmetic — no timer is started or
      // awaited, `now` is a plain number).
      expect(isEligible(key, lower - 0.001), `wait must be >= ${lower}ms`).toBe(false);
      expect(isEligible(key, upper), `wait must be <= ${upper}ms`).toBe(true);
    });

    // The magnitude bounds above are the jitter envelope, so they cannot see the
    // envelope collapse to its own centre: with JITTER_RATIO = 0 every draw returns
    // exactly s_n, which is inside [0.8*s_n, 1.2*s_n]. Jitter's purpose isn't
    // magnitude — it's that shards which failed together don't reconnect in lockstep
    // — so its silent loss is a thundering-herd regression the bounds above miss by
    // construction. Asserted as spread, not magnitude, and needs no new constant. One
    // consumer only (qa-P001): the mutant lives in the shared computeBackoffMs, so one
    // side detecting it detects it, and failureCounter.ts exposes no numeric wait to
    // spread-check without first reconstructing it from the eligibility boolean.
    it(`rateLimitRetryTarget.ts: repeated draws at n = ${n} are not all identical (the jitter is live)`, () => {
      const DRAWS = 8;
      const waits = new Set(
        Array.from({ length: DRAWS }, () => computeRateLimitRetryTarget(0, 0, undefined, n - 1).target),
      );

      // With JITTER_RATIO = 0 every draw is exactly s_n and this set has size 1. With
      // jitter live the draws are continuous over a 0.4 * s_n window, so all eight
      // colliding is not a realistic failure mode — this is not a tolerance, it is a
      // statement that the value varies at all.
      expect(waits.size, `all ${DRAWS} draws returned the same wait — jitter is not being applied`)
        .toBeGreaterThan(1);
    });
  });
});
