import type { UserEvents } from '../../@types';
import type {
  Snowflake, UnavailableGuild, Message as RawMessage, AugmentedGuild as AugmentedRawGuild,
} from '../../discord';
import type { IApiOptions } from '../Api';
import type Gateway from '../Gateway';
import type { GatewayOptions, IdentityOptions } from '../Gateway';

export type GatewayMap = Map<number, Gateway>;
export type RawGuildType = AugmentedRawGuild | UnavailableGuild;

export interface ParacordOptions {
  events?: UserEvents;
  apiOptions?: Partial<IApiOptions>;
  gatewayOptions?: Partial<GatewayOptions>;
  autoInit?: boolean;
}

export type GuildCacheOptions = {
  roles?: false;
  emojis?: false;
  guildMembers?: false;
  guildChannels?: false;
  presences?: false;
  guildVoiceStates?: false;
}

export interface ParacordCacheOptions extends GuildCacheOptions {
  guilds?: false;
}

type Primitive = string | number | boolean | null | undefined;
export type KeysWithType<T> = { [K in keyof T]: T[K] extends Primitive ? K : never }[keyof T];

export interface ParacordLoginOptions {
  identity: IdentityOptions;
  shards?: number[];
  shardCount?: number;
  unavailableGuildTolerance?: number;
  unavailableGuildWait?: number;
  allowEventsDuringStartup?: true;
  startupHeartbeatTolerance?: number;
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

export type EventFunctions = Record<string, EventFunction>;
export type EventFunction = (...any: unknown[]) => unknown;
