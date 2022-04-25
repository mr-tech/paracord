import type {
  Snowflake, User, ISO8601timestamp, Role, GuildMember, Emoji, UnavailableGuild, Application, Channel, ThreadMember, Button,
} from '.';

export type GatewayPayload = {
  /** opcode for the payload */
  op: number;
  /** event data */
  d: string | number | boolean | null; // any JSON value;
  /** sequence number, used for resuming sessions and heartbeats */
  s: number | null; // *
  /** the event name for this payload */
  t: string | null; // *
};

// ========================================================================

export type GatewayURLQueryStringParam = {
  /** Gateway Version to use */
  v: number; // see [Gateway versions](#DOCS_TOPICS_GATEWAY/gateways-gateway-versions)
  /** The encoding of received gateway packets */
  encoding: string; // `json` or `etf`
  /** The (optional) compression of gateway packets */
  compress?: string; // `zlib-stream`
};

// ========================================================================

export type Identify = {
  /** authentication token */
  token: string;
  /** connection properties */
  properties: IdentifyConnectionProperties;
  /** whether this connection supports compression of packets */
  compress?: boolean; // false
  /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  large_threshold?: number; // 50
  /** used for Guild Sharding */
  shard?: [number, number]; // (shard_id, num_shards);
  /** presence structure for initial presence information */
  presence?: Presence;
  /** the Gateway Intents you wish to receive */
  intents: number;
};

// ========================================================================

export type IdentifyConnectionProperties = {
  /** your operating system */
  $os: string;
  /** your library name */
  $browser: string;
  /** your library name */
  $device: string;
};

// ========================================================================

export type Resume = {
  /** session token */
  token: string;
  /** session id */
  session_id: string;
  /** last sequence number received */
  seq: number;
};

// ========================================================================

export type GuildRequestMember = {
  /** id of the guild to get members for */
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
  /** id of the guild */
  guild_id: Snowflake;
  /** id of the voice channel client wants to join (null if disconnecting) */
  channel_id: Snowflake | null;
  /** is the client muted */
  self_mute: boolean;
  /** is the client deafened */
  self_deaf: boolean;
};

// ========================================================================

export type GatewayPresenceUpdate = {
  /** unix time (in milliseconds) of when the client went idle, or null if the client is not idle */
  since: number | null;
  /** the user's activities */
  activities: Activity[];
  /** the user's new status */
  status: StatusType;
  /** whether or not the client is afk */
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
  /** the interval (in milliseconds) the client should heartbeat with */
  heartbeat_interval: number;
};

// ========================================================================

export type ReadyEventField = {
  /** gateway version */
  v: number;
  /** information about the user including email */
  user: User;
  /** the guilds the user is in */
  guilds: UnavailableGuild[];
  /** used for resuming connections */
  session_id: string;
  /** the shard information associated with this session, if sent when identifying */
  shard?: [number, number]; // (shard_id, num_shards);
  /** contains `id` and `flags` */
  application: Partial<Application>;
};

// ========================================================================

export type ThreadListSyncEventField = {
  /** the id of the guild */
  guild_id: Snowflake;
  /** the parent channel ids whose threads are being synced.If omitted, then threads were synced for the entire guild.This array may contain channel_ids that have no active threads as well, so you know to clear that data. */
  channel_ids?: Snowflake[];
  /** all active threads in the given channels that the current user can access */
  threads: Channel[];
  /** all thread member objects from the synced threads for the current user, indicating which threads the current user has been added to */
  members: ThreadMember[];
};

// ========================================================================

export type ThreadMemberUpdateEventExtraField = {
  /** the id of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type ThreadMembersUpdateEventField = {
  /** the id of the thread */
  id: Snowflake;
  /** the id of the guild */
  guild_id: Snowflake;
  /** the approximate number of members in the thread, capped at 50 */
  member_count: number;
  /** the users who were added to the thread */
  added_members?: ThreadMember[];
  /** the id of the users who were removed from the thread */
  removed_member_ids?: Snowflake[];
};

// ========================================================================

export type ChannelPinsUpdateEventField = {
  /** the id of the guild */
  guild_id?: Snowflake;
  /** the id of the channel */
  channel_id: Snowflake;
  /** the time at which the most recent pinned message was pinned */
  last_pin_timestamp?: ISO8601timestamp | null;
};

// ========================================================================

export type GuildBanAddEventField = {
  /** id of the guild */
  guild_id: Snowflake;
  /** the banned user */
  user: User;
};

// ========================================================================

export type GuildBanRemoveEventField = {
  /** id of the guild */
  guild_id: Snowflake;
  /** the unbanned user */
  user: User;
};

// ========================================================================

export type GuildEmojisUpdateEventField = {
  /** id of the guild */
  guild_id: Snowflake;
  /** array of emojis */
  emojis: [];
};

// ========================================================================

export type GuildStickersUpdateEventField = {
  /** id of the guild */
  guild_id: Snowflake;
  /** array of stickers */
  stickers: [];
};

// ========================================================================

