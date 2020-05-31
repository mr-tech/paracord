import { RateLimitState } from '../types';
import RateLimit from './RateLimit';
import RateLimitTemplate from './RateLimitTemplate';
export default class RateLimitMap extends Map {
    private sweepInterval;
    constructor();
    upsert(rateLimitKey: string, { remaining, limit, resetTimestamp, resetAfter, }: RateLimitState, template: RateLimitTemplate): RateLimit;
    private sweepExpiredRateLimits;
    startSweepInterval(): void;
}
