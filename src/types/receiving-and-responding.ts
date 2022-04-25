import type {
  Snowflake, GuildMember, User, Role, Attachment, AllowedMention, Channel, Embed, MessageComponent,
  SelectOption, ApplicationCommandInteractionDataOption, Message, ApplicationCommandOptionChoice, ComponentType, ApplicationCommandOptionType, MessageFlags,
} from '.';

export type Interaction = {
  /** id of the interaction */
  id: Snowflake;
  /** id of the application this interaction is for */
  application_id: Snowflake;
  /** the type of interaction */
  type: InteractionType;
  /** the command data payload */
  data?: InteractionData;
  /** the guild it was sent from */
  guild_id?: Snowflake;
  /** the channel it was sent from */
  channel_id?: Snowflake;
  /** guild member data for the invoking user, including permissions */
  member?: GuildMember;
  /** user object for the invoking user, if invoked in a DM */
  user?: User;
  /** a continuation token for responding to the interaction */
  token: string;
  /** read-only property, always `1` */
  version: number;
  /** for components, the message they were attached to */
  message?: Message;
  /** the selected language of the invoking user */
  locale?: string;
  /** the guild's preferred locale, if invoked in a guild */
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

export type InteractionData = {
  /** the `ID` of the invoked command */
  id: Snowflake; // Application Command
  /** the `name` of the invoked command */
  name: string; // Application Command
  /** the `type` of the invoked command */
  type: ApplicationCommandOptionType; // Application Command
  /** converted users + roles + channels + attachments */
  resolved?: ResolvedData; // Application Command
  /** the params + values from the user */
  options?: ApplicationCommandInteractionDataOption[]; // Application Command
  /** the id of the guild the command is registered to */
  guild_id?: Snowflake; // Application Command
  /** the `custom_id` of the component */
  custom_id?: string; // Component, Modal Submit
  /** the type of the component */
  component_type?: ComponentType; // Component
  /** the values the user selected */
  values?: SelectOption[]; // Component (Select)
  /** id the of user or message targeted by a user or [message](#DOCS_INTERACTIONS_APPLICATION_COMMANDS/message-commands) command */
  target_id?: Snowflake; // [User Command](#DOCS_INTERACTIONS_APPLICATION_COMMANDS/user-commands), [Message Command](#DOCS_INTERACTIONS_APPLICATION_COMMANDS/message-commands)
  /** the values submitted by the user */
  components?: MessageComponent[]; // Modal Submit
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

export type MessageInteraction = {
  /** id of the interaction */
  id: Snowflake;
  /** the type of interaction */
  type: InteractionType;
  /** the name of the application command */
  name: string;
  /** the user who invoked the interaction */
  user: User;
  /** the member who invoked the interaction in the guild */
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
  /** DEFERRED_UPDATE_MESSAGE\* */
  6 |
  /** UPDATE_MESSAGE\* */
  7 |
  /** APPLICATION_COMMAND_AUTOCOMPLETE_RESULT */
  8 |
  /** MODAL\*\* */
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
  /** a developer-defined identifier for the component, max 100 characters */
  custom_id: string;
  /** the title of the popup modal, max 45 characters */
  title: string;
  /** between 1 and 5 (inclusive) components that make up the modal */
  components: MessageComponent[];
};
