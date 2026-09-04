import { SECOND_IN_MILLISECONDS } from '../../../constants';

import type { RpcArguments } from '../../../@types';
import type { ApiResponse } from '../types';

/**
 * Coerces a header value to a non-negative number of milliseconds.
 *
 * Rate limit headers are absent on 429s that carry no bucket state — Cloudflare bans and
 * `x-ratelimit-scope: shared` responses among them — and `Number(undefined)` is `NaN`. NaN
 * propagates through `Math.max` and poisons every timestamp derived from it, so it is stopped here.
 */
function headerToMilliseconds(value: unknown): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return seconds * SECOND_IN_MILLISECONDS;
}

/** Coerces a header value to a finite count. */
function headerToCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

/** Header values arrive as strings, so the string `'false'` must not read as `true`. */
function headerToBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * Coerces an already-in-milliseconds value (the constructor's `resetAfter`/`retryAfter`
 * parameters, converted by `headerToMilliseconds` at the header boundary or already
 * milliseconds over rpc) to a non-negative finite number — the same NaN/negative guard
 * as `headerToMilliseconds`, without its seconds-to-milliseconds multiplication.
 */
function clampMilliseconds(value: unknown): number {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms;
}

/**
 * Representation of rate limit values from the header of a response from Discord.
 * @internal
 */
export default class RateLimitHeaders {
  /** From Discord - If the request was globally rate limited. */
  public global: boolean;

  /** From Discord - Id of the rate limit bucket. */
  public bucketHash: string | undefined;

  /** From Discord - Number of requests that can be made between rate limit triggers. */
  public limit: number;

  /** From Discord - Number of requests available before hitting rate limit. */
  public remaining: number;

  /** From Discord - How long in ms the rate limit resets. */
  public resetAfter: number;

  /** From Discord - How long in ms the rate sub-limit resets. (Same as resetAfter if there is no sub-limit.) */
  public retryAfter: number;

  /** A localized timestamp of when the rate limit resets. */
  public resetTimestamp: number;

  /**
   * Extracts the rate limit state information if they exist from a set of response headers.
   * @param headers Headers from a response.
   * @returns Rate limit state with the bucket hash; or `undefined` if there is no rate limit information.
   */
  public static extractRateLimitFromHeaders(headers: ApiResponse['headers'], retryAfter: undefined | number): RateLimitHeaders {
    const {
      'x-ratelimit-global': global,
      'x-ratelimit-bucket': bucketHash,
      'x-ratelimit-limit': limit,
      'x-ratelimit-remaining': remaining,
      'x-ratelimit-reset-after': resetAfter,
    } = headers;

    return new RateLimitHeaders(
      headerToBoolean(global),
      <string | undefined> bucketHash,
      headerToCount(limit),
      headerToCount(remaining),
      headerToMilliseconds(resetAfter),
      headerToMilliseconds(retryAfter),
    );
  }

  /**
   * Creates a new rate limit headers.
   *
   * @param global From Discord - If the request was globally rate limited.
   * @param bucketHash From Discord - Id of the rate limit bucket.
   * @param limit From Discord - Number of requests that can be made between rate limit triggers.
   * @param remaining From Discord - Number of requests available before hitting rate limit.
   * @param resetAfter From Discord - How long in ms the rate limit resets.
   * @param retryAfter From Discord - The retry value from a 429 body. Sub-limits may make this value larger than resetAfter.
   */
  public constructor(global: boolean, bucketHash: string | undefined, limit: number, remaining: number, resetAfter: number, retryAfter: undefined | number) {
    // Values can also arrive over rpc, so they are re-checked here rather than only at the header
    // boundary — through the same coercion helpers the header boundary uses, not a second, weaker
    // restatement of the same rules that could silently diverge from them.
    const safeResetAfter = clampMilliseconds(resetAfter);
    const safeRetryAfter = clampMilliseconds(retryAfter);

    this.global = headerToBoolean(global);
    this.bucketHash = bucketHash;
    this.limit = headerToCount(limit);
    this.remaining = headerToCount(remaining);
    this.resetAfter = safeResetAfter;

    const maxWait = Math.max(safeRetryAfter, safeResetAfter);
    this.retryAfter = maxWait;
    this.resetTimestamp = new Date().getTime() + maxWait;
  }

  /** Whether or not the header values indicate the request has a rate limit. */
  public get hasState(): boolean {
    return this.bucketHash !== undefined;
  }

  /** Values to send over the rate limit service rpc. */
  public get rpcArgs(): RpcArguments {
    return [this.global, this.bucketHash, this.limit, this.remaining, this.resetAfter, this.retryAfter];
  }
}
