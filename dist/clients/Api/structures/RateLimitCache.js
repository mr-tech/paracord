"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _requestRouteMetaToBucket, _rateLimitMap, _rateLimitTemplateMap, _globalRateLimitState;
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const utils_1 = require("../../../utils");
const RateLimitMap_1 = __importDefault(require("./RateLimitMap"));
const RateLimitTemplateMap_1 = __importDefault(require("./RateLimitTemplateMap"));
class RateLimitCache {
    constructor(autoStartSweep = true) {
        _requestRouteMetaToBucket.set(this, void 0);
        _rateLimitMap.set(this, void 0);
        _rateLimitTemplateMap.set(this, void 0);
        _globalRateLimitState.set(this, void 0);
        __classPrivateFieldSet(this, _requestRouteMetaToBucket, new Map());
        __classPrivateFieldSet(this, _rateLimitMap, new RateLimitMap_1.default());
        __classPrivateFieldSet(this, _rateLimitTemplateMap, new RateLimitTemplateMap_1.default());
        __classPrivateFieldSet(this, _globalRateLimitState, {
            remaining: 0,
            resetTimestamp: 0,
        });
        autoStartSweep && __classPrivateFieldGet(this, _rateLimitMap).startSweepInterval();
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
        return __classPrivateFieldGet(this, _globalRateLimitState).resetTimestamp <= new Date().getTime();
    }
    get globalRateLimitHasRemainingUses() {
        return __classPrivateFieldGet(this, _globalRateLimitState).remaining > 0;
    }
    get globalRateLimitResetAfter() {
        const resetAfter = utils_1.millisecondsFromNow(__classPrivateFieldGet(this, _globalRateLimitState).resetTimestamp);
        return resetAfter > 0 ? resetAfter : 0;
    }
    startSweepInterval() {
        __classPrivateFieldGet(this, _rateLimitMap).startSweepInterval();
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
            __classPrivateFieldGet(this, _globalRateLimitState).resetTimestamp = new Date().getTime() + constants_1.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS;
        }
        --__classPrivateFieldGet(this, _globalRateLimitState).remaining;
    }
    authorizeRequestFromClient(request) {
        const { isGloballyRateLimited } = this;
        const rateLimit = this.getRateLimitFromCache(request);
        if (isGloballyRateLimited) {
            if (rateLimit !== undefined && this.returnIsRateLimited(request)) {
                return {
                    resetAfter: RateLimitCache.returnStricterResetTimestamp(this.globalRateLimitResetAfter, rateLimit.resetAfter),
                    global: true,
                };
            }
            return { resetAfter: this.globalRateLimitResetAfter, global: true };
        }
        if (rateLimit === undefined) {
            return { resetAfter: 0 };
        }
        const { resetAfter } = this.returnIsRateLimited(request);
        if (resetAfter === 0) {
            rateLimit.decrementRemaining();
            this.decrementGlobalRemaining();
            return { resetAfter: 0 };
        }
        return { resetAfter: rateLimit.resetAfter };
    }
    update(request, rateLimitHeaders) {
        const { requestRouteMeta, rateLimitKey } = request;
        const { bucket } = rateLimitHeaders;
        if (bucket !== undefined) {
            __classPrivateFieldGet(this, _requestRouteMetaToBucket).set(requestRouteMeta, bucket);
            const template = __classPrivateFieldGet(this, _rateLimitTemplateMap).upsert(bucket, rateLimitHeaders);
            __classPrivateFieldGet(this, _rateLimitMap).upsert(rateLimitKey, rateLimitHeaders, template);
        }
    }
    returnIsRateLimited(request) {
        if (this.isGloballyRateLimited) {
            return { resetAfter: this.globalRateLimitResetAfter, global: true };
        }
        const rateLimit = this.getRateLimitFromCache(request);
        if (rateLimit === null || rateLimit === void 0 ? void 0 : rateLimit.isRateLimited) {
            return { resetAfter: rateLimit.resetAfter };
        }
        return { resetAfter: 0 };
    }
    resetGlobalRateLimit() {
        __classPrivateFieldGet(this, _globalRateLimitState).resetTimestamp = 0;
        __classPrivateFieldGet(this, _globalRateLimitState).remaining = constants_1.API_GLOBAL_RATE_LIMIT;
    }
    getRateLimitFromCache(request) {
        const { requestRouteMeta, rateLimitKey } = request;
        const bucket = __classPrivateFieldGet(this, _requestRouteMetaToBucket).get(requestRouteMeta);
        if (bucket !== undefined) {
            return __classPrivateFieldGet(this, _rateLimitMap).get(rateLimitKey) || this.rateLimitFromTemplate(request, bucket);
        }
        return undefined;
    }
    rateLimitFromTemplate(request, bucketUid) {
        const { rateLimitKey } = request;
        const rateLimit = __classPrivateFieldGet(this, _rateLimitTemplateMap).createAssumedRateLimit(bucketUid);
        if (rateLimit !== undefined) {
            __classPrivateFieldGet(this, _rateLimitMap).set(rateLimitKey, rateLimit);
            return rateLimit;
        }
        return undefined;
    }
}
exports.default = RateLimitCache;
_requestRouteMetaToBucket = new WeakMap(), _rateLimitMap = new WeakMap(), _rateLimitTemplateMap = new WeakMap(), _globalRateLimitState = new WeakMap();
