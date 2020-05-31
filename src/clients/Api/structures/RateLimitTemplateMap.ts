import { RateLimitHeaders } from '.';
import RateLimit from './RateLimit';
import RateLimitTemplate from './RateLimitTemplate';

/** Buckets to observed rate limit defaults. */
export = class RateLimitTemplateMap extends Map<string, RateLimitTemplate> {
  /**
   * Insert or updates rate limit template using state.
   * @param state Incoming rate limit state.
   */
  public upsert(state: RateLimitHeaders): RateLimitTemplate {
    const { bucket } = state;

    let rateLimitTemplate = this.get(bucket);

    if (rateLimitTemplate === undefined) {
      rateLimitTemplate = new RateLimitTemplate(state);
      this.set(bucket, rateLimitTemplate);
    } else {
      rateLimitTemplate.update(state);
    }

    return rateLimitTemplate;
  }

  /**
   * Creates a new rate limit from a template if there is one.
   * @param bucket uid of rate limit bucket.
   */
  public createAssumedRateLimit(bucket: string): RateLimit | undefined {
    const template = this.get(bucket);

    if (template !== undefined) {
      const { limit, limit: remaining } = template;
      const resetTimestamp = new Date().getTime() + template.resetAfter;
      return new RateLimit({
        remaining, resetTimestamp, limit, resetAfter: 0,
      }, template);
    }

    return undefined;
  }
}
