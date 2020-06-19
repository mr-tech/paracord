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

export type GatewayMap = Map<number, Gateway>;

export interface ParacordOptions {
  events?: UserEvents;
  apiOptions?: Partial<IApiOptions>;
  gatewayOptions?: Partial<GatewayOptions>;
  autoInit?: boolean;
  filters?: FilterOptions;
  limits?: {
    members?: {
      amount?: number;
      cap?: number;
      expireAfter?: number;
      expireFunc: (this: Paracord, member: User) => boolean;
    },
    presences?: {
      amount?: number;
      cap?: number;
      expireAfter?: number;
      expireFunc: (this: Paracord, member: Presence) => boolean;
    }
  }
}

export type ParacordCache = KeysWithType<Paracord, GuildMap | UserMap | PresenceMap>;
export type ParacordCacheFilter = Array<ParacordCache>;
export type GuildCache = KeysWithType<Guild, GuildMemberMap | GuildChannelMap | PresenceMap | VoiceStateMap | RoleMap | EmojiMap>;
export type GuildCacheFilter = Array<GuildCache>;
export type GuildProp = KeysWithType<Guild, string | number | boolean | Array<unknown> | GuildMember | VoiceRegion | null | undefined>;
export type GuildPropFilter = Array<GuildProp>;

export interface FilterOptions {
  throwOnAccess?: false;
  caches?:{
    guild?: GuildCacheFilter;
    paracord?: ParacordCacheFilter;
  },
  props?: {
    guild?: GuildPropFilter;
  }
}

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

export interface FilteredProps {
  props: string[];
  caches?: string[]
}

export interface GuildBase {
  guild: Guild;
}

export type Presence = RawPresence;

export interface User extends RawUser {
  createdOn: number;
  tag: string;
  presence: RawPresence | undefined;
}
export interface GuildChannel extends GuildBase, RawChannel {
  permissionOverwrites: Overwrite[];
}
export interface GuildRole extends GuildBase, RawRole {
  guildId: Snowflake;
}
export interface GuildEmoji extends GuildBase, RawEmoji {
  id: Snowflake;
  // roles: RoleMap;
}
export interface GuildMember extends GuildBase, RawGuildMember, AugmentedRawGuildMember {
  user: User;
  lastAccessedTimestamp: number;
  // roles: RoleMap;
}
export interface GuildVoiceState extends GuildBase, RawVoiceState{}
export interface Message extends RawMessage {
  channelId: RawMessage['channel_id'];
}

export type UserMap = Map<Snowflake, User>;
export type GuildMap = Map<Snowflake, Guild>;
export type RoleMap = Map<Snowflake, GuildRole>;
export type EmojiMap = Map<Snowflake, GuildEmoji>;
export type VoiceStateMap = Map<Snowflake, Partial<GuildVoiceState>>;
export type PresenceMap = Map<Snowflake, Presence>;
export type GuildChannelMap = Map<Snowflake, GuildChannel>;
export type GuildMemberMap = Map<Snowflake, GuildMember>;

export type EventFunctions = Record<string, EventFunction>;
export type EventFunction = (...any: unknown[]) => unknown;
