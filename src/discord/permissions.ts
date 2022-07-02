import type { Snowflake } from '.';

export type Role = {
  /** role id */
  id: Snowflake;
  /** role name */
  name: string;
  /** integer representation of hexadecimal color code */
  color: number;
  /** if this role is pinned in the user listing */
  hoist: boolean;
  /** role icon hash */
  icon?: string | null;
  /** role unicode emoji */
  unicode_emoji?: string | null;
  /** position of this role */
  position: number;
  /** permission bit set */
  permissions: string;
  /** whether this role is managed by an integration */
  managed: boolean;
  /** whether this role is mentionable */
  mentionable: boolean;
  /** the tags this role has */
  tags?: RoleTag;
};

// ========================================================================

export type RoleTag = {
  /** the id of the bot this role belongs to */
  bot_id?: Snowflake;
  /** the id of the integration this role belongs to */
  integration_id?: Snowflake;
  /** whether this is the guild's premium subscriber role */
  premium_subscriber?: null;
};
