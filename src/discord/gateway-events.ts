import {
  Application, AutoModerationAction, Button, Channel, Emoji, GuildMember,
  GuildScheduledEvent, ISO8601timestamp, Role, Snowflake,
  StageInstance, ThreadMember, TriggerType, UnavailableGuild, User, VoiceState,
} from '.';

export type GatewayPayload = {
  /** Gateway opcode, which indicates the payload type */
  op: number;
  /** Event data */
  d: unknown;
  /** Sequence number of event used for resuming sessions and [heartbeating](#DOCS_TOPICS_GATEWAY/sending-heartbeats) */
  s: number | null;
  /** Event name */
  t: string | null;
};

// ========================================================================

export type Identify = {
  /** Authentication token */
  token: string;
  /** Connection properties */
  properties: IdentifyConnectionProperties;
  /** Whether this connection supports compression of packets */
  compress?: boolean; // false
  /** Value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  large_threshold?: number; // 50
  /** Used for Guild Sharding */
  shard?: [number, number]; // (shard_id, num_shards);
  /** Presence structure for initial presence information */
  presence?: Presence;
  /** Gateway Intents you wish to receive */
  intents: number;
};

// ========================================================================

export type IdentifyConnectionProperties = {
  /** Your operating system */
  os: string;
  /** Your library name */
  browser: string;
  /** Your library name */
  device: string;
};

// ========================================================================

export type Resume = {
  /** Session token */
  token: string;
  /** Session ID */
  session_id: string;
  /** Last sequence number received */
  seq: number;
};

// ========================================================================

export type GuildRequestMember = {
  /** ID of the guild to get members for */
  guild_id: Snowflake; // true
  /** string that username starts with, or an empty string to return all members */
  query?: string; // one of query or user_ids
  /** maximum number of members to send matching the `query`; a limit of `0` can be used with an empty string `query` to return all members */
  limit: number; // true when specifying query
  /** used to specify if we want the presences of the matched members */
  presences?: boolean; // false
  /** used to specify which users you wish to fetch */
  user_ids?: Snowflake | Snowflake[]; // one of query or user_ids
  /** nonce to identify the Guild Members Chunk response */
  nonce?: string; // false
};

// ========================================================================

export type GatewayVoiceStateUpdate = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** ID of the voice channel client wants to join (null if disconnecting) */
  channel_id: Snowflake | null;
  /** Whether the client is muted */
  self_mute: boolean;
  /** Whether the client deafened */
  self_deaf: boolean;
};

// ========================================================================

export type GatewayPresenceUpdate = {
  /** Unix time (in milliseconds) of when the client went idle, or null if the client is not idle */
  since: number | null;
  /** User's activities */
  activities: Activity[];
  /** User's new status */
  status: StatusType;
  /** Whether or not the client is afk */
  afk: boolean;
};

// ========================================================================

export type StatusType =
  /** Online */
  'online' |
  /** Do Not Disturb */
  'dnd' |
  /** AFK */
  'idle' |
  /** Invisible and shown as offline */
  'invisible' |
  /** Offline */
  'offline';

// ========================================================================

export type Hello = {
  /** Interval (in milliseconds) an app should heartbeat with */
  heartbeat_interval: number;
};

// ========================================================================

export type ReadyEventField = {
  /** API version */
  v: number;
  /** Information about the user including email */
  user: User;
  /** Guilds the user is in */
  guilds: UnavailableGuild[];
  /** Used for resuming connections */
  session_id: string;
  /** Gateway URL for resuming connections */
  resume_gateway_url: string;
  /** Shard information associated with this session, if sent when identifying */
  shard?: [number, number]; // (shard_id, num_shards);
  /** Contains `id` and `flags` */
  application: Partial<Application>;
};

// ========================================================================

export type AutoModerationActionExecutionEventField = {
  /** ID of the guild in which action was executed */
  guild_id: Snowflake;
  /** Action which was executed */
  action: AutoModerationAction;
  /** ID of the rule which action belongs to */
  rule_id: Snowflake;
  /** Trigger type of rule which was triggered */
  rule_trigger_type: TriggerType;
  /** ID of the user which generated the content which triggered the rule */
  user_id: Snowflake;
  /** ID of the channel in which user content was posted */
  channel_id?: Snowflake;
  /** ID of any user message which content belongs to */
  message_id?: Snowflake;
  /** ID of any system auto moderation messages posted as a result of this action */
  alert_system_message_id?: Snowflake;
  /** User-generated text content */
  content: string;
  /** Word or phrase configured in the rule that triggered the rule */
  matched_keyword: string | null;
  /** Substring in content that triggered the rule */
  matched_content: string | null;
};

