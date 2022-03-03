import type Api from '../Api';
import { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } from '../../../constants';
import { RateLimitState } from '../types';
import RateLimit from './RateLimit';
import RateLimitTemplate from './RateLimitTemplate';

/** Rate limit keys to their associated state. */
export default class RateLimitMap extends Map<string, RateLimit> {
  #logger?: Api;

  /** Interval for sweeping old rate limits from the cache. */
  #sweepInterval: NodeJS.Timer | undefined;

  public constructor(logger?: Api) {
    super();

    this.#logger = logger;
    this.#sweepInterval = undefined;
  }

  /**
   * Inserts rate limit if not exists. Otherwise, updates its state.
   * @param rateLimitKey Internally-generated key for this state.
   * @param state Rate limit state derived from response headers.
   */
  public upsert(rateLimitKey: string, {
    remaining, limit, resetTimestamp, resetAfter,
  }: RateLimitState, template: RateLimitTemplate): RateLimit {
    const state: RateLimitState = {
      remaining, limit, resetTimestamp, resetAfter,
    };

    let rateLimit = this.get(rateLimitKey);
    if (rateLimit === undefined) {
      rateLimit = new RateLimit(state, template);
      this.set(rateLimitKey, rateLimit);
    } else {
      rateLimit.assignIfStricter(state);
    }

    return rateLimit;
  }

  /** Removes old rate limits from cache. */
  private sweepExpiredRateLimits(): void {
    const now = new Date().getTime();
    let count = 0;
    for (const [key, { expires }] of this.entries()) {
      if (expires < now) {
        this.delete(key);
        ++count;
      }
    }

    if (this.#logger) {
      this.#logger.log('DEBUG', `Swept old ${count} old rate limits from cache. (${new Date().getTime() - now}ms)`);
    }
  }

  /** Begins timer for sweeping cache of old rate limits. */
  public startSweepInterval(): void {
    this.#sweepInterval = setInterval(
      this.sweepExpiredRateLimits.bind(this),
      API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS,
    );
  }
}
