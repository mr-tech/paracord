import type {
  ActivityAsset, GuildMembersChunkEventField, GuildMemberUpdateEventField, Activity, Channel, Emoji,
  Guild, GuildMember, Message, Presence, User, VoiceState, Snowflake, UnavailableGuild,
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

export type GatewayPresence = Omit<Presence, 'user'> & { user: { id: string } }

export interface AugmentedActivityAssets extends ActivityAsset {
  largeImage?: string;
  largeText?: string;
  smallImage?: string;
  smallText?: string;
}

export type MessageComponent = Button | SelectMenu | SelectOption | TextInput;

export type GuildTextChannel = { type: 0 } & Pick<Required<Channel>,
'guild_id' |
'id' |
'last_message_id' |
'last_pin_timestamp' |
'name' |
'nsfw' |
'parent_id' |
'permission_overwrites' |
'position' |
'rate_limit_per_user' |
'topic'>

export type GuildVoiceChannel = { type: 2 } & Pick<Required<Channel>,
'bitrate' |
'guild_id' |
'id' |
'last_message_id' |
'name' |
'parent_id' |
'permission_overwrites' |
'position' |
'rate_limit_per_user' |
'rtc_region' |
'type' |
'user_limit'>

export type GuildCategoryChannel = { type: 4 } & Pick<Required<Channel>,
'guild_id' |
'id' |
'name' |
'nsfw' |
'parent_id' |
'permission_overwrites' |
'position' |
'type'>

export type GuildNewsChannel = { type: 5 } & Pick<Required<Channel>,
'guild_id' |
'id' |
'last_message_id' |
'last_pin_timestamp' |
'name' |
'nsfw' |
'parent_id' |
'permission_overwrites' |
'position' |
'rate_limit_per_user' |
'topic' |
'type'>

// export type GuildStoreChannel = { type: 6 } & Pick<Required<Channel>>

export type GuildNewsThreadChannel = { type: 10, parent_id: string } & Pick<Required<Channel>,
'guild_id' |
'id' |
'last_message_id' |
'member' |
'member_count' |
'message_count' |
'name' |
'owner_id' |
'rate_limit_per_user' |
'thread_metadata'
>

export type GuildPublicThreadChannel = { type: 11, parent_id: string } & Pick<Required<Channel>,
'guild_id' |
'id' |
'last_message_id' |
'member' |
'member_count' |
'message_count' |
'name' |
'owner_id' |
'rate_limit_per_user' |
'thread_metadata'
>

export type GuildPrivateThreadChannel = { type: 12, parent_id: string } & Pick<Required<Channel>,
'guild_id' |
'id' |
'last_message_id' |
'member' |
'member_count' |
'message_count' |
'name' |
'owner_id' |
'rate_limit_per_user' |
'thread_metadata'
>

export type GuildStageVoiceChannel = { type: 13 } & Pick<Required<Channel>,
'bitrate' |
'guild_id' |
'id' |
'name' |
'nsfw' |
'parent_id' |
'permission_overwrites' |
'position' |
'rtc_region' |
'topic' |
'type' |
'user_limit'
>

export type GuildChannel = GuildTextChannel | GuildVoiceChannel | GuildCategoryChannel | GuildNewsChannel | GuildStageVoiceChannel;
export type GuildThread = GuildNewsThreadChannel | GuildPublicThreadChannel | GuildPrivateThreadChannel;

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
