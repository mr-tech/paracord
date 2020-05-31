"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const Utils_1 = require("../../../Utils");
const RateLimitMap_1 = __importDefault(require("./RateLimitMap"));
const RateLimitTemplateMap_1 = __importDefault(require("./RateLimitTemplateMap"));
class RateLimitCache {
    constructor(autoStartSweep = true) {
        this.requestRouteMetaToBucket = new Map();
        this.rateLimitMap = new RateLimitMap_1.default();
        this.rateLimitTemplateMap = new RateLimitTemplateMap_1.default();
        this.globalRateLimitState = {
            remaining: 0,
            resetTimestamp: 0,
        };
        autoStartSweep && this.rateLimitMap.startSweepInterval();
    }
    static returnStricterResetTimestamp(globalResetAfter, rateLimitResetAfter) {
        return globalResetAfter > rateLimitResetAfter ? globalResetAfter : rateLimitResetAfter;
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
        return this.globalRateLimitState.resetTimestamp <= new Date().getTime();
    }
    get globalRateLimitHasRemainingUses() {
        return this.globalRateLimitState.remaining > 0;
    }
    get globalRateLimitResetAfter() {
        const resetAfter = Utils_1.millisecondsFromNow(this.globalRateLimitState.resetTimestamp);
        return resetAfter > 0 ? resetAfter : 0;
    }
    startSweepInterval() {
        this.rateLimitMap.startSweepInterval();
    }
    wrapRequest(requestFunc) {
        const wrappedRequest = (request) => {
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
    decrementGlobalRemaining() {
        if (this.globalRateLimitResetAfter === 0) {
            this.globalRateLimitState.resetTimestamp = new Date().getTime() + constants_1.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS;
        }
        --this.globalRateLimitState.remaining;
    }
    authorizeRequestFromClient(request) {
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
    update(request, rateLimitHeaders) {
        const { requestRouteMeta, rateLimitKey } = request;
        const { bucket } = rateLimitHeaders;
        this.requestRouteMetaToBucket.set(requestRouteMeta, bucket);
        const template = this.rateLimitTemplateMap.upsert(rateLimitHeaders);
        this.rateLimitMap.upsert(rateLimitKey, rateLimitHeaders, template);
    }
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
    resetGlobalRateLimit() {
        this.globalRateLimitState.resetTimestamp = 0;
        this.globalRateLimitState.remaining = constants_1.API_GLOBAL_RATE_LIMIT;
    }
    getRateLimitFromCache(request) {
        const { requestRouteMeta, rateLimitKey } = request;
        const bucket = this.requestRouteMetaToBucket.get(requestRouteMeta);
        if (bucket !== undefined) {
            return this.rateLimitMap.get(rateLimitKey) || this.rateLimitFromTemplate(request, bucket);
        }
        return undefined;
    }
    rateLimitFromTemplate(request, bucketUid) {
        const { rateLimitKey } = request;
        const rateLimit = this.rateLimitTemplateMap.createAssumedRateLimit(bucketUid);
        if (rateLimit !== undefined) {
            this.rateLimitMap.set(rateLimitKey, rateLimit);
            return rateLimit;
        }
        return undefined;
    }
}
exports.default = RateLimitCache;
