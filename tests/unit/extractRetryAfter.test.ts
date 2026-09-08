import { describe, it, expect } from 'vitest';
import extractRetryAfter from '../../src/clients/Api/structures/extractRetryAfter';

import type { RateLimitedResponse } from '../../src/clients/Api/types';

function response(data: unknown, headers: Record<string, unknown> = {}): RateLimitedResponse {
  return {
    status: 429,
    statusText: 'Too Many Requests',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
    headers,
  };
}

describe('extractRetryAfter (CR-4: presence before coercion)', () => {
  it('prefers a finite body retry_after over the header', () => {
    expect(extractRetryAfter(response({ retry_after: 5 }, { 'retry-after': '20' }))).toBe(5);
  });

  it('falls back to the header when the body carries no retry_after at all', () => {
    expect(extractRetryAfter(response({}, { 'retry-after': '20' }))).toBe(20);
  });

  it('CR-4: falls back to the header when the body retry_after is null (present, unusable) rather than reading it as 0', () => {
    expect(extractRetryAfter(response({ retry_after: null }, { 'retry-after': '20' }))).toBe(20);
  });

  it('returns undefined when neither source is usable (the Cloudflare-ban shape: html body, only a retry-after header)', () => {
    expect(extractRetryAfter(response('<html>banned</html>', { 'retry-after': '620' }))).toBe(620);
    expect(extractRetryAfter(response('<html>banned</html>', {}))).toBeUndefined();
  });
});
