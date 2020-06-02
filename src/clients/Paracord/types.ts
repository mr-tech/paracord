// // Paracord

import { UserEvents } from '../../common';
import { Identify } from '../../types';
import { IApiOptions } from '../Api/types';
import Gateway from '../Gateway/Gateway';
import { GatewayOptions } from '../Gateway/types';

export type GatewayMap = Map<number, Gateway>;

export type ParacordOptions = {
  events?: UserEvents;
  apiOptions?: Partial<IApiOptions>;
  gatewayOptions?: Partial<GatewayOptions>;
  autoInit?: boolean;
}

export interface ParacordLoginOptions {
  identity?: Identify;
  shards?: number[];
  shardCount?: number;
  unavailableGuildTolerance?: number;
  unavailableGuildWait?: number;
  allowEventsDuringStartup?: false;
}

export type InternalShardIds = number[]

export interface ShardLauncherOptions{
  /* Discord token. Used to find recommended shard count when no `shardIds` provided. Will be coerced into a bot token. */
  token?: string;
  /* Ids of the shards to start internally. Ignored if `shardChunks` is defined. */
  shardIds?: InternalShardIds;
  /* Arrays of shard Ids to launch. Each item will spawn a pm2 process with the designated shards internally. */
  shardChunks?: InternalShardIds[];
  /* Total number of shards this app will be running across all instances. */
  shardCount?: number;
  /* Name that will appear beside the shard number in pm2. */
  appName?: string;
  /* Additional environment variables to load into the app. */
  env?: Record<string, unknown>;
}
