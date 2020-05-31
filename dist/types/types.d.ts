import { Overwrite, RawChannel, RawEmoji, RawGuildMember, RawRole, RawUser } from '.';
import Guild from '../clients/Paracord/structures/Guild';
import { RawPresence } from './gateway';
import { RawVoiceState } from './voice';
export declare type Snowflake = string;
export declare type ISO8601timestamp = string;
export declare type User = RawUser & {
    createdOn: () => number;
    tag: () => string;
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
    guildId: Guild['id'];
};
export declare type GuildEmoji = RawEmoji & {};
export declare type GuildMember = RawGuildMember & {
    user: User;
};
export declare type GuildVoiceState = RawVoiceState & {};
export declare type UserMap = Map<User['id'], User>;
export declare type GuildMap = Map<Guild['id'], Guild>;
export declare type RoleMap = Map<GuildRole['id'], GuildRole>;
export declare type EmojiMap = Map<GuildEmoji['id'], GuildEmoji>;
export declare type VoiceStateMap = Map<GuildVoiceState['member']['user']['id'], Partial<GuildVoiceState>>;
export declare type PresenceMap = Map<RawPresence['user']['id'], RawPresence>;
export declare type GuildChannelMap = Map<GuildChannel['id'], GuildChannel>;
export declare type GuildMemberMap = Map<GuildMember['user']['id'], GuildMember>;
export declare type EventFunctions = Record<string, EventFunction>;
export declare type EventFunction = (...any: unknown[]) => unknown;
