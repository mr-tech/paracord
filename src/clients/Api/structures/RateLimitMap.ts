import { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } from '../../../constants';

import RateLimit from './RateLimit';

import type Api from '../Api';
import type { IncomingRateLimit } from '../types';
import type RateLimitTemplate from './RateLimitTemplate';

/** Rate limit keys to their associated state. */
export default class RateLimitMap extends Map<string, RateLimit> {
  #logger?: undefined | Api;

  #expiredInterval: NodeJS.Timeout;

  public constructor(logger?: undefined | Api) {
    super();
    this.#logger = logger;
    this.#expiredInterval = setInterval(this.sweepExpiredRateLimits, API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS);
  }

  public end() {
    clearInterval(this.#expiredInterval);
  }

  /**
   * Inserts rate limit if not exists. Otherwise, updates its state.
   * @param rateLimitKey Internally-generated key for this state.
   * @param state Rate limit state derived from response headers.
   */
  public upsert(rateLimitKey: string, {
    remaining, limit, resetTimestamp, resetAfter: waitFor,
  }: IncomingRateLimit, template: RateLimitTemplate): RateLimit {
    const state: IncomingRateLimit = {
      remaining, limit, resetTimestamp, resetAfter: waitFor,
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
  private sweepExpiredRateLimits = (): void => {
    const now = new Date().getTime();
    let count = 0;
    for (const [key, { expires }] of this.entries()) {
      if (expires < now) {
        this.delete(key);
        ++count;
      }
    }

    if (this.#logger) {
      this.#logger.log('DEBUG', 'GENERAL', `Swept old ${count} old rate limits from cache. (${new Date().getTime() - now}ms)`);
    }
  };
}
