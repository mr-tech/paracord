import { RequestService } from '../../rpc/services';
import { RemoteApiResponse } from '../../rpc/types';
import { ApiRequest } from './structures';
import { IApiOptions, IApiResponse, IRateLimitState, IRequestOptions, IResponseState, IServiceOptions } from './types';
export default class Api {
    private rateLimitCache;
    private requestQueue;
    private requestQueueProcessInterval?;
    rpcRequestService?: RequestService;
    private rpcRateLimitService?;
    private allowFallback;
    events?: Record<string, string>;
    private emitter?;
    private wrappedAxiosInstance;
    private rpcServiceOptions?;
    private static shouldQueueRequest;
    private static validateParams;
    private static createWrappedAxiosInstance;
    constructor(token: string, options?: IApiOptions);
    get hasRateLimitService(): boolean;
    get hasRequestService(): boolean;
    private log;
    private emit;
    addRequestService(serviceOptions?: IServiceOptions): void;
    addRateLimitService(serviceOptions?: IServiceOptions): void;
    private recreateRpcService;
    startQueue(interval?: number): void;
    stopQueue(): void;
    request(method: string, url: string, options?: IRequestOptions): Promise<IApiResponse | RemoteApiResponse>;
    handleRequestLocal(request: ApiRequest): Promise<IApiResponse>;
    private handleRequestRemote;
    sendRequest(request: ApiRequest, fromQueue?: true): Promise<IResponseState>;
    authorizeRequestWithServer(request: ApiRequest): Promise<IRateLimitState | undefined>;
    private handleResponse;
    private handleRateLimitedRequest;
    private updateRateLimitCache;
    private updateRpcCache;
    private enqueueRequest;
}