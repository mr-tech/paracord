"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const RateLimit_1 = __importDefault(require("./RateLimit"));
class RateLimitMap extends Map {
    #logger;
    #sweepInterval;
    constructor(logger) {
        super();
        this.#logger = logger;
        this.#sweepInterval = undefined;
    }
    upsert(rateLimitKey, { remaining, limit, resetTimestamp, resetAfter: waitFor, }, template) {
        const state = {
            remaining, limit, resetTimestamp, resetAfter: waitFor,
        };
        let rateLimit = this.get(rateLimitKey);
        if (rateLimit === undefined) {
            rateLimit = new RateLimit_1.default(state, template);
            this.set(rateLimitKey, rateLimit);
        }
        else {
            rateLimit.assignIfStricter(state);
        }
        return rateLimit;
    }
    sweepExpiredRateLimits = () => {
        const now = new Date().getTime();
        let count = 0;
        for (const [key, { expires }] of this.entries()) {
            if (expires < now) {
                this.delete(key);
                ++count;
            }
        }
        if (this.#logger) {
            this.#logger.log('DEBUG', `Swept old ${count} old rate limits from cache. (${new Date().getTime() - now}ms)`);
        }
    };
    startSweepInterval = () => {
        this.#sweepInterval = setInterval(this.sweepExpiredRateLimits, constants_1.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS);
    };
}
exports.default = RateLimitMap;
