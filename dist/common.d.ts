/// <reference types="node" />
import { ChannelCredentials } from '@grpc/grpc-js';
import { Options } from '@grpc/proto-loader';
import { EventEmitter } from 'events';
import { RawGuild } from './types';
export interface IServerOptions {
    host: string;
    port: number | string;
    channel: ChannelCredentials;
    allowFallback: boolean;
    protoOptions: Options;
}
export interface ILockServiceOptions extends IServerOptions {
    duration: number;
}
export declare type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
export declare type UserEvents = Record<string, string>;
export declare type RpcArguments = [boolean, string, number, number, number];
export interface ExtendedEmitter extends EventEmitter {
    eventHandler?: (type: string, data: unknown, id: number) => Promise<unknown>;
}
export declare type DeleteEvent = ({ guildId }: {
    guildId: RawGuild['id'];
}) => unknown;
