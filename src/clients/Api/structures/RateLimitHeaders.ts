import { RpcArguments } from '../../../common';
import { SECOND_IN_MILLISECONDS } from '../../../constants';
import { IApiResponse } from '../types';

/** Representation of rate limit values from the header of a response from Discord. */
export default class RateLimitHeaders {
  /** From Discord - If the request was globally rate limited. */
  public global: boolean;

  /** From Discord - Id of the rate limit bucket. */
  public bucket: string | undefined;

  /** From Discord - Number of requests that can be made between rate limit triggers. */
  public limit: number;

  /** From Discord - Number of requests available before hitting rate limit. */
  public remaining: number;

  /** From Discord - How long in ms the rate limit resets. */
  public resetAfter: number;

  /** A localized timestamp of when the rate limit resets. */
  public resetTimestamp: number;

  /**
   * Extracts the rate limit state information if they exist from a set of response headers.
   * @param headers Headers from a response.
   * @returns Rate limit state with the bucket id; or `undefined` if there is no rate limit information.
   */
  public static extractRateLimitFromHeaders(headers: IApiResponse['headers']): RateLimitHeaders {
    const {
      'x-ratelimit-global': global,
      'x-ratelimit-bucket': bucket,
      'x-ratelimit-limit': limit,
      'x-ratelimit-remaining': remaining,
      'x-ratelimit-reset-after': resetAfter,
    } = headers;

    return new RateLimitHeaders(
      <boolean | undefined> global ?? false,
      <string | undefined> bucket,
      Number(limit),
      Number(remaining),
      Number(resetAfter) * SECOND_IN_MILLISECONDS,
    );
  }

  /**
   * Creates a new rate limit headers.
   *
   * @param global From Discord - If the request was globally rate limited.
   * @param bucket From Discord - Id of the rate limit bucket.
   * @param limit From Discord - Number of requests that can be made between rate limit triggers.
   * @param remaining From Discord - Number of requests available before hitting rate limit.
   * @param resetAfter A localized timestamp of when the rate limit resets.
   */
  public constructor(global: boolean, bucket: string | undefined, limit: number, remaining: number, resetAfter: number) {
    this.global = global || false;
    this.bucket = bucket;
    this.limit = limit;
    this.remaining = remaining;
    this.resetAfter = resetAfter;
    this.resetTimestamp = new Date().getTime() + this.resetAfter;
  }

  /** Whether or not the header values indicate the request has a rate limit. */
  public get hasState(): boolean {
    return this.bucket !== undefined;
  }

  /** Values to send over the rate limit service rpc. */
  public get rpcArgs(): RpcArguments {
    return [this.global, this.bucket, this.limit, this.remaining, this.resetAfter];
  }
}
