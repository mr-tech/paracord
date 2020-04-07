'use strict';

const RateLimit = require('./RateLimit');
const { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } = require('../../../constants');

/**
 * Rate limit keys to their associated state.
 * @extends Map<string,RateLimit>
 */
module.exports = class RateLimitMap extends Map {
  constructor(props) {
    super(props);

    this.sweepInterval;
  }

  /**
   * Inserts rate limit if not exists. Otherwise, updates its state.
   *
   * @param {string} rateLimitKey Internally-generated key for this state.
   * @param {RateLimitState} state Rate limit state derived from response headers.
   * @returns {RateLimit} New / updated rate limit.
   */
  upsert(rateLimitKey, state, template) {
    const rateLimit = this.get(rateLimitKey);

    if (rateLimit === undefined) {
      this.set(rateLimitKey, new RateLimit(state, template));
    } else {
      rateLimit.assignIfStricter(state);
    }

    return rateLimit;
  }

  sweepExpiredRateLimits() {
    const now = new Date().getTime();
    for (const [key, { expires }] of this.entries()) {
      if (expires < now) {
        this.delete(key);
      }
    }
  }

  startSweepInterval() {
    this.sweepInterval = setInterval(
      this.sweepExpiredRateLimits.bind(this),
      API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS,
    );
  }
};
