import { RateLimitState } from '../types';
export default class RateLimitTemplate {
    limit: number;
    resetAfter: number;
    constructor({ limit, resetAfter }: RateLimitState);
    update({ limit, resetAfter }: RateLimitState): void;
}
