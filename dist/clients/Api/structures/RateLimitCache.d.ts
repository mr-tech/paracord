import { AxiosInstance } from 'axios';
import { BaseRequest, RateLimitHeaders } from '.';
import { WrappedRequest } from '../types';
import type { ApiRequest } from '.';
export default class RateLimitCache {
    private requestRouteMetaToBucket;
    private rateLimitMap;
    private rateLimitTemplateMap;
    private globalRateLimitState;
    private static returnStricterResetTimestamp;
    constructor(autoStartSweep?: boolean);
    private get isGloballyRateLimited();
    private get globalRateLimitHasReset();
    private get globalRateLimitHasRemainingUses();
    private get globalRateLimitResetAfter();
    startSweepInterval(): void;
    wrapRequest(requestFunc: AxiosInstance['request']): WrappedRequest;
    decrementGlobalRemaining(): void;
    authorizeRequestFromClient(request: BaseRequest): number;
    update(request: BaseRequest | ApiRequest, rateLimitHeaders: RateLimitHeaders): void;
    returnIsRateLimited(request: BaseRequest | ApiRequest): boolean;
    private resetGlobalRateLimit;
    private getRateLimitFromCache;
    private rateLimitFromTemplate;
}
