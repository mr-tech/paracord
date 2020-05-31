import Api from '../Api';
import { RateLimitCache, ApiRequest } from '.';
export default class RequestQueue {
    private rateLimitCache;
    private processing;
    private queue;
    private _length;
    private apiClient;
    constructor(rateLimitCache: RateLimitCache, apiClient: Api);
    private get length();
    push(...items: ApiRequest[]): void;
    private spliceMany;
    process(): Promise<void>;
    private processIteration;
}
