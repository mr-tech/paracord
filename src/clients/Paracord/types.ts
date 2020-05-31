// // Paracord

import { UserEvents } from '../../common';
import { IApiOptions } from '../Api/types';
import { GatewayOptions } from '../Gateway/types';
import Gateway from '../Gateway/Gateway';
import { Identify } from '../../types';

export type GatewayMap = Map<number, Gateway>;

export type ParacordOptions = {
  events?: UserEvents;
  apiOptions?: Partial<IApiOptions>;
  gatewayOptions?: Partial<GatewayOptions>;
  autoInit?: boolean;
}

export interface ParacordLoginOptions {
  identity?: Partial<Identify>;
  shards?: Identify['shard'];
  shardCount?: number;
  unavailableGuildTolerance?: number;
  unavailableGuildWait?: number;
  allowEventsDuringStartup?: false;
}

// // Shard Launcher

// /**
//  * @export typedef ShardLauncherOptions
//  * @property {string} [token] Discord token. Used to find recommended shard count when no `shardIds` provided. Will be coerced into a bot token.
//  * @property {InternalShardIds} [shardIds] Ids of the shards to start internally. Ignored if `shardChunks` is defined.
//  * @property {InternalShardIds[]} [shardChunks] Arrays of shard Ids to launch. Each item will spawn a pm2 process with the designated shards internally.
//  * @property {number} [shardCount] Total number of shards this app will be running across all instances.
//  * @property {string} [appName] Name that will appear beside the shard number in pm2.
//  * @property {Object<string, any>} [env] Additional environment variables to load into the app.
//  */

// /** @export typedef {number[]} InternalShardIds Shard Ids designated to be spawned internally. */
