/// <reference types="node" />
import { ApiRequest, RateLimitCache } from '.';
import Api from '../Api';
export default class RequestQueue {
    private rateLimitCache;
    private processing;
    private queue;
    private _length;
    private apiClient;
    constructor(rateLimitCache: RateLimitCache, apiClient: Api);
    private get length();
    startQueue(interval: number): NodeJS.Timer;
    push(...items: ApiRequest[]): void;
    private spliceMany;
    private process;
    private processIteration;
    private sendRequest;
}
