import type RateLimitHeaders from './RateLimitHeaders';

/** A frozen instance of a rate limit that is used as a reference for requests with the same bucket but without an existing cached state. */
export default class RateLimitTemplate {
  /** From Discord - Rate limit request cap. */
  public limit: number;

  /** From Discord - Highest value seen from Discord for rate limit reset wait in ms. */
  public resetAfter: number;

  /** Creates a new rate limit state. */
  public constructor({ limit, resetAfter }: RateLimitHeaders) {
    this.limit = limit;
    this.resetAfter = resetAfter;
  }

  /** Updates state properties. */
  public update({ limit, resetAfter }: RateLimitHeaders): void {
    if (limit < this.limit) {
      this.limit = limit;
    }
    if (resetAfter > this.resetAfter) {
      this.resetAfter = resetAfter;
    }
  }
}
