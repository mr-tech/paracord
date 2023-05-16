import type { Snowflake } from '.';

export const PERMISSIONS = {
  CREATE_INSTANT_INVITE: BigInt(0x1),
  KICK_MEMBERS: BigInt(0x2),
  BAN_MEMBERS: BigInt(0x4),
  ADMINISTRATOR: BigInt(0x8),
  MANAGE_CHANNELS: BigInt(0x10),
  MANAGE_GUILD: BigInt(0x20),
  ADD_REACTIONS: BigInt(0x40),
  VIEW_AUDIT_LOG: BigInt(0x80),
  PRIORITY_SPEAKER: BigInt(0x100),
  STREAM: BigInt(0x200),
  VIEW_CHANNEL: BigInt(0x400),
  SEND_MESSAGES: BigInt(0x800),
  SEND_TTS_MESSAGES: BigInt(0x1000),
  MANAGE_MESSAGES: BigInt(0x2000),
  EMBED_LINKS: BigInt(0x4000),
  ATTACH_FILES: BigInt(0x8000),
  READ_MESSAGE_HISTORY: BigInt(0x10000),
  MENTION_EVERYONE: BigInt(0x20000),
  USE_EXTERNAL_EMOJIS: BigInt(0x40000),
  VIEW_GUILD_INSIGHTS: BigInt(0x80000),
  CONNECT: BigInt(0x100000),
  SPEAK: BigInt(0x200000),
  MUTE_MEMBERS: BigInt(0x400000),
  DEAFEN_MEMBERS: BigInt(0x800000),
  MOVE_MEMBERS: BigInt(0x1000000),
  USE_VAD: BigInt(0x2000000),
  CHANGE_NICKNAME: BigInt(0x4000000),
  MANAGE_NICKNAMES: BigInt(0x8000000),
  MANAGE_ROLES: BigInt(0x10000000),
  MANAGE_WEBHOOKS: BigInt(0x20000000),
  MANAGE_GUILD_EXPRESSIONS: BigInt(0x40000000),
  USE_APPLICATION_COMMANDS: BigInt(0x80000000),
  REQUEST_TO_SPEAK: BigInt(0x100000000),
  MANAGE_EVENTS: BigInt(0x200000000),
  MANAGE_THREADS: BigInt(0x400000000),
  CREATE_PUBLIC_THREADS: BigInt(0x800000000),
  CREATE_PRIVATE_THREADS: BigInt(0x1000000000),
  USE_EXTERNAL_STICKERS: BigInt(0x2000000000),
  SEND_MESSAGES_IN_THREADS: BigInt(0x4000000000),
  USE_EMBEDDED_ACTIVITIES: BigInt(0x8000000000),
  MODERATE_MEMBERS: BigInt(0x10000000000),
  VIEW_CREATOR_MONETIZATION_ANALYTICS: BigInt(0x20000000000),
  USE_SOUNDBOARD: BigInt(0x40000000000),
  SEND_VOICE_MESSAGES: BigInt(0x400000000000),
} as const;

// ========================================================================

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
  /** whether this is the guild's Booster role */
  premium_subscriber?: null;
  /** the id of this role's subscription sku and listing */
  subscription_listing_id?: Snowflake;
  /** whether this role is available for purchase */
  available_for_purchase?: null;
  /** whether this role is a guild's linked role */
  guild_connections?: null;
};