// ========================================================================

export type ThreadListSyncEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** Parent channel IDs whose threads are being synced.If omitted, then threads were synced for the entire guild.This array may contain channel_ids that have no active threads as well, so you know to clear that data. */
  channel_ids?: Snowflake[];
  /** All active threads in the given channels that the current user can access */
  threads: Channel[];
  /** All thread member objects from the synced threads for the current user, indicating which threads the current user has been added to */
  members: ThreadMember[];
};

// ========================================================================

export type ThreadMemberUpdateEventExtraField = {
  /** ID of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type ThreadMembersUpdateEventField = {
  /** ID of the thread */
  id: Snowflake;
  /** ID of the guild */
  guild_id: Snowflake;
  /** Approximate number of members in the thread, capped at 50 */
  member_count: number;
  /** Users who were added to the thread */
  added_members?: ThreadMember[];
  /** ID of the users who were removed from the thread */
  removed_member_ids?: Snowflake[];
};

// ========================================================================

export type ChannelPinsUpdateEventField = {
  /** ID of the guild */
  guild_id?: Snowflake;
  /** ID of the channel */
  channel_id: Snowflake;
  /** Time at which the most recent pinned message was pinned */
  last_pin_timestamp?: ISO8601timestamp | null;
};

// ========================================================================

export type GuildCreateExtraField = {
  /** When this guild was joined at */
  joined_at: ISO8601timestamp;
  /** `true` if this is considered a large guild */
  large: boolean;
  /** `true` if this guild is unavailable due to an outage */
  unavailable?: boolean;
  /** Total number of members in this guild */
  member_count: number;
  /** States of members currently in voice channels; lacks the `guild_id` key */
  voice_states: Partial<VoiceState>[];
  /** Users in the guild */
  members: GuildMember[];
  /** Channels in the guild */
  channels: Channel[];
  /** All active threads in the guild that current user has permission to view */
  threads: Channel[];
  /** Presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  presences: Partial<Presence>[];
  /** Stage instances in the guild */
  stage_instances: StageInstance[];
  /** Scheduled events in the guild */
  guild_scheduled_events: GuildScheduledEvent[];
};

// ========================================================================

export type GuildBanAddEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** User who was banned */
  user: User;
};

// ========================================================================

export type GuildBanRemoveEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** User who was unbanned */
  user: User;
};

// ========================================================================

export type GuildEmojisUpdateEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** Array of emojis */
  emojis: [];
};

// ========================================================================

export type GuildStickersUpdateEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** Array of stickers */
  stickers: [];
};

// ========================================================================

export type GuildIntegrationsUpdateEventField = {
  /** ID of the guild whose integrations were updated */
  guild_id: Snowflake;
};

// ========================================================================

export type GuildMemberAddExtraField = {
  /** ID of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type GuildMemberRemoveEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** User who was removed */
  user: User;
};

// ========================================================================

export type GuildMemberUpdateEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** User role ids */
  roles: Snowflake[];
  /** User */
  user: User;
  /** Nickname of the user in the guild */
  nick?: string | null;
  /** Member's guild avatar hash */
  avatar: string | null;
  /** When the user joined the guild */
  joined_at: ISO8601timestamp | null;
  /** When the user starting boosting the guild */
  premium_since?: ISO8601timestamp | null;
  /** Whether the user is deafened in voice channels */
  deaf?: boolean;
  /** Whether the user is muted in voice channels */
  mute?: boolean;
  /** Whether the user has not yet passed the guild's Membership Screening requirements */
  pending?: boolean;
  /** When the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
  communication_disabled_until?: ISO8601timestamp | null;
};

// ========================================================================

export type GuildMembersChunkEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** Set of guild members */
  members: GuildMember[];
  /** Chunk index in the expected chunks for this response (0 <= chunk\_index < chunk\_count) */
  chunk_index: number;
  /** Total number of expected chunks for this response */
  chunk_count: number;
  /** When passing an invalid ID to `REQUEST_GUILD_MEMBERS`, it will be returned here */
  not_found?: [];
  /** When passing `true` to `REQUEST_GUILD_MEMBERS`, presences of the returned members will be here */
  presences?: Presence[];
  /** Nonce used in the Guild Members Request */
  nonce?: string;
};

