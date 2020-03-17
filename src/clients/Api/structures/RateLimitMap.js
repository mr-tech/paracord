'use strict';

const RateLimit = require('./RateLimit');
const { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } = require('../../../utils/constants');

/** @typedef {import("./Request")} Request */

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
  upsert(rateLimitKey, state) {
    const rateLimit = this.get(rateLimitKey);

    if (rateLimit === undefined) {
      this.set(rateLimitKey, new RateLimit(state));
    } else {
      rateLimit.assignIfStricter(state);
    }

    return rateLimit;
  }

  sweepExpiredRateLimits() {
    const now = new Date().getTime();
    Array.from(this.entries()).forEach(([key, { expires }]) => {
      if (expires < now) {
        this.delete(key);
      }
    });
  }

  startSweepInterval() {
    this.sweepInterval = setInterval(
      this.sweepExpiredRateLimits.bind(this),
      60e3,
      // API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS,
    );
  }
};
