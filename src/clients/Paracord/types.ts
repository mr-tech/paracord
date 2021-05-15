// // Paracord
/* eslint-disable max-classes-per-file */

import { Paracord } from '../..';
import { UserEvents } from '../../common';
import {
  RawGuildEmoji, AugmentedRawGuild, AugmentedRawGuildMember, AugmentedRawVoiceState, Identify, RawChannel, RawMessage, RawPresence, RawRole, RawUser, Snowflake, UnavailableGuild, GuildMemberUpdateEventFields,
} from '../../types';
import { IApiOptions } from '../Api/types';
import Gateway from '../Gateway/Gateway';
import { GatewayOptions } from '../Gateway/types';
import CacheMap from './structures/CacheMap';
import Activity from './structures/discord/objects/Activity';
import Overwrite from './structures/discord/objects/Overwrite';
import GuildEmoji from './structures/discord/resources/GuildEmoji';
import Guild from './structures/discord/resources/Guild';
import GuildChannel from './structures/discord/resources/GuildChannel';
import GuildMember from './structures/discord/resources/GuildMember';
import GuildVoiceState from './structures/discord/resources/GuildVoiceState';
import Presence from './structures/discord/resources/Presence';
import Role from './structures/discord/resources/Role';
import User from './structures/discord/resources/User';

export type GatewayMap = Map<number, Gateway>;

export interface ParacordOptions {
  events?: UserEvents;
  apiOptions?: Partial<IApiOptions>;
  gatewayOptions?: Partial<GatewayOptions>;
  autoInit?: boolean;
  limits?: Limits
  filterOptions?: FilterOptions;
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

export interface FilterOptions {
  caches?: ParacordCacheOptions;
  props: {
    guild?: Array<KeysWithType<Guild>>;
    user?: Array<KeysWithType<User>>;
    role?: Array<KeysWithType<Role>>;
    emoji?: Array<KeysWithType<GuildEmoji>>;
    guildChannel?: Array<KeysWithType<GuildChannel>>;
    presence?: Array<KeysWithType<Presence>>;
    guildVoiceState?: Array<KeysWithType<GuildVoiceState>>;
    guildMember?: Array<KeysWithType<GuildMember>>;
    activity?: Array<KeysWithType<Activity>>;
  };
}

export interface ParacordLoginOptions {
  identity?: Partial<Identify>;
  shards?: number[];
  shardCount?: number;
  unavailableGuildTolerance?: number;
  unavailableGuildWait?: number;
  allowEventsDuringStartup?: true;
  startupHeartbeatTolerance?: number;
}

export type DiscordResource = Guild | GuildMember | GuildChannel | User | Role | GuildEmoji | GuildVoiceState | Presence;
export type DiscordObject = Activity | Overwrite;
export type DiscordTypes = DiscordResource | DiscordObject;

// export type FilteredProps<T extends DiscordTypes, U extends RawWildCard> = Array<(FilterOptions['props'] & keyof Base<T, U>)[keyof FilterOptions['props'] & keyof Base<T, U>]>;

// export type GuildProp = KeysWithType<Guild, Primitive | GuildMember | VoiceRegion >;

/* Caches */
export type GuildMap = CacheMap<Guild, RawGuildType>
export type UserMap = CacheMap<User, RawUser>
export type PresenceMap = CacheMap<Presence, RawPresence>
export type RoleMap = CacheMap<Role, RawRole>
export type EmojiMap = CacheMap<GuildEmoji, RawGuildEmoji>
export type GuildMemberMap = CacheMap<GuildMember, AugmentedRawGuildMember | GuildMemberUpdateEventFields>
export type GuildChannelMap = CacheMap<GuildChannel, RawChannel>
export type VoiceStateMap = CacheMap<GuildVoiceState, AugmentedRawVoiceState>

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
  channelId: Snowflake;
}

export type EventFunctions = Record<string, EventFunction>;
export type EventFunction = (...any: unknown[]) => unknown;
export type RawGuildType = AugmentedRawGuild | UnavailableGuild

// export interface GuildMembersChunk extends AugmentedGuildMembersChunkEventFields{
//   members: GuildMember[];
// }
