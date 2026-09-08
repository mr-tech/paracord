import { describe, it, expect } from 'vitest';
import RateLimitHeaders from '../../src/clients/Api/structures/RateLimitHeaders';

const VALUE_CLASS: Array<{ label: string; value: unknown }> = [
  { label: 'absent', value: undefined },
  { label: 'empty string', value: '' },
  { label: 'non-numeric', value: 'not-a-number' },
  { label: 'negative', value: '-5' },
  { label: "'true'", value: 'true' },
  { label: 'true (boolean)', value: true },
  { label: 'finite non-negative (numeric string)', value: '42' },
];

describe('RateLimitHeaders coercion guards, both construction sites (AC-9.3)', () => {
  describe.each(VALUE_CLASS)('$label — extractRateLimitFromHeaders', ({ value }) => {
    it('produces finite limit/remaining/resetAfter/retryAfter and a boolean global', () => {
      const headers = RateLimitHeaders.extractRateLimitFromHeaders({
        'x-ratelimit-global': value,
        'x-ratelimit-bucket': 'bucket-1',
        'x-ratelimit-limit': value,
        'x-ratelimit-remaining': value,
        'x-ratelimit-reset-after': value,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, value as any);

      expect(Number.isFinite(headers.limit)).toBe(true);
      expect(Number.isFinite(headers.remaining)).toBe(true);
      expect(Number.isFinite(headers.resetAfter)).toBe(true);
      expect(Number.isFinite(headers.retryAfter)).toBe(true);
      expect(typeof headers.global).toBe('boolean');
    });
  });

  describe.each(VALUE_CLASS)('$label — direct constructor (the RPC boundary\'s site)', ({ value }) => {
    it('produces finite limit/remaining/resetAfter/retryAfter and a boolean global', () => {
      const headers = new RateLimitHeaders(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value as any, 'bucket-1', value as any, value as any, value as any, value as any,
      );

      expect(Number.isFinite(headers.limit)).toBe(true);
      expect(Number.isFinite(headers.remaining)).toBe(true);
      expect(Number.isFinite(headers.resetAfter)).toBe(true);
      expect(Number.isFinite(headers.retryAfter)).toBe(true);
      expect(typeof headers.global).toBe('boolean');
    });
  });

  it('CR-3: the direct constructor coerces a numeric-string limit/remaining the same way extractRateLimitFromHeaders does (parity, not just finiteness)', () => {
    const viaHeaders = RateLimitHeaders.extractRateLimitFromHeaders({
      'x-ratelimit-global': false,
      'x-ratelimit-bucket': 'b',
      'x-ratelimit-limit': '5',
      'x-ratelimit-remaining': '3',
      'x-ratelimit-reset-after': '1',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, undefined);
    const viaDirectConstructor = new RateLimitHeaders(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      false, 'b', '5' as any, '3' as any, 1000, undefined,
    );

    expect(viaDirectConstructor.limit).toBe(viaHeaders.limit);
    expect(viaDirectConstructor.remaining).toBe(viaHeaders.remaining);
    expect(viaDirectConstructor.limit).toBe(5);
    expect(viaDirectConstructor.remaining).toBe(3);
  });
});
