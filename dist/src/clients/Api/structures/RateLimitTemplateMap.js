"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const RateLimitTemplate_1 = __importDefault(require("./RateLimitTemplate"));
const _1 = require(".");
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
            const resetTimestamp = new Date() + template.resetAfter;
            return new _1.RateLimit({
                remaining, resetTimestamp, limit, resetAfter: 0,
            }, template);
        }
        return undefined;
    }
};
