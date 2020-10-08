import {
  ActivityAssets, GuildMembersChunkEventFields, GuildMemberUpdateEventFields, RawActivity, RawChannel, RawGuild, RawGuildMember, RawMessage, RawPresence, RawRole, RawUser, RawVoiceState, Snowflake,
} from '.';
import GuildMember from '../clients/Paracord/structures/discord/resources/GuildMember';

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

export interface AugmentedEmoji {
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
AugmentedEmoji |
RawActivity |
AugmentedActivityAssets |
RawPresence
