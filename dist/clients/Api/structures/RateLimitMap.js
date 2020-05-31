"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const RateLimit_1 = __importDefault(require("./RateLimit"));
class RateLimitMap extends Map {
    constructor() {
        super();
        this.sweepInterval = undefined;
    }
    upsert(rateLimitKey, { remaining, limit, resetTimestamp, resetAfter, }, template) {
        const rateLimit = this.get(rateLimitKey);
        const state = {
            remaining, limit, resetTimestamp, resetAfter,
        };
        if (rateLimit === undefined) {
            this.set(rateLimitKey, new RateLimit_1.default(state, template));
        }
        else {
            rateLimit.assignIfStricter(state);
        }
        return rateLimit;
    }
    sweepExpiredRateLimits() {
        const now = new Date().getTime();
        for (const [key, { expires }] of this.entries()) {
            if (expires < now) {
                this.delete(key);
            }
        }
    }
    startSweepInterval() {
        this.sweepInterval = setInterval(this.sweepExpiredRateLimits.bind(this), constants_1.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS);
    }
}
exports.default = RateLimitMap;
