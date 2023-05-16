import type {
  AllowedMention, ApplicationCommandOptionChoice, ApplicationCommandOptionType, Attachment, Channel, Component, ComponentType, Embed, GuildMember, Message, MessageComponent, MessageFlags, Role, Snowflake, User,
} from '.';

export type Interaction = {
  /** ID of the interaction */
  id: Snowflake;
  /** ID of the application this interaction is for */
  application_id: Snowflake;
  /** Type of interaction */
  type: InteractionType;
  /** Interaction data payload */
  data?: ApplicationCommandData | MessageComponentData | ModalSubmitData;
  /** Guild that the interaction was sent from */
  guild_id?: Snowflake;
  /** Channel that the interaction was sent from */
  channel?: Partial<Channel>;
  /** Channel that the interaction was sent from */
  channel_id?: Snowflake;
  /** Guild member data for the invoking user, including permissions */
  member?: GuildMember;
  /** User object for the invoking user, if invoked in a DM */
  user?: User;
  /** Continuation token for responding to the interaction */
  token: string;
  /** Read-only property, always `1` */
  version: number;
  /** For components, the message they were attached to */
  message?: Message;
  /** Bitwise set of permissions the app or bot has within the channel the interaction was sent from */
  app_permissions?: string;
  /** Selected language of the invoking user */
  locale?: string;
  /** Guild's preferred locale, if invoked in a guild */
  guild_locale?: string;
};

// ========================================================================

export type InteractionType =
  /** PING */
  1 |
  /** APPLICATION_COMMAND */
  2 |
  /** MESSAGE_COMPONENT */
  3 |
  /** APPLICATION_COMMAND_AUTOCOMPLETE */
  4 |
  /** MODAL_SUBMIT */
  5;

// ========================================================================

export type ApplicationCommandData = {
  /** the `ID` of the invoked command */
  id: Snowflake;
  /** the `name` of the invoked command */
  name: string;
  /** the `type` of the invoked command */
  type: ApplicationCommandOptionType;
  /** converted users + roles + channels + attachments */
  resolved?: ResolvedData;
  /** the params + values from the user */
  options?: ApplicationCommandInteractionDataOption[];
  /** the id of the guild the command is registered to */
  guild_id?: Snowflake;
  /** id of the user or message targeted by a user or [message](#DOCS_INTERACTIONS_APPLICATION_COMMANDS/message-commands) command */
  target_id?: Snowflake;
};

// ========================================================================

export type MessageComponentData = {
  /** the `custom_id` of the component */
  custom_id: string;
  /** the type of the component */
  component_type: ComponentType;
  /** values the user selected in a select menu component */
  values?: string[];
};

// ========================================================================

export type ModalSubmitData = {
  /** the `custom_id` of the modal */
  custom_id: string;
  /** the values submitted by the user */
  components: MessageComponent[];
};

// ========================================================================

export type ResolvedData = {
  /** the ids and User objects */
  users?: Record<Snowflake, User>;
  /** the ids and partial Member objects */
  members?: Record<Snowflake, Partial<GuildMember>>;
  /** the ids and Role objects */
  roles?: Record<Snowflake, Role>;
  /** the ids and partial Channel objects */
  channels?: Record<Snowflake, Partial<Channel>>;
  /** the ids and partial Message objects */
  messages?: Record<Snowflake, Partial<Message>>;
  /** the ids and attachment objects */
  attachments?: Record<Snowflake, Attachment>;
};

// ========================================================================

export type ApplicationCommandInteractionDataOption = {
  /** Name of the parameter */
  name: string;
  /** Value of application command option type */
  type: ApplicationCommandOptionType;
  /** Value of the option resulting from user input */
  value?: string | number | boolean;
  /** Present if this option is a group or subcommand */
  options?: ApplicationCommandInteractionDataOption[];
  /** `true` if this option is the currently focused option for autocomplete */
  focused?: boolean;
};

// ========================================================================

export type MessageInteraction = {
  /** ID of the interaction */
  id: Snowflake;
  /** Type of interaction */
  type: InteractionType;
  /** Name of the application command, including subcommands and subcommand groups */
  name: string;
  /** User who invoked the interaction */
  user: User;
  /** Member who invoked the interaction in the guild */
  member?: Partial<GuildMember>;
};

// ========================================================================

export type InteractionResponse = {
  /** the type of response */
  type: InteractionCallbackType;
  /** an optional response message */
  data?: MessageCallback | AutocompleteCallback | ModalCallback;
};

// ========================================================================

export type InteractionCallbackType =
  /** PONG */
  1 |
  /** CHANNEL_MESSAGE_WITH_SOURCE */
  4 |
  /** DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE */
  5 |
  /** DEFERRED_UPDATE_MESSAGE */
  6 |
  /** UPDATE_MESSAGE */
  7 |
  /** APPLICATION_COMMAND_AUTOCOMPLETE_RESULT */
  8 |
  /** MODAL */
  9;

// ========================================================================

export type MessageCallback = {
  /** is the response TTS */
  tts?: boolean;
  /** message content */
  content?: string;
  /** supports up to 10 embeds */
  embeds?: Embed[];
  /** allowed mentions object */
  allowed_mentions?: AllowedMention;
  /** message flags combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) (only `SUPPRESS_EMBEDS` and `EPHEMERAL` can be set) */
  flags?: MessageFlags;
  /** message components */
  components?: MessageComponent[];
  /** attachment objects with filename and description */
  attachments?: Partial<Attachment>[];
};

// ========================================================================

export type AutocompleteCallback = {
  /** autocomplete choices (max of 25 choices) */
  choices: ApplicationCommandOptionChoice[];
};

// ========================================================================

export type ModalCallback = {
  /** a developer-defined identifier for the modal, max 100 characters */
  custom_id: string;
  /** the title of the popup modal, max 45 characters */
  title: string;
  /** between 1 and 5 (inclusive) components that make up the modal */
  components: Component[];
};
