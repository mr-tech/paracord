'use strict';

const Utils = require('../../../utils');
const { API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS } = require('../../../constants');

/** State of a Discord rate limit. */
module.exports = class RateLimit {
  /**
   * Creates a new rate limit state.
   *
   * @param {RateLimitState}
   * @param {import("./RateLimitTemplate")} template
   */
  constructor({ remaining, resetTimestamp, limit }, template) {
    /** @type {number} Number of requests available before hitting rate limit. Triggers internal rate limiting when 0. */
    this.remaining = remaining;
    /** @type {number|void}  When the rate limit's remaining requests resets to `limit`. */
    this.resetTimestamp = resetTimestamp;
    /** @type {number} From Discord - Rate limit request cap. */
    this.limit = limit;
    /** @type {number} Timestamp of when this rate limit will expire if not accessed again before then. */
    this.expires;
    /** @type {import("./RateLimitTemplate")} */
    this.template = template;

    this.refreshExpire();
  }

  /**
   * If the request cannot be made without triggering a Discord rate limit.
   * @type {boolean} `true` if the rate limit exists and is active. Do no send a request.
   */
  get isRateLimited() {
    this.refreshExpire();

    if (this.rateLimitHasReset) {
      this.resetRemaining();
      return false;
    } if (this.hasRemainingUses) {
      return false;
    }

    return true;
  }

  /**
   * If it is past the time Discord said the rate limit would reset.
   * @private
   * @type {boolean}
   */
  get rateLimitHasReset() {
    return this.resetTimestamp <= new Date().getTime();
  }

  /**
   * If a request can be made without triggering a Discord rate limit.
   * @private
   * @type {boolean}
   */
  get hasRemainingUses() {
    return this.remaining > 0;
  }

  /** @type {number} How long until the rate limit resets in ms. */
  get resetAfter() {
    const resetAfter = Utils.millisecondsFromNow(this.resetTimestamp);
    return resetAfter > 0 ? resetAfter : 0;
  }

  refreshExpire() {
    this.expires = new Date().getTime() + API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS;
  }

  /** Reduces the remaining requests (before internally rate limiting) by 1. */
  decrementRemaining() {
    this.refreshExpire();
    --this.remaining;
  }

  /**
   * Updates state properties if incoming state is more "strict".
   * Strictness is defined by the value that decreases the chance of getting rate limit.
   *
   * @param {RateLimitState}
   */
  assignIfStricter({ remaining, resetTimestamp, limit }) {
    if (resetTimestamp !== undefined && remaining < this.remaining) {
      this.remaining = remaining;
    }
    if (resetTimestamp !== undefined && resetTimestamp > this.resetTimestamp) {
      this.resetTimestamp = resetTimestamp;
    }
    if (resetTimestamp !== undefined && limit < this.limit) {
      this.limit = limit;
    }
  }

  /**
   * Sets the remaining requests back to the known limit.
   * @private
   * */
  resetRemaining() {
    this.remaining = this.limit;
    this.resetTimestamp = new Date().getTime() + this.template.resetAfter;
  }
};
