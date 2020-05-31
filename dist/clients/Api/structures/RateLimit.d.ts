import type RateLimitTemplate from './RateLimitTemplate';
import type { RateLimitState } from '../types';
export default class RateLimit {
    private remaining;
    private resetTimestamp;
    private limit;
    expires: number | undefined;
    private template;
    private allowHeaderOverride;
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
