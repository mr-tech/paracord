/// <reference types="node" />
import { EventEmitter } from 'events';
import { ServerCredentials, ServiceError } from '@grpc/grpc-js';
import Api from '../clients/Api/Api';
import { Lock } from './structures';
export interface RpcServerOptions {
    host?: string;
    port?: string | number;
    channel?: ServerCredentials;
    emitter?: EventEmitter;
    apiClient?: Api;
    identifyLock?: Lock;
}
export interface IDebugEvent {
    source: number;
    level: number;
    message: string;
}
export declare type TServiceCallbackError = null | string | ServiceError;
export declare type LockRequestProto = {
    time_out: number;
    token: string | undefined;
};
export declare type TokenProto = {
    value: string;
};
export declare type StatusProto = {
    success: boolean;
    message: string | undefined;
    token: string | undefined;
};
export declare type RequestProto = {
    method: string;
    url: string;
    data?: string;
    headers?: string;
};
export declare type AuthorizationProto = {
    reset_after: number;
};
export declare type ResponseProto = {
    status_code: number;
    status_text: string;
    data: string | undefined;
};
export declare type RateLimitStateProto = {
    request_meta: RequestMetaProto;
    bucket: string;
    remaining: number;
    limit: number;
    reset_after: number;
    global: boolean;
};
export interface IRequestMessage {
    method: string;
    url: string;
    data?: undefined | Record<string, unknown>;
    headers?: undefined | Record<string, unknown>;
}
export declare type RequestMetaProto = {
    method: string;
    url: string;
};
export declare type RemoteApiResponse = {
    status: number;
    statusText: string;
    data: Record<string, unknown>;
};
