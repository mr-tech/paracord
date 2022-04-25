import type {
  ISO8601timestamp, Channel, Emoji, Presence,
  Role, User, VoiceState, Snowflake, Application, GuildScheduledEvent, Sticker, StageInstance, VoiceRegion,
} from '.';

export type Guild = {
  /** guild id */
  id: Snowflake;
  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  name: string;
  /** icon hash */
  icon: string | null;
  /** icon hash, returned when in the template object */
  icon_hash?: string | null;
  /** splash hash */
  splash: string | null;
  /** discovery splash hash; only present for guilds with the "DISCOVERABLE" feature */
  discovery_splash: string | null;
  /** true if the user is the owner of the guild */
  owner?: boolean;
  /** id of owner */
  owner_id: Snowflake;
  /** total permissions for the user in the guild (excludes overwrites) */
  permissions?: string;
  /** voice region id for the guild (deprecated) */
  region?: VoiceRegion | null;
  /** id of afk channel */
  afk_channel_id: Snowflake | null;
  /** afk timeout in seconds */
  afk_timeout: number;
  /** true if the server widget is enabled */
  widget_enabled?: boolean;
  /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
  widget_channel_id?: Snowflake | null;
  /** verification level required for the guild */
  verification_level: VerificationLevel;
  /** default message notifications level */
  default_message_notifications: DefaultMessageNotificationLevel;
  /** explicit content filter level */
  explicit_content_filter: ExplicitContentFilterLevel;
  /** roles in the guild */
  roles: Role[];
  /** custom guild emojis */
  emojis: Emoji[];
  /** enabled guild features */
  features: GuildFeatureType[];
  /** required MFA level for the guild */
  mfa_level: MFALevel;
  /** application id of the guild creator if it is bot-created */
  application_id: Snowflake | null;
  /** the id of the channel where guild notices such as welcome messages and boost events are posted */
  system_channel_id: Snowflake | null;
  /** system channel flags */
  system_channel_flags: SystemChannelFlags;
  /** the id of the channel where Community guilds can display rules and/or guidelines */
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
  voice_states?: Partial<VoiceState>[];
  /** users in the guild */
  members?: GuildMember[];
  /** channels in the guild */
  channels?: Channel[];
  /** all active threads in the guild that current user has permission to view */
  threads?: Channel[];
  /** presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  presences?: Partial<Presence>[];
  /** the maximum number of presences for the guild (`null` is always returned, apart from the largest of guilds) */
  max_presences?: number | null;
  /** the maximum number of members for the guild */
  max_members?: number;
  /** the vanity url code for the guild */
  vanity_url_code: string | null;
  /** the description of a guild */
  description: string | null;
  /** banner hash */
  banner: string | null;
  /** premium tier (Server Boost level) */
  premium_tier: PremiumTier;
  /** the number of boosts this guild currently has */
  premium_subscription_count?: number;
  /** the preferred locale of a Community guild; used in server discovery and notices from Discord, and sent in interactions; defaults to "en-US" */
  preferred_locale: string;
  /** the id of the channel where admins and moderators of Community guilds receive notices from Discord */
  public_updates_channel_id: Snowflake | null;
  /** the maximum amount of users in a video channel */
  max_video_channel_users?: number;
  /** approximate number of members in this guild, returned from the `GET /guilds/<id>` endpoint when `with_counts` is `true` */
  approximate_member_count?: number;
  /** approximate number of non-offline members in this guild, returned from the `GET /guilds/<id>` endpoint when `with_counts` is `true` */
  approximate_presence_count?: number;
  /** the welcome screen of a Community guild, shown to new members, returned in an Invite's guild object */
  welcome_screen?: WelcomeScreen;
  /** guild NSFW level */
  nsfw_level: GuildNSFWLevel;
  /** Stage instances in the guild */
  stage_instances?: StageInstance[];
  /** custom guild stickers */
  stickers?: Sticker[];
  /** the scheduled events in the guild */
  guild_scheduled_events?: GuildScheduledEvent[];
  /** whether the guild has the boost progress bar enabled */
  premium_progress_bar_enabled: boolean;
};

// ========================================================================

export type DefaultMessageNotificationLevel =
  /** ALL_MESSAGES */
  0 |
  /** ONLY_MENTIONS */
  1;

// ========================================================================

export type ExplicitContentFilterLevel =
  /** DISABLED */
  0 |
  /** MEMBERS_WITHOUT_ROLES */
  1 |
  /** ALL_MEMBERS */
  2;

// ========================================================================

export type MFALevel =
  /** NONE */
  0 |
  /** ELEVATED */
  1;

// ========================================================================

export type VerificationLevel =
  /** NONE */
  0 |
  /** LOW */
  1 |
  /** MEDIUM */
  2 |
  /** HIGH */
  3 |
  /** VERY_HIGH */
  4;

// ========================================================================

export type GuildNSFWLevel =
  /** DEFAULT */
  0 |
  /** EXPLICIT */
  1 |
  /** SAFE */
  2 |
  /** AGE_RESTRICTED */
  3;

// ========================================================================

export type PremiumTier =
  /** NONE */
  0 |
  /** TIER_1 */
  1 |
  /** TIER_2 */
  2 |
  /** TIER_3 */
  3;

// ========================================================================

export enum SystemChannelFlags {
  SUPPRESS_JOIN_NOTIFICATIONS = 1 << 0,
  SUPPRESS_PREMIUM_SUBSCRIPTIONS = 1 << 1,
  SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 1 << 2,
  SUPPRESS_JOIN_NOTIFICATION_REPLIES = 1 << 3
}

// ========================================================================

