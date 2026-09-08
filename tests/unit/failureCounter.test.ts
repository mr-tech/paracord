import { describe, it, expect } from 'vitest';
import {
  recordClose, markReady, isEligible,
} from '../../src/clients/Paracord/failureCounter';

describe('failureCounter (F-26)', () => {
  it('consumer origin before READY leaves n and does not move an existing not-before', () => {
    const gw = {};
    recordClose(gw, 'transport', 1000);
    const afterTransport = isEligible(gw, 1000);
    expect(afterTransport).toBe(false);

    recordClose(gw, 'consumer', 1001);
    expect(isEligible(gw, 1001)).toBe(false);
  });

  it('transport/discord origin before READY increments n and sets notBefore = closedAt + d_n', () => {
    const gw = {};
    recordClose(gw, 'transport', 0);
    expect(isEligible(gw, 0)).toBe(false);
    expect(isEligible(gw, 1300)).toBe(true);
  });

  it('n = 0 (no failure yet) is immediately eligible', () => {
    const gw = {};
    expect(isEligible(gw, 0)).toBe(true);
  });

  it('markReady resets n to 0 and the very next close (any origin) is treated as "after" — n stays 0, eligible at once', () => {
    const gw = {};
    recordClose(gw, 'transport', 0);
    recordClose(gw, 'transport', 100);
    markReady(gw);
    recordClose(gw, 'transport', 200);
    expect(isEligible(gw, 200)).toBe(true);

    recordClose(gw, 'transport', 200);
    expect(isEligible(gw, 200)).toBe(false);
    expect(isEligible(gw, 1400)).toBe(true);
  });
});
