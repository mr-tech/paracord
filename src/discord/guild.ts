import type {
  ISO8601timestamp, Channel, Emoji, Role, User, Snowflake, Application, Sticker, VoiceRegion,
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
  /** the maximum amount of users in a stage video channel */
  max_stage_video_channel_users?: number;
  /** approximate number of members in this guild, returned from the `GET /guilds/<id>` endpoint when `with_counts` is `true` */
  approximate_member_count?: number;
  /** approximate number of non-offline members in this guild, returned from the `GET /guilds/<id>` endpoint when `with_counts` is `true` */
  approximate_presence_count?: number;
  /** the welcome screen of a Community guild, shown to new members, returned in an Invite's guild object */
  welcome_screen?: WelcomeScreen;
  /** guild NSFW level */
  nsfw_level: GuildNSFWLevel;
  /** custom guild stickers */
  stickers?: Sticker[];
  /** whether the guild has the boost progress bar enabled */
  premium_progress_bar_enabled: boolean;
  /** the id of the channel where admins and moderators of Community guilds receive safety alerts from Discord */
  safety_alerts_channel_id: Snowflake | null;
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
  SUPPRESS_JOIN_NOTIFICATION_REPLIES = 1 << 3,
  SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS = 1 << 4,
  SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES = 1 << 5
}

// ========================================================================

export type GuildFeatureType =
  /** guild has access to set an animated guild banner image */
  'ANIMATED_BANNER' |
  /** guild has access to set an animated guild icon */
  'ANIMATED_ICON' |
  /** guild is using the [old permissions configuration behavior](#DOCS_CHANGE_LOG/upcoming-application-command-permission-changes) */
  'APPLICATION_COMMAND_PERMISSIONS_V2' |
  /** guild has set up auto moderation rules */
  'AUTO_MODERATION' |
  /** guild has access to set a guild banner image */
  'BANNER' |
  /** guild can enable welcome screen, Membership Screening, stage channels and discovery, and receives community updates */
  'COMMUNITY' |
  /** guild has enabled monetization */
  'CREATOR_MONETIZABLE_PROVISIONAL' |
  /** guild has enabled the role subscription promo page */
  'CREATOR_STORE_PAGE' |
  /** guild has been set as a support server on the App Directory */
  'DEVELOPER_SUPPORT_SERVER' |
  /** guild is able to be discovered in the directory */
  'DISCOVERABLE' |
  /** guild is able to be featured in the directory */
  'FEATURABLE' |
  /** guild has paused invites, preventing new users from joining */
  'INVITES_DISABLED' |
  /** guild has access to set an invite splash background */
  'INVITE_SPLASH' |
  /** guild has enabled [Membership Screening](#DOCS_RESOURCES_GUILD/membership-screening-object) */
  'MEMBER_VERIFICATION_GATE_ENABLED' |
  /** guild has increased custom sticker slots */
  'MORE_STICKERS' |
  /** guild has access to create announcement channels */
  'NEWS' |
  /** guild is partnered */
  'PARTNERED' |
  /** guild can be previewed before joining via Membership Screening or the directory */
  'PREVIEW_ENABLED' |
  /** guild has disabled alerts for join raids in the configured safety alerts channel */
  'RAID_ALERTS_DISABLED' |
  /** guild is able to set role icons */
  'ROLE_ICONS' |
  /** guild has role subscriptions that can be purchased */
  'ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE' |
  /** guild has enabled role subscriptions */
  'ROLE_SUBSCRIPTIONS_ENABLED' |
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

export type GuildWidget = {
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
  /** guild member flags represented as a bit set, defaults to `0` */
  flags: GuildMemberFlags;
  /** whether the user has not yet passed the guild's Membership Screening requirements */
  pending?: boolean;
  /** total permissions of the member in the channel, including overwrites, returned when in the interaction object */
  permissions?: string;
  /** when the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
  communication_disabled_until?: ISO8601timestamp | null;
};

// ========================================================================

export enum GuildMemberFlags {
  DID_REJOIN = 1 << 0,
  COMPLETED_ONBOARDING = 1 << 1,
  BYPASSES_VERIFICATION = 1 << 2,
  STARTED_ONBOARDING = 1 << 3
}

// ========================================================================

export type Integration = {
  /** integration id */
  id: Snowflake;
  /** integration name */
  name: string;
  /** integration type (twitch, youtube, discord, or guild_subscription) */
  type: string;
  /** is this integration enabled */
  enabled: boolean;
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
  account: IntegrationAccount;
  /** when this integration was last synced */
  synced_at?: ISO8601timestamp;
  /** how many subscribers this integration has */
  subscriber_count?: number;
  /** has this integration been revoked */
  revoked?: boolean;
  /** The bot/OAuth2 application for discord integrations */
  application?: Application;
  /** the scopes the application has been authorized for */
  scopes?: string[];
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

// ========================================================================

export type GuildOnboarding = {
  /** ID of the guild this onboarding is part of */
  guild_id: Snowflake;
  /** Prompts shown during onboarding and in customize community */
  prompts: OnboardingPrompt[];
  /** Channel IDs that members get opted into automatically */
  default_channel_ids: Snowflake[];
  /** Whether onboarding is enabled in the guild */
  enabled: boolean;
};

// ========================================================================

export type OnboardingPrompt = {
  /** ID of the prompt */
  id: Snowflake;
  /** Type of prompt */
  type: PromptType;
  /** Options available within the prompt */
  options: PromptOption[];
  /** Title of the prompt */
  title: string;
  /** Indicates whether users are limited to selecting one option for the prompt */
  single_select: boolean;
  /** Indicates whether the prompt is required before a user completes the onboarding flow */
  required: boolean;
  /** Indicates whether the prompt is present in the onboarding flow. If `false`, the prompt will only appear in the Channels & Roles tab */
  in_onboarding: boolean;
};

// ========================================================================

export type PromptOption = {
  /** ID of the prompt option */
  id: Snowflake;
  /** IDs for channels a member is added to when the option is selected */
  channel_ids: Snowflake[];
  /** IDs for roles assigned to a member when the option is selected */
  role_ids: Snowflake[];
  /** Emoji of the option */
  emoji: Emoji;
  /** Title of the option */
  title: string;
  /** Description of the option */
  description: string | null;
};

// ========================================================================

export type PromptType =
  /** MULTIPLE_CHOICE */
  0 |
  /** DROPDOWN */
  1;
