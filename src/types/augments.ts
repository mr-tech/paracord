import type {
  ActivityAsset, GuildMembersChunkEventField, GuildMemberUpdateEventField, Activity, Channel, Emoji,
  Guild, GuildMember, Message, Presence, Role, User, VoiceState, Snowflake, UnavailableGuild,
  Button, SelectMenu, SelectOption, TextInput,
} from '.';

export interface AugmentedGuildMember extends GuildMember {
  user: User;
}

export interface AugmentedVoiceState extends VoiceState {
  member?: AugmentedGuildMember;
}

export interface AugmentedGuild extends Guild {
  voice_states?: AugmentedVoiceState[];
  presences?: Presence[];
  members?: AugmentedGuildMember[];
  emojis: GuildEmoji[];
}

export interface AugmentedGuildMembersChunkEventFields extends GuildMembersChunkEventField {
  members: AugmentedGuildMember[];
}

export interface AugmentedMessage extends Message {
  member: AugmentedGuildMember;
}

export interface GuildEmoji extends Emoji {
  id: Snowflake;
}

export interface AugmentedActivityAssets extends ActivityAsset {
  largeImage?: string;
  largeText?: string;
  smallImage?: string;
  smallText?: string;
}

export type MessageComponent = Button | SelectMenu | SelectOption | TextInput;

export type WildCard =
AugmentedGuildMember |
AugmentedVoiceState |
AugmentedGuildMembersChunkEventFields |
AugmentedMessage |
GuildMemberUpdateEventField |
User |
Channel |
AugmentedGuild |
GuildEmoji |
Activity |
AugmentedActivityAssets |
Presence |
UnavailableGuild