// ========================================================================

export type GuildRoleCreateEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** Role that was created */
  role: Role;
};

// ========================================================================

export type GuildRoleUpdateEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** Role that was updated */
  role: Role;
};

// ========================================================================

export type GuildRoleDeleteEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** ID of the role */
  role_id: Snowflake;
};

// ========================================================================

export type GuildScheduledEventUserAddEventField = {
  /** ID of the guild scheduled event */
  guild_scheduled_event_id: Snowflake;
  /** ID of the user */
  user_id: Snowflake;
  /** ID of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type GuildScheduledEventUserRemoveEventField = {
  /** ID of the guild scheduled event */
  guild_scheduled_event_id: Snowflake;
  /** ID of the user */
  user_id: Snowflake;
  /** ID of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type IntegrationCreateEventAdditionalField = {
  /** ID of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type IntegrationUpdateEventAdditionalField = {
  /** ID of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type IntegrationDeleteEventField = {
  /** Integration ID */
  id: Snowflake;
  /** ID of the guild */
  guild_id: Snowflake;
  /** ID of the bot/OAuth2 application for this discord integration */
  application_id?: Snowflake;
};

// ========================================================================

export type InviteCreateEventField = {
  /** Channel the invite is for */
  channel_id: Snowflake;
  /** Unique invite code */
  code: string;
  /** Time at which the invite was created */
  created_at: ISO8601timestamp;
  /** Guild of the invite */
  guild_id?: Snowflake;
  /** User that created the invite */
  inviter?: User;
  /** How long the invite is valid for (in seconds) */
  max_age: number;
  /** Maximum number of times the invite can be used */
  max_uses: number;
  /** Type of target for this voice channel invite */
  target_type?: number;
  /** User whose stream to display for this voice channel stream invite */
  target_user?: User;
  /** Embedded application to open for this voice channel embedded application invite */
  target_application?: Partial<Application>;
  /** Whether or not the invite is temporary (invited users will be kicked on disconnect unless they're assigned a role) */
  temporary: boolean;
  /** How many times the invite has been used (always will be 0) */
  uses: number;
};

// ========================================================================

export type InviteDeleteEventField = {
  /** Channel of the invite */
  channel_id: Snowflake;
  /** Guild of the invite */
  guild_id?: Snowflake;
  /** Unique invite code */
  code: string;
};

// ========================================================================

export type MessageCreateExtraField = {
  /** ID of the guild the message was sent in - unless it is an ephemeral message */
  guild_id?: Snowflake;
  /** Member properties for this message's author. Missing for ephemeral messages and messages from webhooks */
  member?: Partial<GuildMember>;
  /** Users specifically mentioned in the message */
  mentions: User[];
};

// ========================================================================

export type MessageDeleteEventField = {
  /** ID of the message */
  id: Snowflake;
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
};

// ========================================================================

export type MessageDeleteBulkEventField = {
  /** IDs of the messages */
  ids: Snowflake[];
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
};

// ========================================================================

export type MessageReactionAddEventField = {
  /** ID of the user */
  user_id: Snowflake;
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the message */
  message_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
  /** Member who reacted if this happened in a guild */
  member?: GuildMember;
  /** Emoji used to react - example */
  emoji: Emoji;
};

// ========================================================================

export type MessageReactionRemoveEventField = {
  /** ID of the user */
  user_id: Snowflake;
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the message */
  message_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
  /** Emoji used to react - example */
  emoji: Emoji;
};

// ========================================================================

export type MessageReactionRemoveAllEventField = {
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the message */
  message_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
};

// ========================================================================

export type MessageReactionRemoveEmojiEventField = {
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
  /** ID of the message */
  message_id: Snowflake;
  /** the emoji that was removed */
  emoji: Partial<Emoji>;
};

// ========================================================================

export type Presence = {
  /** User whose presence is being updated */
  user: User;
  /** ID of the guild */
  guild_id: Snowflake;
  /** either "idle", "dnd", "online", or "offline" */
  status: StatusType;
  /** User's current activities */
  activities: Activity[];
  /** User's platform-dependent status */
  client_status: ClientStatus;
};

// ========================================================================

