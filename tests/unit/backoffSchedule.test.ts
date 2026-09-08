import { describe, it, expect } from 'vitest';
import computeBackoffMs from '../../src/clients/Gateway/structures/backoffSchedule';

describe('computeBackoffMs (D-8 pure schedule function)', () => {
  it('n = 0 is 0 (the failure-counter table: n = 0 has a value, d_0 = 0)', () => {
    expect(computeBackoffMs(0)).toBe(0);
  });

  it('n = 1..7 falls within [0.8 * s_n, 1.2 * s_n] with s_n = min(60, 2^(n-1)) s, no timers involved', () => {
    for (let n = 1; n <= 7; n += 1) {
      const sSeconds = Math.min(60, 2 ** (n - 1));
      const lower = 0.8 * sSeconds * 1000;
      const upper = 1.2 * sSeconds * 1000;
      for (let trial = 0; trial < 50; trial += 1) {
        const d = computeBackoffMs(n);
        expect(d).toBeGreaterThanOrEqual(lower);
        expect(d).toBeLessThanOrEqual(upper);
      }
    }
  });

  it('reaches and stays at the 60 s cap from n = 7 on', () => {
    for (const n of [7, 8, 20, 100]) {
      const d = computeBackoffMs(n);
      expect(d).toBeGreaterThanOrEqual(0.8 * 60 * 1000);
      expect(d).toBeLessThanOrEqual(1.2 * 60 * 1000);
    }
  });

  it('jitter actually varies across calls (not a constant)', () => {
    const values = new Set(Array.from({ length: 20 }, () => computeBackoffMs(3)));
    expect(values.size).toBeGreaterThan(1);
  });
});
