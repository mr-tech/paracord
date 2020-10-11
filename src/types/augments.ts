import {
  ActivityAssets, GuildMembersChunkEventFields, GuildMemberUpdateEventFields, RawActivity, RawChannel, RawEmoji, RawGuild, RawGuildMember, RawMessage, RawPresence, RawRole, RawUser, RawVoiceState, Snowflake, UnavailableGuild,
} from '.';

export interface AugmentedRawGuildMember extends RawGuildMember {
  user: RawUser;
}

export interface AugmentedRawVoiceState extends RawVoiceState {
  member: AugmentedRawGuildMember;
}

export interface AugmentedRawGuild extends RawGuild {
  voice_states?: AugmentedRawVoiceState[];
  presences?: RawPresence[];
  members?: AugmentedRawGuildMember[];
}

export interface AugmentedGuildMembersChunkEventFields extends GuildMembersChunkEventFields {
  members: AugmentedRawGuildMember[];
}

export interface AugmentedRawMessage extends RawMessage {
  member: AugmentedRawGuildMember;
}

export interface RawGuildEmoji extends RawEmoji {
  id: Snowflake
}

export interface AugmentedActivityAssets extends ActivityAssets {
  largeImage?: string;
  largeText?: string;
  smallImage?: string;
  smallText?: string;
}

export type RawWildCard =
AugmentedRawGuildMember |
AugmentedRawVoiceState |
AugmentedGuildMembersChunkEventFields |
AugmentedRawMessage |
GuildMemberUpdateEventFields |
RawUser |
RawChannel |
AugmentedRawGuild |
RawRole |
RawGuildEmoji |
RawActivity |
AugmentedActivityAssets |
RawPresence |
UnavailableGuild
