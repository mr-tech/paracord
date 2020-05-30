import { GuildMember, Snowflake } from '.';

export type VoiceState = {
  /** the guild id this voice state is for */
  guildId?: Snowflake;
  /** the channel id this user is connected to */
  channelId: Snowflake | null;
  /** the user id this voice state is for */
  userId: Snowflake;
  /** the guild member this voice state is for */
  member: GuildMember;
  /** the session id for this voice state */
  sessionId: string;
  /** whether this user is deafened by the server */
  deaf: boolean;
  /** whether this user is muted by the server */
  mute: boolean;
  /** whether this user is locally deafened */
  selfDeaf: boolean;
  /** whether this user is locally muted */
  selfMute: boolean;
  /** whether this user is streaming using "Go Live" */
  selfStream?: boolean;
  /** whether this user is muted by the current user */
  suppress: boolean;
};

// ========================================================================

export type VoiceRegion = {
  /** unique ID for the region */
  id: string;
  /** name of the region */
  name: string;
  /** true if this is a vip-only server */
  vip: boolean;
  /** true for a single server that is closest to the current user's client */
  optimal: boolean;
  /** whether this is a deprecated voice region (avoid switching to these) */
  deprecated: boolean;
  /** whether this is a custom voice region (used for events/etc) */
  custom: boolean;
};
