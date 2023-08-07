"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const constants_1 = require("../../../constants");
const RateLimitMap_1 = __importDefault(require("./RateLimitMap"));
const RateLimitTemplateMap_1 = __importDefault(require("./RateLimitTemplateMap"));
/** Stores the state of all known rate limits this client has encountered. */
class RateLimitCache {
    #apiClient;
    /** Request meta values to their associated rate limit bucket, if one exists. */
    bucketHashes;
    /** Rate limit keys to their associate rate limit */
    #rateLimitMap;
    /** Bucket Ids to saved rate limits state to create new rate limits from known constraints. */
    #rateLimitTemplateMap;
    /** Assumed state of the global rate limit. */
    #globalRateLimitState;
    #globalRateLimitMax;
    #globalRateLimitResetPadding;
    constructor(globalRateLimitMax, globalRateLimitResetPadding, api) {
        this.#apiClient = api;
        this.bucketHashes = new Map();
        this.#rateLimitMap = new RateLimitMap_1.default(api);
        this.#rateLimitTemplateMap = new RateLimitTemplateMap_1.default();
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
    /** If it is past the time Discord said the rate limit would reset. */
    get globalRateLimitHasReset() {
        return this.#globalRateLimitState.resetTimestamp <= new Date().getTime();
    }
    /** If a request can be made without triggering a Discord rate limit. */
    get globalRateLimitHasRemainingUses() {
        return this.#globalRateLimitState.remaining > 0;
    }
    /** How long until the rate limit resets in ms. */
    get globalRateLimitResetAfter() {
        const waitFor = (0, utils_1.millisecondsFromNow)(this.#globalRateLimitState.resetTimestamp);
        return waitFor > 0 ? waitFor : 0;
    }
    /** Decorator for requests. Decrements rate limit when executing if one exists for this request. */
    wrapRequest(requestFunc) {
        const wrappedRequest = (request) => {
            const rateLimit = this.getRateLimitFromCache(request);
            if (rateLimit !== undefined) {
                rateLimit.decrementRemaining();
            }
            this.decrementGlobalRemaining();
            const r = requestFunc.bind(this);
            return r(request.config);
        };
        return wrappedRequest;
    }
    decrementGlobalRemaining() {
        if (this.globalRateLimitResetAfter === 0) {
            this.#globalRateLimitState.resetTimestamp = new Date().getTime() + constants_1.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS + this.#globalRateLimitResetPadding;
        }
        --this.#globalRateLimitState.remaining;
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
    update(rateLimitKey, bucketHashKey, rateLimitHeaders) {
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
    updateGlobal(rateLimitHeaders) {
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
    isRateLimited(request) {
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
    resetGlobalRateLimit() {
        this.#globalRateLimitState.resetTimestamp = 0;
        this.#globalRateLimitState.remaining = this.#globalRateLimitMax;
    }
    /**
     * Gets the rate limit, creating a new one from an existing template if the rate limit does not already exist.
     *
     * @param request Request that may have a rate limit.
     * @return `undefined` when there is no cached rate limit or matching template for this request.
     */
    getRateLimitFromCache(request) {
        const { rateLimitKey, bucketHashKey } = request;
        if (rateLimitKey) {
            const rateLimit = this.#rateLimitMap.get(rateLimitKey);
            if (rateLimit)
                return rateLimit;
        }
        const bucketHash = this.bucketHashes.get(bucketHashKey);
        if (bucketHash) {
            return this.rateLimitFromTemplate(request, bucketHash);
        }
        return undefined;
    }
    getBucket(bucketHashKey) {
        return this.bucketHashes.get(bucketHashKey);
    }
    /**
     * Updates this cache using the response headers after making a request.
     *
     * @param request Request that was made.
     * @param bucketHash uid of the rate limit's bucket.
     */
    rateLimitFromTemplate(request, bucketHash) {
        const rateLimit = this.#rateLimitTemplateMap.createAssumedRateLimit(bucketHash);
        if (rateLimit !== undefined) {
            const rateLimitKey = request.getRateLimitKey(bucketHash);
            this.#rateLimitMap.set(rateLimitKey, rateLimit);
            return rateLimit;
        }
        return undefined;
    }
}
exports.default = RateLimitCache;
