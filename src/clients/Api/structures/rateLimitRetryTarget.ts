import computeBackoffMs from '../../Gateway/structures/backoffSchedule';

export interface RateLimitRetryTarget {
  /** Absolute timestamp the request should not be re-sent before. */
  target: number;
  /** The request's information-free retry count after this response. */
  nextInformationFreeRetryCount: number;
}

/**
 * The information-free 429 backoff, as pure arithmetic separated from the timer that
 * consumes it. `resetTimestamp` and `waitUntil` are the server-directed target and the
 * request's own prior stricter wait; when their max (`directed`) is still in the
 * future, the response told us something real — the wait honours it and the request's
 * information-free counter resets to 0. When `directed` is at or before `now`, the
 * response was information-free (no body `retry_after`, no `retry-after` header, no
 * `x-ratelimit-reset-after` — the shape that reaches this function with
 * `resetTimestamp` at 0 or already elapsed), and the wait grows on `computeBackoffMs`
 * — the same schedule function the gateway's own reconnect backoff uses, reused rather
 * than reimplemented so one schedule function serves both.
 *
 * The counter is state of the *request*, supplied and returned by the caller — this
 * function holds none of its own, so it composes with re-queue: the same `ApiRequest`
 * instance is reused across queue cycles, carrying its own count forward.
 */
export default function computeRateLimitRetryTarget(
  now: number,
  resetTimestamp: number,
  waitUntil: number | undefined,
  informationFreeRetryCount: number,
): RateLimitRetryTarget {
  const directed = Math.max(
    Number.isFinite(resetTimestamp) ? resetTimestamp : 0,
    waitUntil ?? 0,
  );

  if (directed > now) {
    return { target: directed, nextInformationFreeRetryCount: 0 };
  }

  const nextInformationFreeRetryCount = informationFreeRetryCount + 1;
  return {
    target: now + computeBackoffMs(nextInformationFreeRetryCount),
    nextInformationFreeRetryCount,
  };
}
