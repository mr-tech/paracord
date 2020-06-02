import { RpcArguments } from '../../../common';
import { IApiResponse } from '../types';
export default class RateLimitHeaders {
    global: boolean;
    bucket: string | undefined;
    limit: number;
    remaining: number;
    resetAfter: number;
    resetTimestamp: number;
    static extractRateLimitFromHeaders(headers: IApiResponse['headers']): RateLimitHeaders;
    constructor(global: boolean, bucket: string | undefined, limit: number, remaining: number, resetAfter: number);
    get hasState(): boolean;
    get rpcArgs(): RpcArguments;
}
