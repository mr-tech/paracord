import { RateLimitHeaders } from '.';
import RateLimit from './RateLimit';
import RateLimitTemplate from './RateLimitTemplate';

/** Buckets to observed rate limit defaults. */
export default class RateLimitTemplateMap extends Map<string, RateLimitTemplate> {
  /**
   * Insert or updates rate limit template using state.
   * @param state Incoming rate limit state.
   */
  public upsert(bucketHash: string, state: RateLimitHeaders): RateLimitTemplate {
    let rateLimitTemplate = this.get(bucketHash);

    if (rateLimitTemplate === undefined) {
      rateLimitTemplate = new RateLimitTemplate(state);
      this.set(bucketHash, rateLimitTemplate);
    } else {
      rateLimitTemplate.update(state);
    }

    return rateLimitTemplate;
  }

  /**
   * Creates a new rate limit from a template if there is one.
   * @param bucketHash uid of rate limit bucket.
   */
  public createAssumedRateLimit(bucketHash: string): RateLimit | undefined {
    const template = this.get(bucketHash);

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
