import {
  ISO8601timestamp, RawChannel, RawEmoji, RawPresence, RawRole, RawUser, RawVoiceState, Snowflake, VoiceRegion,
} from '.';
import Emoji from '../clients/Paracord/structures/discord/resources/Emoji';

export type RawGuild = {
  [index: string]: unknown;

  /** guild id */
  id: Snowflake;
  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  name: string;
  /** icon hash */
  icon: string | null;
  /** splash hash */
  splash: string | null;
  /** discovery splash hash; only present for guilds with the "DISCOVERABLE" feature */
  discovery_splash: string | null;
  /** true if the user is the owner of the guild */
  owner?: boolean;
  /** id of owner */
  owner_id: Snowflake;
  /** total permissions for the user in the guild (excludes overrides) */
  permissions?: number;
  /** voice region id for the guild */
  region: VoiceRegion;
  /** id of afk channel */
  afk_channel_id: Snowflake | null;
  /** afk timeout in seconds */
  afk_timeout: number;
  /** true if the server widget is enabled (deprecated, replaced with `widget_enabled`) */
  embed_enabled?: boolean;
  /** the channel id that the widget will generate an invite to, or `null` if set to no invite (deprecated, replaced with `widget_channel_id`) */
  embed_channel_id?: Snowflake | null;
  /** verification level required for the guild */
  verification_level: VerificationLevel;
  /** default message notification level */
  default_message_notifications: DefaultMessageNotificationLevel;
  /** explicit content filter level */
  explicit_content_filter: ExplicitContentFilterLevel;
  /** roles in the guild */
  roles: RawRole[];
  /** custom guild emojis */
  emojis: Emoji[]; // !! NOT GENERATED RawEmoji -> GuildEmoji
  /** enabled guild features */
  features: GuildFeature[];
  /** required MFA Level for the guild */
  mfa_level: MFALevel;
  /** application id of the guild creator if it is bot-created */
  application_id: Snowflake | null;
  /** true if the server widget is enabled */
  widget_enabled?: boolean;
  /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
  widget_channel_id?: Snowflake | null;
  /** the id of the channel where guild notices such as welcome messages and boost events are posted */
  system_channel_id: Snowflake | null;
  /** system channel flags */
  system_channel_flags: SystemChannelFlags;
  /** the id of the channel where guilds with the "PUBLIC" feature can display rules and/or guidelines */
  rules_channel_id: Snowflake | null;
  /** when this guild was joined at */
  joined_at?: ISO8601timestamp;
  /** true if this is considered a large guild */
  large?: boolean;
  /** true if this guild is unavailable due to an outage */
  unavailable?: boolean;
  /** total number of members in this guild */
  member_count?: number;
  /** states of members currently in voice channels; lacks the `guild_id` key */
  voice_states?: Partial<RawVoiceState>[];
  /** users in the guild */
  members?: RawGuildMember[];
  /** channels in the guild */
  channels?: RawChannel[];
  /** presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  presences?: Partial<RawPresence>[];
  /** the maximum number of presences for the guild (the default value, currently 25000, is in effect when `null` is returned) */
  max_presences?: number | null;
  /** the maximum number of members for the guild */
  max_members?: number;
  /** the vanity url code for the guild */
  vanity_url_code: string | null;
  /** the description for the guild, if the guild is discoverable */
  description: string | null;
  /** banner hash */
  banner: string | null;
  /** server Boost level */
  premium_tier: PremiumTier;
  /** the number of boosts this guild currently has */
  premium_subscription_count?: number;
  /** the preferred locale of a guild with the "PUBLIC" feature; used in server discovery and notices from Discord; defaults to "en-US" */
  preferred_locale: string;
  /** the id of the channel where admins and moderators of guilds with the "PUBLIC" feature receive notices from Discord */
  public_updates_channel_id: Snowflake | null;
  /** the maximum amount of users in a video channel */
  max_video_channel_users?: number;
  /** approximate number of members in this guild, returned from the `GET /guild/<id>` endpoint when `with_counts` is `true` */
  approximate_member_count?: number;
  /** approximate number of non-offline members in this guild, returned from the `GET /guild/<id>` endpoint when `with_counts` is `true` */
  approximate_presence_count?: number;
};

// ========================================================================

export type DefaultMessageNotificationLevel = [
  /** ALL_MESSAGES */
  0 |
  /** ONLY_MENTIONS */
  1
];

// ========================================================================

export type ExplicitContentFilterLevel = [
  /** DISABLED */
  0 |
  /** MEMBERS_WITHOUT_ROLES */
  1 |
  /** ALL_MEMBERS */
  2
];

