import type {
  Guild, Channel, User, ISO8601timestamp, Application, GuildMember, GuildScheduledEvent,
} from '.';

export type Invite = {
  /** the invite code (unique ID) */
  code: string;
  /** the guild this invite is for */
  guild?: Partial<Guild>;
  /** the channel this invite is for */
  channel: Partial<Channel> | null;
  /** the user who created the invite */
  inviter?: User;
  /** the type of target for this voice channel invite */
  target_type?: number;
  /** the user whose stream to display for this voice channel stream invite */
  target_user?: User;
  /** the embedded application to open for this voice channel embedded application invite */
  target_application?: Partial<Application>;
  /** approximate count of online members, returned from the `GET /invites/<code>` endpoint when `with_counts` is `true` */
  approximate_presence_count?: number;
  /** approximate count of total members, returned from the `GET /invites/<code>` endpoint when `with_counts` is `true` */
  approximate_member_count?: number;
  /** the expiration date of this invite, returned from the `GET /invites/<code>` endpoint when `with_expiration` is `true` */
  expires_at?: ISO8601timestamp | null;
  /** stage instance data if there is a public Stage instance in the Stage channel this invite is for (deprecated) */
  stage_instance?: InviteStageInstance;
  /** guild scheduled event data, only included if `guild_scheduled_event_id` contains a valid guild scheduled event id */
  guild_scheduled_event?: GuildScheduledEvent;
};

// ========================================================================

export type InviteMetadata = {
  /** number of times this invite has been used */
  uses: number;
  /** max number of times this invite can be used */
  max_uses: number;
  /** duration (in seconds) after which the invite expires */
  max_age: number;
  /** whether this invite only grants temporary membership */
  temporary: boolean;
  /** when this invite was created */
  created_at: ISO8601timestamp;
};

// ========================================================================

export type InviteStageInstance = {
  /** the members speaking in the Stage */
  members: Partial<GuildMember>[];
  /** the number of users in the Stage */
  participant_count: number;
  /** the number of users speaking in the Stage */
  speaker_count: number;
  /** the topic of the Stage instance (1-120 characters) */
  topic: string;
};
