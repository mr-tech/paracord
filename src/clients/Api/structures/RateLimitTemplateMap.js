'use strict';

const RateLimitTemplate = require('./RateLimitTemplate');
const Ratelimit = require('./RateLimit');

/**
 * Buckets to observed rate limit defaults.
 * @extends Map<string,RateLimitTemplate>
 */
module.exports = class RateLimitTemplateMap extends Map {
  upsert(bucket, state) {
    let rateLimitTemplate = this.get(bucket);

    if (rateLimitTemplate === undefined) {
      rateLimitTemplate = new RateLimitTemplate(state);
      this.set(bucket, rateLimitTemplate);
    } else {
      rateLimitTemplate.update(state);
    }

    return rateLimitTemplate;
  }

  createAssumedRateLimit(bucket) {
    const template = this.get(bucket);
    const { limit, limit: remaining } = template;
    const resetTimestamp = new Date() + template.resetAfter;
    return new Ratelimit({ remaining, resetTimestamp, limit }, template);
  }
};
