import type { EventEmitter } from 'events';
import type { ChannelCredentials } from '@grpc/grpc-js';
import type { Snowflake } from '../discord';
import type { Gateway } from '../clients';

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

export type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export type RpcArguments = [boolean, string | undefined, number, number, number, number | undefined]

export interface ExtendedEmitter extends EventEmitter {
  eventHandler?: (type: string, data: unknown, shard: Gateway) => Promise<unknown>;
}

export type DeleteEvent = ({ guildId }: {guildId: Snowflake}) => unknown;

// export type NotVoid = string | number | boolean | symbol | bigint | Record<string, unknown>;
