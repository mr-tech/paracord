import type { RateLimitState } from '../types';
import type RateLimitTemplate from './RateLimitTemplate';
export default class RateLimit {
    #private;
    expires: number;
    constructor({ remaining, resetTimestamp, limit }: RateLimitState, template: RateLimitTemplate);
    get isRateLimited(): boolean;
    private get rateLimitHasReset();
    private get hasRemainingUses();
    get resetAfter(): number;
    private refreshExpire;
    decrementRemaining(): void;
    assignIfStricter({ remaining, resetTimestamp, limit }: RateLimitState): void;
    private resetRemaining;
}