// ========================================================================

export type MFALevel = [
  /** NONE */
  0 |
  /** ELEVATED */
  1
];

// ========================================================================

export type VerificationLevel = [
  /** NONE */
  0 |
  /** LOW */
  1 |
  /** MEDIUM */
  2 |
  /** HIGH */
  3 |
  /** VERY_HIGH */
  4
];

// ========================================================================

export type PremiumTier = [
  /** NONE */
  0 |
  /** TIER_1 */
  1 |
  /** TIER_2 */
  2 |
  /** TIER_3 */
  3
];

// ========================================================================

export enum SystemChannelFlags {
  SUPPRESS_JOIN_NOTIFICATIONS = 1 << 0,
  SUPPRESS_PREMIUM_SUBSCRIPTIONS = 1 << 1
}

// ========================================================================

export type GuildFeature = [
  /** guild has access to set an invite splash background */
  'INVITE_SPLASH' |
  /** guild has access to set 384kbps bitrate in voice (previously VIP voice servers) */
  'VIP_REGIONS' |
  /** guild has access to set a vanity URL */
  'VANITY_URL' |
  /** guild is verified */
  'VERIFIED' |
  /** guild is partnered */
  'PARTNERED' |
  /** guild is public */
  'PUBLIC' |
  /** guild has access to use commerce features (i.e. create store channels) */
  'COMMERCE' |
  /** guild has access to create news channels */
  'NEWS' |
  /** guild is able to be discovered in the directory */
  'DISCOVERABLE' |
  /** guild is able to be featured in the directory */
  'FEATURABLE' |
  /** guild has access to set an animated guild icon */
  'ANIMATED_ICON' |
  /** guild has access to set a guild banner image */
  'BANNER' |
  /** guild cannot be public */
  'PUBLIC_DISABLED' |
  /** guild has enabled the welcome screen */
  'WELCOME_SCREEN_ENABLED'
];

// ========================================================================

export type GuildPreview = {
  /** guild id */
  id: Snowflake;
  /** guild name (2-100 characters) */
  name: string;
  /** icon hash */
  icon: string | null;
  /** splash hash */
  splash: string | null;
  /** discovery splash hash */
  discovery_splash: string | null;
  /** custom guild emojis */
  emojis: RawEmoji[];
  /** enabled guild features */
  features: GuildFeature[];
  /** approximate number of members in this guild */
  approximate_member_count: number;
  /** approximate number of online members in this guild */
  approximate_presence_count: number;
  /** the description for the guild */
  description: string | null;
};

// ========================================================================

export type GuildWidget = {
  /** whether the widget is enabled */
  enabled: boolean;
  /** the widget channel id */
  channel_id: Snowflake | null;
};

// ========================================================================

export type RawGuildMember = {
  /** the user this guild member represents */
  user?: RawUser;
  /** this users guild nickname */
  nick: string | null;
  /** array of role object ids */
  roles: Snowflake[];
  /** when the user joined the guild */
  joined_at: ISO8601timestamp;
  /** when the user started boosting the guild */
  premium_since?: ISO8601timestamp | null;
  /** whether the user is deafened in voice channels */
  deaf: boolean;
  /** whether the user is muted in voice channels */
  mute: boolean;
};

// ========================================================================

export type Integration = {
  /** integration id */
  id: Snowflake;
  /** integration name */
  name: string;
  /** integration type (twitch, youtube, etc) */
  type: string;
  /** is this integration enabled */
  enabled: boolean;
  /** is this integration syncing */
  syncing: boolean;
  /** id that this integration uses for "subscribers" */
  role_id: Snowflake;
  /** whether emoticons should be synced for this integration (twitch only currently) */
  enable_emoticons?: boolean;
  /** the behavior of expiring subscribers */
  expire_behavior: IntegrationExpireBehavior;
  /** the grace period (in days) before expiring subscribers */
  expire_grace_period: number;
  /** user for this integration */
  user: RawUser;
  /** integration account information */
  account: Account;
  /** when this integration was last synced */
  synced_at: ISO8601timestamp;
};

// ========================================================================

export type IntegrationExpireBehavior = [
  /** Remove role */
  0 |
  /** Kick */
  1
];

// ========================================================================

export type IntegrationAccount = {
  /** id of the account */
  id: string;
  /** name of the account */
  name: string;
};

// ========================================================================

export type Ban = {
  /** the reason for the ban */
  reason: string | null;
  /** the banned user */
  user: RawUser;
};
