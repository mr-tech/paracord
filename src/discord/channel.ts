import type {
  Application, Emoji, GuildMember, ISO8601timestamp, MessageComponent, MessageInteraction, Role, Snowflake, Sticker, StickerItem, User,
} from '.';

export type Channel = {
  /** the id of this channel */
  id: Snowflake;
  /** the type of channel */
  type: ChannelType;
  /** the id of the guild (may be missing for some channel objects received over gateway guild dispatches) */
  guild_id?: Snowflake;
  /** sorting position of the channel */
  position?: number;
  /** explicit permission overwrites for members and roles */
  permission_overwrites?: Overwrite[];
  /** the name of the channel (1-100 characters) */
  name?: string | null;
  /** the channel topic (0-4096 characters for `GUILD_FORUM` channels, 0-1024 characters for all others) */
  topic?: string | null;
  /** whether the channel is nsfw */
  nsfw?: boolean;
  /** the id of the last message sent in this channel (or thread for `GUILD_FORUM` channels) (may not point to an existing or valid message or thread) */
  last_message_id?: Snowflake | null;
  /** the bitrate (in bits) of the voice channel */
  bitrate?: number;
  /** the user limit of the voice channel */
  user_limit?: number;
  /** amount of seconds a user has to wait before sending another message (0-21600); bots, as well as users with the permission `manage_messages` or `manage_channel`, are unaffected */
  rate_limit_per_user?: number;
  /** the recipients of the DM */
  recipients?: User[];
  /** icon hash of the group DM */
  icon?: string | null;
  /** id of the creator of the group DM or thread */
  owner_id?: Snowflake;
  /** application id of the group DM creator if it is bot-created */
  application_id?: Snowflake;
  /** for group DM channels: whether the channel is managed by an application via the `gdm.join` OAuth2 scope */
  managed?: boolean;
  /** for guild channels: id of the parent category for a channel (each parent category can contain up to 50 channels), for threads: id of the text channel this thread was created */
  parent_id?: Snowflake | null;
  /** when the last pinned message was pinned. This may be `null` in events such as `GUILD_CREATE` when a message is not pinned. */
  last_pin_timestamp?: ISO8601timestamp | null;
  /** voice region id for the voice channel, automatic when set to null */
  rtc_region?: string | null;
  /** the camera video quality mode of the voice channel, 1 when not present */
  video_quality_mode?: number;
  /** number of messages (not including the initial message or deleted messages) in a thread. */
  message_count?: number;
  /** an approximate count of users in a thread, stops counting at 50 */
  member_count?: number;
  /** thread-specific fields not needed by other channels */
  thread_metadata?: ThreadMetadata;
  /** thread member object for the current user, if they have joined the thread, only included on certain API endpoints */
  member?: ThreadMember;
  /** default duration, copied onto newly created threads, in minutes, threads will stop showing in the channel list after the specified period of inactivity, can be set to: 60, 1440, 4320, 10080 */
  default_auto_archive_duration?: number;
  /** computed permissions for the invoking user in the channel, including overwrites, only included when part of the `resolved` data received on a slash command interaction */
  permissions?: string;
  /** channel flags combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) */
  flags?: number;
  /** number of messages ever sent in a thread, it's similar to `message_count` on message creation, but will not decrement the number when a message is deleted */
  total_message_sent?: number;
  /** the set of tags that can be used in a `GUILD_FORUM` channel */
  available_tags?: ForumTag[];
  /** the IDs of the set of tags that have been applied to a thread in a `GUILD_FORUM` channel */
  applied_tags?: Snowflake[];
  /** the emoji to show in the add reaction button on a thread in a `GUILD_FORUM` channel */
  default_reaction_emoji?: DefaultReaction | null;
  /** the initial `rate_limit_per_user` to set on newly created threads in a channel. this field is copied to the thread at creation time and does not live update. */
  default_thread_rate_limit_per_user?: number;
  /** the default sort order type used to order posts in `GUILD_FORUM` channels. Defaults to `null`, which indicates a preferred sort order hasn't been set by a channel admin */
  default_sort_order?: number | null;
  /** the default forum layout view used to display posts in `GUILD_FORUM` channels. Defaults to `0`, which indicates a layout view has not been set by a channel admin */
  default_forum_layout?: number;
};

// ========================================================================

