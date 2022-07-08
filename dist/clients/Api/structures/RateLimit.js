"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const constants_1 = require("../../../constants");
/** State of a Discord rate limit. */
class RateLimit {
    /** Timestamp of when this rate limit will expire if not accessed again before then. */
    expires;
    /** Number of requests available before hitting rate limit. Triggers internal rate limiting when 0. */
    #remaining;
    /** When the rate limit's remaining requests resets to `limit`. */
    #resetTimestamp;
    /** From Discord - Rate limit request cap. */
    #limit;
    #template;
    /** When resetting the rate limit, allows the next response to dictate the reset timestamp. */
    #allowTimestampOverwrite;
    /**
     * Creates a new rate limit state.
     * @param rateLimitState
     * @param template
     */
    constructor({ remaining, resetTimestamp, limit }, template) {
        this.#remaining = remaining;
        this.#resetTimestamp = resetTimestamp ?? -1;
        this.#limit = limit;
        this.#template = template;
        this.#allowTimestampOverwrite = true;
        this.refreshExpire();
    }
    /**
     * If the request cannot be made without triggering a Discord rate limit.
     * `true` if the rate limit exists and is active. Do no send a request.
     */
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
    /** If it is past the time Discord said the rate limit would reset. */
    get rateLimitHasReset() {
        return this.#resetTimestamp <= new Date().getTime();
    }
    /** If a request can be made without triggering a Discord rate limit. */
    get hasRemainingUses() {
        return this.#remaining > 0;
    }
    /** How long until the rate limit resets in ms. */
    get waitFor() {
        const waitFor = (0, utils_1.millisecondsFromNow)(this.#resetTimestamp);
        return waitFor > 0 ? waitFor : 0;
    }
    refreshExpire() {
        this.expires = new Date().getTime() + constants_1.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS;
    }
    /** Reduces the remaining requests (before internally rate limiting) by 1. */
    decrementRemaining() {
        this.refreshExpire();
        --this.#remaining;
    }
    /**
     * Updates state properties if incoming state is more "strict".
     * Strictness is defined by the value that decreases the chance of getting rate limit.
     * @param rateLimit
     */
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
    /** Sets the remaining requests back to the known limit. */
    resetRemaining() {
        this.#remaining = this.#limit;
        this.#resetTimestamp = new Date().getTime() + this.#template.resetAfter;
        this.#allowTimestampOverwrite = true;
    }
}
exports.default = RateLimit;
