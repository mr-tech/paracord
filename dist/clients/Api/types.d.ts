/// <reference types="node" />
import { ChannelCredentials } from '@grpc/grpc-js';
import type { EventEmitter } from 'events';
import { UserEvents } from '../../common';
import type { ApiRequest } from './structures';
export interface IApiOptions {
    emitter?: EventEmitter;
    events?: UserEvents;
    requestOptions?: IRequestOptions;
}
export interface IRequestOptions {
    data?: Record<string, unknown>;
    headers?: Record<string, unknown> | undefined;
    local?: boolean;
    keepCase?: boolean;
    returnOnRateLimit?: false;
    returnOnGlobalRateLimit?: false;
    maxRateLimitRetry?: number;
    transformResponse?: (x: Record<string, unknown>) => Record<string, unknown>;
}
export declare type WrappedRequest = (request: ApiRequest) => Promise<IApiResponse>;
export declare type RateLimitState = {
    remaining: number;
    limit: number;
    resetTimestamp: number | undefined;
    resetAfter: number;
};
export interface IServiceOptions {
    host?: string;
    port?: string | number;
    channel?: ChannelCredentials;
    allowFallback?: boolean;
}
export interface IApiResponse {
    status: number;
    statusText: string;
    data: Record<string, unknown>;
    headers: Record<string, unknown>;
}
export declare type IRateLimitState = {
    resetAfter: number;
    global?: boolean;
};
export declare type IResponseState = IRateLimitState & {
    response?: IApiResponse;
};
