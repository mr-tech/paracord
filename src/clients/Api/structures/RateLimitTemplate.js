'use strict';

/** State of a Discord rate limit. */
module.exports = class RateLimitTemplate {
  /**
   * Creates a new rate limit state.
   *
   * @param {RateLimitState}
   */
  constructor({ limit, resetAfter }) {
    /** @type {number} From Discord - Rate limit request cap. */
    this.limit = limit;
    /** @type {number} From Discord - Highest value seen from Discord for rate limit reset wait in ms. */
    this.resetAfter = resetAfter;
  }

  /**
   * Updates state properties.
   *
   * @param {number} limit From Discord - Limit value from headers.
   * @param {number} resetAfter From Discord - Reset after value from headers (after converted to ms).
   */
  update({ limit, resetAfter }) {
    if (limit < this.limit) {
      this.limit = limit;
    }
    if (resetAfter > this.resetAfter) {
      this.resetAfter = resetAfter;
    }
  }
};
