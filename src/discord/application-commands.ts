import type { Snowflake, ChannelType, AvailableLocale } from '.';

export type ApplicationCommand = {
  /** Unique ID of command */
  id: Snowflake; // all
  /** Type of command, defaults to `1` */
  type?: ApplicationCommandType; // all
  /** ID of the parent application */
  application_id: Snowflake; // all
  /** guild id of the command, if not global */
  guild_id?: Snowflake; // all
  /** Name of command), 1-32 characters */
  name: string; // all
  /** Localization dictionary for `name` field. Values follow the same restrictions as `name` */
  name_localizations?: AvailableLocale | null; // all
  /** Description for `CHAT_INPUT` commands, 1-100 characters. Empty string for `USER` and `MESSAGE` commands */
  description: string; // all
  /** Localization dictionary for `description` field. Values follow the same restrictions as `description` */
  description_localizations?: AvailableLocale | null; // all
  /** Parameters for the command, max of 25 */
  options?: ApplicationCommandOption[]; // CHAT_INPUT
  /** Set of permissions represented as a bit set */
  default_member_permissions?: string | null; // all
  /** Indicates whether the command is available in DMs with the app, only for globally-scoped commands. By default, commands are visible. */
  dm_permission?: boolean | null; // all
  /** Not recommended for use as field will soon be deprecated. Indicates whether the command is enabled by default when the app is added to a guild, defaults to `true` */
  default_permission?: boolean | null; // all
  /** Autoincrementing version identifier updated during substantial record changes */
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
  /** Type of option */
  type: ApplicationCommandOptionType;
  /** 1-32 character name */
  name: string;
  /** Localization dictionary for the `name` field. Values follow the same restrictions as `name` */
  name_localizations?: AvailableLocale | null;
  /** 1-100 character description */
  description: string;
  /** Localization dictionary for the `description` field. Values follow the same restrictions as `description` */
  description_localizations?: AvailableLocale | null;
  /** If the parameter is required or optional--default `false` */
  required?: boolean;
  /** Choices for `STRING`, `INTEGER`, and `NUMBER` types for the user to pick from, max 25 */
  choices?: ApplicationCommandOptionChoice[];
  /** If the option is a subcommand or subcommand group type, these nested options will be the parameters */
  options?: ApplicationCommandOption[];
  /** If the option is a channel type, the channels shown will be restricted to these types */
  channel_types?: ChannelType[];
  /** If the option is an `INTEGER` or `NUMBER` type, the minimum value permitted */
  min_value?: number;
  /** If the option is an `INTEGER` or `NUMBER` type, the maximum value permitted */
  max_value?: number;
  /** For option type `STRING`, the minimum allowed length (minimum of `0`, maximum of `6000`) */
  min_length?: number;
  /** For option type `STRING`, the maximum allowed length (minimum of `1`, maximum of `6000`) */
  max_length?: number;
  /** If autocomplete interactions are enabled for this `STRING`, `INTEGER`, or `NUMBER` type option */
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
  name_localizations?: AvailableLocale | null;
  /** Value for the choice, up to 100 characters if string */
  value: string | number;
};

// ========================================================================

export type GuildApplicationCommandPermission = {
  /** ID of the command or the application ID */
  id: Snowflake;
  /** ID of the application the command belongs to */
  application_id: Snowflake;
  /** ID of the guild */
  guild_id: Snowflake;
  /** Permissions for the command in the guild, max of 100 */
  permissions: ApplicationCommandPermission[];
};

// ========================================================================

export type ApplicationCommandPermission = {
  /** ID of the role, user, or channel. It can also be a permission constant */
  id: Snowflake;
  /** role (`1`), user (`2`), or channel (`3`) */
  type: ApplicationCommandPermissionType;
  /** `true` to allow, `false`, to disallow */
  permission: boolean;
};

// ========================================================================

export type ApplicationCommandPermissionType =
  /** ROLE */
  1 |
  /** USER */
  2 |
  /** CHANNEL */
  3;
