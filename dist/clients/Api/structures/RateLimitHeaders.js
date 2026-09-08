"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
function headerToMilliseconds(value) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0)
        return 0;
    return seconds * constants_1.SECOND_IN_MILLISECONDS;
}
function headerToCount(value) {
    const count = Number(value);
    return Number.isFinite(count) ? count : 0;
}
function headerToBoolean(value) {
    return value === true || value === 'true';
}
function clampMilliseconds(value) {
    const ms = Number(value);
    if (!Number.isFinite(ms) || ms < 0)
        return 0;
    return ms;
}
/**
 * Representation of rate limit values from the header of a response from Discord.
 */
class RateLimitHeaders {
    /** From Discord - If the request was globally rate limited. */
    global;
    /** From Discord - Id of the rate limit bucket. */
    bucketHash;
    /** From Discord - Number of requests that can be made between rate limit triggers. */
    limit;
    /** From Discord - Number of requests available before hitting rate limit. */
    remaining;
    /** From Discord - How long in ms the rate limit resets. */
    resetAfter;
    /** From Discord - How long in ms the rate sub-limit resets. (Same as resetAfter if there is no sub-limit.) */
    retryAfter;
    /** A localized timestamp of when the rate limit resets. */
    resetTimestamp;
    /**
     * Extracts the rate limit state information if they exist from a set of response headers.
     * @param headers Headers from a response.
     * @returns Rate limit state with the bucket hash; or `undefined` if there is no rate limit information.
     */
    static extractRateLimitFromHeaders(headers, retryAfter) {
        const { 'x-ratelimit-global': global, 'x-ratelimit-bucket': bucketHash, 'x-ratelimit-limit': limit, 'x-ratelimit-remaining': remaining, 'x-ratelimit-reset-after': resetAfter, } = headers;
        return new RateLimitHeaders(headerToBoolean(global), bucketHash, headerToCount(limit), headerToCount(remaining), headerToMilliseconds(resetAfter), headerToMilliseconds(retryAfter));
    }
    /**
     * Creates a new rate limit headers.
     *
     * @param global From Discord - If the request was globally rate limited.
     * @param bucketHash From Discord - Id of the rate limit bucket.
     * @param limit From Discord - Number of requests that can be made between rate limit triggers.
     * @param remaining From Discord - Number of requests available before hitting rate limit.
     * @param resetAfter From Discord - How long in ms the rate limit resets.
     * @param retryAfter From Discord - The retry value from a 429 body. Sub-limits may make this value larger than resetAfter.
     */
    constructor(global, bucketHash, limit, remaining, resetAfter, retryAfter) {
        const safeResetAfter = clampMilliseconds(resetAfter);
        const safeRetryAfter = clampMilliseconds(retryAfter);
        this.global = headerToBoolean(global);
        this.bucketHash = bucketHash;
        this.limit = headerToCount(limit);
        this.remaining = headerToCount(remaining);
        this.resetAfter = safeResetAfter;
        const maxWait = Math.max(safeRetryAfter, safeResetAfter);
        this.retryAfter = maxWait;
        this.resetTimestamp = new Date().getTime() + maxWait;
    }
    /** Whether or not the header values indicate the request has a rate limit. */
    get hasState() {
        return this.bucketHash !== undefined;
    }
    /** Values to send over the rate limit service rpc. */
    get rpcArgs() {
        return [this.global, this.bucketHash, this.limit, this.remaining, this.resetAfter, this.retryAfter];
    }
}
exports.default = RateLimitHeaders;
