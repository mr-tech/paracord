"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RateLimit_1 = __importDefault(require("./RateLimit"));
const RateLimitTemplate_1 = __importDefault(require("./RateLimitTemplate"));
/** Buckets to observed rate limit defaults. */
class RateLimitTemplateMap extends Map {
    /**
     * Insert or updates rate limit template using state.
     * @param state Incoming rate limit state.
     */
    upsert(bucketHash, state) {
        let rateLimitTemplate = this.get(bucketHash);
        if (rateLimitTemplate === undefined) {
            rateLimitTemplate = new RateLimitTemplate_1.default(state);
            this.set(bucketHash, rateLimitTemplate);
        }
        else {
            rateLimitTemplate.update(state);
        }
        return rateLimitTemplate;
    }
    /**
     * Creates a new rate limit from a template if there is one.
     * @param bucketHash uid of rate limit bucket.
     */
    createAssumedRateLimit(bucketHash) {
        const template = this.get(bucketHash);
        if (template !== undefined) {
            const { limit, limit: remaining } = template;
            const resetTimestamp = new Date().getTime() + template.resetAfter;
            return new RateLimit_1.default({
                remaining, resetTimestamp, limit, resetAfter: 0,
            }, template);
        }
        return undefined;
    }
}
exports.default = RateLimitTemplateMap;
