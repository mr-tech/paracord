/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  User, Integration, Snowflake, Channel, Webhook, GuildScheduledEvent, AutoModerationRule,
} from '.';

export type AuditLog = {
  /** List of audit log entries, sorted from most to least recent */
  audit_log_entries: AuditLogEntry[];
  /** List of auto moderation rules referenced in the audit log */
  auto_moderation_rules: AutoModerationRule[];
  /** List of guild scheduled events referenced in the audit log */
  guild_scheduled_events: GuildScheduledEvent[];
  /** List of partial integration objects */
  integrations: Partial<Integration>[];
  /** List of threads referenced in the audit log\* */
  threads: Channel[];
  /** List of users referenced in the audit log */
  users: User[];
  /** List of webhooks referenced in the audit log */
  webhooks: Webhook[];
};

// ========================================================================

export type AuditLogEntry = {
  /** ID of the affected entity (webhook, user, role, etc.) */
  target_id: string | null;
  /** Changes made to the target_id */
  changes?: AuditLogChange[];
  /** User or app that made the changes */
  user_id: Snowflake | null;
  /** ID of the entry */
  id: Snowflake;
  /** Type of action that occurred */
  action_type: AuditLogEventType;
  /** Additional info for certain event types */
  options?: OptionalAuditEntryInfo;
  /** Reason for the change (1-512 characters) */
  reason?: string;
};

// ========================================================================

export type AuditLogEventType =
  /** GUILD_UPDATE */
  1 |
  /** CHANNEL_CREATE */
  10 |
  /** CHANNEL_UPDATE */
  11 |
  /** CHANNEL_DELETE */
  12 |
  /** CHANNEL_OVERWRITE_CREATE */
  13 |
  /** CHANNEL_OVERWRITE_UPDATE */
  14 |
  /** CHANNEL_OVERWRITE_DELETE */
  15 |
  /** MEMBER_KICK */
  20 |
  /** MEMBER_PRUNE */
  21 |
  /** MEMBER_BAN_ADD */
  22 |
  /** MEMBER_BAN_REMOVE */
  23 |
  /** MEMBER_UPDATE */
  24 |
  /** MEMBER_ROLE_UPDATE */
  25 |
  /** MEMBER_MOVE */
  26 |
  /** MEMBER_DISCONNECT */
  27 |
  /** BOT_ADD */
  28 |
  /** ROLE_CREATE */
  30 |
  /** ROLE_UPDATE */
  31 |
  /** ROLE_DELETE */
  32 |
  /** INVITE_CREATE */
  40 |
  /** INVITE_UPDATE */
  41 |
  /** INVITE_DELETE */
  42 |
  /** WEBHOOK_CREATE */
  50 |
  /** WEBHOOK_UPDATE */
  51 |
  /** WEBHOOK_DELETE */
  52 |
  /** EMOJI_CREATE */
  60 |
  /** EMOJI_UPDATE */
  61 |
  /** EMOJI_DELETE */
  62 |
  /** MESSAGE_DELETE */
  72 |
  /** MESSAGE_BULK_DELETE */
  73 |
  /** MESSAGE_PIN */
  74 |
  /** MESSAGE_UNPIN */
  75 |
  /** INTEGRATION_CREATE */
  80 |
  /** INTEGRATION_UPDATE */
  81 |
  /** INTEGRATION_DELETE */
  82 |
  /** STAGE_INSTANCE_CREATE */
  83 |
  /** STAGE_INSTANCE_UPDATE */
  84 |
  /** STAGE_INSTANCE_DELETE */
  85 |
  /** STICKER_CREATE */
  90 |
  /** STICKER_UPDATE */
  91 |
  /** STICKER_DELETE */
  92 |
  /** GUILD_SCHEDULED_EVENT_CREATE */
  100 |
  /** GUILD_SCHEDULED_EVENT_UPDATE */
  101 |
  /** GUILD_SCHEDULED_EVENT_DELETE */
  102 |
  /** THREAD_CREATE */
  110 |
  /** THREAD_UPDATE */
  111 |
  /** THREAD_DELETE */
  112 |
  /** APPLICATION_COMMAND_PERMISSION_UPDATE */
  121 |
  /** AUTO_MODERATION_RULE_CREATE */
  140 |
  /** AUTO_MODERATION_RULE_UPDATE */
  141 |
  /** AUTO_MODERATION_RULE_DELETE */
  142 |
  /** AUTO_MODERATION_BLOCK_MESSAGE */
  143;

// ========================================================================

export type OptionalAuditEntryInfo = {
  /** ID of the app whose permissions were targeted */
  application_id: Snowflake; // APPLICATION_COMMAND_PERMISSION_UPDATE
  /** Channel in which the entities were targeted */
  channel_id: Snowflake; // MEMBER_MOVE & MESSAGE_PIN & MESSAGE_UNPIN & MESSAGE_DELETE & STAGE_INSTANCE_CREATE & STAGE_INSTANCE_UPDATE & STAGE_INSTANCE_DELETE
  /** Number of entities that were targeted */
  count: string; // MESSAGE_DELETE & MESSAGE_BULK_DELETE & MEMBER_DISCONNECT & MEMBER_MOVE
  /** Number of days after which inactive members were kicked */
  delete_member_days: string; // MEMBER_PRUNE
  /** ID of the overwritten entity */
  id: Snowflake; // CHANNEL_OVERWRITE_CREATE & CHANNEL_OVERWRITE_UPDATE & CHANNEL_OVERWRITE_DELETE
  /** Number of members removed by the prune */
  members_removed: string; // MEMBER_PRUNE
  /** ID of the message that was targeted */
  message_id: Snowflake; // MESSAGE_PIN & MESSAGE_UNPIN
  /** Name of the role if type is `"0"` (not present if type is `"1"`) */
  role_name: string; // CHANNEL_OVERWRITE_CREATE & CHANNEL_OVERWRITE_UPDATE & CHANNEL_OVERWRITE_DELETE
  /** Type of overwritten entity - role (`"0"`) or member (`"1"`) */
  type: string; // CHANNEL_OVERWRITE_CREATE & CHANNEL_OVERWRITE_UPDATE & CHANNEL_OVERWRITE_DELETE
};

// ========================================================================

export type AuditLogChange = {
  /** New value of the key */
  new_value?: unknown;
  /** Old value of the key */
  old_value?: unknown;
  /** Name of the changed entity, with a few exceptions */
  key: string;
};
