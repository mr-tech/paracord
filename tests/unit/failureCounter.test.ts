import { describe, it, expect } from 'vitest';
import {
  recordClose, markReady, isEligible, resetAll,
} from '../../src/clients/Paracord/failureCounter';

/**
 * WP-1 step 2 (F-26's failure counter, form (a) arithmetic — no timers). One gateway
 * key per test to avoid cross-test WeakMap bleed.
 */
describe('failureCounter (F-26)', () => {
  it('consumer origin before READY leaves n and does not move an existing not-before', () => {
    const gw = {};
    recordClose(gw, 'transport', 1000); // n -> 1, notBefore = 1000 + d_1
    const afterTransport = isEligible(gw, 1000);
    expect(afterTransport).toBe(false); // d_1 >= 800ms, not eligible immediately

    recordClose(gw, 'consumer', 1001); // leave n; notBefore untouched
    expect(isEligible(gw, 1001)).toBe(false); // the transport close's wait still governs
  });

  it('transport/discord origin before READY increments n and sets notBefore = closedAt + d_n', () => {
    const gw = {};
    recordClose(gw, 'transport', 0);
    expect(isEligible(gw, 0)).toBe(false);
    expect(isEligible(gw, 1300)).toBe(true); // d_1 upper bound is 1200ms
  });

  it('n = 0 (no failure yet) is immediately eligible', () => {
    const gw = {};
    expect(isEligible(gw, 0)).toBe(true);
  });

  it('markReady resets n to 0 and the very next close (any origin) is treated as "after" — n stays 0, eligible at once', () => {
    const gw = {};
    recordClose(gw, 'transport', 0); // n -> 1
    recordClose(gw, 'transport', 100); // n -> 2
    markReady(gw);
    recordClose(gw, 'transport', 200); // "after" phase: n resets to 0, next tick, not incremented to 3
    expect(isEligible(gw, 200)).toBe(true);

    // the *next* close, now genuinely before a new READY, resumes climbing from n = 1
    recordClose(gw, 'transport', 200);
    expect(isEligible(gw, 200)).toBe(false);
    expect(isEligible(gw, 1300)).toBe(true);
  });

  it('resetAll clears every key (test isolation helper)', () => {
    const gw = {};
    recordClose(gw, 'transport', 0);
    resetAll();
    expect(isEligible(gw, 0)).toBe(true);
  });
});
