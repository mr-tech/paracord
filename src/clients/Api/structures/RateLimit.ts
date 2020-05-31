import { millisecondsFromNow } from '../../../Utils';
import { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } from '../../../constants';

import type RateLimitTemplate from './RateLimitTemplate';
import type { RateLimitState } from '../types';

/** State of a Discord rate limit. */
export default class RateLimit {
  /** Number of requests available before hitting rate limit. Triggers internal rate limiting when 0. */
  private remaining: number;

  /** When the rate limit's remaining requests resets to `limit`. */
  private resetTimestamp: number;

  /** From Discord - Rate limit request cap. */
  private limit: number;

  /** Timestamp of when this rate limit will expire if not accessed again before then. */
  public expires: number | undefined;

  private template: RateLimitTemplate;

  private allowHeaderOverride: boolean;

  /**
   * Creates a new rate limit state.
   *
   * @param {RateLimitState}
   * @param {ApiRequest} template
   */
  public constructor({ remaining, resetTimestamp, limit }: RateLimitState, template: RateLimitTemplate) {
    this.remaining = remaining;
    this.resetTimestamp = resetTimestamp ?? -1;
    this.limit = limit;
    this.expires = undefined;
    this.template = template;
    this.allowHeaderOverride = true;

    this.refreshExpire();
  }

  /**
   * If the request cannot be made without triggering a Discord rate limit.
   * `true` if the rate limit exists and is active. Do no send a request.
   */
  public get isRateLimited(): boolean {
    this.refreshExpire();

    if (this.rateLimitHasReset) {
      this.resetRemaining();
      return false;
    } if (this.hasRemainingUses) {
      return false;
    }

    return true;
  }

  /** If it is past the time Discord said the rate limit would reset. */
  private get rateLimitHasReset(): boolean {
    return this.resetTimestamp <= new Date().getTime();
  }

  /** If a request can be made without triggering a Discord rate limit. */
  private get hasRemainingUses(): boolean {
    return this.remaining > 0;
  }

  /** How long until the rate limit resets in ms. */
  public get resetAfter(): number {
    const resetAfter = millisecondsFromNow(this.resetTimestamp);
    return resetAfter > 0 ? resetAfter : 0;
  }

  private refreshExpire(): void {
    this.expires = new Date().getTime() + API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS;
  }

  /** Reduces the remaining requests (before internally rate limiting) by 1. */
  public decrementRemaining(): void {
    this.refreshExpire();
    --this.remaining;
  }

  /**
   * Updates state properties if incoming state is more "strict".
   * Strictness is defined by the value that decreases the chance of getting rate limit.
   *
   * @param {RateLimitState}
   */
  public assignIfStricter({ remaining, resetTimestamp, limit }: RateLimitState): void {
    if (resetTimestamp !== undefined && (this.allowHeaderOverride || remaining < this.remaining)) {
      this.remaining = remaining;
    }
    if (resetTimestamp !== undefined && (this.allowHeaderOverride || resetTimestamp > this.resetTimestamp)) {
      this.resetTimestamp = resetTimestamp;
    }
    if (resetTimestamp !== undefined && (this.allowHeaderOverride || limit < this.limit)) {
      this.limit = limit;
    }

    this.allowHeaderOverride = false;
  }

  /** Sets the remaining requests back to the known limit. */
  private resetRemaining(): void {
    this.remaining = this.limit;
    this.resetTimestamp = new Date().getTime() + this.template.resetAfter;
    this.allowHeaderOverride = true;
  }
}