export type ChannelType =
  /** GUILD_TEXT */
  0 |
  /** DM */
  1 |
  /** GUILD_VOICE */
  2 |
  /** GROUP_DM */
  3 |
  /** GUILD_CATEGORY */
  4 |
  /** ANNOUNCEMENT */
  5 |
  /** ANNOUNCEMENT_THREAD */
  10 |
  /** PUBLIC_THREAD */
  11 |
  /** PRIVATE_THREAD */
  12 |
  /** GUILD_STAGE_VOICE */
  13 |
  /** GUILD_DIRECTORY */
  14 |
  /** GUILD_FORUM */
  15;

// ========================================================================

export type VideoQualityMode = [
  /** AUTO */
  1 |
  /** FULL */
  2
];

// ========================================================================

export enum ChannelFlags {
  PINNED = 1 << 1,
  REQUIRE_TAG = 1 << 4
}

// ========================================================================

export type SortOrderType =
  /** LATEST_ACTIVITY */
  0 |
  /** CREATION_DATE */
  1;

// ========================================================================

export enum ForumLayoutTypes {
  NOT_SET = 0,
  LIST_VIEW = 1,
  GALLERY_VIEW = 2
}

// ========================================================================

export type Message = {
  /** id of the message */
  id: Snowflake;
  /** id of the channel the message was sent in */
  channel_id: Snowflake;
  /** the author of this message (not guaranteed to be a valid user, see below) */
  author: User;
  /** contents of the message */
  content: string;
  /** when this message was sent */
  timestamp: ISO8601timestamp;
  /** when this message was edited (or null if never) */
  edited_timestamp: ISO8601timestamp | null;
  /** whether this was a TTS message */
  tts: boolean;
  /** whether this message mentions everyone */
  mention_everyone: boolean;
  /** users specifically mentioned in the message */
  mentions: User[];
  /** roles specifically mentioned in this message */
  mention_roles: Role[];
  /** channels specifically mentioned in this message */
  mention_channels?: ChannelMention[];
  /** any attached files */
  attachments: Attachment[];
  /** any embedded content */
  embeds: Embed[];
  /** reactions to the message */
  reactions?: Reaction[];
  /** used for validating a message was sent */
  nonce?: number | string;
  /** whether this message is pinned */
  pinned: boolean;
  /** if the message is generated by a webhook, this is the webhook's id */
  webhook_id?: Snowflake;
  /** type of message */
  type: MessageType;
  /** sent with Rich Presence-related chat embeds */
  activity?: MessageActivity;
  /** sent with Rich Presence-related chat embeds */
  application?: Partial<Application>;
  /** if the message is an Interaction or application-owned webhook, this is the id of the application */
  application_id?: Snowflake;
  /** data showing the source of a crosspost, channel follow add, pin, or reply message */
  message_reference?: MessageReference;
  /** message flags combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) */
  flags?: MessageFlags;
  /** the message associated with the message_reference */
  referenced_message?: Message | null;
  /** sent if the message is a response to an Interaction */
  interaction?: MessageInteraction;
  /** the thread that was started from this message, includes thread member object */
  thread?: Channel;
  /** sent if the message contains components like buttons, action rows, or other interactive components */
  components?: MessageComponent[];
  /** sent if the message contains stickers */
  sticker_items?: StickerItem[];
  /** Deprecated the stickers sent with the message */
  stickers?: Sticker[];
  /** A generally increasing integer (there may be gaps or duplicates) that represents the approximate position of the message in a thread, it can be used to estimate the relative position of the message in a thread in company with `total_message_sent` on parent thread */
  position?: number;
  /** data of the role subscription purchase or renewal that prompted this ROLE_SUBSCRIPTION_PURCHASE message */
  role_subscription_data?: RoleSubscriptionData;
};

// ========================================================================

export type MessageType =
  /** DEFAULT */
  0 |
  /** RECIPIENT_ADD */
  1 |
  /** RECIPIENT_REMOVE */
  2 |
  /** CALL */
  3 |
  /** CHANNEL_NAME_CHANGE */
  4 |
  /** CHANNEL_ICON_CHANGE */
  5 |
  /** CHANNEL_PINNED_MESSAGE */
  6 |
  /** USER_JOIN */
  7 |
  /** GUILD_BOOST */
  8 |
  /** GUILD_BOOST_TIER_1 */
  9 |
  /** GUILD_BOOST_TIER_2 */
  10 |
  /** GUILD_BOOST_TIER_3 */
  11 |
  /** CHANNEL_FOLLOW_ADD */
  12 |
  /** GUILD_DISCOVERY_DISQUALIFIED */
  14 |
  /** GUILD_DISCOVERY_REQUALIFIED */
  15 |
  /** GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING */
  16 |
  /** GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING */
  17 |
  /** THREAD_CREATED */
  18 |
  /** REPLY */
  19 |
  /** APPLICATION_COMMAND */
  20 |
  /** THREAD_STARTER_MESSAGE */
  21 |
  /** GUILD_INVITE_REMINDER */
  22 |
  /** CONTEXT_MENU_COMMAND */
  23 |
  /** AUTO_MODERATION_ACTION */
  24 |
  /** INTERACTION_PREMIUM_UPSELL */
  26 |
  /** STAGE_START */
  27 |
  /** STAGE_END */
  28 |
  /** STAGE_SPEAKER */
  29 |
  /** STAGE_TOPIC */
  31 |
  /** GUILD_APPLICATION_PREMIUM_SUBSCRIPTION */
  32;

