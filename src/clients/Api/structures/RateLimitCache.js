'use strict';

const RateLimitMap = require('./RateLimitMap');
const RateLimitTemplateMap = require('./RateLimitTemplateMap');
const Utils = require('../../../utils');
const { API_GLOBAL_RATE_LIMIT, API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS } = require('../../../constants');

// TODO(lando): add a periodic sweep for rate limits to fix potential memory leak.

/** @typedef {import("./Request")} Request */

/** @typedef {string} RateLimitRequestMeta Combination of request parameters that identify a bucket. */
/** @typedef {string} RateLimitBucket From Discord - A uid that identifies a group of requests that share a rate limit. */
/** @typedef {string} RateLimitKey */

/**
 * @typedef {Map<RateLimitRequestMeta, RateLimitBucket>} requestRouteMetaToBucket
 */

// /**
//  * @typedef {RateLimit} RateLimitTemplate A frozen instance of a rate limit that is used as
//  * a reference for requests with the same bucket but without an existing cached state.
//  */

// /** @typedef {Map<RateLimitBucket, void|RateLimitTemplate>} RateLimitTemplateMap */

/** @typedef GlobalRateLimitState
 * @property {number} remaining How many requests remaining before checking to see if global rate limit should trigger.
 * @property {number} resetTimestamp
 */

