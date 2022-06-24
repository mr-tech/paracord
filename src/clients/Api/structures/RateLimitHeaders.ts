import { RpcArguments } from '../../../common';
import { SECOND_IN_MILLISECONDS } from '../../../constants';
import { IApiResponse } from '../types';

/** Representation of rate limit values from the header of a response from Discord. */
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
  public static extractRateLimitFromHeaders(headers: IApiResponse<any>['headers'], retryAfter: undefined | number): RateLimitHeaders {
    const {
      'x-ratelimit-global': global,
      'x-ratelimit-bucket': bucketHash,
      'x-ratelimit-limit': limit,
      'x-ratelimit-remaining': remaining,
      'x-ratelimit-reset-after': resetAfter,
    } = headers;

    return new RateLimitHeaders(
      <boolean | undefined> global ?? false,
      <string | undefined> bucketHash,
      Number(limit),
      Number(remaining),
      Number(resetAfter) * SECOND_IN_MILLISECONDS,
      retryAfter && retryAfter * SECOND_IN_MILLISECONDS,
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
    this.global = global || false;
    this.bucketHash = bucketHash;
    this.limit = limit;
    this.remaining = remaining;
    this.resetAfter = resetAfter;

    const maxWait = Math.max(retryAfter ?? 0, resetAfter);
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
