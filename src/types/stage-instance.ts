import type { Snowflake } from '.';

export type StageInstance = {
  /** The id of this Stage instance */
  id: Snowflake;
  /** The guild id of the associated Stage channel */
  guild_id: Snowflake;
  /** The id of the associated Stage channel */
  channel_id: Snowflake;
  /** The topic of the Stage instance (1-120 characters) */
  topic: string;
  /** The privacy level of the Stage instance */
  privacy_level: number;
  /** Whether or not Stage Discovery is disabled (deprecated) */
  discoverable_disabled: boolean;
};
