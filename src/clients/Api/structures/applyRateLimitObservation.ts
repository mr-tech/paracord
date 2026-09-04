import type RateLimitCache from './RateLimitCache';
import type RateLimitHeaders from './RateLimitHeaders';

/**
 * The rate-limit observation boundary: the one place both `Api#updateRateLimitCache`
 * (local path) and `addService.ts#update` (RPC path) invoke, so a third caller (the
 * request-proxy path) inherits the policy rather than re-deciding it. Performs the
 * bucket update only when `headers.hasState`, and the global update unconditionally —
 * the one permitted bucket-presence conditional in this class. Without it, the two
 * callers could disagree on the pairing: a global 429 with no bucket header would
 * update the local cache while being discarded on the shared-budget RPC path, or vice
 * versa, depending on which caller's own guard happened to be stricter.
 *
 * `computeRateLimitKey` is deferred to the caller (rather than this function computing
 * it) because the two callers derive it differently — `ApiRequest#getRateLimitKey`
 * caches it on the request; `addService.ts` derives it fresh from the decoded proto —
 * and it is only ever needed, and only ever safe to compute, when `headers.hasState`.
 *
 * Exported from its own module, not re-exported through any barrel the package entry
 * reaches, so it does not move `api-report/paracord.api.md` — the same shape as
 * `backoffSchedule.ts`, `closeOrigin.ts` and `failureCounter.ts`.
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
