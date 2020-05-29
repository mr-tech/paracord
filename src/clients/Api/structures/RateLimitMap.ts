import RateLimit from './RateLimit';
import { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } from '../../../constants';
import RateLimitTemplate from './RateLimitTemplate';
import { RateLimitState } from '../types';

/**
 * Rate limit keys to their associated state.
 * @extends Map<string,RateLimit>
 */
export default class RateLimitMap extends Map {
  /** Interval for sweeping old rate limits from the cache. */
  private sweepInterval: NodeJS.Timer | undefined;

  public constructor() {
    super();

    this.sweepInterval = undefined;
  }

  /**
   * Inserts rate limit if not exists. Otherwise, updates its state.
   *
   * @param {string} rateLimitKey Internally-generated key for this state.
   * @param {RateLimitState} state Rate limit state derived from response headers.
   * @returns {RateLimit} New / updated rate limit.
   */
  public upsert(rateLimitKey: string, {
    remaining, limit, resetTimestamp, resetAfter,
  }: RateLimitState, template: RateLimitTemplate): RateLimit {
    const rateLimit = this.get(rateLimitKey);

    const state: RateLimitState = {
      remaining, limit, resetTimestamp, resetAfter,
    };

    if (rateLimit === undefined) {
      this.set(rateLimitKey, new RateLimit(state, template));
    } else {
      rateLimit.assignIfStricter(state);
    }

    return rateLimit;
  }

  /** Removes old rate limits from cache. */
  private sweepExpiredRateLimits() {
    const now = new Date().getTime();
    for (const [key, { expires }] of this.entries()) {
      if (expires < now) {
        this.delete(key);
      }
    }
  }

  /** Begins timer for sweeping cache of old rate limits. */
  public startSweepInterval(): void {
    this.sweepInterval = setInterval(
      this.sweepExpiredRateLimits.bind(this),
      API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS,
    );
  }
}
