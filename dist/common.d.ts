/// <reference types="node" />
import { ChannelCredentials } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import { Snowflake } from './types';
export interface IServerOptions {
    host: string;
    port: number | string;
    channel: ChannelCredentials;
    allowFallback: boolean;
}
export interface ILockServiceOptions extends IServerOptions {
    duration: number;
}
export declare type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
export declare type UserEvents = Record<string, string>;
export declare type RpcArguments = [boolean, string | undefined, number, number, number];
export interface ExtendedEmitter extends EventEmitter {
    eventHandler?: (type: string, data: unknown, id: number) => Promise<unknown>;
}
export declare type DeleteEvent = ({ guildId }: {
    guildId: Snowflake;
}) => unknown;
export declare type KeysWithType<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];
