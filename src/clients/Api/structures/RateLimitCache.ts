import { millisecondsFromNow } from '../../../utils';
import { API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS } from '../../../constants';

import RateLimitMap from './RateLimitMap';
import RateLimitTemplateMap from './RateLimitTemplateMap';

import type { AxiosInstance } from 'axios';
import type Api from '../Api';
import type { RateLimitState, WrappedRequest } from '../types';
import type ApiRequest from './ApiRequest';
import type BaseRequest from './BaseRequest';
import type RateLimit from './RateLimit';
import type RateLimitHeaders from './RateLimitHeaders';

/** From Discord - A uid that identifies a group of requests that share a rate limit. */
type RateLimitBucketHash = string;

/** Stores the state of all known rate limits this client has encountered. */
export default class RateLimitCache {
  #apiClient: undefined | Api;

  /** Request meta values to their associated rate limit bucket, if one exists. */
  bucketHashes: Map<string, RateLimitBucketHash>;

  /** Rate limit keys to their associate rate limit */
  #rateLimitMap: RateLimitMap;

  /** Bucket Ids to saved rate limits state to create new rate limits from known constraints. */
  #rateLimitTemplateMap: RateLimitTemplateMap;

  /** Assumed state of the global rate limit. */
  #globalRateLimitState: {
    /** How many requests remaining before checking to see if global rate limit should trigger. */
    remaining: number;
    /** Epoch timestamp of when the global rate limit expires. */
    resetTimestamp: number;
  };

  #globalRateLimitMax: number;

  #globalRateLimitResetPadding: number;

  public constructor(globalRateLimitMax: number, globalRateLimitResetPadding: number, api: undefined | Api) {
    this.#apiClient = api;
    this.bucketHashes = new Map();
    this.#rateLimitMap = new RateLimitMap(api);
    this.#rateLimitTemplateMap = new RateLimitTemplateMap();
    this.#globalRateLimitState = {
      remaining: 0,
      resetTimestamp: 0,
    };
    this.#globalRateLimitMax = globalRateLimitMax;
    this.#globalRateLimitResetPadding = globalRateLimitResetPadding;
  }

  /**
   * If the request cannot be made without triggering a Discord rate limit.
   * `true` if the rate limit exists and is active. Do no send a request.
   */
  private get isGloballyRateLimited(): boolean {
    if (this.globalRateLimitHasReset) {
      this.resetGlobalRateLimit();
      return false;
    }

    if (this.globalRateLimitHasRemainingUses) {
      return false;
    }

    return true;
  }

  /** If it is past the time Discord said the rate limit would reset. */
  private get globalRateLimitHasReset(): boolean {
    return this.#globalRateLimitState.resetTimestamp <= new Date().getTime();
  }

  /** If a request can be made without triggering a Discord rate limit. */
  private get globalRateLimitHasRemainingUses(): boolean {
    return this.#globalRateLimitState.remaining > 0;
  }

  /** How long until the rate limit resets in ms. */
  private get globalRateLimitResetAfter(): number {
    const waitFor = millisecondsFromNow(this.#globalRateLimitState.resetTimestamp);
    return waitFor > 0 ? waitFor : 0;
  }

  /** Decorator for requests. Decrements rate limit when executing if one exists for this request. */
  public wrapRequest(requestFunc: AxiosInstance['request']): WrappedRequest {
    const wrappedRequest = <T>(request: ApiRequest) => {
      const rateLimit = this.getRateLimitFromCache(request);

      if (rateLimit !== undefined) {
        rateLimit.decrementRemaining();
      }

      this.decrementGlobalRemaining();
      const r = requestFunc.bind(this);
      return r<T>(request.config);
    };

    return wrappedRequest;
  }

  private decrementGlobalRemaining(): void {
    if (this.globalRateLimitResetAfter === 0) {
      this.#globalRateLimitState.resetTimestamp = new Date().getTime() + API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS + this.#globalRateLimitResetPadding;
    }

    --this.#globalRateLimitState.remaining;
  }

  /**
   * Authorizes a request being check via the rate limit rpc service.
   *
   * @param {BaseRequest} request Request's rate limit key formed in BaseRequest.
   * @returns {number} Until when the client should wait before asking to authorize this request again.
   */
  public authorizeRequestFromClient(request: BaseRequest): RateLimitState {
    const { isGloballyRateLimited } = this;
    const rateLimit = this.getRateLimitFromCache(request);

    if (isGloballyRateLimited) {
      return {
        waitFor: this.globalRateLimitResetAfter,
        global: true,
      };
    }

    if (rateLimit === undefined) {
      return { waitFor: 0 };
    }

    const { waitFor } = this.isRateLimited(request);
    if (waitFor === 0) {
      rateLimit.decrementRemaining();
      this.decrementGlobalRemaining();
      return { waitFor: 0 };
    }

    return { waitFor: rateLimit.waitFor };
  }

  /**
   * Updates this cache using the response headers after making a request.
   *
   * @param request Request that was made.
   * @param rateLimitHeaders Rate limit values from the response.
   */
  public update(rateLimitKey: string, bucketHashKey: string, rateLimitHeaders: RateLimitHeaders): void {
    const { bucketHash } = rateLimitHeaders;

    if (bucketHash !== undefined) {
      this.bucketHashes.set(bucketHashKey, bucketHash);
      const template = this.#rateLimitTemplateMap.upsert(bucketHash, rateLimitHeaders);
      this.#rateLimitMap.upsert(rateLimitKey, rateLimitHeaders, template);
    }
  }

  /**
   * Sets the global rate limit state if the response headers indicate a global rate limit.
   *
   * @param rateLimitHeaders Rate limit values from the response.
   */
  public updateGlobal(rateLimitHeaders: RateLimitHeaders): void {
    if (rateLimitHeaders.global) {
      this.#globalRateLimitState.remaining = 0;
      this.#globalRateLimitState.resetTimestamp = Date.now() + rateLimitHeaders.retryAfter;
    }
  }

  /**
   * Runs a request's rate limit meta against the cache to determine if it would trigger a rate limit.
   *
   * @param request The request to reference when checking the rate limit state.
   * @returns `true` if rate limit would get triggered.
   */
  public isRateLimited(request: BaseRequest | ApiRequest): RateLimitState {
    if (this.isGloballyRateLimited) {
      return { waitFor: this.globalRateLimitResetAfter, global: true };
    }

    const rateLimit = this.getRateLimitFromCache(request);
    if (rateLimit?.isRateLimited) {
      return { waitFor: rateLimit.waitFor };
    }

    return { waitFor: 0 };
  }

  /** Sets the remaining requests back to the known limit. */
  private resetGlobalRateLimit(): void {
    this.#globalRateLimitState.resetTimestamp = 0;
    this.#globalRateLimitState.remaining = this.#globalRateLimitMax;
  }

  /**
   * Gets the rate limit, creating a new one from an existing template if the rate limit does not already exist.
   *
   * @param request Request that may have a rate limit.
   * @return `undefined` when there is no cached rate limit or matching template for this request.
   */
  private getRateLimitFromCache(request: BaseRequest | ApiRequest): RateLimit | undefined {
    const { rateLimitKey, bucketHashKey } = request;

    if (rateLimitKey) {
      const rateLimit = this.#rateLimitMap.get(rateLimitKey);
      if (rateLimit) return rateLimit;
    }

    const bucketHash = this.bucketHashes.get(bucketHashKey);
    if (bucketHash) {
      return this.rateLimitFromTemplate(request, bucketHash);
    }

    return undefined;
  }

  public getBucket(bucketHashKey: string) {
    return this.bucketHashes.get(bucketHashKey);
  }

  /**
   * Updates this cache using the response headers after making a request.
   *
   * @param request Request that was made.
   * @param bucketHash uid of the rate limit's bucket.
   */
  private rateLimitFromTemplate(request: BaseRequest | ApiRequest, bucketHash: string): RateLimit | undefined {
    const rateLimit = this.#rateLimitTemplateMap.createAssumedRateLimit(bucketHash);
    if (rateLimit !== undefined) {
      const rateLimitKey = request.getRateLimitKey(bucketHash);
      this.#rateLimitMap.set(rateLimitKey, rateLimit);
      return rateLimit;
    }

    return undefined;
  }
}
