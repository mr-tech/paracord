import type {
  Snowflake, User, Guild, Channel,
} from '.';

export type Webhook = {
  /** the id of the webhook */
  id: Snowflake;
  /** the type of the webhook */
  type: WebhookType;
  /** the guild id this webhook is for, if any */
  guild_id?: Snowflake | null;
  /** the channel id this webhook is for, if any */
  channel_id: Snowflake | null;
  /** the user this webhook was created by (not returned when getting a webhook with its token) */
  user?: User;
  /** the default name of the webhook */
  name: string | null;
  /** the default user avatar hash of the webhook */
  avatar: string | null;
  /** the secure token of the webhook (returned for Incoming Webhooks) */
  token?: string;
  /** the bot/OAuth2 application that created this webhook */
  application_id: Snowflake | null;
  /** the guild of the channel that this webhook is following (returned for Channel Follower Webhooks) */
  source_guild?: Partial<Guild>;
  /** the channel that this webhook is following (returned for Channel Follower Webhooks) */
  source_channel?: Partial<Channel>;
  /** the url used for executing the webhook (returned by the webhooks OAuth2 flow) */
  url?: string;
};

// ========================================================================

export type WebhookType =
  /** Incoming */
  1 |
  /** Channel Follower */
  2 |
  /** Application */
  3;
