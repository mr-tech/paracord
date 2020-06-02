import { Overwrite, RawChannel, RawEmoji, RawGuildMember, RawRole, RawUser } from '.';
import Guild from '../clients/Paracord/structures/Guild';
import { RawPresence } from './gateway';
import { RawVoiceState } from './voice';
export declare type Snowflake = string;
export declare type ISO8601timestamp = string;
export declare type User = RawUser & {
    createdOn: () => number;
    tag: string;
    presence: RawPresence | undefined;
};
export declare type UnavailableGuild = {
    id: Snowflake;
    unavailable: true;
};
export declare type GuildChannel = RawChannel & {
    guildId: Snowflake;
    permissionOverwrites: Overwrite[];
};
export declare type GuildRole = RawRole & {
    guildId: Snowflake;
};
export declare type GuildEmoji = RawEmoji & {};
export declare type GuildMember = RawGuildMember & {
    user: User;
};
export declare type GuildVoiceState = RawVoiceState & {};
export declare type UserMap = Map<Snowflake, User>;
export declare type GuildMap = Map<Snowflake, Guild>;
export declare type RoleMap = Map<Snowflake, GuildRole>;
export declare type EmojiMap = Map<Snowflake, GuildEmoji>;
export declare type VoiceStateMap = Map<Snowflake, Partial<GuildVoiceState>>;
export declare type PresenceMap = Map<Snowflake, RawPresence>;
export declare type GuildChannelMap = Map<Snowflake, GuildChannel>;
export declare type GuildMemberMap = Map<Snowflake, GuildMember>;
export declare type EventFunctions = Record<string, EventFunction>;
export declare type EventFunction = (...any: unknown[]) => unknown;
