/// <reference types="node" />
import type { EventEmitter } from 'events';
import Api from '../../clients/Api/Api';
import { RateLimitCache } from '../../clients/Api/structures';
import { IApiOptions } from '../../clients/Api/types';
import { DebugLevel } from '../../common';
import { Lock } from '../structures';
import { IDebugEvent, RpcServerOptions } from '../types';
declare const grpc: any;
export default class RpcServer extends grpc.Server {
    emitter?: EventEmitter;
    apiClient?: Api;
    rateLimitCache: RateLimitCache;
    identifyLock: Lock;
    private host;
    private port;
    private channel;
    constructor(options?: RpcServerOptions);
    private get bindArgs();
    addRequestService(token: string, apiOptions?: IApiOptions): void;
    addLockService(): void;
    addRateLimitService(): void;
    serve(): void;
    log(level: DebugLevel, message: string): void;
    emit(type: string, event: IDebugEvent): void;
}
export {};
