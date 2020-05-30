import {
  Role, Emoji, VoiceState, Presence, Channel, GuildMember, Overwrite,
} from '.';

export type Snowflake = string;

export type ISO8601timestamp = string;

export type UnavailableGuild = {
  id: Snowflake;
  unavailable: true;
}

export type RoleMap = Map<Role['id'], Role>
export type EmojiMap = Map<Emoji['id'], Emoji>
export type VoiceStateMap = Map<VoiceState['member']['user']['id'], Partial<VoiceState>>
export type PresenceMap = Map<Presence['user']['id'], Partial<Presence>>
export type GuildChannelMap = Map<GuildChannel['id'], GuildChannel>
export type GuildMemberMap = Map<GuildMember['user']['id'], GuildMember>

export type GuildChannel = Channel & {
  permissionOverwrites: Overwrite[];
}
