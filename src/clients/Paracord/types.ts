// // Paracord
/* eslint-disable max-classes-per-file */

import { KeysWithType, UserEvents } from '../../common';
import {
  Identify, Overwrite, RawChannel, RawEmoji, RawGuildMember, RawMessage, RawPresence, RawRole, RawUser, RawVoiceState, Snowflake, VoiceRegion, AugmentedRawGuildMember, AugmentedGuildMembersChunkEventFields,
} from '../../types';
import { IApiOptions } from '../Api/types';
import Gateway from '../Gateway/Gateway';
import { GatewayOptions } from '../Gateway/types';
import Guild from './structures/Guild';
import { Paracord } from '../..';
import User from './structures/User';
import GuildMember from './structures/GuildMember';
import Base from './structures/Base';
import CacheMap from './structures/CacheMap';
import GuildChannel from './structures/GuildChannel';

export type GatewayMap = Map<number, Gateway>;

export interface ParacordOptions {
  events?: UserEvents;
  apiOptions?: Partial<IApiOptions>;
  gatewayOptions?: Partial<GatewayOptions>;
  autoInit?: boolean;
  limits?: Limits
  filters?: FilterOptions;
}

export interface Limits {
  members?: Limit<GuildMember>;
  presences?: Limit<GuildMember>;
  users?: Limit<User>;
}

export interface Limit<T> {
  amount?: number;
  cap?: number;
  expireAfter?: number;
  expireFunc: (this: Paracord, cache: T[]) => void;
}

export interface FilterOptions {
  caches?:{
    paracord?: ParacordCacheFilter;
    guild?: GuildCacheFilter;
  },
  props: {
    guild?: GuildPropFilter;
    user?: UserPropFilter;
    guildMember?: GuildMemberPropFilter;
  }
}

export type FilteredProps<T> = Array<(FilterOptions['props'] & keyof Base<T>)[keyof FilterOptions['props'] & keyof Base<T>]>;

type Primitive = string | number | boolean | null | undefined;
export type ParacordCache = KeysWithType<Paracord, GuildMap>;
export type ParacordCacheFilter = Array<ParacordCache>;
export type GuildCache = KeysWithType<Guild, RoleMap | EmojiMap | GuildMemberMap | GuildChannelMap | PresenceMap | VoiceStateMap >;
export type GuildCacheFilter = Array<GuildCache>
export type UserProp = KeysWithType<User, Primitive>;
export type UserPropFilter = Array<UserProp>;
export type GuildMemberProp = KeysWithType<GuildMember, Primitive>;
export type GuildMemberPropFilter = Array<GuildMemberProp>;
export type GuildProp = KeysWithType<Guild, Primitive | GuildMember | VoiceRegion >;
export type GuildPropFilter = Array<GuildProp>;


export interface ParacordLoginOptions {
  identity?: Identify;
  shards?: number[];
  shardCount?: number;
  unavailableGuildTolerance?: number;
  unavailableGuildWait?: number;
  allowEventsDuringStartup?: true;
}

export interface GuildMembersChunk extends AugmentedGuildMembersChunkEventFields{
  members: GuildMember[];
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

export interface Message extends RawMessage {
  channelId: RawMessage['channel_id'];
}

export type GuildTypes = GuildMember | GuildChannel

export type GuildChannelMap = CacheMap<GuildChannel>;
export type GuildMemberMap = CacheMap<GuildMember>;

// export type UserMap = CacheMap<User>;
// export type GuildMap = CacheMap<Guild>;
// export type RoleMap = CacheMap<GuildRole>;
// export type EmojiMap = CacheMap<GuildEmoji>;
// export type VoiceStateMap = CacheMap<Partial<GuildVoiceState>>;
// export type PresenceMap = CacheMap<Presence>;

export type EventFunctions = Record<string, EventFunction>;
export type EventFunction = (...any: unknown[]) => unknown;