export type ClientStatus = {
  /** User's status set for an active desktop (Windows, Linux, Mac) application session */
  desktop?: string;
  /** User's status set for an active mobile (iOS, Android) application session */
  mobile?: string;
  /** User's status set for an active web (browser, bot account) application session */
  web?: string;
};

// ========================================================================

export type Activity = {
  /** Activity's name */
  name: string;
  /** activity type */
  type: ActivityType;
  /** Stream URL, is validated when type is 1 */
  url?: string | null;
  /** Unix timestamp (in milliseconds) of when the activity was added to the user's session */
  created_at: number;
  /** unix timestamps for start and/or end of the game */
  timestamps?: ActivityTimestamp;
  /** Application ID for the game */
  application_id?: Snowflake;
  /** What the player is currently doing */
  details?: string | null;
  /** User's current party status */
  state?: string | null;
  /** the emoji used for a custom status */
  emoji?: ActivityEmoji | null;
  /** information for the current party of the player */
  party?: ActivityParty;
  /** images for the presence and their hover texts */
  assets?: ActivityAsset;
  /** secrets for Rich Presence joining and spectating */
  secrets?: ActivitySecret;
  /** Whether or not the activity is an instanced game session */
  instance?: boolean;
  /** activity flags `OR`d together, describes what the payload includes */
  flags?: ActivityFlags;
  /** Custom buttons shown in the Rich Presence (max 2) */
  buttons?: Button[];
};

// ========================================================================

export type ActivityType =
  /** Game */
  0 |
  /** Streaming */
  1 |
  /** Listening */
  2 |
  /** Watching */
  3 |
  /** Custom */
  4 |
  /** Competing */
  5;

// ========================================================================

export type ActivityTimestamp = {
  /** Unix time (in milliseconds) of when the activity started */
  start?: number;
  /** Unix time (in milliseconds) of when the activity ends */
  end?: number;
};

// ========================================================================

export type ActivityEmoji = {
  /** Name of the emoji */
  name: string;
  /** ID of the emoji */
  id?: Snowflake;
  /** Whether the emoji is animated */
  animated?: boolean;
};

// ========================================================================

export type ActivityParty = {
  /** ID of the party */
  id?: string;
  /** Used to show the party's current and maximum size */
  size?: [number, number]; // ((currentSize, maxSize));
};

// ========================================================================

export type ActivityAsset = {
  /** See Activity Asset Image */
  large_image?: string;
  /** Text displayed when hovering over the large image of the activity */
  large_text?: string;
  /** See Activity Asset Image */
  small_image?: string;
  /** Text displayed when hovering over the small image of the activity */
  small_text?: string;
};

// ========================================================================

export type ActivitySecret = {
  /** Secret for joining a party */
  join?: string;
  /** Secret for spectating a game */
  spectate?: string;
  /** Secret for a specific instanced match */
  match?: string;
};

// ========================================================================

export enum ActivityFlags {
  INSTANCE = 1 << 0,
  JOIN = 1 << 1,
  SPECTATE = 1 << 2,
  JOIN_REQUEST = 1 << 3,
  SYNC = 1 << 4,
  PLAY = 1 << 5,
  PARTY_PRIVACY_FRIENDS = 1 << 6,
  PARTY_PRIVACY_VOICE_CHANNEL = 1 << 7,
  EMBEDDED = 1 << 8
}

// ========================================================================

export type ActivityButton = {
  /** Text shown on the button (1-32 characters) */
  label: string;
  /** URL opened when clicking the button (1-512 characters) */
  url: string;
};

// ========================================================================

export type TypingStartEventField = {
  /** ID of the channel */
  channel_id: Snowflake;
  /** ID of the guild */
  guild_id?: Snowflake;
  /** ID of the user */
  user_id: Snowflake;
  /** Unix time (in seconds) of when the user started typing */
  timestamp: number;
  /** Member who started typing if this happened in a guild */
  member?: GuildMember;
};

// ========================================================================

export type VoiceServerUpdateEventField = {
  /** Voice connection token */
  token: string;
  /** Guild this voice server update is for */
  guild_id: Snowflake;
  /** Voice server host */
  endpoint: string | null;
};

// ========================================================================

export type WebhooksUpdateEventField = {
  /** ID of the guild */
  guild_id: Snowflake;
  /** ID of the channel */
  channel_id: Snowflake;
};
