import { RpcArguments } from '../../../common';
export default class RateLimitHeaders {
    global: boolean;
    bucket: string;
    limit: number;
    remaining: number;
    resetAfter: number;
    resetTimestamp: number;
    static extractRateLimitFromHeaders(headers: Record<string, string>): RateLimitHeaders | undefined;
    constructor(global: boolean, bucket: string, limit: number, remaining: number, resetAfter: number);
    get hasState(): boolean;
    get rpcArgs(): RpcArguments;
}
