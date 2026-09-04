import { describe, it, expect, vi } from 'vitest';
import applyRateLimitObservation from '../../src/clients/Api/structures/applyRateLimitObservation';
import RateLimitHeaders from '../../src/clients/Api/structures/RateLimitHeaders';

import type RateLimitCache from '../../src/clients/Api/structures/RateLimitCache';

/**
 * WP-9b step 3 (architect F-6; AC-9.9). The one place both `Api#updateRateLimitCache`
 * and `addService#update` invoke: the bucket update fires only when
 * `headers.hasState`, the global update fires unconditionally. This is the one
 * permitted bucket-presence conditional in the class — neither caller holds one of its
 * own once they call this.
 */
function fakeCache() {
  return {
    update: vi.fn(),
    updateGlobal: vi.fn(),
  } as unknown as RateLimitCache;
}

describe('applyRateLimitObservation (AC-9.9\'s shared pairing)', () => {
  it('calls cache.update and cache.updateGlobal when the headers carry bucket state', () => {
    const cache = fakeCache();
    const headers = new RateLimitHeaders(false, 'bucket-1', 5, 4, 1000, undefined);
    const computeRateLimitKey = vi.fn((bucketHash: string) => `key:${bucketHash}`);

    applyRateLimitObservation(cache, headers, 'bhk', computeRateLimitKey);

    expect(computeRateLimitKey).toHaveBeenCalledWith('bucket-1');
    expect(cache.update).toHaveBeenCalledWith('key:bucket-1', 'bhk', headers);
    expect(cache.updateGlobal).toHaveBeenCalledWith(headers);
  });

  it('F-3: calls cache.updateGlobal even when the headers carry NO bucket state (a global 429 with no bucket header)', () => {
    const cache = fakeCache();
    const headers = new RateLimitHeaders(true, undefined, 0, 0, 5000, 5000);
    const computeRateLimitKey = vi.fn();

    applyRateLimitObservation(cache, headers, 'bhk', computeRateLimitKey);

    expect(computeRateLimitKey).not.toHaveBeenCalled();
    expect(cache.update).not.toHaveBeenCalled();
    expect(cache.updateGlobal).toHaveBeenCalledWith(headers);
  });
});
