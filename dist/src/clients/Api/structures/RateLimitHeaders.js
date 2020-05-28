"use strict";
const constants_1 = require("../../../constants");
module.exports = class RateLimitHeaders {
    constructor(global, bucket, limit, remaining, resetAfter) {
        this.global = global || false;
        this.bucket = bucket;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAfter = resetAfter;
        this.resetTimestamp = new Date().getTime() + this.resetAfter;
    }
    get hasState() {
        return this.bucket !== undefined;
    }
    get rpcArgs() {
        return [
            this.global,
            this.bucket,
            this.limit,
            this.remaining,
            this.resetAfter,
        ];
    }
    static extractRateLimitFromHeaders(headers) {
        if (headers['x-ratelimit-bucket'] === undefined) {
            return undefined;
        }
        const { 'x-ratelimit-bucket': bucket, 'x-ratelimit-limit': limit, 'x-ratelimit-remaining': remaining, 'x-ratelimit-reset-after': resetAfter, } = headers;
        const global = Object.prototype.hasOwnProperty.call(headers, 'x-ratelimit-global');
        return new RateLimitHeaders(global, bucket, Number(limit), Number(remaining), Number(resetAfter) * constants_1.SECOND_IN_MILLISECONDS);
    }
};
