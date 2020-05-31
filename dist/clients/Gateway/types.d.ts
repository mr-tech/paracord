/// <reference types="node" />
import { EventEmitter } from 'events';
import { UserEvents } from '../../common';
import { Identify } from '../../types';
import Api from '../Api/Api';
import { IApiResponse } from '../Api/types';
export interface GatewayOptions {
    identity: Partial<Identify>;
    emitter: EventEmitter;
    events: UserEvents;
    api: Api;
    keepCase: false;
}
declare type ErrorResponse = {
    message: string;
    code: number;
};
export interface GatewayBotResponse extends IApiResponse {
    data: {
        url: string;
        sessionStartLimit: SessionLimitData;
        shards: number;
    } & ErrorResponse;
}
export declare type SessionLimitData = {
    total: number;
    remaining: number;
    resetAfter: number;
    maxConcurrency: number;
};
export declare type WebsocketRateLimitCache = {
    resetTimestamp: number;
    remainingRequests: number;
};
export {};
