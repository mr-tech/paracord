import { KeysWithType, UserEvents } from '../../common';
import { Identify, Overwrite, RawChannel, RawEmoji, RawGuildMember, RawMessage, RawPresence, RawRole, RawUser, RawVoiceState, Snowflake, VoiceRegion, AugmentedRawGuildMember } from '../../types';
import { IApiOptions } from '../Api/types';
import Gateway from '../Gateway/Gateway';
import { GatewayOptions } from '../Gateway/types';
import Guild from './structures/Guild';
import { Paracord } from '../..';
export declare type GatewayMap = Map<number, Gateway>;
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
        };
        presences?: {
            amount?: number;
            cap?: number;
            expireAfter?: number;
            expireFunc: (this: Paracord, member: Presence) => boolean;
        };
    };
}
export declare type ParacordCache = KeysWithType<Paracord, GuildMap | UserMap | PresenceMap>;
export declare type ParacordCacheFilter = Array<ParacordCache>;
export declare type GuildCache = KeysWithType<Guild, GuildMemberMap | GuildChannelMap | PresenceMap | VoiceStateMap | RoleMap | EmojiMap>;
export declare type GuildCacheFilter = Array<GuildCache>;
export declare type GuildProp = KeysWithType<Guild, string | number | boolean | Array<unknown> | GuildMember | VoiceRegion | null | undefined>;
export declare type GuildPropFilter = Array<GuildProp>;
export interface FilterOptions {
    throwOnAccess?: false;
    caches?: {
        guild?: GuildCacheFilter;
        paracord?: ParacordCacheFilter;
    };
    props?: {
        guild?: GuildPropFilter;
    };
}
export interface ParacordLoginOptions {
    identity?: Identify;
    shards?: number[];
    shardCount?: number;
    unavailableGuildTolerance?: number;
    unavailableGuildWait?: number;
    allowEventsDuringStartup?: true;
}
export declare type InternalShardIds = number[];
export interface ShardLauncherOptions {
    token?: string;
    shardIds?: InternalShardIds;
    shardChunks?: InternalShardIds[];
    shardCount?: number;
    appName?: string;
    env?: Record<string, unknown>;
}
export interface FilteredProps {
    props: string[];
    caches?: string[];
}
export interface GuildBase {
    guild: Guild;
}
export declare type Presence = RawPresence;
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
}
export interface GuildMember extends GuildBase, RawGuildMember, AugmentedRawGuildMember {
    user: User;
}
export interface GuildVoiceState extends GuildBase, RawVoiceState {
}
export interface Message extends RawMessage {
    channelId: RawMessage['channel_id'];
}
export declare type UserMap = Map<Snowflake, User>;
export declare type GuildMap = Map<Snowflake, Guild>;
export declare type RoleMap = Map<Snowflake, GuildRole>;
export declare type EmojiMap = Map<Snowflake, GuildEmoji>;
export declare type VoiceStateMap = Map<Snowflake, Partial<GuildVoiceState>>;
export declare type PresenceMap = Map<Snowflake, Presence>;
export declare type GuildChannelMap = Map<Snowflake, GuildChannel>;
export declare type GuildMemberMap = Map<Snowflake, GuildMember>;
export declare type EventFunctions = Record<string, EventFunction>;
export declare type EventFunction = (...any: unknown[]) => unknown;
