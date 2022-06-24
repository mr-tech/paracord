import { ChannelCredentials } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import { Snowflake } from './types';

export interface IServerOptions {
  /** Server host to connect to. */
  host: string;
  /** Server port to connect to. */
  port: number | string;
  /** GRPC channel to connect to server over. */
  channel: ChannelCredentials;
  /** If the service is allowed to fallback on alternate functionality. Defined differently for each service. */
  allowFallback: boolean;
}

export interface ILockServiceOptions extends IServerOptions{
  /** How long ion ms the client will request the lock for when acquiring. */
  duration: number;
}

export type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export type UserEvents = Record<string, string>;

export type RpcArguments = [boolean, string | undefined, number, number, number, number | undefined]

export interface ExtendedEmitter extends EventEmitter {
  eventHandler?: (type: string, data: unknown, id: number) => Promise<unknown>;
}

export type DeleteEvent = ({ guildId }: {guildId: Snowflake}) => unknown;

// export type NotVoid = string | number | boolean | symbol | bigint | Record<string, unknown>;
