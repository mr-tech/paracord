import type RateLimitCache from './RateLimitCache';
import type RateLimitHeaders from './RateLimitHeaders';

export default function applyRateLimitObservation(
  cache: RateLimitCache,
  headers: RateLimitHeaders,
  bucketHashKey: string,
  computeRateLimitKey: (bucketHash: string) => string,
): void {
  if (headers.hasState) {
    cache.update(computeRateLimitKey(headers.bucketHash as string), bucketHashKey, headers);
  }
  cache.updateGlobal(headers);
}
