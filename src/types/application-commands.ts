import type { Snowflake, ChannelType, AvailableLocale } from '.';

export type ApplicationCommand = {
  /** unique id of the command */
  id: Snowflake; // all
  /** the type of command, defaults `1` if not set */
  type?: ApplicationCommandType; // all
  /** unique id of the parent application */
  application_id: Snowflake; // all
  /** guild id of the command, if not global */
  guild_id?: Snowflake; // all
  /** 1-32 character name */
  name: string; // all
  /** Localization dictionary for the `name` field. Values follow the same restrictions as `name` */
  name_localizations?: AvailableLocale; // all
  /** 1-100 character description for `CHAT_INPUT` commands, empty string for `USER` and `MESSAGE` commands */
  description: string; // all
  /** Localization dictionary for the `description` field. Values follow the same restrictions as `description` */
  description_localizations?: AvailableLocale; // all
  /** the parameters for the command, max 25 */
  options?: ApplicationCommandOption[]; // CHAT_INPUT
  /** whether the command is enabled by default when the app is added to a guild (default `true`) */
  default_permission?: boolean; // all
  /** autoincrementing version identifier updated during substantial record changes */
  version: Snowflake; // all
};

// ========================================================================

export type ApplicationCommandType =
  /** CHAT_INPUT */
  1 |
  /** USER */
  2 |
  /** MESSAGE */
  3;

// ========================================================================

export type ApplicationCommandOption = {
  /** the type of option */
  type: ApplicationCommandOptionType;
  /** 1-32 character name */
  name: string;
  /** Localization dictionary for the `name` field. Values follow the same restrictions as `name` */
  name_localizations?: AvailableLocale;
  /** 1-100 character description */
  description: string;
  /** Localization dictionary for the `description` field. Values follow the same restrictions as `description` */
  description_localizations?: AvailableLocale;
  /** if the parameter is required or optional--default `false` */
  required?: boolean;
  /** choices for `STRING`, `INTEGER`, and `NUMBER` types for the user to pick from, max 25 */
  choices?: ApplicationCommandOptionChoice[];
  /** if the option is a subcommand or subcommand group type, these nested options will be the parameters */
  options?: ApplicationCommandOption[];
  /** if the option is a channel type, the channels shown will be restricted to these types */
  channel_types?: ChannelType[];
  /** if the option is an `INTEGER` or `NUMBER` type, the minimum value permitted */
  min_value?: number;
  /** if the option is an `INTEGER` or `NUMBER` type, the maximum value permitted */
  max_value?: number;
  /** if autocomplete interactions are enabled for this `STRING`, `INTEGER`, or `NUMBER` type option */
  autocomplete?: boolean;
};

// ========================================================================

export type ApplicationCommandOptionType =
  /** SUB_COMMAND */
  1 |
  /** SUB_COMMAND_GROUP */
  2 |
  /** STRING */
  3 |
  /** INTEGER */
  4 |
  /** BOOLEAN */
  5 |
  /** USER */
  6 |
  /** CHANNEL */
  7 |
  /** ROLE */
  8 |
  /** MENTIONABLE */
  9 |
  /** NUMBER */
  10 |
  /** ATTACHMENT */
  11;

// ========================================================================

export type ApplicationCommandOptionChoice = {
  /** 1-100 character choice name */
  name: string;
  /** Localization dictionary for the `name` field. Values follow the same restrictions as `name` */
  name_localizations?: AvailableLocale;
  /** value of the choice, up to 100 characters if string */
  value: string | number; // *
};

// ========================================================================

export type ApplicationCommandInteractionDataOption = {
  /** the name of the parameter */
  name: string;
  /** value of application command option type */
  type: ApplicationCommandOptionType;
  /** the value of the option resulting from user input */
  value?: string | number;
  /** present if this option is a group or subcommand */
  options?: ApplicationCommandInteractionDataOption[];
  /** true if this option is the currently focused option for autocomplete */
  focused?: boolean;
};

// ========================================================================

export type GuildApplicationCommandPermission = {
  /** the id of the command */
  id: Snowflake;
  /** the id of the application the command belongs to */
  application_id: Snowflake;
  /** the id of the guild */
  guild_id: Snowflake;
  /** the permissions for the command in the guild */
  permissions: ApplicationCommandPermission[];
};

// ========================================================================

export type ApplicationCommandPermission = {
  /** the id of the role or user */
  id: Snowflake;
  /** role or user */
  type: ApplicationCommandPermission;
  /** `true` to allow, `false`, to disallow */
  permission: boolean;
};

// ========================================================================

export type ApplicationCommandPermissionType =
  /** ROLE */
  1 |
  /** USER */
  2;
