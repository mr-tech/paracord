"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const RateLimit_1 = __importDefault(require("./RateLimit"));
const RateLimitTemplate_1 = __importDefault(require("./RateLimitTemplate"));
module.exports = class RateLimitTemplateMap extends Map {
    upsert(state) {
        const { bucket } = state;
        let rateLimitTemplate = this.get(bucket);
        if (rateLimitTemplate === undefined) {
            rateLimitTemplate = new RateLimitTemplate_1.default(state);
            this.set(bucket, rateLimitTemplate);
        }
        else {
            rateLimitTemplate.update(state);
        }
        return rateLimitTemplate;
    }
    createAssumedRateLimit(bucket) {
        const template = this.get(bucket);
        if (template !== undefined) {
            const { limit, limit: remaining } = template;
            const resetTimestamp = new Date().getTime() + template.resetAfter;
            return new RateLimit_1.default({
                remaining, resetTimestamp, limit, resetAfter: 0,
            }, template);
        }
        return undefined;
    }
};
