"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
class RateLimitHeaders {
    global;
    bucketHash;
    limit;
    remaining;
    resetAfter;
    retryAfter;
    resetTimestamp;
    static extractRateLimitFromHeaders(headers, retryAfter) {
        const { 'x-ratelimit-global': global, 'x-ratelimit-bucket': bucketHash, 'x-ratelimit-limit': limit, 'x-ratelimit-remaining': remaining, 'x-ratelimit-reset-after': resetAfter, } = headers;
        return new RateLimitHeaders(global ?? false, bucketHash, Number(limit), Number(remaining), Number(resetAfter) * constants_1.SECOND_IN_MILLISECONDS, retryAfter && retryAfter * constants_1.SECOND_IN_MILLISECONDS);
    }
    constructor(global, bucketHash, limit, remaining, resetAfter, retryAfter) {
        this.global = global || false;
        this.bucketHash = bucketHash;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAfter = resetAfter;
        const maxWait = Math.max(retryAfter ?? 0, resetAfter);
        this.retryAfter = maxWait;
        this.resetTimestamp = new Date().getTime() + maxWait;
    }
    get hasState() {
        return this.bucketHash !== undefined;
    }
    get rpcArgs() {
        return [this.global, this.bucketHash, this.limit, this.remaining, this.resetAfter, this.retryAfter];
    }
}
exports.default = RateLimitHeaders;
