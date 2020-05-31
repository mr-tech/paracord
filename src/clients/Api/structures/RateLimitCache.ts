import { AxiosInstance } from 'axios';
import type { ApiRequest } from '.';
import { API_GLOBAL_RATE_LIMIT, API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS } from '../../../constants';
import { millisecondsFromNow } from '../../../Utils';
import { IApiResponse, WrappedRequest } from '../types';
import BaseRequest from './BaseRequest';
import RateLimit from './RateLimit';
import RateLimitHeaders from './RateLimitHeaders';
import RateLimitMap from './RateLimitMap';
import RateLimitTemplateMap from './RateLimitTemplateMap';

/** From Discord - A uid that identifies a group of requests that share a rate limit. */
type RateLimitBucketUid = string;

/** Stores the state of all known rate limits this client has encountered. */
export default class RateLimitCache {
  /** Request meta values to their associated rate limit bucket, if one exists. */
  private requestRouteMetaToBucket: Map<BaseRequest['requestRouteMeta'], RateLimitBucketUid>;

  /** Rate limit keys to their associate rate limit */
  private rateLimitMap: RateLimitMap;

  /** Bucket Ids to saved rate limits state to create new rate limits from known constraints. */
  private rateLimitTemplateMap: RateLimitTemplateMap;

  /** Assumed state of the global rate limit. */
  private globalRateLimitState: {
    /** How many requests remaining before checking to see if global rate limit should trigger. */
    remaining: number;
    /** Epoch timestamp of when the global rate limit expires. */
    resetTimestamp: number;
  };

  /** Return whichever rate limit has the longest remaining wait time before being able to make this request. */
  private static returnStricterResetTimestamp(globalResetAfter: number, rateLimitResetAfter: number) {
    return globalResetAfter > rateLimitResetAfter ? globalResetAfter : rateLimitResetAfter;
  }

  /**
   * Creates a new rate limit cache.
   * @param autoStartSweep Specify false to not start the sweep interval.
   */
  public constructor(autoStartSweep = true) {
    this.requestRouteMetaToBucket = new Map();
    this.rateLimitMap = new RateLimitMap();
    this.rateLimitTemplateMap = new RateLimitTemplateMap();
    this.globalRateLimitState = {
      remaining: 0,
      resetTimestamp: 0,
    };

    autoStartSweep && this.rateLimitMap.startSweepInterval();
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
    return this.globalRateLimitState.resetTimestamp <= new Date().getTime();
  }

  /** If a request can be made without triggering a Discord rate limit. */
  private get globalRateLimitHasRemainingUses(): boolean {
    return this.globalRateLimitState.remaining > 0;
  }

  /** How long until the rate limit resets in ms. */
  private get globalRateLimitResetAfter(): number {
    const resetAfter = millisecondsFromNow(this.globalRateLimitState.resetTimestamp);
    return resetAfter > 0 ? resetAfter : 0;
  }

  /** Begins timer for sweeping cache of old rate limits. */
  public startSweepInterval(): void {
    this.rateLimitMap.startSweepInterval();
  }

  /** Decorator for requests. Decrements rate limit when executing if one exists for this request. */
  public wrapRequest(requestFunc: AxiosInstance['request']): WrappedRequest {
    const wrappedRequest = (request: ApiRequest): Promise<IApiResponse> => {
      const rateLimit = this.getRateLimitFromCache(request);

      if (rateLimit !== undefined) {
        rateLimit.decrementRemaining();
      }

      this.decrementGlobalRemaining();

      const r = requestFunc.bind(this);
      return r(request.sendData);
    };

    return wrappedRequest;
  }

  public decrementGlobalRemaining(): void {
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
  public authorizeRequestFromClient(request: BaseRequest): number {
    const { isGloballyRateLimited } = this;
    const rateLimit = this.getRateLimitFromCache(request);

    if (isGloballyRateLimited) {
      if (rateLimit !== undefined && this.returnIsRateLimited(request)) {
        return RateLimitCache.returnStricterResetTimestamp(this.globalRateLimitResetAfter, rateLimit.resetAfter);
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
   * Updates this cache using the response headers after making a request.
   *
   * @param request Request that was made.
   * @param rateLimitHeaders Rate limit values from the response.
   */
  public update(request: BaseRequest | ApiRequest, rateLimitHeaders: RateLimitHeaders): void {
    const { requestRouteMeta, rateLimitKey } = request;
    const { bucket } = rateLimitHeaders;

    this.requestRouteMetaToBucket.set(requestRouteMeta, bucket);
    const template = this.rateLimitTemplateMap.upsert(rateLimitHeaders);
    this.rateLimitMap.upsert(rateLimitKey, rateLimitHeaders, template);
  }

  /**
   * Runs a request's rate limit meta against the cache to determine if it would trigger a rate limit.
   *
   * @param request The request to reference when checking the rate limit state.
   * @returns `true` if rate limit would get triggered.
   */
  public returnIsRateLimited(request: BaseRequest | ApiRequest): boolean {
    if (this.isGloballyRateLimited) {
      return true;
    }

    const rateLimit = this.getRateLimitFromCache(request);
    if (rateLimit !== undefined) {
      return rateLimit.isRateLimited;
    }

    return false;
  }

  /** Sets the remaining requests back to the known limit. */
  private resetGlobalRateLimit(): void {
    this.globalRateLimitState.resetTimestamp = 0;
    this.globalRateLimitState.remaining = API_GLOBAL_RATE_LIMIT;
  }

  /**
   * Gets the rate limit, creating a new one from an existing template if the rate limit does not already exist.
   *
   * @param request Request that may have a rate limit.
   * @return `undefined` when there is no cached rate limit or matching template for this request.
   */
  private getRateLimitFromCache(request: BaseRequest | ApiRequest): RateLimit | undefined {
    const { requestRouteMeta, rateLimitKey } = request;

    const bucket = this.requestRouteMetaToBucket.get(requestRouteMeta);
    if (bucket !== undefined) {
      return this.rateLimitMap.get(rateLimitKey) || this.rateLimitFromTemplate(request, bucket);
    }

    return undefined;
  }

  /**
   * Updates this cache using the response headers after making a request.
   *
   * @param request Request that was made.
   * @param bucketUid uid of the rate limit's bucket.
   */
  private rateLimitFromTemplate(request: BaseRequest | ApiRequest, bucketUid: string): RateLimit | undefined {
    const { rateLimitKey } = request;

    const rateLimit = this.rateLimitTemplateMap.createAssumedRateLimit(bucketUid);
    if (rateLimit !== undefined) {
      this.rateLimitMap.set(rateLimitKey, rateLimit);
      return rateLimit;
    }

    return undefined;
  }
}
