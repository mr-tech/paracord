import type {
  ActivityAsset, Channel, Emoji, Guild, GuildMember, Message, Presence,
  User, VoiceState, Snowflake, Button, SelectMenu, GuildRequestMember,
  ButtonStyleType, TextInput,
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

export type ButtonEmoji = Pick<Emoji, 'name' | 'id' | 'animated'>;
export type NonLinkButton = Omit<Button, 'url' | 'style' | 'emoji'> & Required<Pick<Button, 'custom_id'>> & { style: Exclude<ButtonStyleType, 5>, emoji?: ButtonEmoji };
export type LinkButton = Omit<Button, 'custom_id' | 'style' | 'emoji'> & Required<Pick<Button, 'url'>> & { style: 5, emoji?: ButtonEmoji };
export type StringSelectMenu = { type: 3 } & Omit<SelectMenu, 'channel_types'>;
export type UserSelectMenu = { type: 5 } & Omit<SelectMenu, 'options' | 'channel_types' >;
export type RoleSelectMenu = { type: 6 } & Omit<SelectMenu, 'options' | 'channel_types'>;
export type MentionableSelectMenu = { type: 7 } & Omit<SelectMenu, 'options' | 'channel_types'>;
export type ChannelSelectMenu = { type: 8 } & Omit<SelectMenu, 'options' | 'channel_types'>;

export type SubMessageComponent =
NonLinkButton | LinkButton
| StringSelectMenu | UserSelectMenu
| RoleSelectMenu | MentionableSelectMenu
| ChannelSelectMenu

export type ActionRowComponent = {
  type: 1;
  components: Array<SubMessageComponent | TextInput>;
};

export type MessageComponent = ActionRowComponent;

export type Component = ActionRowComponent;

export type GuildTextChannel = { type: 0, name: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'last_message_id'
| 'last_pin_timestamp'
| 'nsfw'
| 'parent_id'
| 'permission_overwrites'
| 'position'
| 'rate_limit_per_user'
| 'topic'>

export type GuildVoiceChannel = { type: 2, name: string } & Pick<Required<Channel>,
'bitrate'
| 'guild_id'
| 'id'
| 'last_message_id'
| 'parent_id'
| 'permission_overwrites'
| 'position'
| 'rate_limit_per_user'
| 'rtc_region'
| 'type'
| 'user_limit'
>

export type GuildCategoryChannel = { type: 4, name: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'nsfw'
| 'parent_id'
| 'permission_overwrites'
| 'position'
| 'type'
>

export type GuildNewsChannel = { type: 5, name: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'last_message_id'
| 'last_pin_timestamp'
| 'nsfw'
| 'parent_id'
| 'permission_overwrites'
| 'position'
| 'rate_limit_per_user'
| 'topic'
| 'type'
>

// export type GuildStoreChannel = { type: 6 } & Pick<Required<Channel>>

export type GuildNewsThreadChannel = { type: 10, name: string, parent_id: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'last_message_id'
| 'member'
| 'member_count'
| 'message_count'
| 'owner_id'
| 'rate_limit_per_user'
| 'thread_metadata'
>

export type GuildPublicThreadChannel = { type: 11, name: string, parent_id: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'last_message_id'
| 'member'
| 'member_count'
| 'message_count'
| 'owner_id'
| 'rate_limit_per_user'
| 'thread_metadata'
>

export type GuildPrivateThreadChannel = { type: 12, name: string, parent_id: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'last_message_id'
| 'member'
| 'member_count'
| 'message_count'
| 'owner_id'
| 'rate_limit_per_user'
| 'thread_metadata'
>

export type GuildStageVoiceChannel = { type: 13, name: string } & Pick<Required<Channel>,
'guild_id'
| 'bitrate'
| 'id'
| 'nsfw'
| 'parent_id'
| 'permission_overwrites'
| 'position'
| 'rtc_region'
| 'topic'
| 'type'
| 'user_limit'
>

export type GuildForumChannel = { type: 15, name: string } & Pick<Required<Channel>,
'guild_id'
| 'id'
| 'last_message_id'
| 'position'
| 'flags'
| 'parent_id'
| 'topic'
| 'permission_overwrites'
| 'rate_limit_per_user'
| 'nsfw'
| 'available_tags'
| 'default_reaction_emoji'
>

export type CasedGuildRequestMember = Omit<GuildRequestMember, 'guild_id' | 'user_ids'> & {
  guildId: GuildRequestMember['guild_id'];
  userIds: GuildRequestMember['user_ids'];
}

export type GuildChannel = GuildTextChannel
| GuildVoiceChannel
| GuildCategoryChannel
| GuildNewsChannel
| GuildStageVoiceChannel
| GuildForumChannel;

export type GuildThread = GuildNewsThreadChannel | GuildPublicThreadChannel | GuildPrivateThreadChannel;

export type Locale =
/** Danish - Dansk */
'da' |
/** German - Deutsch */
'de' |
/** English, UK - English, UK */
'en-GB' |
/** English, US - English, US */
'en-US' |
/** Spanish - Español */
'es-ES' |
/** French - Français */
'fr' |
/** Croatian - Hrvatski */
'hr' |
/** Italian - Italiano */
'it' |
/** Lithuanian - Lietuviškai */
'lt' |
/** Hungarian - Magyar */
'hu' |
/** Dutch - Nederlands */
'nl' |
/** Norwegian - Norsk */
'no' |
/** Polish - Polski */
'pl' |
/** Portuguese, Brazilian - Português do Brasil */
'pt-BR' |
/** Romanian, Romania - Română */
'ro' |
/** Finnish - Suomi */
'fi' |
/** Swedish - Svenska */
'sv-SE' |
/** Vietnamese - Tiếng Việt   */
'vi' |
/** Turkish - Türkçe */
'tr' |
/** Czech - Čeština */
'cs' |
/** Greek - Ελληνικά */
'el' |
/** Bulgarian - български */
'bg' |
/** Russian - Pусский */
'ru' |
/** Ukrainian - Українська */
'uk' |
/** Hindi - हिन्दी */
'hi' |
/** Thai - ไทย */
'th' |
/** Chinese, China - 中文 */
'zh-CN' |
/** Japanese - 日本語 */
'ja' |
/** Chinese, Taiwan - 繁體中文 */
'zh-TW' |
/** Korean - 한국어 */
'ko';

export type AvailableLocale = Partial<Record<Locale, string>>;

export interface GatewayBotResponse {
  /** websocket url */
  url: string;
  /** recommended shard count */
  shards: number;
  /** state of the limits for this period of time */
  session_start_limit: SessionLimitData;
}

export type SessionLimitData = {
  /** Total number of identifies application can make in this period. */
  total: number;
  /** Identifies remaining for this period. */
  remaining: number;
  /** How long in ms until `remaining` resets. */
  reset_after: number;
  /** How many shards are allowed to identify in parallel. */
  max_concurrency: number;
}
