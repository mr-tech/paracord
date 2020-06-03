"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
class RateLimitHeaders {
    constructor(global, bucket, limit, remaining, resetAfter) {
        this.global = global || false;
        this.bucket = bucket;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAfter = resetAfter;
        this.resetTimestamp = new Date().getTime() + this.resetAfter;
    }
    static extractRateLimitFromHeaders(headers) {
        var _a;
        const { 'x-ratelimit-global': global, 'x-ratelimit-bucket': bucket, 'x-ratelimit-limit': limit, 'x-ratelimit-remaining': remaining, 'x-ratelimit-reset-after': resetAfter, } = headers;
        return new RateLimitHeaders((_a = global) !== null && _a !== void 0 ? _a : false, bucket, Number(limit), Number(remaining), Number(resetAfter) * constants_1.SECOND_IN_MILLISECONDS);
    }
    get hasState() {
        return this.bucket !== undefined;
    }
    get rpcArgs() {
        return [this.global, this.bucket, this.limit, this.remaining, this.resetAfter];
    }
}
exports.default = RateLimitHeaders;