export type GuildFeatureType =
  /** guild has access to set an animated guild banner image */
  'ANIMATED_BANNER' |
  /** guild has access to set an animated guild icon */
  'ANIMATED_ICON' |
  /** guild has access to set a guild banner image */
  'BANNER' |
  /** guild has access to use commerce features (i.e. create store channels) */
  'COMMERCE' |
  /** guild can enable welcome screen, Membership Screening, stage channels and discovery, and receives community updates */
  'COMMUNITY' |
  /** guild is able to be discovered in the directory */
  'DISCOVERABLE' |
  /** guild is able to be featured in the directory */
  'FEATURABLE' |
  /** guild has access to set an invite splash background */
  'INVITE_SPLASH' |
  /** guild has enabled [Membership Screening](#DOCS_RESOURCES_GUILD/membership-screening-object) */
  'MEMBER_VERIFICATION_GATE_ENABLED' |
  /** guild has enabled monetization */
  'MONETIZATION_ENABLED' |
  /** guild has increased custom sticker slots */
  'MORE_STICKERS' |
  /** guild has access to create news channels */
  'NEWS' |
  /** guild is partnered */
  'PARTNERED' |
  /** guild can be previewed before joining via Membership Screening or the directory */
  'PREVIEW_ENABLED' |
  /** guild has access to create private threads */
  'PRIVATE_THREADS' |
  /** guild is able to set role icons */
  'ROLE_ICONS' |
  /** guild has access to the seven day archive time for threads */
  'SEVEN_DAY_THREAD_ARCHIVE' |
  /** guild has access to the three day archive time for threads */
  'THREE_DAY_THREAD_ARCHIVE' |
  /** guild has enabled ticketed events */
  'TICKETED_EVENTS_ENABLED' |
  /** guild has access to set a vanity URL */
  'VANITY_URL' |
  /** guild is verified */
  'VERIFIED' |
  /** guild has access to set 384kbps bitrate in voice (previously VIP voice servers) */
  'VIP_REGIONS' |
  /** guild has enabled the welcome screen */
  'WELCOME_SCREEN_ENABLED';

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
  emojis: Emoji[];
  /** enabled guild features */
  features: GuildFeatureType[];
  /** approximate number of members in this guild */
  approximate_member_count: number;
  /** approximate number of online members in this guild */
  approximate_presence_count: number;
  /** the description for the guild */
  description: string | null;
  /** custom guild stickers */
  stickers: Sticker[];
};

// ========================================================================

export type GuildWidgetSetting = {
  /** whether the widget is enabled */
  enabled: boolean;
  /** the widget channel id */
  channel_id: Snowflake | null;
};

// ========================================================================

export type GetGuildWidget = {
  /** guild id */
  id: Snowflake;
  /** guild name (2-100 characters) */
  name: string;
  /** instant invite for the guilds specified widget invite channel */
  instant_invite: string | null;
  /** voice and stage channels which are accessible by @everyone */
  channels: Partial<Channel>[];
  /** special widget user objects that includes users presence (Limit 100) */
  members: Partial<User>[];
  /** number of online members in this guild */
  presence_count: number;
};

// ========================================================================

export type GuildMember = {
  /** the user this guild member represents */
  user?: User;
  /** this user's guild nickname */
  nick?: string | null;
  /** the member's guild avatar hash */
  avatar?: string | null;
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
  /** whether the user has not yet passed the guild's Membership Screening requirements */
  pending?: boolean;
  /** total permissions of the member in the channel, including overwrites, returned when in the interaction object */
  permissions?: string;
  /** when the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
  communication_disabled_until?: ISO8601timestamp | null;
};

// ========================================================================

export type Integration = {
  /** integration id */
  id: Snowflake;
  /** integration name */
  name: string;
  /** integration type (twitch, youtube, or discord) */
  type: string;
  /** is this integration enabled */
  enabled?: boolean;
  /** is this integration syncing */
  syncing?: boolean;
  /** id that this integration uses for "subscribers" */
  role_id?: Snowflake;
  /** whether emoticons should be synced for this integration (twitch only currently) */
  enable_emoticons?: boolean;
  /** the behavior of expiring subscribers */
  expire_behavior?: IntegrationExpireType;
  /** the grace period (in days) before expiring subscribers */
  expire_grace_period?: number;
  /** user for this integration */
  user?: User;
  /** integration account information */
  account: Account;
  /** when this integration was last synced */
  synced_at?: ISO8601timestamp;
  /** how many subscribers this integration has */
  subscriber_count?: number;
  /** has this integration been revoked */
  revoked?: boolean;
  /** The bot/OAuth2 application for discord integrations */
  application?: Application;
};

// ========================================================================

export type IntegrationExpireType =
  /** Remove role */
  0 |
  /** Kick */
  1;

// ========================================================================

export type IntegrationAccount = {
  /** id of the account */
  id: string;
  /** name of the account */
  name: string;
};

// ========================================================================

export type IntegrationApplication = {
  /** the id of the app */
  id: Snowflake;
  /** the name of the app */
  name: string;
  /** the icon hash of the app */
  icon: string | null;
  /** the description of the app */
  description: string;
  /** the bot associated with this application */
  bot?: User;
};

// ========================================================================

export type Ban = {
  /** the reason for the ban */
  reason: string | null;
  /** the banned user */
  user: User;
};

// ========================================================================

export type WelcomeScreen = {
  /** the server description shown in the welcome screen */
  description: string | null;
  /** the channels shown in the welcome screen, up to 5 */
  welcome_channels: WelcomeScreenChannel[];
};

// ========================================================================

export type WelcomeScreenChannel = {
  /** the channel's id */
  channel_id: Snowflake;
  /** the description shown for the channel */
  description: string;
  /** the emoji id, if the emoji is custom */
  emoji_id: Snowflake | null;
  /** the emoji name if custom, the unicode character if standard, or `null` if no emoji is set */
  emoji_name: string | null;
};
