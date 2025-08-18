import type Gateway from '../Gateway';
import type {
  GatewayEvent,
  GatewayOptions, IdentityOptions, ParacordEvent, ParacordGatewayEvent,
} from '../Gateway';

export type GatewayMap = Map<number, Gateway>;

export type ParacordGatewayOptions = Omit<GatewayOptions, 'emitter' | 'identity'>
export interface ParacordOptions {
  gatewayOptions: ParacordGatewayOptions;
  unavailableGuildTolerance?: number;
  unavailableGuildWait?: number;
  shardStartupTimeout?: number;
  compressShards?: number[];
}

export interface ParacordLoginOptions {
  identity: IdentityOptions;
  shards?: number[];
  shardCount?: number;

  /** Function that determines if the gateway is allowed to connect. */
  allowConnection?: undefined | ((gw: Gateway) => boolean | Promise<boolean>);
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

export type HandleEventCallback = (
  eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent,
  data: unknown,
  shard: Gateway
) => void;

export interface ParacordStartupEvent {
  shard: Gateway;
  forced?: boolean;
  resumed?: boolean;
}
