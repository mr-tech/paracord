import { Snowflake } from '.';

export type AutoModerationRule = {
  /** the id of this rule */
  id: Snowflake;
  /** the id of the guild which this rule belongs to */
  guild_id: Snowflake;
  /** the rule name */
  name: string;
  /** the user which first created this rule */
  creator_id: Snowflake;
  /** the rule event type */
  event_type: number;
  /** the rule trigger type */
  trigger_type: number;
  /** the rule trigger metadata */
  trigger_metadata: object;
  /** the actions which will execute when the rule is triggered */
  actions: AutoModerationAction[];
  /** whether the rule is enabled */
  enabled: boolean;
  /** the role ids that should not be affected by the rule (Maximum of 20) */
  exempt_roles: Snowflake[];
  /** the channel ids that should not be affected by the rule (Maximum of 50) */
  exempt_channels: Snowflake[];
};

// ========================================================================

export type TriggerType =
  /** KEYWORD */
  1 |
  /** SPAM */
  3 |
  /** KEYWORD_PRESET */
  4 |
  /** MENTION_SPAM */
  5;

// ========================================================================

export type TriggerMetadata = {
  /** KEYWORD */
  keyword_filter: string[]; // substrings which will be searched for in content (Maximum of 1000)
  /** KEYWORD */
  regex_patterns: string[]; // regular expression patterns which will be matched against content (Maximum of 10)
  /** KEYWORD_PRESET */
  presets: KeywordPresetType[]; // the internally pre-defined wordsets which will be searched for in content
  /** KEYWORD, KEYWORD_PRESET */
  allow_list: string[]; // substrings which should not trigger the rule (Maximum of 100 or 1000)
  /** MENTION_SPAM */
  mention_total_limit: number; // total number of unique role and user mentions allowed per message (Maximum of 50)
  /** MENTION_SPAM */
  mention_raid_protection_enabled: boolean; // whether to automatically detect mention raids
};

// ========================================================================

export type KeywordPresetType =
  /** PROFANITY */
  1 |
  /** SEXUAL_CONTENT */
  2 |
  /** SLURS */
  3;

// ========================================================================

export type EventType =
  /** MESSAGE_SEND */
  1;

// ========================================================================

export type AutoModerationAction = {
  /** the type of action */
  type: AutoModerationActionType;
  /** additional metadata needed during execution for this specific action type */
  metadata?: AutoModerationActionMetadata;
};

// ========================================================================

export type AutoModerationActionType =
  /** BLOCK_MESSAGE */
  1 |
  /** SEND_ALERT_MESSAGE */
  2 |
  /** TIMEOUT */
  3;

// ========================================================================

export type AutoModerationActionMetadata = {
  /** SEND_ALERT_MESSAGE */
  channel_id: Snowflake; // channel to which user content should be logged
  /** TIMEOUT */
  duration_seconds: number; // timeout duration in seconds
  /** BLOCK_MESSAGE */
  custom_message?: string; // additional explanation that will be shown to members whenever their message is blocked
};