export type GuildIntegrationsUpdateEventField = {
  /** id of the guild whose integrations were updated */
  guild_id: Snowflake;
};

// ========================================================================

export type GuildMemberAddExtraField = {
  /** id of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type GuildMemberRemoveEventField = {
  /** the id of the guild */
  guild_id: Snowflake;
  /** the user who was removed */
  user: User;
};

// ========================================================================

export type GuildMemberUpdateEventField = {
  /** the id of the guild */
  guild_id: Snowflake;
  /** user role ids */
  roles: Snowflake[];
  /** the user */
  user: User;
  /** nickname of the user in the guild */
  nick?: string | null;
  /** the member's guild avatar hash */
  avatar: string | null;
  /** when the user joined the guild */
  joined_at: ISO8601timestamp | null;
  /** when the user starting boosting the guild */
  premium_since?: ISO8601timestamp | null;
  /** whether the user is deafened in voice channels */
  deaf?: boolean;
  /** whether the user is muted in voice channels */
  mute?: boolean;
  /** whether the user has not yet passed the guild's Membership Screening requirements */
  pending?: boolean;
  /** when the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
  communication_disabled_until?: ISO8601timestamp | null;
};

// ========================================================================

export type GuildMembersChunkEventField = {
  /** the id of the guild */
  guild_id: Snowflake;
  /** set of guild members */
  members: GuildMember[];
  /** the chunk index in the expected chunks for this response (0 <= chunk\_index < chunk\_count) */
  chunk_index: number;
  /** the total number of expected chunks for this response */
  chunk_count: number;
  /** if passing an invalid id to `REQUEST_GUILD_MEMBERS`, it will be returned here */
  not_found?: [];
  /** if passing true to `REQUEST_GUILD_MEMBERS`, presences of the returned members will be here */
  presences?: Presence[];
  /** the nonce used in the Guild Members Request */
  nonce?: string;
};

// ========================================================================

export type GuildRoleCreateEventField = {
  /** the id of the guild */
  guild_id: Snowflake;
  /** the role created */
  role: Role;
};

// ========================================================================

export type GuildRoleUpdateEventField = {
  /** the id of the guild */
  guild_id: Snowflake;
  /** the role updated */
  role: Role;
};

// ========================================================================

export type GuildRoleDeleteEventField = {
  /** id of the guild */
  guild_id: Snowflake;
  /** id of the role */
  role_id: Snowflake;
};

// ========================================================================

export type GuildScheduledEventUserAddEventField = {
  /** id of the guild scheduled event */
  guild_scheduled_event_id: Snowflake;
  /** id of the user */
  user_id: Snowflake;
  /** id of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type GuildScheduledEventUserRemoveEventField = {
  /** id of the guild scheduled event */
  guild_scheduled_event_id: Snowflake;
  /** id of the user */
  user_id: Snowflake;
  /** id of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type IntegrationCreateEventAdditionalField = {
  /** id of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type IntegrationUpdateEventAdditionalField = {
  /** id of the guild */
  guild_id: Snowflake;
};

// ========================================================================

export type IntegrationDeleteEventField = {
  /** integration id */
  id: Snowflake;
  /** id of the guild */
  guild_id: Snowflake;
  /** id of the bot/OAuth2 application for this discord integration */
  application_id?: Snowflake;
};

// ========================================================================

export type InviteCreateEventField = {
  /** the channel the invite is for */
  channel_id: Snowflake;
  /** the unique invite code */
  code: string;
  /** the time at which the invite was created */
  created_at: ISO8601timestamp;
  /** the guild of the invite */
  guild_id?: Snowflake;
  /** the user that created the invite */
  inviter?: User;
  /** how long the invite is valid for (in seconds) */
  max_age: number;
  /** the maximum number of times the invite can be used */
  max_uses: number;
  /** the type of target for this voice channel invite */
  target_type?: number;
  /** the user whose stream to display for this voice channel stream invite */
  target_user?: User;
  /** the embedded application to open for this voice channel embedded application invite */
  target_application?: Partial<Application>;
  /** whether or not the invite is temporary (invited users will be kicked on disconnect unless they're assigned a role) */
  temporary: boolean;
  /** how many times the invite has been used (always will be 0) */
  uses: number;
};

// ========================================================================

export type InviteDeleteEventField = {
  /** the channel of the invite */
  channel_id: Snowflake;
  /** the guild of the invite */
  guild_id?: Snowflake;
  /** the unique invite code */
  code: string;
};

// ========================================================================

export type MessageDeleteEventField = {
  /** the id of the message */
  id: Snowflake;
  /** the id of the channel */
  channel_id: Snowflake;
  /** the id of the guild */
  guild_id?: Snowflake;
};

// ========================================================================

export type MessageDeleteBulkEventField = {
  /** the ids of the messages */
  ids: Snowflake[];
  /** the id of the channel */
  channel_id: Snowflake;
  /** the id of the guild */
  guild_id?: Snowflake;
};

// ========================================================================