// ========================================================================

export type MessageActivity = {
  /** type of message activity */
  type: MessageActivityType;
  /** party_id from a Rich Presence event */
  party_id?: string;
};

// ========================================================================

export type MessageActivityType =
  /** JOIN */
  1 |
  /** SPECTATE */
  2 |
  /** LISTEN */
  3 |
  /** JOIN_REQUEST */
  5;

// ========================================================================

export enum MessageFlags {
  CROSSPOSTED = 1 << 0,
  IS_CROSSPOST = 1 << 1,
  SUPPRESS_EMBEDS = 1 << 2,
  SOURCE_MESSAGE_DELETED = 1 << 3,
  URGENT = 1 << 4,
  HAS_THREAD = 1 << 5,
  EPHEMERAL = 1 << 6,
  LOADING = 1 << 7,
  FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 1 << 8,
  SUPPRESS_NOTIFICATIONS = 1 << 12,
  IS_VOICE_MESSAGE = 1 << 13
}

// ========================================================================

export type MessageReference = {
  /** id of the originating message */
  message_id?: Snowflake;
  /** id of the originating message's channel */
  channel_id?: Snowflake;
  /** id of the originating message's guild */
  guild_id?: Snowflake;
  /** when sending, whether to error if the referenced message doesn't exist instead of sending as a normal (non-reply) message, default true */
  fail_if_not_exists?: boolean;
};

// ========================================================================

export type FollowedChannel = {
  /** source channel id */
  channel_id: Snowflake;
  /** created target webhook id */
  webhook_id: Snowflake;
};

// ========================================================================

export type Reaction = {
  /** times this emoji has been used to react */
  count: number;
  /** whether the current user reacted using this emoji */
  me: boolean;
  /** emoji information */
  emoji: Partial<Emoji>;
};

// ========================================================================

export type Overwrite = {
  /** role or user id */
  id: Snowflake;
  /** either 0 (role) or 1 (member) */
  type: 0 | 1;
  /** permission bit set */
  allow: string;
  /** permission bit set */
  deny: string;
};

// ========================================================================

export type ThreadMetadata = {
  /** whether the thread is archived */
  archived: boolean;
  /** the thread will stop showing in the channel list after `auto_archive_duration` minutes of inactivity, can be set to: 60, 1440, 4320, 10080 */
  auto_archive_duration: number;
  /** timestamp when the thread's archive status was last changed, used for calculating recent activity */
  archive_timestamp: ISO8601timestamp;
  /** whether the thread is locked; when a thread is locked, only users with MANAGE_THREADS can unarchive it */
  locked: boolean;
  /** whether non-moderators can add other non-moderators to a thread; only available on private threads */
  invitable?: boolean;
  /** timestamp when the thread was created; only populated for threads created after 2022-01-09 */
  create_timestamp?: ISO8601timestamp | null;
};

// ========================================================================

export type ThreadMember = {
  /** ID of the thread */
  id?: Snowflake;
  /** ID of the user */
  user_id?: Snowflake;
  /** Time the user last joined the thread */
  join_timestamp: ISO8601timestamp;
  /** Any user-thread settings, currently only used for notifications */
  flags: number;
  /** Additional information about the user */
  member?: GuildMember;
};

// ========================================================================

export type DefaultReaction = {
  /** the id of a guild's custom emoji */
  emoji_id: Snowflake | null;
  /** the unicode character of the emoji */
  emoji_name: string | null;
};

// ========================================================================

export type ForumTag = {
  /** the id of the tag */
  id: Snowflake;
  /** the name of the tag (0-20 characters) */
  name: string;
  /** whether this tag can only be added to or removed from threads by a member with the `MANAGE_THREADS` permission */
  moderated: boolean;
  /** the id of a guild's custom emoji */
  emoji_id: Snowflake | null;
  /** the unicode character of the emoji */
  emoji_name: string | null;
};

