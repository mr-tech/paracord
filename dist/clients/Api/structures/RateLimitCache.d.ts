import { AxiosInstance } from 'axios';
import type { ApiRequest } from '.';
import { WrappedRequest } from '../types';
import BaseRequest from './BaseRequest';
import RateLimitHeaders from './RateLimitHeaders';
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
