"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const constants_1 = require("../../../constants");
class RateLimit {
    expires;
    #remaining;
    #resetTimestamp;
    #limit;
    #template;
    #allowTimestampOverwrite;
    constructor({ remaining, resetTimestamp, limit }, template) {
        this.#remaining = remaining;
        this.#resetTimestamp = resetTimestamp ?? -1;
        this.#limit = limit;
        this.#template = template;
        this.#allowTimestampOverwrite = true;
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
        return this.#resetTimestamp <= new Date().getTime();
    }
    get hasRemainingUses() {
        return this.#remaining > 0;
    }
    get waitFor() {
        const waitFor = (0, utils_1.millisecondsFromNow)(this.#resetTimestamp);
        return waitFor > 0 ? waitFor : 0;
    }
    refreshExpire() {
        this.expires = new Date().getTime() + constants_1.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS;
    }
    decrementRemaining() {
        this.refreshExpire();
        --this.#remaining;
    }
    assignIfStricter({ remaining, resetTimestamp, limit }) {
        if (resetTimestamp !== undefined && remaining < this.#remaining) {
            this.#remaining = remaining;
        }
        if (resetTimestamp !== undefined && limit < this.#limit) {
            this.#limit = limit;
        }
        if (resetTimestamp !== undefined && (this.#allowTimestampOverwrite || resetTimestamp > this.#resetTimestamp)) {
            this.#resetTimestamp = resetTimestamp;
        }
        this.#allowTimestampOverwrite = false;
    }
    resetRemaining() {
        this.#remaining = this.#limit;
        this.#resetTimestamp = new Date().getTime() + this.#template.resetAfter;
        this.#allowTimestampOverwrite = true;
    }
}
exports.default = RateLimit;