/** Stores the state of all known rate limits this client has encountered. */
module.exports = class RateLimitCache {
  static returnStricterResetTimestamp(globalResetAfter, rateLimitResetAfter) {
    return globalResetAfter > rateLimitResetAfter ? globalResetAfter : rateLimitResetAfter;
  }

  /** Creates a new rate limit cache. */
  constructor() {
    /** @type {requestRouteMetaToBucket} Request meta values to their associated rate limit bucket, if one exists. */
    this.requestRouteMetaToBucket = new Map();
    /** @type {RateLimitMap} Rate limit keys to their associate rate limit. */
    this.rateLimitMap = new RateLimitMap();
    /** @type {RateLimitTemplateMap} Bucket Ids to saved rate limits state to create new rate limits from known constraints. */
    this.rateLimitTemplateMap = new RateLimitTemplateMap();
    /** @type {GlobalRateLimitState} */
    this.globalRateLimitState = {
      remaining: 0,
      resetTimestamp: 0,
    };

    this.rateLimitMap.startSweepInterval();
  }

  /**
   * If the request cannot be made without triggering a Discord rate limit.
   * @type {boolean} `true` if the rate limit exists and is active. Do no send a request.
   */
  get isGloballyRateLimited() {
    if (this.globalRateLimitHasReset) {
      this.resetGlobalRateLimit();
      return false;
    }

    if (this.globalRateLimitHasRemainingUses) {
      return false;
    }

    return true;
  }

  /**
   * If it is past the time Discord said the rate limit would reset.
   * @private
   * @type {boolean}
   */
  get globalRateLimitHasReset() {
    return this.globalRateLimitState.resetTimestamp <= new Date().getTime();
  }

  /**
   * If a request can be made without triggering a Discord rate limit.
   * @private
   * @type {boolean}
   */
  get globalRateLimitHasRemainingUses() {
    return this.globalRateLimitState.remaining > 0;
  }

  /** @type {number} How long until the rate limit resets in ms. */
  get globalRateLimitResetAfter() {
    const resetAfter = Utils.millisecondsFromNow(this.globalRateLimitState.resetTimestamp);
    return resetAfter > 0 ? resetAfter : 0;
  }

  /** Sets the remaining requests back to the known limit. */
  resetGlobalRateLimit() {
    this.globalRateLimitState.resetTimestamp = 0;
    this.globalRateLimitState.remaining = API_GLOBAL_RATE_LIMIT;
  }


  /**
   * Decorator for requests. Decrements rate limit when executing if one exists for this request.
   *
   * @param {Function} requestFunc `request` method of an axios instance.
   * @returns {WrappedRequest} Wrapped function.
   */
  wrapRequest(requestFunc) {
    /** @type {WrappedRequest} */
    const wrappedRequest = (request) => {
      const rateLimit = this.getRateLimitFromCache(request);

      if (rateLimit !== undefined) {
        rateLimit.decrementRemaining();
      }

      this.decrementGlobalRemaining();

      return requestFunc.apply(this, [request.sendData]);
    };

    return wrappedRequest;
  }

  decrementGlobalRemaining() {
    if (this.globalRateLimitResetAfter === 0) {
      this.globalRateLimitState.resetTimestamp = new Date().getTime() + API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS;
    }

    --this.globalRateLimitState.remaining;
  }

  /**
   * Authorizes a request being check via the rate limit rpc service.
   *
   * @param {BaseRequest} request Request's rate limit key formed in BaseRequest.
   * @returns {number} Until when the client should wait before asking to authorize this request again.
   */
  authorizeRequestFromClient(request) {
    const { isGloballyRateLimited } = this;
    const rateLimit = this.getRateLimitFromCache(request);

    if (isGloballyRateLimited) {
      if (rateLimit !== undefined && this.returnIsRateLimited(request)) {
        return RateLimitCache.returnStricterResetTimestamp(this.globalResetAfter, rateLimit.resetAfter);
      }

      return this.globalRateLimitResetAfter;
    }

    if (rateLimit === undefined) {
      return 0;
    }

    if (!this.returnIsRateLimited(request)) {
      rateLimit.decrementRemaining();
      this.decrementGlobalRemaining();
      return 0;
    }

    return rateLimit.resetAfter;
  }

  /**
   * Gets the rate limit, creating a new one from an existing template if the rate limit does not already exist.
   * @private
   *
   * @param {BaseRequest|Request} request Request that may have a rate limit.
   * @return {RateLimit} `undefined` when there is no cached rate limit or matching template for this request.
   */
  getRateLimitFromCache(request) {
    const { requestRouteMeta, rateLimitKey } = request;

    const bucket = this.requestRouteMetaToBucket.get(requestRouteMeta);
    if (bucket !== undefined) {
      return this.rateLimitMap.get(rateLimitKey) || this.rateLimitFromTemplate(request);
    }

    return undefined;
  }

  rateLimitFromTemplate(request, bucket) {
    const { rateLimitKey } = request;

    const rateLimit = this.rateLimitTemplateMap.createAssumedRateLimit(bucket);
    if (rateLimit !== undefined) {
      this.rateLimitMap.set(rateLimitKey, rateLimit);
      return rateLimit;
    }

    return undefined;
  }

  /**
   * Updates this cache using the response headers after making a request.
   *
   * @param {BaseRequest|Request} request Request that was made.
   * @param {RateLimitHeaders} rateLimitHeaders Rate limit values from the response.
   */
  update(request, rateLimitHeaders) {
    const { requestRouteMeta, rateLimitKey } = request;

    if (rateLimitHeaders !== undefined) {
      const { bucket, ...state } = rateLimitHeaders;

      this.requestRouteMetaToBucket.set(requestRouteMeta, bucket);
      const template = this.rateLimitTemplateMap.upsert(bucket, state);
      console.log(template);
      this.rateLimitMap.upsert(rateLimitKey, state, template);
    }
  }

  /**
   * Runs a request's rate limit meta against the cache to determine if it would trigger a rate limit.
   *
   * @param {Request} request The request to reference when checking the rate limit state.
   * @returns {boolean} `true` if rate limit would get triggered.
   */
  returnIsRateLimited(request) {
    if (this.isGloballyRateLimited) {
      return true;
    }

    const rateLimit = this.getRateLimitFromCache(request);
    if (rateLimit !== undefined) {
      return rateLimit.isRateLimited;
    }

    return false;
  }
};
