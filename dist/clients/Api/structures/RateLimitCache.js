"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const constants_1 = require("../../../constants");
const RateLimitMap_1 = __importDefault(require("./RateLimitMap"));
const RateLimitTemplateMap_1 = __importDefault(require("./RateLimitTemplateMap"));
class RateLimitCache {
    bucketHashes;
    #rateLimitMap;
    #rateLimitTemplateMap;
    #globalRateLimitState;
    #globalRateLimitMax;
    #globalRateLimitResetPadding;
    constructor(autoStartSweep, globalRateLimitMax, globalRateLimitResetPadding, logger) {
        this.bucketHashes = new Map();
        this.#rateLimitMap = new RateLimitMap_1.default(logger);
        this.#rateLimitTemplateMap = new RateLimitTemplateMap_1.default();
        this.#globalRateLimitState = {
            remaining: 0,
            resetTimestamp: 0,
        };
        this.#globalRateLimitMax = globalRateLimitMax;
        this.#globalRateLimitResetPadding = globalRateLimitResetPadding;
        if (autoStartSweep)
            autoStartSweep && this.#rateLimitMap.startSweepInterval();
    }
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
    get globalRateLimitHasReset() {
        return this.#globalRateLimitState.resetTimestamp <= new Date().getTime();
    }
    get globalRateLimitHasRemainingUses() {
        return this.#globalRateLimitState.remaining > 0;
    }
    get globalRateLimitResetAfter() {
        const waitFor = (0, utils_1.millisecondsFromNow)(this.#globalRateLimitState.resetTimestamp);
        return waitFor > 0 ? waitFor : 0;
    }
    startSweepInterval() {
        this.#rateLimitMap.startSweepInterval();
    }
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
    update(rateLimitKey, bucketHashKey, rateLimitHeaders) {
        const { bucketHash } = rateLimitHeaders;
        if (bucketHash !== undefined) {
            this.bucketHashes.set(bucketHashKey, bucketHash);
            const template = this.#rateLimitTemplateMap.upsert(bucketHash, rateLimitHeaders);
            this.#rateLimitMap.upsert(rateLimitKey, rateLimitHeaders, template);
        }
    }
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
    resetGlobalRateLimit() {
        this.#globalRateLimitState.resetTimestamp = 0;
        this.#globalRateLimitState.remaining = this.#globalRateLimitMax;
    }
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
