"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../../../Utils");
const constants_1 = require("../../../constants");
class RateLimit {
    constructor({ remaining, resetTimestamp, limit }, template) {
        this.remaining = remaining;
        this.resetTimestamp = resetTimestamp;
        this.limit = limit;
        this.expires = undefined;
        this.template = template;
        this.allowHeaderOverride = true;
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
        return this.resetTimestamp <= new Date().getTime();
    }
    get hasRemainingUses() {
        return this.remaining > 0;
    }
    get resetAfter() {
        if (this.resetTimestamp === undefined)
            return 0;
        const resetAfter = Utils_1.millisecondsFromNow(this.resetTimestamp);
        return resetAfter > 0 ? resetAfter : 0;
    }
    refreshExpire() {
        this.expires = new Date().getTime() + constants_1.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS;
    }
    decrementRemaining() {
        this.refreshExpire();
        --this.remaining;
    }
    assignIfStricter({ remaining, resetTimestamp, limit }) {
        if (resetTimestamp !== undefined && (this.allowHeaderOverride || remaining < this.remaining)) {
            this.remaining = remaining;
        }
        if (resetTimestamp !== undefined && (this.allowHeaderOverride || resetTimestamp > this.resetTimestamp)) {
            this.resetTimestamp = resetTimestamp;
        }
        if (resetTimestamp !== undefined && (this.allowHeaderOverride || limit < this.limit)) {
            this.limit = limit;
        }
        this.allowHeaderOverride = false;
    }
    resetRemaining() {
        this.remaining = this.limit;
        this.resetTimestamp = new Date().getTime() + this.template.resetAfter;
        this.allowHeaderOverride = true;
    }
}
exports.default = RateLimit;
