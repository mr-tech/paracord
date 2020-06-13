/// <reference types="node" />
import { EventEmitter } from 'events';
import { UserEvents } from '../../common';
import Api from '../Api/Api';
import { IApiResponse } from '../Api/types';
import { Identify, IdentifyConnectionProperties, GatewayStatusUpdate } from '../../types';
export interface GatewayOptions {
    identity: Identify;
    emitter: EventEmitter;
    events?: UserEvents;
    api: Api;
    wsUrl?: string;
}
declare type ErrorResponse = {
    message: string;
    code: number;
};
export declare type Heartbeat = number;
export interface GatewayBotResponse extends IApiResponse {
    data: {
        url: string;
        shards: number;
        sessionStartLimit: SessionLimitData;
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
export declare type IdentityOptions = {
    token: string;
    shard?: [number, number];
    properties?: IdentifyConnectionProperties;
    compress?: boolean;
    largeThreshold?: number;
    presence?: GatewayStatusUpdate;
    guildSubscriptions?: boolean;
    intents?: number;
};
export {};
