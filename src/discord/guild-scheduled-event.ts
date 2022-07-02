import type {
  Snowflake, ISO8601timestamp, User, GuildMember,
} from '.';

export type GuildScheduledEvent = {
  /** the id of the scheduled event */
  id: Snowflake;
  /** the guild id which the scheduled event belongs to */
  guild_id: Snowflake;
  /** the channel id in which the scheduled event will be hosted, or `null` if guild scheduled event scheduled entity type is `EXTERNAL` */
  channel_id: Snowflake | null;
  /** the id of the user that created the scheduled event * */
  creator_id?: Snowflake | null;
  /** the name of the scheduled event (1-100 characters) */
  name: string;
  /** the description of the scheduled event (1-1000 characters) */
  description?: string | null;
  /** the time the scheduled event will start */
  scheduled_start_time: ISO8601timestamp;
  /** the time the scheduled event will end, required if entity_type is `EXTERNAL` */
  scheduled_end_time: ISO8601timestamp | null;
  /** the privacy level of the scheduled event */
  privacy_level: GuildScheduledEventPrivacyLevel;
  /** the status of the scheduled event */
  status: GuildScheduledEventStatusType;
  /** the type of the scheduled event */
  entity_type: GuildScheduledEventEntityType;
  /** the id of an entity associated with a guild scheduled event */
  entity_id: Snowflake | null;
  /** additional metadata for the guild scheduled event */
  entity_metadata: GuildScheduledEventEntityMetadata | null;
  /** the user that created the scheduled event */
  creator?: GuildScheduledEventUser;
  /** the number of users subscribed to the scheduled event */
  user_count?: number;
  /** the cover image hash of the scheduled event */
  image?: string | null;
};

// ========================================================================

export type GuildScheduledEventPrivacyLevel =
  /** GUILD_ONLY */
  2;

// ========================================================================

export type GuildScheduledEventEntityType =
  /** STAGE_INSTANCE */
  1 |
  /** VOICE */
  2 |
  /** EXTERNAL */
  3;

// ========================================================================

export type GuildScheduledEventStatusType =
  /** SCHEDULED */
  1 |
  /** ACTIVE */
  2 |
  /** COMPLETED \* */
  3 |
  /** CANCELED\* */
  4;

// ========================================================================

export type GuildScheduledEventEntityMetadata = {
  /** location of the event (1-100 characters) */
  location?: string;
};

// ========================================================================

export type GuildScheduledEventUser = {
  /** the scheduled event id which the user subscribed to */
  guild_scheduled_event_id: Snowflake;
  /** user which subscribed to an event */
  user: User;
  /** guild member data for this user for the guild which this event belongs to, if any */
  member?: GuildMember;
};

// ========================================================================

export type QueryStringParam = {
  /** include number of users subscribed to each event */
  with_user_count?: boolean;
};
