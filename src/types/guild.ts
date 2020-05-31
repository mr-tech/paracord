import {
  ISO8601timestamp, Snowflake, User, EmojiMap, VoiceRegion, RawRole, RawEmoji, RawChannel, RawPresence, RawVoiceState,
} from '.';

export type RawGuild = {
  /** guild id */
  id: Snowflake;
  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  name: string;
  /** icon hash */
  icon: string | null;
  /** splash hash */
  splash: string | null;
  /** discovery splash hash; only present for guilds with the "DISCOVERABLE" feature */
  discoverySplash: string | null;
  /** true if the user is the owner of the guild */
  owner?: boolean;
  /** id of owner */
  ownerId: Snowflake;
  /** total permissions for the user in the guild (excludes overrides) */
  permissions?: number;
  /** voice region id for the guild */
  region: VoiceRegion;
  /** id of afk channel */
  afkChannelId: Snowflake | null;
  /** afk timeout in seconds */
  afkTimeout: number;
  /** true if the server widget is enabled (deprecated, replaced with `widget_enabled`) */
  embedEnabled?: boolean;
  /** the channel id that the widget will generate an invite to, or `null` if set to no invite (deprecated, replaced with `widget_channel_id`) */
  embedChannelId?: Snowflake | null;
  /** verification level required for the guild */
  verificationLevel: VerificationLevel;
  /** default message notification level */
  defaultMessageNotifications: DefaultMessageNotificationLevel;
  /** explicit content filter level */
  explicitContentFilter: ExplicitContentFilterLevel;
  /** roles in the guild */
  roles: RawRole[];
  /** custom guild emojis */
  emojis: RawEmoji[];
  /** enabled guild features */
  features: GuildFeature[];
  /** required MFA Level for the guild */
  mfaLevel: MFALevel;
  /** application id of the guild creator if it is bot-created */
  applicationId: Snowflake | null;
  /** true if the server widget is enabled */
  widgetEnabled?: boolean;
  /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
  widgetChannelId?: Snowflake | null;
  /** the id of the channel where guild notices such as welcome messages and boost events are posted */
  systemChannelId: Snowflake | null;
  /** system channel flags */
  systemChannelFlags: SystemChannelFlags;
  /** the id of the channel where guilds with the "PUBLIC" feature can display rules and/or guidelines */
  rulesChannelId: Snowflake | null;
  /** when this guild was joined at */
  joinedAt?: ISO8601timestamp;
  /** true if this is considered a large guild */
  large?: boolean;
  /** true if this guild is unavailable due to an outage */
  unavailable?: boolean;
  /** total number of members in this guild */
  memberCount?: number;
  /** states of members currently in voice channels; lacks the `guild_id` key */
  voiceStates?: Partial<RawVoiceState>[];
  /** users in the guild */
  members?: RawGuildMember[];
  /** channels in the guild */
  channels?: RawChannel[];
  /** presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  presences?: Partial<RawPresence>[];
  /** the maximum number of presences for the guild (the default value, currently 25000, is in effect when `null` is returned) */
  maxPresences?: number | null;
  /** the maximum number of members for the guild */
  maxMembers?: number;
  /** the vanity url code for the guild */
  vanityUrlCode: string | null;
  /** the description for the guild, if the guild is discoverable */
  description: string | null;
  /** banner hash */
  banner: string | null;
  /** server Boost level */
  premiumTier: PremiumTier;
  /** the number of boosts this guild currently has */
  premiumSubscriptionCount?: number;
  /** the preferred locale of a guild with the "PUBLIC" feature; used in server discovery and notices from Discord; defaults to "en-US" */
  preferredLocale: string;
  /** the id of the channel where admins and moderators of guilds with the "PUBLIC" feature receive notices from Discord */
  publicUpdatesChannelId: Snowflake | null;
  /** the maximum amount of users in a video channel */
  maxVideoChannelUsers?: number;
  /** approximate number of members in this guild, returned from the `GET /guild/<id>` endpoint when `with_counts` is `true` */
  approximateMemberCount?: number;
  /** approximate number of non-offline members in this guild, returned from the `GET /guild/<id>` endpoint when `with_counts` is `true` */
  approximatePresenceCount?: number;
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
  discoverySplash: string | null;
  /** custom guild emojis */
  emojis: EmojiMap;
  /** enabled guild features */
  features: GuildFeature[];
  /** approximate number of members in this guild */
  approximateMemberCount: number;
  /** approximate number of online members in this guild */
  approximatePresenceCount: number;
  /** the description for the guild */
  description: string | null;
};

// ========================================================================

export type GuildWidget = {
  /** whether the widget is enabled */
  enabled: boolean;
  /** the widget channel id */
  channelId: Snowflake | null;
};

// ========================================================================

export type RawGuildMember = {
  /** the user this guild member represents */
  user: User;
  /** this users guild nickname */
  nick: string | null;
  /** array of role object ids */
  roles: Snowflake[];
  /** when the user joined the guild */
  joinedAt: ISO8601timestamp;
  /** when the user started boosting the guild */
  premiumSince?: ISO8601timestamp | null;
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
  roleId: Snowflake;
  /** whether emoticons should be synced for this integration (twitch only currently) */
  enableEmoticons?: boolean;
  /** the behavior of expiring subscribers */
  expireBehavior: IntegrationExpireBehavior;
  /** the grace period (in days) before expiring subscribers */
  expireGracePeriod: number;
  /** user for this integration */
  user: User;
  /** integration account information */
  account: Account;
  /** when this integration was last synced */
  syncedAt: ISO8601timestamp;
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
  user: User;
};
