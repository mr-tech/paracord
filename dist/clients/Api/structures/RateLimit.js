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
var _remaining, _resetTimestamp, _limit, _template, _allowHeaderOverride;
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const utils_1 = require("../../../utils");
class RateLimit {
    constructor({ remaining, resetTimestamp, limit }, template) {
        _remaining.set(this, void 0);
        _resetTimestamp.set(this, void 0);
        _limit.set(this, void 0);
        _template.set(this, void 0);
        _allowHeaderOverride.set(this, void 0);
        __classPrivateFieldSet(this, _remaining, remaining);
        __classPrivateFieldSet(this, _resetTimestamp, resetTimestamp !== null && resetTimestamp !== void 0 ? resetTimestamp : -1);
        __classPrivateFieldSet(this, _limit, limit);
        __classPrivateFieldSet(this, _template, template);
        __classPrivateFieldSet(this, _allowHeaderOverride, true);
        this.refreshExpire();
    }
    get isRateLimited() {
        this.refreshExpire();
        if (this.rateLimitHasReset) {
            this.resetRemaining();
            return false;
        }
        if (this.hasRemainingUses) {
            return false;
        }
        return true;
    }
    get rateLimitHasReset() {
        return __classPrivateFieldGet(this, _resetTimestamp) <= new Date().getTime();
    }
    get hasRemainingUses() {
        return __classPrivateFieldGet(this, _remaining) > 0;
    }
    get resetAfter() {
        const resetAfter = utils_1.millisecondsFromNow(__classPrivateFieldGet(this, _resetTimestamp));
        return resetAfter > 0 ? resetAfter : 0;
    }
    refreshExpire() {
        this.expires = new Date().getTime() + constants_1.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS;
    }
    decrementRemaining() {
        this.refreshExpire();
        __classPrivateFieldSet(this, _remaining, +__classPrivateFieldGet(this, _remaining) - 1);
    }
    assignIfStricter({ remaining, resetTimestamp, limit }) {
        if (resetTimestamp !== undefined && (__classPrivateFieldGet(this, _allowHeaderOverride) || remaining < __classPrivateFieldGet(this, _remaining))) {
            __classPrivateFieldSet(this, _remaining, remaining);
        }
        if (resetTimestamp !== undefined && (__classPrivateFieldGet(this, _allowHeaderOverride) || resetTimestamp > __classPrivateFieldGet(this, _resetTimestamp))) {
            __classPrivateFieldSet(this, _resetTimestamp, resetTimestamp);
        }
        if (resetTimestamp !== undefined && (__classPrivateFieldGet(this, _allowHeaderOverride) || limit < __classPrivateFieldGet(this, _limit))) {
            __classPrivateFieldSet(this, _limit, limit);
        }
        __classPrivateFieldSet(this, _allowHeaderOverride, false);
    }
    resetRemaining() {
        __classPrivateFieldSet(this, _remaining, __classPrivateFieldGet(this, _limit));
        __classPrivateFieldSet(this, _resetTimestamp, new Date().getTime() + __classPrivateFieldGet(this, _template).resetAfter);
        __classPrivateFieldSet(this, _allowHeaderOverride, true);
    }
}
exports.default = RateLimit;
_remaining = new WeakMap(), _resetTimestamp = new WeakMap(), _limit = new WeakMap(), _template = new WeakMap(), _allowHeaderOverride = new WeakMap();
