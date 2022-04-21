import type {
  ActivityAsset, GuildMembersChunkEventField, GuildMemberUpdateEventField, Activity, Channel, Emoji,
  Guild, GuildMember, Message, Presence, User, VoiceState, Snowflake, UnavailableGuild,
  Button, SelectMenu,
} from '.';
import { GuildRequestMember } from './gateway';
import { ButtonStyleType, TextInput } from './message-components';

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

export type ButtonEmoji = Pick<Emoji, 'name' | 'id' | 'animated'>;
export type NonLinkButton = Omit<Button, 'url' | 'style' | 'emoji'> & Required<Pick<Button, 'custom_id'>> & { style: Exclude<ButtonStyleType, 5>, emoji?: ButtonEmoji };
export type LinkButton = Omit<Button, 'custom_id' | 'style' | 'emoji'> & Required<Pick<Button, 'url'>> & { style: 5, emoji?: ButtonEmoji };

export type MessageComponent = ActionRowComponent;

export type ActionRowComponent = {
  type: 1;
  components: Array<NonLinkButton | LinkButton> | SelectMenu[] | TextInput[];
};

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

export type CasedGuildRequestMember = Omit<GuildRequestMember, 'guild_id' | 'user_ids'> & {
  guildId: GuildRequestMember['guild_id'];
  userIds: GuildRequestMember['user_ids'];
}

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
