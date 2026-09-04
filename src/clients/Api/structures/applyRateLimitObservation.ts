import type RateLimitCache from './RateLimitCache';
import type RateLimitHeaders from './RateLimitHeaders';

/**
 * The rate-limit observation boundary contract (architect F-6; WP-9b step 3, AC-9.9):
 * the one place both `Api#updateRateLimitCache` (local path) and
 * `addService.ts#update` (RPC path, D-20) invoke, so a third caller (the request-proxy
 * path) inherits the policy rather than re-deciding it. Performs the bucket update only
 * when `headers.hasState`, and the global update unconditionally — the one permitted
 * bucket-presence conditional in this class. Before this, the two callers disagreed:
 * `addService.ts#update` nested its global update inside the same bucket-presence
 * guard, so a global 429 with no bucket header silently updated the local cache and was
 * discarded on the shared-budget RPC path (research `54f02df` §5.2; code review F-3).
 *
 * `computeRateLimitKey` is deferred to the caller (rather than this function computing
 * it) because the two callers derive it differently — `ApiRequest#getRateLimitKey`
 * caches it on the request; `addService.ts` derives it fresh from the decoded proto —
 * and it is only ever needed, and only ever safe to compute, when `headers.hasState`.
 *
 * Exported from its own module, not re-exported through any barrel the package entry
 * reaches, so it does not move `api-report/paracord.api.md` (AC-9.6) — the same shape
 * as `backoffSchedule.ts`, `closeOrigin.ts` and `failureCounter.ts` (WP-1).
 */
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