// ========================================================================

export type Embed = {
  /** title of embed */
  title?: string;
  /** type of embed (always "rich" for webhook embeds) */
  type?: string;
  /** description of embed */
  description?: string;
  /** url of embed */
  url?: string;
  /** timestamp of embed content */
  timestamp?: ISO8601timestamp;
  /** color code of the embed */
  color?: number;
  /** footer information */
  footer?: EmbedFooter;
  /** image information */
  image?: EmbedImage;
  /** thumbnail information */
  thumbnail?: EmbedThumbnail;
  /** video information */
  video?: EmbedVideo;
  /** provider information */
  provider?: EmbedProvider;
  /** author information */
  author?: EmbedAuthor;
  /** fields information */
  fields?: EmbedField[];
};

// ========================================================================

export type EmbedThumbnail = {
  /** source url of thumbnail (only supports http(s) and attachments) */
  url: string;
  /** a proxied url of the thumbnail */
  proxy_url?: string;
  /** height of thumbnail */
  height?: number;
  /** width of thumbnail */
  width?: number;
};

// ========================================================================

export type EmbedVideo = {
  /** source url of video */
  url?: string;
  /** a proxied url of the video */
  proxy_url?: string;
  /** height of video */
  height?: number;
  /** width of video */
  width?: number;
};

// ========================================================================

export type EmbedImage = {
  /** source url of image (only supports http(s) and attachments) */
  url: string;
  /** a proxied url of the image */
  proxy_url?: string;
  /** height of image */
  height?: number;
  /** width of image */
  width?: number;
};

// ========================================================================

export type EmbedProvider = {
  /** name of provider */
  name?: string;
  /** url of provider */
  url?: string;
};

// ========================================================================

export type EmbedAuthor = {
  /** name of author */
  name: string;
  /** url of author (only supports http(s)) */
  url?: string;
  /** url of author icon (only supports http(s) and attachments) */
  icon_url?: string;
  /** a proxied url of author icon */
  proxy_icon_url?: string;
};

// ========================================================================

export type EmbedFooter = {
  /** footer text */
  text: string;
  /** url of footer icon (only supports http(s) and attachments) */
  icon_url?: string;
  /** a proxied url of footer icon */
  proxy_icon_url?: string;
};

// ========================================================================

export type EmbedField = {
  /** name of the field */
  name: string;
  /** value of the field */
  value: string;
  /** whether or not this field should display inline */
  inline?: boolean;
};

// ========================================================================

export type Attachment = {
  /** attachment id */
  id: Snowflake;
  /** name of file attached */
  filename: string;
  /** description for the file (max 1024 characters) */
  description?: string;
  /** the attachment's media type */
  content_type?: string;
  /** size of file in bytes */
  size: number;
  /** source url of file */
  url: string;
  /** a proxied url of file */
  proxy_url: string;
  /** height of file (if image) */
  height?: number | null;
  /** width of file (if image) */
  width?: number | null;
  /** whether this attachment is ephemeral */
  ephemeral?: boolean;
  /** the duration of the audio file (currently for voice messages) */
  duration_secs?: number;
  /** base64 encoded bytearray representing a sampled waveform (currently for voice messages) */
  waveform?: string;
};

// ========================================================================

export type ChannelMention = {
  /** id of the channel */
  id: Snowflake;
  /** id of the guild containing the channel */
  guild_id: Snowflake;
  /** the type of channel */
  type: ChannelType;
  /** the name of the channel */
  name: string;
};

// ========================================================================

export type AllowedMentionType =
  /** Role Mentions */
  'roles' |
  /** User Mentions */
  'users' |
  /** Everyone Mentions */
  'everyone';

// ========================================================================

export type AllowedMention = {
  /** An array of allowed mention types to parse from the content. */
  parse: AllowedMentionType[];
  /** Array of role_ids to mention (Max size of 100) */
  roles: Snowflake[];
  /** Array of user_ids to mention (Max size of 100) */
  users: Snowflake[];
  /** For replies, whether to mention the author of the message being replied to (default false) */
  replied_user: boolean;
};

// ========================================================================

export type RoleSubscriptionData = {
  /** the id of the sku and listing that the user is subscribed to */
  role_subscription_listing_id: Snowflake;
  /** the name of the tier that the user is subscribed to */
  tier_name: string;
  /** the cumulative number of months that the user has been subscribed for */
  total_months_subscribed: number;
  /** whether this notification is for a renewal rather than a new purchase */
  is_renewal: boolean;
};