export type MessageReactionAddEventField = {
  /** the id of the user */
  user_id: Snowflake;
  /** the id of the channel */
  channel_id: Snowflake;
  /** the id of the message */
  message_id: Snowflake;
  /** the id of the guild */
  guild_id?: Snowflake;
  /** the member who reacted if this happened in a guild */
  member?: GuildMember;
  /** the emoji used to react - example */
  emoji: Partial<Emoji>;
};

// ========================================================================

export type MessageReactionRemoveEventField = {
  /** the id of the user */
  user_id: Snowflake;
  /** the id of the channel */
  channel_id: Snowflake;
  /** the id of the message */
  message_id: Snowflake;
  /** the id of the guild */
  guild_id?: Snowflake;
  /** the emoji used to react - example */
  emoji: Partial<Emoji>;
};

// ========================================================================

export type MessageReactionRemoveAllEventField = {
  /** the id of the channel */
  channel_id: Snowflake;
  /** the id of the message */
  message_id: Snowflake;
  /** the id of the guild */
  guild_id?: Snowflake;
};

// ========================================================================

export type MessageReactionRemoveEmojiEventField = {
  /** the id of the channel */
  channel_id: Snowflake;
  /** the id of the guild */
  guild_id?: Snowflake;
  /** the id of the message */
  message_id: Snowflake;
  /** the emoji that was removed */
  emoji: Partial<Emoji>;
};

// ========================================================================

export type Presence = {
  /** the user presence is being updated for */
  user: User;
  /** id of the guild */
  guild_id: Snowflake;
  /** either "idle", "dnd", "online", or "offline" */
  status: StatusType;
  /** user's current activities */
  activities: Activity[];
  /** user's platform-dependent status */
  client_status: ClientStatus;
};

// ========================================================================

export type ClientStatus = {
  /** the user's status set for an active desktop (Windows, Linux, Mac) application session */
  desktop?: string;
  /** the user's status set for an active mobile (iOS, Android) application session */
  mobile?: string;
  /** the user's status set for an active web (browser, bot account) application session */
  web?: string;
};

// ========================================================================

export type Activity = {
  /** the activity's name */
  name: string;
  /** activity type */
  type: ActivityType;
  /** stream url, is validated when type is 1 */
  url?: string | null;
  /** unix timestamp (in milliseconds) of when the activity was added to the user's session */
  created_at: number;
  /** unix timestamps for start and/or end of the game */
  timestamps?: ActivityTimestamp;
  /** application id for the game */
  application_id?: Snowflake;
  /** what the player is currently doing */
  details?: string | null;
  /** the user's current party status */
  state?: string | null;
  /** the emoji used for a custom status */
  emoji?: ActivityEmoji | null;
  /** information for the current party of the player */
  party?: ActivityParty;
  /** images for the presence and their hover texts */
  assets?: ActivityAsset;
  /** secrets for Rich Presence joining and spectating */
  secrets?: ActivitySecret;
  /** whether or not the activity is an instanced game session */
  instance?: boolean;
  /** activity flags `OR`d together, describes what the payload includes */
  flags?: ActivityFlags;
  /** the custom buttons shown in the Rich Presence (max 2) */
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
  /** unix time (in milliseconds) of when the activity started */
  start?: number;
  /** unix time (in milliseconds) of when the activity ends */
  end?: number;
};

// ========================================================================

export type ActivityEmoji = {
  /** the name of the emoji */
  name: string;
  /** the id of the emoji */
  id?: Snowflake;
  /** whether this emoji is animated */
  animated?: boolean;
};

// ========================================================================

export type ActivityParty = {
  /** the id of the party */
  id?: string;
  /** used to show the party's current and maximum size */
  size?: [number, number]; // ((currentSize, maxSize));
};

// ========================================================================

export type ActivityAsset = {
  /** see Activity Asset Image */
  large_image?: string;
  /** text displayed when hovering over the large image of the activity */
  large_text?: string;
  /** see Activity Asset Image */
  small_image?: string;
  /** text displayed when hovering over the small image of the activity */
  small_text?: string;
};

// ========================================================================

export type ActivitySecret = {
  /** the secret for joining a party */
  join?: string;
  /** the secret for spectating a game */
  spectate?: string;
  /** the secret for a specific instanced match */
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
  /** the text shown on the button (1-32 characters) */
  label: string;
  /** the url opened when clicking the button (1-512 characters) */
  url: string;
};

// ========================================================================

export type TypingStartEventField = {
  /** id of the channel */
  channel_id: Snowflake;
  /** id of the guild */
  guild_id?: Snowflake;
  /** id of the user */
  user_id: Snowflake;
  /** unix time (in seconds) of when the user started typing */
  timestamp: number;
  /** the member who started typing if this happened in a guild */
  member?: GuildMember;
};

// ========================================================================

export type VoiceServerUpdateEventField = {
  /** voice connection token */
  token: string;
  /** the guild this voice server update is for */
  guild_id: Snowflake;
  /** the voice server host */
  endpoint: string | null;
};

// ========================================================================

export type WebhooksUpdateEventField = {
  /** id of the guild */
  guild_id: Snowflake;
  /** id of the channel */
  channel_id: Snowflake;
};
