/// <reference types="node" />

import type { AxiosInstance } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ChannelCredentials } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import type { default as FormData_2 } from 'form-data';
import * as grpc from '@grpc/grpc-js';
import { Method } from 'axios';
import type { ServerCredentials } from '@grpc/grpc-js';
import ws from 'ws';

export declare type ActionRowComponent = {
    type: 1;
    components: Array<SubMessageComponent | TextInput>;
};

export declare type Activity = {
    /** Activity's name */
    name: string;
    /** activity type */
    type: ActivityType;
    /** Stream URL, is validated when type is 1 */
    url?: string | null;
    /** Unix timestamp (in milliseconds) of when the activity was added to the user's session */
    created_at: number;
    /** unix timestamps for start and/or end of the game */
    timestamps?: ActivityTimestamp;
    /** Application ID for the game */
    application_id?: Snowflake;
    /** What the player is currently doing */
    details?: string | null;
    /** User's current party status */
    state?: string | null;
    /** the emoji used for a custom status */
    emoji?: ActivityEmoji | null;
    /** information for the current party of the player */
    party?: ActivityParty;
    /** images for the presence and their hover texts */
    assets?: ActivityAsset;
    /** secrets for Rich Presence joining and spectating */
    secrets?: ActivitySecret;
    /** Whether or not the activity is an instanced game session */
    instance?: boolean;
    /** activity flags `OR`d together, describes what the payload includes */
    flags?: ActivityFlags;
    /** Custom buttons shown in the Rich Presence (max 2) */
    buttons?: Button[];
};

export declare type ActivityAsset = {
    /** See Activity Asset Image */
    large_image?: string;
    /** Text displayed when hovering over the large image of the activity */
    large_text?: string;
    /** See Activity Asset Image */
    small_image?: string;
    /** Text displayed when hovering over the small image of the activity */
    small_text?: string;
};

export declare type ActivityButton = {
    /** Text shown on the button (1-32 characters) */
    label: string;
    /** URL opened when clicking the button (1-512 characters) */
    url: string;
};

export declare type ActivityEmoji = {
    /** Name of the emoji */
    name: string;
    /** ID of the emoji */
    id?: Snowflake;
    /** Whether the emoji is animated */
    animated?: boolean;
};

export declare enum ActivityFlags {
    INSTANCE = 1,
    JOIN = 2,
    SPECTATE = 4,
    JOIN_REQUEST = 8,
    SYNC = 16,
    PLAY = 32,
    PARTY_PRIVACY_FRIENDS = 64,
    PARTY_PRIVACY_VOICE_CHANNEL = 128,
    EMBEDDED = 256
}

export declare type ActivityParty = {
    /** ID of the party */
    id?: string;
    /** Used to show the party's current and maximum size */
    size?: [number, number];
};

export declare type ActivitySecret = {
    /** Secret for joining a party */
    join?: string;
    /** Secret for spectating a game */
    spectate?: string;
    /** Secret for a specific instanced match */
    match?: string;
};

export declare type ActivityTimestamp = {
    /** Unix time (in milliseconds) of when the activity started */
    start?: number;
    /** Unix time (in milliseconds) of when the activity ends */
    end?: number;
};

export declare type ActivityType = 
/** Game */
0 | 
/** Streaming */
1 | 
/** Listening */
2 | 
/** Watching */
3 | 
/** Custom */
4 | 
/** Competing */
5;

export declare type AllowedMention = {
    /** An array of allowed mention types to parse from the content. */
    parse: AllowedMentionType[];
    /** Array of role_ids to mention (Max size of 100) */
    roles: Snowflake[];
    /** Array of user_ids to mention (Max size of 100) */
    users: Snowflake[];
    /** For replies, whether to mention the author of the message being replied to (default false) */
    replied_user: boolean;
};

export declare type AllowedMentionType = 
/** Role Mentions */
'roles' | 
/** User Mentions */
'users' | 
/** Everyone Mentions */
'everyone';

/** A client used to interact with Discord's REST API and navigate its rate limits. */
export declare class Api {
    #private;
    /** When using Rpc, the service through which to pass requests to the server. */
    rpcRequestService?: undefined | RequestService;
    /** Key:Value mapping this client's events to user's preferred emitted value. */
    events?: undefined | Record<string, string>;
    static isApiDebugEvent(event: unknown): event is ApiDebugEvent;
    private static allowQueue;
    /**
     * Throws errors and warnings if the parameters passed to the constructor aren't sufficient.
     * @param token Discord bot token.
     */
    private static validateParams;
    /** Creates an isolated axios instance for use by this REST handler. */
    private static createWrappedRequestMethod;
    /**
     * Takes the method and url "minor parameters" to create a key used in navigating rate limits. Condenses common paths.
     * @param method HTTP method of the request.
     * @param rateLimitMinorParameters Request method and parameters in the url following the major parameter.
     * @returns A key used internally to find related buckets.
     */
    static extractBucketHashKey(method: string, url: string): string[];
    /**
     * Creates a new Api client.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
    constructor(token: string, options?: ApiOptions);
    get hasRateLimitService(): boolean;
    get hasRequestService(): boolean;
    get queue(): RequestQueue;
    get maxExceeded(): boolean;
    end(): void;
    /**
     * Simple alias for logging events emitted by this client.
     * @param level Key of the logging level of this message.
     * @param message Content of the log
     * @param [data] Data pertinent to the event.
     */
    log(level: DebugLevel, code: 'GENERAL', message: string): void;
    log<T extends ApiDebugCodeName>(level: DebugLevel, code: T, message: string, data: ApiDebugData[T]): void;
    /**
     * Emits all events if `this.events` is undefined; otherwise will emit those defined as keys in `this.events` as the paired value.
     * @param type Type of event. (e.g. "DEBUG" or "CHANNEL_CREATE")
     * @param data Data to send with the event.
     */
    private emit;
    on: <T extends "RATE_LIMITED" | "ERROR" | "GENERAL" | "REQUEST_SENT" | "REQUEST_QUEUED" | "REQUEST_REQUEUED" | "RESPONSE_RECEIVED" | "SERVER_ERROR" = "RATE_LIMITED" | "ERROR" | "GENERAL" | "REQUEST_SENT" | "REQUEST_QUEUED" | "REQUEST_REQUEUED" | "RESPONSE_RECEIVED" | "SERVER_ERROR">(name: T, listener: (event: ApiDebugEvent<T>) => void) => void;
    /**
     * Adds the service that has a server make requests to Discord on behalf of the client.
     * @param serviceOptions
     * @returns `true` is connection was successful.
     */
    addRequestService: (serviceOptions?: ServiceOptions) => Promise<boolean>;
    /**
     * Adds the service that first checks with a server before making a request to Discord.
     * @param serviceOptions
     * @returns `true` is connection was successful.
     */
    addRateLimitService: (serviceOptions?: ServiceOptions) => Promise<boolean>;
    /**
     * @returns `true` is connection was successful.
     */
    private checkRpcServiceConnection;
    private recreateRpcService;
    private reattemptConnectInFuture;
    /**
     * Makes a request to Discord, handling any rate limits and returning when a non-429 response is received.
     * @param method HTTP method of the request.
     * @param url Discord endpoint url. (e.g. "/channels/abc123")
     * @param options Optional parameters for a Discord REST request.
     * @returns Response to the request made.
     */
    request: <T = any>(method: Method, url: string, options?: RequestOptions) => Promise<ApiResponse<T> | RemoteApiResponse<T>>;
    /**
     * Sends the request to the rpc server for handling.
     * @param request ApiRequest being made.
     */
    private handleRequestRemote;
    /**
     * Determines how the request will be made based on the client's options and makes it.
     * @param request ApiRequest being made,
     */
    sendRequest<T>(request: ApiRequest): Promise<ApiResponse<T>>;
    sendRequest<T>(request: ApiRequest, fromQueue: true): Promise<string | ApiResponse<T>>;
    /**
     * Gets authorization from the server to make the request.
     * @param request ApiRequest being made.
     */
    private authorizeRequestWithServer;
    /**
     * Updates the rate limit state and queues the request.
     * @param headers Response headers.
     * @param request Request being sent.
     */
    private handleRateLimitResponse;
    private handleServerErrorResponse;
    /**
     * Puts the Api Request onto the queue to be executed when the rate limit has reset.
     * @param request The Api Request to queue.
     * @returns Resolves as the response to the request.
     */
    private queueRequest;
    /**
     * Updates the local rate limit cache and sends an update to the server if there is one.
     * @param request The request made.
     * @param rateLimitHeaders Headers from the response.
     */
    private updateRateLimitCache;
    private updateRpcCache;
}

export declare const API_DEBUG_CODES: {
    readonly GENERAL: 1;
    readonly ERROR: 2;
    readonly REQUEST_SENT: 3;
    readonly REQUEST_QUEUED: 4;
    readonly REQUEST_REQUEUED: 5;
    readonly RESPONSE_RECEIVED: 6;
    readonly RATE_LIMITED: 7;
    readonly SERVER_ERROR: 8;
};

export declare const API_GLOBAL_RATE_LIMIT = 50;

export declare const API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = 1000;

export declare const API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = 50;

export declare const API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS: number;

export declare type ApiDebugCode = typeof API_DEBUG_CODES[ApiDebugCodeName];

export declare type ApiDebugCodeName = keyof typeof API_DEBUG_CODES;

export declare interface ApiDebugData extends Record<ApiDebugCodeName, unknown> {
    GENERAL: undefined;
    ERROR: unknown;
    REQUEST_SENT: {
        request: ApiRequest;
    };
    REQUEST_QUEUED: {
        request: ApiRequest;
        reason: string;
    };
    REQUEST_REQUEUED: {
        request: ApiRequest;
        reason: string;
    };
    RESPONSE_RECEIVED: {
        request: ApiRequest;
        response: ApiResponse | RateLimitedResponse;
    };
    RATE_LIMITED: {
        request: ApiRequest;
        headers: RateLimitHeaders;
        queued: boolean;
    };
}

export declare type ApiDebugDataType = ApiDebugData[keyof ApiDebugData];

export declare type ApiDebugEvent<T extends ApiDebugCodeName = ApiDebugCodeName> = {
    source: typeof LOG_SOURCES.API;
    level: LogLevel;
    message: string;
    code: typeof API_DEBUG_CODES[T];
    data: ApiDebugData[T];
};

export declare interface ApiError<T = any> extends Error {
    config: ApiRequest['config'];
    code?: string;
    request?: any;
    response?: ApiResponse<T> | RemoteApiResponse<T>;
    isApiError: boolean;
    toJSON: () => object;
}

/** Optional parameters for this api handler. */
export declare interface ApiOptions {
    /** Event emitter through which to emit debug and warning events. */
    emitter?: EventEmitter;
    requestOptions?: RequestOptions;
    queueLoopInterval?: number;
    maxConcurrency?: number;
}

/**
 * A request that will be made to Discord's REST API.
 * @extends BaseRequest
 */
export declare class ApiRequest extends BaseRequest {
    /** Data to send in the body of the request.  */
    data: unknown | undefined;
    /** Additional headers to send with the request. */
    headers: Record<string, unknown> | undefined;
    /** Additional params to send with the request. */
    params: Record<string, unknown> | undefined;
    /** Function to generate form that will be used in place of data. Overwrites `data` and `headers`. */
    createForm: RequestFormDataFunction | undefined;
    /** If queued when using the rate limit rpc service, a timestamp of when the request will first be available to try again. */
    waitUntil: number | undefined;
    /** Set to true not try request on a bucket 429 rate limit. */
    returnOnRateLimit: boolean;
    /** Set to true to not retry the request on a global rate limit. */
    returnOnGlobalRateLimit: boolean;
    attempts: number;
    /** The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides either of the "returnOn" options. */
    retriesLeft?: undefined | number;
    /** Timestamp of when the request was created. */
    createdAt: number;
    startTime: undefined | number;
    completeTime: undefined | number;
    get duration(): undefined | number;
    /**
     * Creates a new request object.
     *
     * @param method HTTP method of the request.
     * @param url Discord REST endpoint target of the request. (e.g. channels/123)
     * @param options Optional parameters for this request.
     */
    constructor(method: Method, url: string, topLevelResource: string, topLevelID: string, bucketHash: undefined | string, bucketHashKey: string, options?: Partial<RequestOptions>);
    /** Data relevant to sending this request via axios. */
    get config(): AxiosRequestConfig;
    /** Assigns a stricter value to `waitUntil`.
     * Strictness is defined by the value that decreases the chance of getting rate limited.
     * @param waitUntil A timestamp of when the request will first be available to try again when queued due to rate limits.
     */
    assignIfStricter(waitUntil: number): void;
}

export declare interface ApiResponse<T = any> {
    /** The HTTP status code of the response. */
    status: number;
    /** Status message returned by the server. (e.g. "OK" with a 200 status) */
    statusText: string;
    /** The data returned by Discord. */
    data: T;
    headers: Record<string, unknown>;
    /** How long the client should wait in ms before trying again. */
    retry_after?: number;
}

export declare type Application = {
    /** the id of the app */
    id: Snowflake;
    /** the name of the app */
    name: string;
    /** the icon hash of the app */
    icon: string | null;
    /** the description of the app */
    description: string;
    /** an array of rpc origin urls, if rpc is enabled */
    rpc_origins?: string[];
    /** when false only app owner can join the app's bot to guilds */
    bot_public: boolean;
    /** when true the app's bot will only join upon completion of the full oauth2 code grant flow */
    bot_require_code_grant: boolean;
    /** the url of the app's terms of service */
    terms_of_service_url?: string;
    /** the url of the app's privacy policy */
    privacy_policy_url?: string;
    /** partial user object containing info on the owner of the application */
    owner?: Partial<User>;
    /** deprecated and will be removed in v11. An empty string. */
    summary: string;
    /** the hex encoded key for verification in interactions and the GameSDK's GetTicket */
    verify_key: string;
    /** if the application belongs to a team, this will be a list of the members of that team */
    team: Team | null;
    /** if this application is a game sold on Discord, this field will be the guild to which it has been linked */
    guild_id?: Snowflake;
    /** if this application is a game sold on Discord, this field will be the id of the "Game SKU" that is created, if exists */
    primary_sku_id?: Snowflake;
    /** if this application is a game sold on Discord, this field will be the URL slug that links to the store page */
    slug?: string;
    /** the application's default rich presence invite cover image hash */
    cover_image?: string;
    /** the application's public flags */
    flags?: number;
    /** up to 5 tags describing the content and functionality of the application */
    tags?: string[];
    /** settings for the application's default in-app authorization link, if enabled */
    install_params?: InstallParam;
    /** the application's default custom authorization link, if enabled */
    custom_install_url?: string;
    /** the application's role connection verification entry point, which when configured will render the app as a verification method in the guild role verification configuration */
    role_connections_verification_url?: string;
};

export declare type ApplicationCommand = {
    /** Unique ID of command */
    id: Snowflake;
    /** Type of command, defaults to `1` */
    type?: ApplicationCommandType;
    /** ID of the parent application */
    application_id: Snowflake;
    /** Guild ID of the command, if not global */
    guild_id?: Snowflake;
    /** Name of command, 1-32 characters */
    name: string;
    /** Localization dictionary for `name` field. Values follow the same restrictions as `name` */
    name_localizations?: AvailableLocale | null;
    /** Description for `CHAT_INPUT` commands, 1-100 characters. Empty string for `USER` and `MESSAGE` commands */
    description: string;
    /** Localization dictionary for `description` field. Values follow the same restrictions as `description` */
    description_localizations?: AvailableLocale | null;
    /** Parameters for the command, max of 25 */
    options?: ApplicationCommandOption[];
    /** Set of permissions represented as a bit set */
    default_member_permissions: string | null;
    /** Indicates whether the command is available in DMs with the app, only for globally-scoped commands. By default, commands are visible. */
    dm_permission?: boolean;
    /** Not recommended for use as field will soon be deprecated. Indicates whether the command is enabled by default when the app is added to a guild, defaults to `true` */
    default_permission?: boolean | null;
    /** Indicates whether the command is age-restricted, defaults to `false` */
    nsfw?: boolean;
    /** Autoincrementing version identifier updated during substantial record changes */
    version: Snowflake;
};

export declare type ApplicationCommandData = {
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

export declare type ApplicationCommandInteractionDataOption = {
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

export declare type ApplicationCommandOption = {
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

export declare type ApplicationCommandOptionChoice = {
    /** 1-100 character choice name */
    name: string;
    /** Localization dictionary for the `name` field. Values follow the same restrictions as `name` */
    name_localizations?: AvailableLocale | null;
    /** Value for the choice, up to 100 characters if string */
    value: string | number;
};

export declare type ApplicationCommandOptionType = 
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

export declare type ApplicationCommandPermission = {
    /** ID of the role, user, or channel. It can also be a permission constant */
    id: Snowflake;
    /** role (`1`), user (`2`), or channel (`3`) */
    type: ApplicationCommandPermissionType;
    /** `true` to allow, `false`, to disallow */
    permission: boolean;
};

export declare type ApplicationCommandPermissionType = 
/** ROLE */
1 | 
/** USER */
2 | 
/** CHANNEL */
3;

export declare type ApplicationCommandType = 
/** CHAT_INPUT */
1 | 
/** USER */
2 | 
/** MESSAGE */
3;

export declare enum ApplicationFlags {
    APPLICATION_AUTO_MODERATION_RULE_CREATE_BADGE = 64,
    GATEWAY_PRESENCE = 4096,
    GATEWAY_PRESENCE_LIMITED = 8192,
    GATEWAY_GUILD_MEMBERS = 16384,
    GATEWAY_GUILD_MEMBERS_LIMITED = 32768,
    VERIFICATION_PENDING_GUILD_LIMIT = 65536,
    EMBEDDED = 131072,
    GATEWAY_MESSAGE_CONTENT = 262144,
    GATEWAY_MESSAGE_CONTENT_LIMITED = 524288,
    APPLICATION_COMMAND_BADGE = 8388608
}

export declare type ApplicationRoleConnection = {
    /** the vanity name of the platform a bot has connected (max 50 characters) */
    platform_name: string | null;
    /** the username on the platform a bot has connected (max 100 characters) */
    platform_username: string | null;
    /** object mapping application role connection metadata keys to their `string`-ified value (max 100 characters) for the user on the platform a bot has connected */
    metadata: object;
};

export declare type Attachment = {
    /** attachment id */
    id: Snowflake;
    /** name of file attached */
    filename: string;
    /** description for the file (max 1024 characters) */
    description?: string;
    /** the attachment's media type */
    content_type?: string;
    /** size of file in bytes */
    size: number;
    /** source url of file */
    url: string;
    /** a proxied url of file */
    proxy_url: string;
    /** height of file (if image) */
    height?: number | null;
    /** width of file (if image) */
    width?: number | null;
    /** whether this attachment is ephemeral */
    ephemeral?: boolean;
    /** the duration of the audio file (currently for voice messages) */
    duration_secs?: number;
    /** base64 encoded bytearray representing a sampled waveform (currently for voice messages) */
    waveform?: string;
};

export declare type AuditLog = {
    /** List of application commands referenced in the audit log */
    application_commands: ApplicationCommand[];
    /** List of audit log entries, sorted from most to least recent */
    audit_log_entries: AuditLogEntry[];
    /** List of auto moderation rules referenced in the audit log */
    auto_moderation_rules: AutoModerationRule[];
    /** List of guild scheduled events referenced in the audit log */
    guild_scheduled_events: GuildScheduledEvent[];
    /** List of partial integration objects */
    integrations: Partial<Integration>[];
    /** List of threads referenced in the audit log */
    threads: Channel[];
    /** List of users referenced in the audit log */
    users: User[];
    /** List of webhooks referenced in the audit log */
    webhooks: Webhook[];
};

export declare type AuditLogChange = {
    /** New value of the key */
    new_value?: unknown;
    /** Old value of the key */
    old_value?: unknown;
    /** Name of the changed entity, with a few exceptions */
    key: string;
};

export declare type AuditLogEntry = {
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

export declare type AuditLogEventType = 
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
143 | 
/** AUTO_MODERATION_FLAG_TO_CHANNEL */
144 | 
/** AUTO_MODERATION_USER_COMMUNICATION_DISABLED */
145;

export declare interface AugmentedActivityAssets extends ActivityAsset {
    largeImage?: string;
    largeText?: string;
    smallImage?: string;
    smallText?: string;
}

export declare interface AugmentedGuild extends Guild {
    voice_states?: AugmentedVoiceState[];
    presences?: Presence[];
    members?: AugmentedGuildMember[];
    emojis: GuildEmoji[];
}

export declare interface AugmentedGuildMember extends GuildMember {
    user: User;
}

export declare interface AugmentedMessage extends Message {
    member: AugmentedGuildMember;
}

export declare interface AugmentedVoiceState extends VoiceState {
    member?: AugmentedGuildMember;
}

export declare type AutocompleteCallback = {
    /** autocomplete choices (max of 25 choices) */
    choices: ApplicationCommandOptionChoice[];
};

export declare type AutoModerationAction = {
    /** the type of action */
    type: AutoModerationActionType;
    /** additional metadata needed during execution for this specific action type */
    metadata?: AutoModerationActionMetadata;
};

export declare type AutoModerationActionExecutionEventField = {
    /** ID of the guild in which action was executed */
    guild_id: Snowflake;
    /** Action which was executed */
    action: AutoModerationAction;
    /** ID of the rule which action belongs to */
    rule_id: Snowflake;
    /** Trigger type of rule which was triggered */
    rule_trigger_type: TriggerType;
    /** ID of the user which generated the content which triggered the rule */
    user_id: Snowflake;
    /** ID of the channel in which user content was posted */
    channel_id?: Snowflake;
    /** ID of any user message which content belongs to */
    message_id?: Snowflake;
    /** ID of any system auto moderation messages posted as a result of this action */
    alert_system_message_id?: Snowflake;
    /** User-generated text content */
    content: string;
    /** Word or phrase configured in the rule that triggered the rule */
    matched_keyword: string | null;
    /** Substring in content that triggered the rule */
    matched_content: string | null;
};

export declare type AutoModerationActionMetadata = {
    /** SEND_ALERT_MESSAGE */
    channel_id: Snowflake;
    /** TIMEOUT */
    duration_seconds: number;
    /** BLOCK_MESSAGE */
    custom_message?: string;
};

export declare type AutoModerationActionType = 
/** BLOCK_MESSAGE */
1 | 
/** SEND_ALERT_MESSAGE */
2 | 
/** TIMEOUT */
3;

export declare type AutoModerationRule = {
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

export declare type AvailableLocale = Partial<Record<Locale, string>>;

declare type AvatarParams = {
    fileType?: undefined | 'png' | 'jpg' | 'webp' | 'gif';
    animate?: boolean;
};

export declare type Ban = {
    /** the reason for the ban */
    reason: string | null;
    /** the banned user */
    user: User;
};

/** Basic information in a request to Discord. */
export declare class BaseRequest {
    #private;
    /** HTTP method of the request. */
    method: Method;
    /** Discord REST endpoint target of the request. (e.g. channels/123) */
    url: string;
    /** Key generated from the method and minor parameters of a request used internally to get shared buckets. */
    bucketHashKey: string;
    /** "Major Parameter" used to differentiate rate limit states. */
    topLevelResource: string;
    /** "Major Parameter" ID used to differentiate rate limit states. */
    private topLevelID;
    /** Key for this specific requests rate limit state in the rate limit cache. (TLR + TLR ID + Bucket Hash) */
    rateLimitKey: undefined | string;
    static formatRateLimitKey(tlr: string, tlrID: string, bucketHash: string): string;
    /**
     * Creates a new base request object with its associated rate limit identifiers.
     *
     * @param method HTTP method of the request.
     * @param url Discord REST endpoint target of the request. (e.g. channels/123)
     */
    constructor(method: Method, url: string, topLevelResource: string, topLevelID: string, bucketHash: undefined | string, bucketHashKey: string);
    get logKey(): string;
    get id(): string;
    getRateLimitKey(bucketHash?: undefined): undefined | string;
    getRateLimitKey(bucketHash: string): string;
}

export declare type Button = {
    /** `2` for a button */
    type: 2;
    /** A button style */
    style: ButtonStyleType;
    /** Text that appears on the button; max 80 characters */
    label?: string;
    /** `name`, `id`, and `animated` */
    emoji?: Partial<Emoji>;
    /** Developer-defined identifier for the button; max 100 characters */
    custom_id?: string;
    /** URL for link-style buttons */
    url?: string;
    /** Whether the button is disabled (defaults to `false`) */
    disabled?: boolean;
};

export declare type ButtonEmoji = Pick<Emoji, 'name' | 'id' | 'animated'>;

export declare type ButtonStyleType = 
/** Primary */
1 | 
/** Secondary */
2 | 
/** Success */
3 | 
/** Danger */
4 | 
/** Link */
5;

export declare type CasedGuildRequestMember = Omit<GuildRequestMember, 'guild_id' | 'user_ids'> & {
    guildId: GuildRequestMember['guild_id'];
    userIds: GuildRequestMember['user_ids'];
};

export declare type Channel = {
    /** the id of this channel */
    id: Snowflake;
    /** the type of channel */
    type: ChannelType;
    /** the id of the guild (may be missing for some channel objects received over gateway guild dispatches) */
    guild_id?: Snowflake;
    /** sorting position of the channel */
    position?: number;
    /** explicit permission overwrites for members and roles */
    permission_overwrites?: Overwrite[];
    /** the name of the channel (1-100 characters) */
    name?: string | null;
    /** the channel topic (0-4096 characters for `GUILD_FORUM` channels, 0-1024 characters for all others) */
    topic?: string | null;
    /** whether the channel is nsfw */
    nsfw?: boolean;
    /** the id of the last message sent in this channel (or thread for `GUILD_FORUM` channels) (may not point to an existing or valid message or thread) */
    last_message_id?: Snowflake | null;
    /** the bitrate (in bits) of the voice channel */
    bitrate?: number;
    /** the user limit of the voice channel */
    user_limit?: number;
    /** amount of seconds a user has to wait before sending another message (0-21600); bots, as well as users with the permission `manage_messages` or `manage_channel`, are unaffected */
    rate_limit_per_user?: number;
    /** the recipients of the DM */
    recipients?: User[];
    /** icon hash of the group DM */
    icon?: string | null;
    /** id of the creator of the group DM or thread */
    owner_id?: Snowflake;
    /** application id of the group DM creator if it is bot-created */
    application_id?: Snowflake;
    /** for group DM channels: whether the channel is managed by an application via the `gdm.join` OAuth2 scope */
    managed?: boolean;
    /** for guild channels: id of the parent category for a channel (each parent category can contain up to 50 channels), for threads: id of the text channel this thread was created */
    parent_id?: Snowflake | null;
    /** when the last pinned message was pinned. This may be `null` in events such as `GUILD_CREATE` when a message is not pinned. */
    last_pin_timestamp?: ISO8601timestamp | null;
    /** voice region id for the voice channel, automatic when set to null */
    rtc_region?: string | null;
    /** the camera video quality mode of the voice channel, 1 when not present */
    video_quality_mode?: number;
    /** number of messages (not including the initial message or deleted messages) in a thread. */
    message_count?: number;
    /** an approximate count of users in a thread, stops counting at 50 */
    member_count?: number;
    /** thread-specific fields not needed by other channels */
    thread_metadata?: ThreadMetadata;
    /** thread member object for the current user, if they have joined the thread, only included on certain API endpoints */
    member?: ThreadMember;
    /** default duration, copied onto newly created threads, in minutes, threads will stop showing in the channel list after the specified period of inactivity, can be set to: 60, 1440, 4320, 10080 */
    default_auto_archive_duration?: number;
    /** computed permissions for the invoking user in the channel, including overwrites, only included when part of the `resolved` data received on a slash command interaction */
    permissions?: string;
    /** channel flags combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) */
    flags?: number;
    /** number of messages ever sent in a thread, it's similar to `message_count` on message creation, but will not decrement the number when a message is deleted */
    total_message_sent?: number;
    /** the set of tags that can be used in a `GUILD_FORUM` channel */
    available_tags?: ForumTag[];
    /** the IDs of the set of tags that have been applied to a thread in a `GUILD_FORUM` channel */
    applied_tags?: Snowflake[];
    /** the emoji to show in the add reaction button on a thread in a `GUILD_FORUM` channel */
    default_reaction_emoji?: DefaultReaction | null;
    /** the initial `rate_limit_per_user` to set on newly created threads in a channel. this field is copied to the thread at creation time and does not live update. */
    default_thread_rate_limit_per_user?: number;
    /** the default sort order type used to order posts in `GUILD_FORUM` channels. Defaults to `null`, which indicates a preferred sort order hasn't been set by a channel admin */
    default_sort_order?: number | null;
    /** the default forum layout view used to display posts in `GUILD_FORUM` channels. Defaults to `0`, which indicates a layout view has not been set by a channel admin */
    default_forum_layout?: number;
};

export declare type CHANNEL_CREATE_EVENT = GuildChannel;

export declare type CHANNEL_DELETE_EVENT = GuildChannel;

export declare type CHANNEL_PINS_UPDATE_EVENT = ChannelPinsUpdateEventField;

export declare type CHANNEL_UPDATE_EVENT = GuildChannel;

export declare enum ChannelFlags {
    PINNED = 2,
    REQUIRE_TAG = 16
}

export declare type ChannelMention = {
    /** id of the channel */
    id: Snowflake;
    /** id of the guild containing the channel */
    guild_id: Snowflake;
    /** the type of channel */
    type: ChannelType;
    /** the name of the channel */
    name: string;
};

export declare type ChannelPinsUpdateEventField = {
    /** ID of the guild */
    guild_id?: Snowflake;
    /** ID of the channel */
    channel_id: Snowflake;
    /** Time at which the most recent pinned message was pinned */
    last_pin_timestamp?: ISO8601timestamp | null;
};

export declare type ChannelSelectMenu = {
    type: 8;
} & Omit<SelectMenu, 'options'>;

export declare type ChannelType = 
/** GUILD_TEXT */
0 | 
/** DM */
1 | 
/** GUILD_VOICE */
2 | 
/** GROUP_DM */
3 | 
/** GUILD_CATEGORY */
4 | 
/** ANNOUNCEMENT */
5 | 
/** ANNOUNCEMENT_THREAD */
10 | 
/** PUBLIC_THREAD */
11 | 
/** PRIVATE_THREAD */
12 | 
/** GUILD_STAGE_VOICE */
13 | 
/** GUILD_DIRECTORY */
14 | 
/** GUILD_FORUM */
15;

export declare type ClientStatus = {
    /** User's status set for an active desktop (Windows, Linux, Mac) application session */
    desktop?: string;
    /** User's status set for an active mobile (iOS, Android) application session */
    mobile?: string;
    /** User's status set for an active web (browser, bot account) application session */
    web?: string;
};

/**
 * Returns a new object that is a clone of the original.
 * @param object Object to clone.
 */
export declare function clone<T>(object: T): T;

/**
 * This is a bot library. Coerced non-compliant tokens to be bot-like.
 * @param token Discord token.
 */
export declare function coerceTokenToBotLike(token: string): string;

export declare type Component = ActionRowComponent;

export declare type ComponentType = 
/** Action Row */
1 | 
/** Button */
2 | 
/** String Select */
3 | 
/** Text Input */
4 | 
/** User Select */
5 | 
/** Role Select */
6 | 
/** Mentionable Select */
7 | 
/** Channel Select */
8;

/**
 * Compute a member's channel-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param channel Channel in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms.
 */
export declare function computeChannelPerms({ member, guild, channel, stopOnOwnerAdmin, }: {
    member: PermissibleMember;
    guild: PermissibleGuild;
    channel: PermissibleChannel;
    stopOnOwnerAdmin?: boolean;
}): bigint;

/**
 * Compute a member's guild-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms in BigInt form.
 */
export declare function computeGuildPerms({ member, guild, stopOnOwnerAdmin }: {
    member: PermissibleMember;
    guild: PermissibleGuild;
    stopOnOwnerAdmin?: boolean;
}): bigint;

export declare type Connection = {
    /** id of the connection account */
    id: string;
    /** the username of the connection account */
    name: string;
    /** the service of this connection */
    type: string;
    /** whether the connection is revoked */
    revoked?: boolean;
    /** an array of partial server integrations */
    integrations?: Partial<Integration>[];
    /** whether the connection is verified */
    verified: boolean;
    /** whether friend sync is enabled for this connection */
    friend_sync: boolean;
    /** whether activities related to this connection will be shown in presence updates */
    show_activity: boolean;
    /** whether this connection has a corresponding third party OAuth2 token */
    two_way_link: boolean;
    /** visibility of this connection */
    visibility: number;
};

/**
 * Creates the discord cdn link for a guild's icon.
 * @param guild Guild whose icon url to generate.s
 * @param fileType File extension of the image.
 */
export declare function constructGuildIcon(guild: Pick<Guild, 'id' | 'icon_hash'>, fileType?: string): string | undefined;

/**
 * Creates the discord cdn link for a user's avatar.
 * @param user User whose avatar url to generate.
 * @param fileType File extension of the image.
 */
export declare function constructUserAvatarUrl(user: Pick<User, 'id' | 'avatar'> & {
    discriminator?: string;
}, { fileType, animate }?: AvatarParams): string;

declare type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export declare const DEFAULT_GATEWAY_BOT_WAIT: number;

export declare type DefaultMessageNotificationLevel = 
/** ALL_MESSAGES */
0 | 
/** ONLY_MENTIONS */
1;

export declare type DefaultReaction = {
    /** the id of a guild's custom emoji */
    emoji_id: Snowflake | null;
    /** the unicode character of the emoji */
    emoji_name: string | null;
};

export declare const DISCORD_API_DEFAULT_VERSION = 10;

export declare const DISCORD_API_URL = "https://discord.com/api";

export declare const DISCORD_CDN_URL = "https://cdn.discordapp.com";

/** Discord epoch (2015-01-01T00:00:00.000Z) */
export declare const DISCORD_EPOCH = 1420070400000;

export declare const DISCORD_WS_VERSION = 10;

export declare type Embed = {
    /** title of embed */
    title?: string;
    /** type of embed (always "rich" for webhook embeds) */
    type?: string;
    /** description of embed */
    description?: string;
    /** url of embed */
    url?: string;
    /** timestamp of embed content */
    timestamp?: ISO8601timestamp;
    /** color code of the embed */
    color?: number;
    /** footer information */
    footer?: EmbedFooter;
    /** image information */
    image?: EmbedImage;
    /** thumbnail information */
    thumbnail?: EmbedThumbnail;
    /** video information */
    video?: EmbedVideo;
    /** provider information */
    provider?: EmbedProvider;
    /** author information */
    author?: EmbedAuthor;
    /** fields information */
    fields?: EmbedField[];
};

export declare type EmbedAuthor = {
    /** name of author */
    name: string;
    /** url of author (only supports http(s)) */
    url?: string;
    /** url of author icon (only supports http(s) and attachments) */
    icon_url?: string;
    /** a proxied url of author icon */
    proxy_icon_url?: string;
};

export declare type EmbedField = {
    /** name of the field */
    name: string;
    /** value of the field */
    value: string;
    /** whether or not this field should display inline */
    inline?: boolean;
};

export declare type EmbedFooter = {
    /** footer text */
    text: string;
    /** url of footer icon (only supports http(s) and attachments) */
    icon_url?: string;
    /** a proxied url of footer icon */
    proxy_icon_url?: string;
};

export declare type EmbedImage = {
    /** source url of image (only supports http(s) and attachments) */
    url: string;
    /** a proxied url of the image */
    proxy_url?: string;
    /** height of image */
    height?: number;
    /** width of image */
    width?: number;
};

export declare type EmbedProvider = {
    /** name of provider */
    name?: string;
    /** url of provider */
    url?: string;
};

export declare type EmbedThumbnail = {
    /** source url of thumbnail (only supports http(s) and attachments) */
    url: string;
    /** a proxied url of the thumbnail */
    proxy_url?: string;
    /** height of thumbnail */
    height?: number;
    /** width of thumbnail */
    width?: number;
};

export declare type EmbedVideo = {
    /** source url of video */
    url?: string;
    /** a proxied url of the video */
    proxy_url?: string;
    /** height of video */
    height?: number;
    /** width of video */
    width?: number;
};

export declare type Emoji = {
    /** emoji id */
    id: Snowflake | null;
    /** emoji name */
    name: string | null;
    /** roles allowed to use this emoji */
    roles?: Role[];
    /** user that created this emoji */
    user?: User;
    /** whether this emoji must be wrapped in colons */
    require_colons?: boolean;
    /** whether this emoji is managed */
    managed?: boolean;
    /** whether this emoji is animated */
    animated?: boolean;
    /** whether this emoji can be used, may be false due to loss of Server Boosts */
    available?: boolean;
};

declare interface EventHandler extends EventEmitter {
    handleEvent: HandleEventCallback;
}

export declare type EventType = 
/** MESSAGE_SEND */
1;

export declare type ExplicitContentFilterLevel = 
/** DISABLED */
0 | 
/** MEMBERS_WITHOUT_ROLES */
1 | 
/** ALL_MEMBERS */
2;

export declare type FollowedChannel = {
    /** source channel id */
    channel_id: Snowflake;
    /** created target webhook id */
    webhook_id: Snowflake;
};

export declare enum ForumLayoutTypes {
    NOT_SET = 0,
    LIST_VIEW = 1,
    GALLERY_VIEW = 2
}

export declare type ForumTag = {
    /** the id of the tag */
    id: Snowflake;
    /** the name of the tag (0-20 characters) */
    name: string;
    /** whether this tag can only be added to or removed from threads by a member with the `MANAGE_THREADS` permission */
    moderated: boolean;
    /** the id of a guild's custom emoji */
    emoji_id: Snowflake | null;
    /** the unicode character of the emoji */
    emoji_name: string | null;
};

/** A client to handle a Discord gateway connection. */
export declare class Gateway {
    #private;
    /** Timer for resume connect behavior after a close, allowing backpressure to be processed before reinitializing the websocket. */
    flushInterval: null | NodeJS.Timeout;
    /**
     * Creates a new Discord gateway handler.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
    constructor(token: string, options: GatewayOptions);
    /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
    get resumable(): boolean;
    /** Whether or not the client is currently resuming a session. */
    get resuming(): boolean;
    /** [ShardID, ShardCount] to identify with; `undefined` if not sharding. */
    get shard(): GatewayIdentify['shard'];
    /** The shard id that this gateway is connected to. */
    get id(): number;
    /** Whether or not the websocket is open. */
    get connected(): boolean;
    /** Whether or not this client should be considered 'online', connected to the gateway and receiving events. */
    get online(): boolean;
    /** This gateway's active websocket connection. */
    get ws(): ws | undefined;
    /** This client's heartbeat manager. */
    get heart(): undefined | Heartbeat;
    get compression(): boolean;
    setCompression(compress: boolean): void;
    /**
     * Simple alias for logging events emitted by this client.
     * @param level Key of the logging level of this message.
     * @param message Content of the log
     * @param data Data pertinent to the event.
     */
    private log;
    /**
     * Emits various events through `this.#emitter`, both Discord and Api. Will emit all events if `this.#events` is undefined; otherwise will only emit those defined as keys in the `this.#events` object.
     * @param type Type of event. (e.g. "GATEWAY_CLOSE" or "CHANNEL_CREATE")
     * @param data Data to send with the event.
     */
    private emit;
    /**
     * Sends a `Request Guild Members` websocket message.
     * @param guildId Id of the guild to request members from.
     * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
     */
    requestGuildMembers(options: GuildRequestMember): boolean;
    updatePresence(presence: GatewayPresenceUpdate): boolean;
    /**
     * Connects to Discord's event gateway.
     * @param _websocket Ignore. For unittest dependency injection only.
     */
    login: (_websocket?: typeof ws) => Promise<void>;
    private constructWsUrl;
    /**
     * Closes the connection.
     * @param reconnect Whether to reconnect after closing.
     */
    close(code?: GatewayCloseCode, flushWaitTime?: null | number): void;
    private startCloseTimeout;
    /**
     * Handles emitting events from Discord. Will first pass through `this.#emitter.handleEvent` function if one exists.
     * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
     * @param data Data of the event from Discord.
     */
    private handleEvent;
    private handleGuildMemberChunk;
    private updateRequestMembersState;
    /** Assigned to websocket `onopen`. */
    private handleWsOpen;
    /** Assigned to websocket `onerror`. */
    private handleWsError;
    /** Assigned to websocket `onclose`. Cleans up and attempts to re-connect with a fresh connection after waiting some time.
     * @param event Object containing information about the close.
     */
    private handleWsClose;
    private waitForFlush;
    private cleanup;
    /** Uses the close code to determine what message to log and if the client should attempt to reconnect.
     * @param code Code that came with the websocket close event.
     * @return Whether or not the client should attempt to login again.
     */
    private handleCloseCode;
    /** Removes current session information. */
    private clearSession;
    /** Assigned to websocket `onmessage`. */
    private handleWsMessage;
    private decompress;
    /** Processes incoming messages from Discord's gateway.
     * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
     */
    private handleMessage;
    /** Proxy for inline heartbeat checking. */
    private checkHeartbeatInline;
    /**
     * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
     * @param data From Discord.
     */
    private handleReady;
    /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
    private handleResumed;
    /**
     * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
     * @param data From Discord.
     */
    private handleHello;
    /** Connects to gateway. */
    private connect;
    /** Sends a "Resume" payload to Discord's gateway. */
    private resume;
    /** Sends an "Identify" payload. */
    private identify;
    sendHeartbeat(): void;
    /**
     * Sends a websocket message to Discord.
     * @param op Gateway Opcode https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
     * @param data Data of the message.
     * @returns true if the packet was sent; false if the packet was not due to rate limiting or websocket not open.
     */
    private send;
    /**
     * Returns whether or not the message to be sent will exceed the rate limit or not, taking into account padded buffers for high priority packets (e.g. heartbeats, resumes).
     * @param op Op code of the message to be sent.
     * @returns true if sending message won't exceed rate limit or padding; false if it will
     */
    private isPacketRateLimited;
    /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
    private updateWsRateLimit;
    /**
     * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
     * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
     * @param resumable Whether or not Discord has said that the connection as able to be resumed.
     */
    private handleInvalidSession;
    /**
     * Updates the sequence value of Discord's gateway if it's larger than the current.
     * @param s Sequence value from Discord.
     */
    private updateSequence;
}

/** https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes */
export declare const GATEWAY_CLOSE_CODES: {
    readonly CLEAN: 1000;
    readonly GOING_AWAY: 1001;
    readonly ABNORMAL: 1006;
    readonly UNKNOWN_ERROR: 4000;
    readonly UNKNOWN_OPCODE: 4001;
    readonly DECODE_ERROR: 4002;
    readonly NOT_AUTHENTICATED: 4003;
    readonly AUTHENTICATION_FAILED: 4004;
    readonly ALREADY_AUTHENTICATED: 4005;
    readonly SESSION_NO_LONGER_VALID: 4006;
    readonly INVALID_SEQ: 4007;
    readonly RATE_LIMITED: 4008;
    readonly SESSION_TIMEOUT: 4009;
    readonly INVALID_SHARD: 4010;
    readonly SHARDING_REQUIRED: 4011;
    readonly INVALID_VERSION: 4012;
    readonly INVALID_INTENT: 4013;
    readonly DISALLOWED_INTENT: 4014;
    readonly CONNECT_TIMEOUT: 4990;
    readonly INTERNAL_TERMINATE_RECONNECT: 4991;
    readonly RECONNECT: 4992;
    readonly SESSION_INVALIDATED: 4993;
    readonly SESSION_INVALIDATED_RESUMABLE: 4994;
    readonly HEARTBEAT_TIMEOUT: 4995;
    readonly USER_TERMINATE_RESUMABLE: 4996;
    readonly USER_TERMINATE_RECONNECT: 4997;
    readonly USER_TERMINATE: 4998;
    readonly UNKNOWN: 4999;
};

export declare type GATEWAY_IDENTIFY_EVENT = null;

/** Gateway websocket connection rate limit. */
export declare const GATEWAY_MAX_REQUESTS_PER_MINUTE = 120;

/** https://discord.com/developers/docs/topics/opcodes-and-status-codes */
export declare const GATEWAY_OP_CODES: {
    readonly DISPATCH: 0;
    readonly HEARTBEAT: 1;
    readonly IDENTIFY: 2;
    readonly GATEWAY_PRESENCE_UPDATE: 3;
    readonly GATEWAY_VOICE_STATE_UPDATE: 4;
    readonly RESUME: 6;
    readonly RECONNECT: 7;
    readonly REQUEST_GUILD_MEMBERS: 8;
    readonly INVALID_SESSION: 9;
    readonly HELLO: 10;
    readonly HEARTBEAT_ACK: 11;
};

export declare type GATEWAY_OPEN_EVENT = null;

/** A buffer the reserves this amount of gateway requests every minute for critical tasks. */
export declare const GATEWAY_REQUEST_BUFFER = 4;

export declare interface GatewayBotResponse {
    /** websocket url */
    url: string;
    /** recommended shard count */
    shards: number;
    /** state of the limits for this period of time */
    session_start_limit: SessionLimitData;
}

export declare type GatewayCloseCode = typeof GATEWAY_CLOSE_CODES[keyof typeof GATEWAY_CLOSE_CODES];

export declare type GatewayCloseEvent = {
    shouldReconnect: boolean;
    code: number;
    gateway: Gateway;
};

export declare type GatewayEvent = 'HELLO' | 'READY' | 'RESUMED' | 'RECONNECT' | 'INVALID_SESSION' | 'CHANNEL_CREATE' | 'CHANNEL_UPDATE' | 'CHANNEL_DELETE' | 'CHANNEL_PINS_UPDATE' | 'THREAD_CREATE' | 'THREAD_UPDATE' | 'THREAD_DELETE' | 'THREAD_LIST_SYNC' | 'THREAD_MEMBER_UPDATE' | 'THREAD_MEMBERS_UPDATE' | 'GUILD_CREATE' | 'GUILD_UPDATE' | 'GUILD_DELETE' | 'GUILD_BAN_ADD' | 'GUILD_BAN_REMOVE' | 'GUILD_EMOJIS_UPDATE' | 'GUILD_STICKERS_UPDATE' | 'GUILD_INTEGRATIONS_UPDATE' | 'GUILD_MEMBER_ADD' | 'GUILD_MEMBER_REMOVE' | 'GUILD_MEMBER_UPDATE' | 'GUILD_MEMBERS_CHUNK' | 'GUILD_ROLE_CREATE' | 'GUILD_ROLE_UPDATE' | 'GUILD_ROLE_DELETE' | 'GUILD_SCHEDULED_EVENT_CREATE' | 'GUILD_SCHEDULED_EVENT_UPDATE' | 'GUILD_SCHEDULED_EVENT_DELETE' | 'GUILD_SCHEDULED_EVENT_USER_ADD' | 'GUILD_SCHEDULED_EVENT_USER_REMOVE' | 'INTEGRATION_CREATE' | 'INTEGRATION_UPDATE' | 'INTEGRATION_DELETE' | 'INTEGRATION_CREATE' | 'INVITE_CREATE' | 'INVITE_DELETE' | 'MESSAGE_CREATE' | 'MESSAGE_UPDATE' | 'MESSAGE_DELETE' | 'MESSAGE_DELETE_BULK' | 'MESSAGE_REACTION_ADD' | 'MESSAGE_REACTION_REMOVE' | 'MESSAGE_REACTION_REMOVE_ALL' | 'MESSAGE_REACTION_REMOVE_EMOJI' | 'PRESENCE_UPDATE' | 'STAGE_INSTANCE_CREATE' | 'STAGE_INSTANCE_DELETE' | 'STAGE_INSTANCE_UPDATE' | 'TYPING_START' | 'USER_UPDATE' | 'VOICE_STATE_UPDATE' | 'VOICE_SERVER_UPDATE' | 'WEBHOOKS_UPDATE';

export declare type GatewayHeartbeatAckEvent = {
    latency: number;
    gateway: Gateway;
};

export declare type GatewayHeartbeatSentEvent = {
    scheduleDiff: number;
    gateway: Gateway;
};

/** A container of information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
export declare class GatewayIdentify {
    #private;
    /** whether this connection supports compression of packets */
    compress: boolean | undefined;
    /** used for Guild Sharding */
    readonly shard?: [number, number];
    /** authentication token */
    readonly token: string;
    /**
     * Creates a new Identity object for use with the gateway.
     * @param identity Properties to add to this identity.
     */
    constructor(token: string, identity: Partial<IdentityOptions>);
    updatePresence(presence: GatewayPresenceUpdate): void;
    toJSON(): Partial<GatewayIdentify>;
}

export declare type GatewayMap = Map<number, Gateway>;

export declare interface GatewayOptions {
    /** An object containing information for identifying with the gateway. `shard` property will be overwritten when using Paracord Shard Launcher. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
    identity: IdentityOptions;
    /** Emitter through which Discord gateway events are sent. */
    emitter: EventHandler;
    /** Websocket url to connect to. */
    wsUrl: string;
    wsParams: GatewayURLQueryStringParam;
    /** Time in seconds subtracted from the heartbeat interval. Useful for applications that tread a thin line between timeouts. */
    heartbeatIntervalOffset?: undefined | number;
    /** How long to wait after a heartbeat ack before timing out the shard. */
    heartbeatTimeoutSeconds?: undefined | number;
    /** Array of Gateway inline heartbeat checks functions for use when internally sharding. */
    checkSiblingHeartbeats?: undefined | Heartbeat['checkIfShouldHeartbeat'][];
    /** Discord gateway version to use. Default: 10 */
    version?: undefined | number;
}

export declare type GatewayPayload = {
    /** Gateway opcode, which indicates the payload type */
    op: number;
    /** Event data */
    d: unknown;
    /** Sequence number of event used for resuming sessions and [heartbeating](#DOCS_TOPICS_GATEWAY/sending-heartbeats) */
    s: number | null;
    /** Event name */
    t: string | null;
};

export declare type GatewayPresence = Omit<Presence, 'user'> & {
    user: {
        id: string;
    };
};

export declare type GatewayPresenceUpdate = {
    /** Unix time (in milliseconds) of when the client went idle, or null if the client is not idle */
    since: number | null;
    /** User's activities */
    activities: Activity[];
    /** User's new status */
    status: StatusType;
    /** Whether or not the client is afk */
    afk: boolean;
};

export declare type GatewayRequestMembersEvent = {
    options: GuildRequestMember;
    gateway: Gateway;
};

export declare type GatewayURLQueryStringParam = {
    /** API Version to use */
    v: number;
    /** The encoding of received gateway packets */
    encoding: string;
    /** The optional transport compression of gateway packets */
    compress?: string;
};

export declare type GatewayVoiceStateUpdate = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** ID of the voice channel client wants to join (null if disconnecting) */
    channel_id: Snowflake | null;
    /** Whether the client is muted */
    self_mute: boolean;
    /** Whether the client deafened */
    self_deaf: boolean;
};

export declare const GIGABYTE_IN_BYTES = 1073741824;

export declare type Guild = {
    /** guild id */
    id: Snowflake;
    /** guild name (2-100 characters, excluding trailing and leading whitespace) */
    name: string;
    /** icon hash */
    icon: string | null;
    /** icon hash, returned when in the template object */
    icon_hash?: string | null;
    /** splash hash */
    splash: string | null;
    /** discovery splash hash; only present for guilds with the "DISCOVERABLE" feature */
    discovery_splash: string | null;
    /** true if the user is the owner of the guild */
    owner?: boolean;
    /** id of owner */
    owner_id: Snowflake;
    /** total permissions for the user in the guild (excludes overwrites) */
    permissions?: string;
    /** voice region id for the guild (deprecated) */
    region?: VoiceRegion | null;
    /** id of afk channel */
    afk_channel_id: Snowflake | null;
    /** afk timeout in seconds */
    afk_timeout: number;
    /** true if the server widget is enabled */
    widget_enabled?: boolean;
    /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
    widget_channel_id?: Snowflake | null;
    /** verification level required for the guild */
    verification_level: VerificationLevel;
    /** default message notifications level */
    default_message_notifications: DefaultMessageNotificationLevel;
    /** explicit content filter level */
    explicit_content_filter: ExplicitContentFilterLevel;
    /** roles in the guild */
    roles: Role[];
    /** custom guild emojis */
    emojis: Emoji[];
    /** enabled guild features */
    features: GuildFeatureType[];
    /** required MFA level for the guild */
    mfa_level: MFALevel;
    /** application id of the guild creator if it is bot-created */
    application_id: Snowflake | null;
    /** the id of the channel where guild notices such as welcome messages and boost events are posted */
    system_channel_id: Snowflake | null;
    /** system channel flags */
    system_channel_flags: SystemChannelFlags;
    /** the id of the channel where Community guilds can display rules and/or guidelines */
    rules_channel_id: Snowflake | null;
    /** the maximum number of presences for the guild (`null` is always returned, apart from the largest of guilds) */
    max_presences?: number | null;
    /** the maximum number of members for the guild */
    max_members?: number;
    /** the vanity url code for the guild */
    vanity_url_code: string | null;
    /** the description of a guild */
    description: string | null;
    /** banner hash */
    banner: string | null;
    /** premium tier (Server Boost level) */
    premium_tier: PremiumTier;
    /** the number of boosts this guild currently has */
    premium_subscription_count?: number;
    /** the preferred locale of a Community guild; used in server discovery and notices from Discord, and sent in interactions; defaults to "en-US" */
    preferred_locale: string;
    /** the id of the channel where admins and moderators of Community guilds receive notices from Discord */
    public_updates_channel_id: Snowflake | null;
    /** the maximum amount of users in a video channel */
    max_video_channel_users?: number;
    /** the maximum amount of users in a stage video channel */
    max_stage_video_channel_users?: number;
    /** approximate number of members in this guild, returned from the `GET /guilds/<id>` endpoint when `with_counts` is `true` */
    approximate_member_count?: number;
    /** approximate number of non-offline members in this guild, returned from the `GET /guilds/<id>` endpoint when `with_counts` is `true` */
    approximate_presence_count?: number;
    /** the welcome screen of a Community guild, shown to new members, returned in an Invite's guild object */
    welcome_screen?: WelcomeScreen;
    /** guild NSFW level */
    nsfw_level: GuildNSFWLevel;
    /** custom guild stickers */
    stickers?: Sticker[];
    /** whether the guild has the boost progress bar enabled */
    premium_progress_bar_enabled: boolean;
    /** the id of the channel where admins and moderators of Community guilds receive safety alerts from Discord */
    safety_alerts_channel_id: Snowflake | null;
};

export declare type GUILD_BAN_ADD_EVENT = GuildBanAddEventField;

export declare type GUILD_BAN_REMOVE_EVENT = GuildBanRemoveEventField;

export declare type GUILD_CREATE_EVENT = Pick<Required<Guild>, 'afk_channel_id' | 'afk_timeout' | 'application_id' | 'banner' | 'default_message_notifications' | 'description' | 'discovery_splash' | 'emojis' | 'features' | 'icon' | 'id' | 'max_members' | 'max_video_channel_users' | 'mfa_level' | 'name' | 'nsfw_level' | 'owner_id' | 'preferred_locale' | 'premium_subscription_count' | 'premium_progress_bar_enabled' | 'premium_tier' | 'public_updates_channel_id' | 'region' | 'roles' | 'rules_channel_id' | 'splash' | 'stickers' | 'system_channel_id' | 'vanity_url_code' | 'verification_level'> & Omit<GuildCreateExtraField, 'voice_states' | 'members' | 'channels' | 'threads' | 'presences'> & {
    voice_states: Pick<VoiceState, 'user_id' | 'channel_id' | 'suppress' | 'session_id' | 'self_video' | 'self_mute' | 'self_deaf' | 'request_to_speak_timestamp' | 'mute' | 'deaf'>[];
    members: AugmentedGuildMember[];
    channels: Omit<GuildChannel, 'guild_id'>[];
    threads: GuildThread[];
    presences: GatewayPresence[];
};

export declare type GUILD_DELETE_EVENT = {
    id: string;
    unavailable?: true;
};

export declare type GUILD_EMOJIS_UPDATE_EVENT = GuildEmojisUpdateEventField;

export declare type GUILD_INTEGRATIONS_UPDATE_EVENT = GuildIntegrationsUpdateEventField;

export declare type GUILD_MEMBER_ADD_EVENT = GuildMemberAddExtraField & Pick<Required<GuildMember>, 'avatar' | 'communication_disabled_until' | 'deaf' | 'joined_at' | 'mute' | 'nick' | 'pending' | 'premium_since' | 'roles' | 'user'>;

export declare type GUILD_MEMBER_REMOVE_EVENT = GuildMemberRemoveEventField;

export declare type GUILD_MEMBER_UPDATE_EVENT = GuildMemberUpdateEventField;

export declare type GUILD_MEMBERS_CHUNK_EVENT = {
    guild_id: Snowflake;
    members: Omit<AugmentedGuildMember, 'guild_id'>[];
    chunk_index: number;
    chunk_count: number;
    not_found?: number[];
    presences?: Omit<Presence, 'guild_id'>[];
    nonce?: string;
};

export declare type GUILD_ROLE_CREATE_EVENT = GuildRoleCreateEventField;

export declare type GUILD_ROLE_DELETE_EVENT = GuildRoleDeleteEventField;

export declare type GUILD_ROLE_UPDATE_EVENT = GuildRoleUpdateEventField;

export declare type GUILD_SCHEDULED_EVENT_CREATE_EVENT = GuildScheduledEvent;

export declare type GUILD_SCHEDULED_EVENT_DELETE_EVENT = GuildScheduledEvent;

export declare type GUILD_SCHEDULED_EVENT_UPDATE_EVENT = GuildScheduledEvent;

export declare type GUILD_SCHEDULED_EVENT_USER_ADD_EVENT = GuildScheduledEventUserAddEventField;

export declare type GUILD_SCHEDULED_EVENT_USER_REMOVE_EVENT = GuildScheduledEventUserRemoveEventField;

export declare type GUILD_STICKERS_UPDATE_EVENT = GuildStickersUpdateEventField;

export declare type GUILD_UPDATE_EVENT = Pick<Required<Guild>, 'afk_channel_id' | 'afk_timeout' | 'application_id' | 'banner' | 'default_message_notifications' | 'description' | 'discovery_splash' | 'emojis' | 'features' | 'icon' | 'id' | 'max_members' | 'max_video_channel_users' | 'mfa_level' | 'name' | 'nsfw_level' | 'owner_id' | 'preferred_locale' | 'premium_subscription_count' | 'premium_progress_bar_enabled' | 'premium_tier' | 'public_updates_channel_id' | 'region' | 'roles' | 'rules_channel_id' | 'splash' | 'stickers' | 'system_channel_id' | 'vanity_url_code' | 'verification_level'>;

export declare type GuildApplicationCommandPermission = {
    /** ID of the command or the application ID */
    id: Snowflake;
    /** ID of the application the command belongs to */
    application_id: Snowflake;
    /** ID of the guild */
    guild_id: Snowflake;
    /** Permissions for the command in the guild, max of 100 */
    permissions: ApplicationCommandPermission[];
};

export declare type GuildBanAddEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** User who was banned */
    user: User;
};

export declare type GuildBanRemoveEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** User who was unbanned */
    user: User;
};

export declare type GuildCategoryChannel = {
    type: 4;
    name: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'nsfw' | 'parent_id' | 'permission_overwrites' | 'position' | 'type'>;

export declare type GuildChannel = GuildTextChannel | GuildVoiceChannel | GuildCategoryChannel | GuildNewsChannel | GuildStageVoiceChannel | GuildForumChannel;

export declare type GuildCreateExtraField = {
    /** When this guild was joined at */
    joined_at: ISO8601timestamp;
    /** `true` if this is considered a large guild */
    large: boolean;
    /** `true` if this guild is unavailable due to an outage */
    unavailable?: boolean;
    /** Total number of members in this guild */
    member_count: number;
    /** States of members currently in voice channels; lacks the `guild_id` key */
    voice_states: Partial<VoiceState>[];
    /** Users in the guild */
    members: GuildMember[];
    /** Channels in the guild */
    channels: Channel[];
    /** All active threads in the guild that current user has permission to view */
    threads: Channel[];
    /** Presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
    presences: Partial<Presence>[];
    /** Stage instances in the guild */
    stage_instances: StageInstance[];
    /** Scheduled events in the guild */
    guild_scheduled_events: GuildScheduledEvent[];
};

export declare interface GuildEmoji extends Emoji {
    id: Snowflake;
}

export declare type GuildEmojisUpdateEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** Array of emojis */
    emojis: [];
};

export declare type GuildFeatureType = 
/** guild has access to set an animated guild banner image */
'ANIMATED_BANNER' | 
/** guild has access to set an animated guild icon */
'ANIMATED_ICON' | 
/** guild is using the [old permissions configuration behavior](#DOCS_CHANGE_LOG/upcoming-application-command-permission-changes) */
'APPLICATION_COMMAND_PERMISSIONS_V2' | 
/** guild has set up auto moderation rules */
'AUTO_MODERATION' | 
/** guild has access to set a guild banner image */
'BANNER' | 
/** guild can enable welcome screen, Membership Screening, stage channels and discovery, and receives community updates */
'COMMUNITY' | 
/** guild has enabled monetization */
'CREATOR_MONETIZABLE_PROVISIONAL' | 
/** guild has enabled the role subscription promo page */
'CREATOR_STORE_PAGE' | 
/** guild has been set as a support server on the App Directory */
'DEVELOPER_SUPPORT_SERVER' | 
/** guild is able to be discovered in the directory */
'DISCOVERABLE' | 
/** guild is able to be featured in the directory */
'FEATURABLE' | 
/** guild has paused invites, preventing new users from joining */
'INVITES_DISABLED' | 
/** guild has access to set an invite splash background */
'INVITE_SPLASH' | 
/** guild has enabled [Membership Screening](#DOCS_RESOURCES_GUILD/membership-screening-object) */
'MEMBER_VERIFICATION_GATE_ENABLED' | 
/** guild has increased custom sticker slots */
'MORE_STICKERS' | 
/** guild has access to create announcement channels */
'NEWS' | 
/** guild is partnered */
'PARTNERED' | 
/** guild can be previewed before joining via Membership Screening or the directory */
'PREVIEW_ENABLED' | 
/** guild has disabled alerts for join raids in the configured safety alerts channel */
'RAID_ALERTS_DISABLED' | 
/** guild is able to set role icons */
'ROLE_ICONS' | 
/** guild has role subscriptions that can be purchased */
'ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE' | 
/** guild has enabled role subscriptions */
'ROLE_SUBSCRIPTIONS_ENABLED' | 
/** guild has enabled ticketed events */
'TICKETED_EVENTS_ENABLED' | 
/** guild has access to set a vanity URL */
'VANITY_URL' | 
/** guild is verified */
'VERIFIED' | 
/** guild has access to set 384kbps bitrate in voice (previously VIP voice servers) */
'VIP_REGIONS' | 
/** guild has enabled the welcome screen */
'WELCOME_SCREEN_ENABLED';

export declare type GuildForumChannel = {
    type: 15;
    name: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'last_message_id' | 'position' | 'flags' | 'parent_id' | 'topic' | 'permission_overwrites' | 'rate_limit_per_user' | 'nsfw' | 'available_tags' | 'default_reaction_emoji'>;

export declare type GuildIntegrationsUpdateEventField = {
    /** ID of the guild whose integrations were updated */
    guild_id: Snowflake;
};

export declare type GuildMember = {
    /** the user this guild member represents */
    user?: User;
    /** this user's guild nickname */
    nick?: string | null;
    /** the member's guild avatar hash */
    avatar?: string | null;
    /** array of role object ids */
    roles: Snowflake[];
    /** when the user joined the guild */
    joined_at: ISO8601timestamp;
    /** when the user started boosting the guild */
    premium_since?: ISO8601timestamp | null;
    /** whether the user is deafened in voice channels */
    deaf: boolean;
    /** whether the user is muted in voice channels */
    mute: boolean;
    /** guild member flags represented as a bit set, defaults to `0` */
    flags: GuildMemberFlags;
    /** whether the user has not yet passed the guild's Membership Screening requirements */
    pending?: boolean;
    /** total permissions of the member in the channel, including overwrites, returned when in the interaction object */
    permissions?: string;
    /** when the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
    communication_disabled_until?: ISO8601timestamp | null;
};

export declare type GuildMemberAddExtraField = {
    /** ID of the guild */
    guild_id: Snowflake;
};

export declare enum GuildMemberFlags {
    DID_REJOIN = 1,
    COMPLETED_ONBOARDING = 2,
    BYPASSES_VERIFICATION = 4,
    STARTED_ONBOARDING = 8
}

export declare type GuildMemberRemoveEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** User who was removed */
    user: User;
};

export declare type GuildMembersChunkEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** Set of guild members */
    members: GuildMember[];
    /** Chunk index in the expected chunks for this response (0 <= chunk\_index < chunk\_count) */
    chunk_index: number;
    /** Total number of expected chunks for this response */
    chunk_count: number;
    /** When passing an invalid ID to `REQUEST_GUILD_MEMBERS`, it will be returned here */
    not_found?: [];
    /** When passing `true` to `REQUEST_GUILD_MEMBERS`, presences of the returned members will be here */
    presences?: Presence[];
    /** Nonce used in the Guild Members Request */
    nonce?: string;
};

export declare type GuildMemberUpdateEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** User role ids */
    roles: Snowflake[];
    /** User */
    user: User;
    /** Nickname of the user in the guild */
    nick?: string | null;
    /** Member's guild avatar hash */
    avatar: string | null;
    /** When the user joined the guild */
    joined_at: ISO8601timestamp | null;
    /** When the user starting boosting the guild */
    premium_since?: ISO8601timestamp | null;
    /** Whether the user is deafened in voice channels */
    deaf?: boolean;
    /** Whether the user is muted in voice channels */
    mute?: boolean;
    /** Whether the user has not yet passed the guild's Membership Screening requirements */
    pending?: boolean;
    /** When the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
    communication_disabled_until?: ISO8601timestamp | null;
};

export declare type GuildNewsChannel = {
    type: 5;
    name: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'last_message_id' | 'last_pin_timestamp' | 'nsfw' | 'parent_id' | 'permission_overwrites' | 'position' | 'rate_limit_per_user' | 'topic' | 'type'>;

export declare type GuildNewsThreadChannel = {
    type: 10;
    name: string;
    parent_id: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'last_message_id' | 'member' | 'member_count' | 'message_count' | 'owner_id' | 'rate_limit_per_user' | 'thread_metadata'>;

export declare type GuildNSFWLevel = 
/** DEFAULT */
0 | 
/** EXPLICIT */
1 | 
/** SAFE */
2 | 
/** AGE_RESTRICTED */
3;

export declare type GuildOnboarding = {
    /** ID of the guild this onboarding is part of */
    guild_id: Snowflake;
    /** Prompts shown during onboarding and in customize community */
    prompts: OnboardingPrompt[];
    /** Channel IDs that members get opted into automatically */
    default_channel_ids: Snowflake[];
    /** Whether onboarding is enabled in the guild */
    enabled: boolean;
};

export declare type GuildPreview = {
    /** guild id */
    id: Snowflake;
    /** guild name (2-100 characters) */
    name: string;
    /** icon hash */
    icon: string | null;
    /** splash hash */
    splash: string | null;
    /** discovery splash hash */
    discovery_splash: string | null;
    /** custom guild emojis */
    emojis: Emoji[];
    /** enabled guild features */
    features: GuildFeatureType[];
    /** approximate number of members in this guild */
    approximate_member_count: number;
    /** approximate number of online members in this guild */
    approximate_presence_count: number;
    /** the description for the guild */
    description: string | null;
    /** custom guild stickers */
    stickers: Sticker[];
};

export declare type GuildPrivateThreadChannel = {
    type: 12;
    name: string;
    parent_id: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'last_message_id' | 'member' | 'member_count' | 'message_count' | 'owner_id' | 'rate_limit_per_user' | 'thread_metadata'>;

export declare type GuildPublicThreadChannel = {
    type: 11;
    name: string;
    parent_id: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'last_message_id' | 'member' | 'member_count' | 'message_count' | 'owner_id' | 'rate_limit_per_user' | 'thread_metadata'>;

export declare type GuildRequestMember = {
    /** ID of the guild to get members for */
    guild_id: Snowflake;
    /** string that username starts with, or an empty string to return all members */
    query?: string;
    /** maximum number of members to send matching the `query`; a limit of `0` can be used with an empty string `query` to return all members */
    limit: number;
    /** used to specify if we want the presences of the matched members */
    presences?: boolean;
    /** used to specify which users you wish to fetch */
    user_ids?: Snowflake | Snowflake[];
    /** nonce to identify the Guild Members Chunk response */
    nonce?: string;
};

export declare type GuildRoleCreateEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** Role that was created */
    role: Role;
};

export declare type GuildRoleDeleteEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** ID of the role */
    role_id: Snowflake;
};

export declare type GuildRoleUpdateEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** Role that was updated */
    role: Role;
};

export declare type GuildScheduledEvent = {
    /** the id of the scheduled event */
    id: Snowflake;
    /** the guild id which the scheduled event belongs to */
    guild_id: Snowflake;
    /** the channel id in which the scheduled event will be hosted, or `null` if guild scheduled event scheduled entity type is `EXTERNAL` */
    channel_id: Snowflake | null;
    /** the id of the user that created the scheduled event */
    creator_id?: Snowflake | null;
    /** the name of the scheduled event (1-100 characters) */
    name: string;
    /** the description of the scheduled event (1-1000 characters) */
    description?: string | null;
    /** the time the scheduled event will start */
    scheduled_start_time: ISO8601timestamp;
    /** the time the scheduled event will end, required if entity_type is `EXTERNAL` */
    scheduled_end_time: ISO8601timestamp | null;
    /** the privacy level of the scheduled event */
    privacy_level: GuildScheduledEventPrivacyLevel;
    /** the status of the scheduled event */
    status: GuildScheduledEventStatusType;
    /** the type of the scheduled event */
    entity_type: GuildScheduledEventEntityType;
    /** the id of an entity associated with a guild scheduled event */
    entity_id: Snowflake | null;
    /** additional metadata for the guild scheduled event */
    entity_metadata: GuildScheduledEventEntityMetadata | null;
    /** the user that created the scheduled event */
    creator?: GuildScheduledEventUser;
    /** the number of users subscribed to the scheduled event */
    user_count?: number;
    /** the cover image hash of the scheduled event */
    image?: string | null;
};

export declare type GuildScheduledEventEntityMetadata = {
    /** location of the event (1-100 characters) */
    location?: string;
};

export declare type GuildScheduledEventEntityType = 
/** STAGE_INSTANCE */
1 | 
/** VOICE */
2 | 
/** EXTERNAL */
3;

export declare type GuildScheduledEventPrivacyLevel = 
/** GUILD_ONLY */
2;

export declare type GuildScheduledEventStatusType = 
/** SCHEDULED */
1 | 
/** ACTIVE */
2 | 
/** COMPLETED */
3 | 
/** CANCELED */
4;

export declare type GuildScheduledEventUser = {
    /** the scheduled event id which the user subscribed to */
    guild_scheduled_event_id: Snowflake;
    /** user which subscribed to an event */
    user: User;
    /** guild member data for this user for the guild which this event belongs to, if any */
    member?: GuildMember;
};

export declare type GuildScheduledEventUserAddEventField = {
    /** ID of the guild scheduled event */
    guild_scheduled_event_id: Snowflake;
    /** ID of the user */
    user_id: Snowflake;
    /** ID of the guild */
    guild_id: Snowflake;
};

export declare type GuildScheduledEventUserRemoveEventField = {
    /** ID of the guild scheduled event */
    guild_scheduled_event_id: Snowflake;
    /** ID of the user */
    user_id: Snowflake;
    /** ID of the guild */
    guild_id: Snowflake;
};

export declare type GuildStageVoiceChannel = {
    type: 13;
    name: string;
} & Pick<Required<Channel>, 'guild_id' | 'bitrate' | 'id' | 'nsfw' | 'parent_id' | 'permission_overwrites' | 'position' | 'rtc_region' | 'topic' | 'type' | 'user_limit'>;

export declare type GuildStickersUpdateEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** Array of stickers */
    stickers: [];
};

export declare type GuildTextChannel = {
    type: 0;
    name: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'last_message_id' | 'last_pin_timestamp' | 'nsfw' | 'parent_id' | 'permission_overwrites' | 'position' | 'rate_limit_per_user' | 'topic'>;

export declare type GuildThread = GuildNewsThreadChannel | GuildPublicThreadChannel | GuildPrivateThreadChannel;

export declare type GuildVoiceChannel = {
    type: 2;
    name: string;
} & Pick<Required<Channel>, 'bitrate' | 'guild_id' | 'id' | 'last_message_id' | 'parent_id' | 'permission_overwrites' | 'position' | 'rate_limit_per_user' | 'rtc_region' | 'type' | 'user_limit'>;

export declare type GuildWidget = {
    /** guild id */
    id: Snowflake;
    /** guild name (2-100 characters) */
    name: string;
    /** instant invite for the guilds specified widget invite channel */
    instant_invite: string | null;
    /** voice and stage channels which are accessible by @everyone */
    channels: Partial<Channel>[];
    /** special widget user objects that includes users presence (Limit 100) */
    members: Partial<User>[];
    /** number of online members in this guild */
    presence_count: number;
};

export declare type GuildWidgetSetting = {
    /** whether the widget is enabled */
    enabled: boolean;
    /** the widget channel id */
    channel_id: Snowflake | null;
};

export declare type HandleEventCallback = (eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent, data: unknown, shard: Gateway) => void;

export declare class Heartbeat {
    #private;
    constructor(gateway: Gateway, options: Options);
    get recentTimestamp(): number | undefined;
    private checkDestroyed;
    /** Starts the timeout for the connection to Discord. */
    startConnectTimeout(client: ws): void;
    /** Clears heartbeat values and clears the heartbeatTimers. */
    destroy(): void;
    /**
     * Set inline with the firehose of events to check if the heartbeat needs to be sent.
     * Works in tandem with startTimeout() to ensure the heartbeats are sent on time regardless of event pressure.
     * May be passed as array to other gateways so that no one gateway blocks the others from sending timely heartbeats.
     * Now receiving the ACKs on the other hand...
     */
    checkIfShouldHeartbeat: () => void;
    /** Handles "Heartbeat ACK" packet from Discord. https://discord.com/developers/docs/topics/gateway#heartbeating */
    ack(): void;
    /**
     * Starts heartbeat. https://discord.com/developers/docs/topics/gateway#heartbeating
     * @param heartbeatTimeout From Discord - Number of ms to wait between sending heartbeats.
     */
    start(heartbeatTimeout: number): void;
    private clearHeartbeatTimeout;
    private clearAckTimeout;
    clearConnectTimeout(): void;
    /**
     * Clears old heartbeat timeout and starts a new one.
     */
    private scheduleNextHeartbeat;
    sendHeartbeat: () => void;
    /** Checks if heartbeat ack was received. */
    private checkForAck;
}

export declare type Hello = {
    /** Interval (in milliseconds) an app should heartbeat with */
    heartbeat_interval: number;
};

export declare type HELLO_EVENT = Hello;

export declare const HOUR_IN_MILLISECONDS: number;

declare interface IDebugEvent {
    source: number;
    level: number;
    message: string;
}

export declare type Identify = {
    /** Authentication token */
    token: string;
    /** Connection properties */
    properties: IdentifyConnectionProperties;
    /** Whether this connection supports compression of packets */
    compress?: boolean;
    /** Value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    large_threshold?: number;
    /** Used for Guild Sharding */
    shard?: [number, number];
    /** Presence structure for initial presence information */
    presence?: Presence;
    /** Gateway Intents you wish to receive */
    intents: number;
};

export declare type IdentifyConnectionProperties = {
    /** Your operating system */
    os: string;
    /** Your library name */
    browser: string;
    /** Your library name */
    device: string;
};

export declare type IdentityOptions = {
    /** authentication token */
    token?: undefined | string;
    /** used for Guild Sharding */
    shard?: undefined | [number, number];
    /** information about the client and how it's connecting */
    properties?: undefined | IdentifyConnectionProperties;
    /** whether this connection supports compression of packets */
    compress?: undefined | boolean;
    /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    largeThreshold?: undefined | number;
    /** presence structure for initial presence information */
    presence?: undefined | GatewayPresenceUpdate;
    /** enables dispatching of guild subscription events (presence and typing events) */
    guildSubscriptions?: undefined | boolean;
    /** the Gateway Intents you wish to receive */
    intents: number;
};

/** The known state of a rate limit. */
export declare type IncomingRateLimit = {
    /** Number of requests available before hitting rate limit. */
    remaining: number;
    /** From Discord - rate limit request cap. */
    limit: number;
    /** When the rate limit requests remaining rests to `limit`. */
    resetTimestamp: number | undefined;
    /** How long in ms until the rate limit resets. */
    resetAfter: number;
};

export declare type InstallParam = {
    /** the scopes to add the application to the server with */
    scopes: string[];
    /** the permissions to request for the bot role */
    permissions: string;
};

export declare type Integration = {
    /** integration id */
    id: Snowflake;
    /** integration name */
    name: string;
    /** integration type (twitch, youtube, discord, or guild_subscription) */
    type: string;
    /** is this integration enabled */
    enabled: boolean;
    /** is this integration syncing */
    syncing?: boolean;
    /** id that this integration uses for "subscribers" */
    role_id?: Snowflake;
    /** whether emoticons should be synced for this integration (twitch only currently) */
    enable_emoticons?: boolean;
    /** the behavior of expiring subscribers */
    expire_behavior?: IntegrationExpireType;
    /** the grace period (in days) before expiring subscribers */
    expire_grace_period?: number;
    /** user for this integration */
    user?: User;
    /** integration account information */
    account: IntegrationAccount;
    /** when this integration was last synced */
    synced_at?: ISO8601timestamp;
    /** how many subscribers this integration has */
    subscriber_count?: number;
    /** has this integration been revoked */
    revoked?: boolean;
    /** The bot/OAuth2 application for discord integrations */
    application?: Application;
    /** the scopes the application has been authorized for */
    scopes?: string[];
};

export declare type INTEGRATION_CREATE_EVENT = Integration & IntegrationCreateEventAdditionalField;

export declare type INTEGRATION_DELETE_EVENT = IntegrationDeleteEventField;

export declare type INTEGRATION_UPDATE_EVENT = Integration & IntegrationUpdateEventAdditionalField;

export declare type IntegrationAccount = {
    /** id of the account */
    id: string;
    /** name of the account */
    name: string;
};

export declare type IntegrationApplication = {
    /** the id of the app */
    id: Snowflake;
    /** the name of the app */
    name: string;
    /** the icon hash of the app */
    icon: string | null;
    /** the description of the app */
    description: string;
    /** the bot associated with this application */
    bot?: User;
};

export declare type IntegrationCreateEventAdditionalField = {
    /** ID of the guild */
    guild_id: Snowflake;
};

export declare type IntegrationDeleteEventField = {
    /** Integration ID */
    id: Snowflake;
    /** ID of the guild */
    guild_id: Snowflake;
    /** ID of the bot/OAuth2 application for this discord integration */
    application_id?: Snowflake;
};

export declare type IntegrationExpireType = 
/** Remove role */
0 | 
/** Kick */
1;

export declare type IntegrationUpdateEventAdditionalField = {
    /** ID of the guild */
    guild_id: Snowflake;
};

export declare type Interaction = {
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

export declare type INTERACTION_CREATE_EVENT = Interaction;

export declare type InteractionCallbackType = 
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

export declare type InteractionResponse = {
    /** the type of response */
    type: InteractionCallbackType;
    /** an optional response message */
    data?: MessageCallback | AutocompleteCallback | ModalCallback;
};

export declare type InteractionType = 
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

export declare type InternalShardIds = number[];

export declare type Invite = {
    /** the invite code (unique ID) */
    code: string;
    /** the guild this invite is for */
    guild?: Partial<Guild>;
    /** the channel this invite is for */
    channel: Partial<Channel> | null;
    /** the user who created the invite */
    inviter?: User;
    /** the type of target for this voice channel invite */
    target_type?: number;
    /** the user whose stream to display for this voice channel stream invite */
    target_user?: User;
    /** the embedded application to open for this voice channel embedded application invite */
    target_application?: Partial<Application>;
    /** approximate count of online members, returned from the `GET /invites/<code>` endpoint when `with_counts` is `true` */
    approximate_presence_count?: number;
    /** approximate count of total members, returned from the `GET /invites/<code>` endpoint when `with_counts` is `true` */
    approximate_member_count?: number;
    /** the expiration date of this invite, returned from the `GET /invites/<code>` endpoint when `with_expiration` is `true` */
    expires_at?: ISO8601timestamp | null;
    /** stage instance data if there is a public Stage instance in the Stage channel this invite is for (deprecated) */
    stage_instance?: InviteStageInstance;
    /** guild scheduled event data, only included if `guild_scheduled_event_id` contains a valid guild scheduled event id */
    guild_scheduled_event?: GuildScheduledEvent;
};

export declare type INVITE_CREATE_EVENT = InviteCreateEventField;

export declare type INVITE_DELETE_EVENT = InviteDeleteEventField;

export declare type InviteCreateEventField = {
    /** Channel the invite is for */
    channel_id: Snowflake;
    /** Unique invite code */
    code: string;
    /** Time at which the invite was created */
    created_at: ISO8601timestamp;
    /** Guild of the invite */
    guild_id?: Snowflake;
    /** User that created the invite */
    inviter?: User;
    /** How long the invite is valid for (in seconds) */
    max_age: number;
    /** Maximum number of times the invite can be used */
    max_uses: number;
    /** Type of target for this voice channel invite */
    target_type?: number;
    /** User whose stream to display for this voice channel stream invite */
    target_user?: User;
    /** Embedded application to open for this voice channel embedded application invite */
    target_application?: Partial<Application>;
    /** Whether or not the invite is temporary (invited users will be kicked on disconnect unless they're assigned a role) */
    temporary: boolean;
    /** How many times the invite has been used (always will be 0) */
    uses: number;
};

export declare type InviteDeleteEventField = {
    /** Channel of the invite */
    channel_id: Snowflake;
    /** Guild of the invite */
    guild_id?: Snowflake;
    /** Unique invite code */
    code: string;
};

export declare type InviteMetadata = {
    /** number of times this invite has been used */
    uses: number;
    /** max number of times this invite can be used */
    max_uses: number;
    /** duration (in seconds) after which the invite expires */
    max_age: number;
    /** whether this invite only grants temporary membership */
    temporary: boolean;
    /** when this invite was created */
    created_at: ISO8601timestamp;
};

export declare type InviteStageInstance = {
    /** the members speaking in the Stage */
    members: Partial<GuildMember>[];
    /** the number of users in the Stage */
    participant_count: number;
    /** the number of users speaking in the Stage */
    speaker_count: number;
    /** the topic of the Stage instance (1-120 characters) */
    topic: string;
};

export declare function isApiError(val: unknown): val is ApiError;

export declare type ISO8601timestamp = string;

export declare function isObject(v: unknown): boolean;

export declare type KeywordPresetType = 
/** PROFANITY */
1 | 
/** SEXUAL_CONTENT */
2 | 
/** SLURS */
3;

export declare type LinkButton = Omit<Button, 'custom_id' | 'style' | 'emoji'> & Pick<Required<Button>, 'url'> & {
    style: 5;
    emoji?: ButtonEmoji;
};

export declare type Locale = 
/** Danish - Dansk */
'da' | 
/** German - Deutsch */
'de' | 
/** English, UK - English, UK */
'en-GB' | 
/** English, US - English, US */
'en-US' | 
/** Spanish - Español */
'es-ES' | 
/** French - Français */
'fr' | 
/** Croatian - Hrvatski */
'hr' | 
/** Italian - Italiano */
'it' | 
/** Lithuanian - Lietuviškai */
'lt' | 
/** Hungarian - Magyar */
'hu' | 
/** Dutch - Nederlands */
'nl' | 
/** Norwegian - Norsk */
'no' | 
/** Polish - Polski */
'pl' | 
/** Portuguese, Brazilian - Português do Brasil */
'pt-BR' | 
/** Romanian, Romania - Română */
'ro' | 
/** Finnish - Suomi */
'fi' | 
/** Swedish - Svenska */
'sv-SE' | 
/** Vietnamese - Tiếng Việt   */
'vi' | 
/** Turkish - Türkçe */
'tr' | 
/** Czech - Čeština */
'cs' | 
/** Greek - Ελληνικά */
'el' | 
/** Bulgarian - български */
'bg' | 
/** Russian - Pусский */
'ru' | 
/** Ukrainian - Українська */
'uk' | 
/** Hindi - हिन्दी */
'hi' | 
/** Thai - ไทย */
'th' | 
/** Chinese, China - 中文 */
'zh-CN' | 
/** Japanese - 日本語 */
'ja' | 
/** Chinese, Taiwan - 繁體中文 */
'zh-TW' | 
/** Korean - 한국어 */
'ko';

export declare const LOG_LEVELS: {
    readonly FATAL: 0;
    readonly ERROR: 1;
    readonly WARNING: 2;
    readonly INFO: 4;
    readonly DEBUG: 5;
};

/** For internal logging. */
export declare const LOG_SOURCES: {
    readonly GATEWAY: 0;
    readonly API: 1;
    readonly PARACORD: 2;
    readonly RPC: 3;
};

export declare type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

export declare type LogSource = typeof LOG_SOURCES[keyof typeof LOG_SOURCES];

export declare type MembershipStateType = 
/** INVITED */
1 | 
/** ACCEPTED */
2;

export declare type MentionableSelectMenu = {
    type: 7;
} & Omit<SelectMenu, 'options' | 'channel_types'>;

export declare type Message = {
    /** id of the message */
    id: Snowflake;
    /** id of the channel the message was sent in */
    channel_id: Snowflake;
    /** the author of this message (not guaranteed to be a valid user, see below) */
    author: User;
    /** contents of the message */
    content: string;
    /** when this message was sent */
    timestamp: ISO8601timestamp;
    /** when this message was edited (or null if never) */
    edited_timestamp: ISO8601timestamp | null;
    /** whether this was a TTS message */
    tts: boolean;
    /** whether this message mentions everyone */
    mention_everyone: boolean;
    /** users specifically mentioned in the message */
    mentions: User[];
    /** roles specifically mentioned in this message */
    mention_roles: Role[];
    /** channels specifically mentioned in this message */
    mention_channels?: ChannelMention[];
    /** any attached files */
    attachments: Attachment[];
    /** any embedded content */
    embeds: Embed[];
    /** reactions to the message */
    reactions?: Reaction[];
    /** used for validating a message was sent */
    nonce?: number | string;
    /** whether this message is pinned */
    pinned: boolean;
    /** if the message is generated by a webhook, this is the webhook's id */
    webhook_id?: Snowflake;
    /** type of message */
    type: MessageType;
    /** sent with Rich Presence-related chat embeds */
    activity?: MessageActivity;
    /** sent with Rich Presence-related chat embeds */
    application?: Partial<Application>;
    /** if the message is an Interaction or application-owned webhook, this is the id of the application */
    application_id?: Snowflake;
    /** data showing the source of a crosspost, channel follow add, pin, or reply message */
    message_reference?: MessageReference;
    /** message flags combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) */
    flags?: MessageFlags;
    /** the message associated with the message_reference */
    referenced_message?: Message | null;
    /** sent if the message is a response to an Interaction */
    interaction?: MessageInteraction;
    /** the thread that was started from this message, includes thread member object */
    thread?: Channel;
    /** sent if the message contains components like buttons, action rows, or other interactive components */
    components?: MessageComponent[];
    /** sent if the message contains stickers */
    sticker_items?: StickerItem[];
    /** Deprecated the stickers sent with the message */
    stickers?: Sticker[];
    /** A generally increasing integer (there may be gaps or duplicates) that represents the approximate position of the message in a thread, it can be used to estimate the relative position of the message in a thread in company with `total_message_sent` on parent thread */
    position?: number;
    /** data of the role subscription purchase or renewal that prompted this ROLE_SUBSCRIPTION_PURCHASE message */
    role_subscription_data?: RoleSubscriptionData;
};

export declare type MESSAGE_CREATE_EVENT = Message & MessageCreateExtraField;

export declare type MESSAGE_DELETE_BULK_EVENT = MessageDeleteBulkEventField;

export declare type MESSAGE_DELETE_EVENT = MessageDeleteEventField;

export declare type MESSAGE_REACTION_ADD_EVENT = MessageReactionAddEventField;

export declare type MESSAGE_REACTION_REMOVE_ALL_EVENT = MessageReactionRemoveAllEventField;

export declare type MESSAGE_REACTION_REMOVE_EMOJI_EVENT = MessageReactionRemoveEmojiEventField;

export declare type MESSAGE_REACTION_REMOVE_EVENT = MessageReactionRemoveEventField;

export declare type MESSAGE_UPDATE_EVENT = Partial<Message> & Pick<Message, 'id' | 'channel_id'>;

export declare type MessageActivity = {
    /** type of message activity */
    type: MessageActivityType;
    /** party_id from a Rich Presence event */
    party_id?: string;
};

export declare type MessageActivityType = 
/** JOIN */
1 | 
/** SPECTATE */
2 | 
/** LISTEN */
3 | 
/** JOIN_REQUEST */
5;

export declare type MessageCallback = {
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

export declare type MessageComponent = ActionRowComponent;

export declare type MessageComponentData = {
    /** the `custom_id` of the component */
    custom_id: string;
    /** the type of the component */
    component_type: ComponentType;
    /** values the user selected in a select menu component */
    values?: string[];
};

export declare type MessageCreateExtraField = {
    /** ID of the guild the message was sent in - unless it is an ephemeral message */
    guild_id?: Snowflake;
    /** Member properties for this message's author. Missing for ephemeral messages and messages from webhooks */
    member?: Partial<GuildMember>;
    /** Users specifically mentioned in the message */
    mentions: User[];
};

export declare type MessageDeleteBulkEventField = {
    /** IDs of the messages */
    ids: Snowflake[];
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
};

export declare type MessageDeleteEventField = {
    /** ID of the message */
    id: Snowflake;
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
};

export declare enum MessageFlags {
    CROSSPOSTED = 1,
    IS_CROSSPOST = 2,
    SUPPRESS_EMBEDS = 4,
    SOURCE_MESSAGE_DELETED = 8,
    URGENT = 16,
    HAS_THREAD = 32,
    EPHEMERAL = 64,
    LOADING = 128,
    FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 256,
    SUPPRESS_NOTIFICATIONS = 4096,
    IS_VOICE_MESSAGE = 8192
}

export declare type MessageInteraction = {
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

export declare type MessageReactionAddEventField = {
    /** ID of the user */
    user_id: Snowflake;
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the message */
    message_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
    /** Member who reacted if this happened in a guild */
    member?: GuildMember;
    /** Emoji used to react - example */
    emoji: Emoji;
};

export declare type MessageReactionRemoveAllEventField = {
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the message */
    message_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
};

export declare type MessageReactionRemoveEmojiEventField = {
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
    /** ID of the message */
    message_id: Snowflake;
    /** the emoji that was removed */
    emoji: Partial<Emoji>;
};

export declare type MessageReactionRemoveEventField = {
    /** ID of the user */
    user_id: Snowflake;
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the message */
    message_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
    /** Emoji used to react - example */
    emoji: Emoji;
};

export declare type MessageReference = {
    /** id of the originating message */
    message_id?: Snowflake;
    /** id of the originating message's channel */
    channel_id?: Snowflake;
    /** id of the originating message's guild */
    guild_id?: Snowflake;
    /** when sending, whether to error if the referenced message doesn't exist instead of sending as a normal (non-reply) message, default true */
    fail_if_not_exists?: boolean;
};

export declare type MessageType = 
/** DEFAULT */
0 | 
/** RECIPIENT_ADD */
1 | 
/** RECIPIENT_REMOVE */
2 | 
/** CALL */
3 | 
/** CHANNEL_NAME_CHANGE */
4 | 
/** CHANNEL_ICON_CHANGE */
5 | 
/** CHANNEL_PINNED_MESSAGE */
6 | 
/** USER_JOIN */
7 | 
/** GUILD_BOOST */
8 | 
/** GUILD_BOOST_TIER_1 */
9 | 
/** GUILD_BOOST_TIER_2 */
10 | 
/** GUILD_BOOST_TIER_3 */
11 | 
/** CHANNEL_FOLLOW_ADD */
12 | 
/** GUILD_DISCOVERY_DISQUALIFIED */
14 | 
/** GUILD_DISCOVERY_REQUALIFIED */
15 | 
/** GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING */
16 | 
/** GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING */
17 | 
/** THREAD_CREATED */
18 | 
/** REPLY */
19 | 
/** APPLICATION_COMMAND */
20 | 
/** THREAD_STARTER_MESSAGE */
21 | 
/** GUILD_INVITE_REMINDER */
22 | 
/** CONTEXT_MENU_COMMAND */
23 | 
/** AUTO_MODERATION_ACTION */
24 | 
/** INTERACTION_PREMIUM_UPSELL */
26 | 
/** STAGE_START */
27 | 
/** STAGE_END */
28 | 
/** STAGE_SPEAKER */
29 | 
/** STAGE_TOPIC */
31 | 
/** GUILD_APPLICATION_PREMIUM_SUBSCRIPTION */
32;

export declare type MFALevel = 
/** NONE */
0 | 
/** ELEVATED */
1;

/**
 * Returns a timestamp of some time in the future. -1 if provide timestamp has already passed
 * @param timestamp Unix timestamp.
 */
export declare function millisecondsFromNow(timestamp: number): number;

export declare const MINUTE_IN_MILLISECONDS: number;

export declare type ModalCallback = {
    /** a developer-defined identifier for the modal, max 100 characters */
    custom_id: string;
    /** the title of the popup modal, max 45 characters */
    title: string;
    /** between 1 and 5 (inclusive) components that make up the modal */
    components: Component[];
};

export declare type ModalSubmitData = {
    /** the `custom_id` of the modal */
    custom_id: string;
    /** the values submitted by the user */
    components: MessageComponent[];
};

export declare type NonLinkButton = Omit<Button, 'url' | 'style' | 'emoji'> & Pick<Required<Button>, 'custom_id'> & {
    style: Exclude<ButtonStyleType, 5>;
    emoji?: ButtonEmoji;
};

export declare type OnboardingPrompt = {
    /** ID of the prompt */
    id: Snowflake;
    /** Type of prompt */
    type: PromptType;
    /** Options available within the prompt */
    options: PromptOption[];
    /** Title of the prompt */
    title: string;
    /** Indicates whether users are limited to selecting one option for the prompt */
    single_select: boolean;
    /** Indicates whether the prompt is required before a user completes the onboarding flow */
    required: boolean;
    /** Indicates whether the prompt is present in the onboarding flow. If `false`, the prompt will only appear in the Channels & Roles tab */
    in_onboarding: boolean;
};

export declare type OptionalAuditEntryInfo = {
    /** ID of the app whose permissions were targeted */
    application_id: Snowflake;
    /** Name of the Auto Moderation rule that was triggered */
    auto_moderation_rule_name: string;
    /** Trigger type of the Auto Moderation rule that was triggered */
    auto_moderation_rule_trigger_type: string;
    /** Channel in which the entities were targeted */
    channel_id: Snowflake;
    /** Number of entities that were targeted */
    count: string;
    /** Number of days after which inactive members were kicked */
    delete_member_days: string;
    /** ID of the overwritten entity */
    id: Snowflake;
    /** Number of members removed by the prune */
    members_removed: string;
    /** ID of the message that was targeted */
    message_id: Snowflake;
    /** Name of the role if type is `"0"` (not present if type is `"1"`) */
    role_name: string;
    /** Type of overwritten entity - role (`"0"`) or member (`"1"`) */
    type: string;
};

declare interface Options {
    heartbeatIntervalOffset?: undefined | number;
    heartbeatTimeoutSeconds?: undefined | number;
    log: Gateway['log'];
    handleEvent: Gateway['handleEvent'];
}

export declare type Overwrite = {
    /** role or user id */
    id: Snowflake;
    /** either 0 (role) or 1 (member) */
    type: 0 | 1;
    /** permission bit set */
    allow: string;
    /** permission bit set */
    deny: string;
};

export declare const OVERWRITE_ROLE_VALUE = 0;

/** A client that provides caching and limited helper functions. Integrates the Api and Gateway clients into a seamless experience. */
declare class Paracord extends EventEmitter {
    #private;
    compressShards?: undefined | number[];
    readonly gatewayLoginQueue: Gateway[];
    /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
    private static validateParams;
    /**
     * Creates a new Paracord client.
     *
     * @param token Discord bot token. Will be coerced into a bot token.
     * @param options Settings for this Paracord instance.
     */
    constructor(token: string, options: ParacordOptions);
    get startingGateway(): Gateway | undefined;
    /** Gateway clients keyed to their shard #. */
    get shards(): GatewayMap;
    /** Whether or not there are gateways currently starting up. */
    get connecting(): boolean;
    /**
     * Processes a gateway event.
     * @param eventType The type of the event from the gateway. https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events (Events tend to be emitted in all caps and underlines in place of spaces.)
     * @param data From Discord.
     * @param gateway Gateway that emitted this event.
     */
    handleEvent(eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent, data: unknown, gateway: Gateway): void;
    /**
     * Simple alias for logging events emitted by this client.
     * @param level Key of the logging level of this message.
     * @param message Content of the log.
     * @param data Data pertinent to the event.
     */
    log(level: DebugLevel, message: string, data?: unknown): void;
    /**
     * Proxy emitter. Renames type with a key in `this.#events`.
     * @param args Any arguments to send with the emitted event.
     */
    emit(event: ParacordGatewayEvent | ParacordEvent, ...args: unknown[]): boolean;
    /**
     * Connects to Discord's gateway and begins receiving and emitting events.
     * @param options Options used when logging in.
     */
    login(options?: Partial<ParacordLoginOptions>): Promise<void>;
    end(): void;
    /** Begins the interval that kicks off gateway logins from the queue. */
    private startGatewayLoginInterval;
    /** Decides shards to spawn and pushes a gateway onto the queue for each one.
     * @param options Options used when logging in.
     */
    private enqueueGateways;
    /** Takes a gateway off of the queue and logs it in. */
    private processGatewayQueue;
    private checkUnavailable;
    private timeoutShard;
    /**
     * Creates gateway and pushes it into cache and login queue.
     * @param identity An object containing information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure
     */
    private addNewGateway;
    private createGatewayOptions;
    /**
     * Creates the handler used when connecting to Discord's gateway.
     * @param token Discord token. Will be coerced to bot token.
     * @param options
     */
    private setUpGateway;
    /** Runs with every GUILD_CREATE on initial start up. Decrements counter and emits `PARACORD_STARTUP_COMPLETE` when 0. */
    private checkIfDoneStarting;
    private completeShardStartup;
    private clearStartingShardState;
    /**
     * Cleans up Paracord start up process and emits `PARACORD_STARTUP_COMPLETE`.
     */
    private emitStartupComplete;
    /**
     * Prepares the client for caching guilds on start up.
     * @param data From Discord - Initial ready event after identify.
     */
    private handleGatewayReady;
    private handleGatewayClose;
    private upsertGatewayQueue;
    private isStartingGateway;
}
export { Paracord }
export default Paracord;

export declare const PARACORD_URL = "https://paracordjs.com/";

export declare const PARACORD_VERSION_NUMBER = "0.5";

export declare type ParacordEvent = 'PARACORD_STARTUP_COMPLETE' | 'SHARD_STARTUP_COMPLETE';

export declare type ParacordGatewayEvent = 'DEBUG' | 'GATEWAY_OPEN' | 'GATEWAY_CLOSE' | 'GATEWAY_RESUME' | 'GATEWAY_IDENTIFY' | 'HEARTBEAT_SENT' | 'HEARTBEAT_ACK' | 'GUILD_MEMBERS_CHUNK' | 'REQUEST_GUILD_MEMBERS';

export declare type ParacordGatewayOptions = Omit<GatewayOptions, 'emitter' | 'identity'>;

export declare interface ParacordLoginOptions {
    identity: IdentityOptions;
    shards?: number[];
    shardCount?: number;
    /** Function that determines if the gateway is allowed to connect. */
    allowConnection?: undefined | ((gw: Gateway) => boolean | Promise<boolean>);
}

export declare interface ParacordOptions {
    gatewayOptions: ParacordGatewayOptions;
    unavailableGuildTolerance?: number;
    unavailableGuildWait?: number;
    shardStartupTimeout?: number;
    compressShards?: number[];
}

export declare interface ParacordStartupEvent {
    shard: Gateway;
    forced?: boolean;
    resumed?: boolean;
}

declare type PermissibleChannel = Pick<GuildChannel, 'id' | 'permission_overwrites'>;

declare type PermissibleGuild = Pick<Guild, 'id' | 'owner_id' | 'roles'>;

declare type PermissibleMember = Pick<Required<GuildMember>, 'user' | 'roles'>;

export declare const PERMISSIONS: {
    readonly CREATE_INSTANT_INVITE: bigint;
    readonly KICK_MEMBERS: bigint;
    readonly BAN_MEMBERS: bigint;
    readonly ADMINISTRATOR: bigint;
    readonly MANAGE_CHANNELS: bigint;
    readonly MANAGE_GUILD: bigint;
    readonly ADD_REACTIONS: bigint;
    readonly VIEW_AUDIT_LOG: bigint;
    readonly PRIORITY_SPEAKER: bigint;
    readonly STREAM: bigint;
    readonly VIEW_CHANNEL: bigint;
    readonly SEND_MESSAGES: bigint;
    readonly SEND_TTS_MESSAGES: bigint;
    readonly MANAGE_MESSAGES: bigint;
    readonly EMBED_LINKS: bigint;
    readonly ATTACH_FILES: bigint;
    readonly READ_MESSAGE_HISTORY: bigint;
    readonly MENTION_EVERYONE: bigint;
    readonly USE_EXTERNAL_EMOJIS: bigint;
    readonly VIEW_GUILD_INSIGHTS: bigint;
    readonly CONNECT: bigint;
    readonly SPEAK: bigint;
    readonly MUTE_MEMBERS: bigint;
    readonly DEAFEN_MEMBERS: bigint;
    readonly MOVE_MEMBERS: bigint;
    readonly USE_VAD: bigint;
    readonly CHANGE_NICKNAME: bigint;
    readonly MANAGE_NICKNAMES: bigint;
    readonly MANAGE_ROLES: bigint;
    readonly MANAGE_WEBHOOKS: bigint;
    readonly MANAGE_GUILD_EXPRESSIONS: bigint;
    readonly USE_APPLICATION_COMMANDS: bigint;
    readonly REQUEST_TO_SPEAK: bigint;
    readonly MANAGE_EVENTS: bigint;
    readonly MANAGE_THREADS: bigint;
    readonly CREATE_PUBLIC_THREADS: bigint;
    readonly CREATE_PRIVATE_THREADS: bigint;
    readonly USE_EXTERNAL_STICKERS: bigint;
    readonly SEND_MESSAGES_IN_THREADS: bigint;
    readonly USE_EMBEDDED_ACTIVITIES: bigint;
    readonly MODERATE_MEMBERS: bigint;
    readonly VIEW_CREATOR_MONETIZATION_ANALYTICS: bigint;
    readonly USE_SOUNDBOARD: bigint;
    readonly SEND_VOICE_MESSAGES: bigint;
};

export declare type PremiumTier = 
/** NONE */
0 | 
/** TIER_1 */
1 | 
/** TIER_2 */
2 | 
/** TIER_3 */
3;

export declare type PremiumType = 
/** None */
0 | 
/** Nitro Classic */
1 | 
/** Nitro */
2 | 
/** Nitro Basic */
3;

export declare type Presence = {
    /** User whose presence is being updated */
    user: User;
    /** ID of the guild */
    guild_id: Snowflake;
    /** either "idle", "dnd", "online", or "offline" */
    status: StatusType;
    /** User's current activities */
    activities: Activity[];
    /** User's platform-dependent status */
    client_status: ClientStatus;
};

export declare type PRESENCE_UPDATE_EVENT = GatewayPresence;

export declare type PromptOption = {
    /** ID of the prompt option */
    id: Snowflake;
    /** IDs for channels a member is added to when the option is selected */
    channel_ids: Snowflake[];
    /** IDs for roles assigned to a member when the option is selected */
    role_ids: Snowflake[];
    /** Emoji of the option */
    emoji: Emoji;
    /** Title of the option */
    title: string;
    /** Description of the option */
    description: string | null;
};

export declare type PromptType = 
/** MULTIPLE_CHOICE */
0 | 
/** DROPDOWN */
1;

export declare type QueryStringParam = {
    /** include number of users subscribed to each event */
    with_user_count?: boolean;
};

export declare class QueuedRequest {
    #private;
    constructor(request: ApiRequest, resolve: (response: ApiResponse) => void, reject: (reason?: unknown) => void);
    get request(): ApiRequest;
    resolve(response: ApiResponse): void;
    reject(reason?: unknown): void;
}

/** State of a Discord rate limit. */
export declare class RateLimit {
    #private;
    /** Timestamp of when this rate limit will expire if not accessed again before then. */
    expires: number;
    /**
     * Creates a new rate limit state.
     * @param rateLimitState
     * @param template
     */
    constructor({ remaining, resetTimestamp, limit }: IncomingRateLimit, template: RateLimitTemplate);
    /**
     * If the request cannot be made without triggering a Discord rate limit.
     * `true` if the rate limit exists and is active. Do no send a request.
     */
    get isRateLimited(): boolean;
    /** If it is past the time Discord said the rate limit would reset. */
    private get rateLimitHasReset();
    /** If a request can be made without triggering a Discord rate limit. */
    private get hasRemainingUses();
    /** How long until the rate limit resets in ms. */
    get waitFor(): number;
    private refreshExpire;
    /** Reduces the remaining requests (before internally rate limiting) by 1. */
    decrementRemaining(): void;
    /**
     * Updates state properties if incoming state is more "strict".
     * Strictness is defined by the value that decreases the chance of getting rate limit.
     * @param rateLimit
     */
    assignIfStricter({ remaining, resetTimestamp, limit }: IncomingRateLimit): void;
    /** Sets the remaining requests back to the known limit. */
    private resetRemaining;
}

/** From Discord - A uid that identifies a group of requests that share a rate limit. */
declare type RateLimitBucketHash = string;

/** Stores the state of all known rate limits this client has encountered. */
export declare class RateLimitCache {
    #private;
    /** Request meta values to their associated rate limit bucket, if one exists. */
    bucketHashes: Map<string, RateLimitBucketHash>;
    constructor(globalRateLimitMax: number, globalRateLimitResetPadding: number, api: undefined | Api);
    /**
     * If the request cannot be made without triggering a Discord rate limit.
     * `true` if the rate limit exists and is active. Do no send a request.
     */
    private get isGloballyRateLimited();
    /** If it is past the time Discord said the rate limit would reset. */
    private get globalRateLimitHasReset();
    /** If a request can be made without triggering a Discord rate limit. */
    private get globalRateLimitHasRemainingUses();
    /** How long until the rate limit resets in ms. */
    private get globalRateLimitResetAfter();
    end(): void;
    /** Decorator for requests. Decrements rate limit when executing if one exists for this request. */
    wrapRequest(requestFunc: AxiosInstance['request']): WrappedRequest;
    private decrementGlobalRemaining;
    /**
     * Authorizes a request being check via the rate limit rpc service.
     *
     * @param {BaseRequest} request Request's rate limit key formed in BaseRequest.
     * @returns {number} Until when the client should wait before asking to authorize this request again.
     */
    authorizeRequestFromClient(request: BaseRequest): RateLimitState;
    /**
     * Updates this cache using the response headers after making a request.
     *
     * @param request Request that was made.
     * @param rateLimitHeaders Rate limit values from the response.
     */
    update(rateLimitKey: string, bucketHashKey: string, rateLimitHeaders: RateLimitHeaders): void;
    /**
     * Sets the global rate limit state if the response headers indicate a global rate limit.
     *
     * @param rateLimitHeaders Rate limit values from the response.
     */
    updateGlobal(rateLimitHeaders: RateLimitHeaders): void;
    /**
     * Runs a request's rate limit meta against the cache to determine if it would trigger a rate limit.
     *
     * @param request The request to reference when checking the rate limit state.
     * @returns `true` if rate limit would get triggered.
     */
    isRateLimited(request: BaseRequest | ApiRequest): RateLimitState;
    /** Sets the remaining requests back to the known limit. */
    private resetGlobalRateLimit;
    /**
     * Gets the rate limit, creating a new one from an existing template if the rate limit does not already exist.
     *
     * @param request Request that may have a rate limit.
     * @return `undefined` when there is no cached rate limit or matching template for this request.
     */
    private getRateLimitFromCache;
    getBucket(bucketHashKey: string): string | undefined;
    /**
     * Updates this cache using the response headers after making a request.
     *
     * @param request Request that was made.
     * @param bucketHash uid of the rate limit's bucket.
     */
    private rateLimitFromTemplate;
}

export declare interface RateLimitedResponse extends ApiResponse<{
    retry_after: number;
    global: boolean;
    message: string;
}> {
    status: 429;
    statusText: 'Too Many Requests';
}

/** Representation of rate limit values from the header of a response from Discord. */
export declare class RateLimitHeaders {
    /** From Discord - If the request was globally rate limited. */
    global: boolean;
    /** From Discord - Id of the rate limit bucket. */
    bucketHash: string | undefined;
    /** From Discord - Number of requests that can be made between rate limit triggers. */
    limit: number;
    /** From Discord - Number of requests available before hitting rate limit. */
    remaining: number;
    /** From Discord - How long in ms the rate limit resets. */
    resetAfter: number;
    /** From Discord - How long in ms the rate sub-limit resets. (Same as resetAfter if there is no sub-limit.) */
    retryAfter: number;
    /** A localized timestamp of when the rate limit resets. */
    resetTimestamp: number;
    /**
     * Extracts the rate limit state information if they exist from a set of response headers.
     * @param headers Headers from a response.
     * @returns Rate limit state with the bucket hash; or `undefined` if there is no rate limit information.
     */
    static extractRateLimitFromHeaders(headers: ApiResponse['headers'], retryAfter: undefined | number): RateLimitHeaders;
    /**
     * Creates a new rate limit headers.
     *
     * @param global From Discord - If the request was globally rate limited.
     * @param bucketHash From Discord - Id of the rate limit bucket.
     * @param limit From Discord - Number of requests that can be made between rate limit triggers.
     * @param remaining From Discord - Number of requests available before hitting rate limit.
     * @param resetAfter From Discord - How long in ms the rate limit resets.
     * @param retryAfter From Discord - The retry value from a 429 body. Sub-limits may make this value larger than resetAfter.
     */
    constructor(global: boolean, bucketHash: string | undefined, limit: number, remaining: number, resetAfter: number, retryAfter: undefined | number);
    /** Whether or not the header values indicate the request has a rate limit. */
    get hasState(): boolean;
    /** Values to send over the rate limit service rpc. */
    get rpcArgs(): RpcArguments;
}

/** Rate limit keys to their associated state. */
export declare class RateLimitMap extends Map<string, RateLimit> {
    #private;
    constructor(logger?: undefined | Api);
    end(): void;
    /**
     * Inserts rate limit if not exists. Otherwise, updates its state.
     * @param rateLimitKey Internally-generated key for this state.
     * @param state Rate limit state derived from response headers.
     */
    upsert(rateLimitKey: string, { remaining, limit, resetTimestamp, resetAfter: waitFor, }: IncomingRateLimit, template: RateLimitTemplate): RateLimit;
    /** Removes old rate limits from cache. */
    private sweepExpiredRateLimits;
}

export declare type RateLimitState = {
    waitFor: number;
    global?: boolean;
};

/** A frozen instance of a rate limit that is used as a reference for requests with the same bucket but without an existing cached state. */
export declare class RateLimitTemplate {
    /** From Discord - Rate limit request cap. */
    limit: number;
    /** From Discord - Highest value seen from Discord for rate limit reset wait in ms. */
    resetAfter: number;
    /** Creates a new rate limit state. */
    constructor({ limit, resetAfter }: RateLimitHeaders);
    /** Updates state properties. */
    update({ limit, resetAfter }: RateLimitHeaders): void;
}

/** Buckets to observed rate limit defaults. */
export declare class RateLimitTemplateMap extends Map<string, RateLimitTemplate> {
    /**
     * Insert or updates rate limit template using state.
     * @param state Incoming rate limit state.
     */
    upsert(bucketHash: string, state: RateLimitHeaders): RateLimitTemplate;
    /**
     * Creates a new rate limit from a template if there is one.
     * @param bucketHash uid of rate limit bucket.
     */
    createAssumedRateLimit(bucketHash: string): RateLimit | undefined;
}

export declare type Reaction = {
    /** times this emoji has been used to react */
    count: number;
    /** whether the current user reacted using this emoji */
    me: boolean;
    /** emoji information */
    emoji: Partial<Emoji>;
};

export declare type READY_EVENT = ReadyEventField;

export declare type ReadyEventField = {
    /** API version */
    v: number;
    /** Information about the user including email */
    user: User;
    /** Guilds the user is in */
    guilds: UnavailableGuild[];
    /** Used for resuming connections */
    session_id: string;
    /** Gateway URL for resuming connections */
    resume_gateway_url: string;
    /** Shard information associated with this session, if sent when identifying */
    shard?: [number, number];
    /** Contains `id` and `flags` */
    application: Partial<Application>;
};

export declare type RemoteApiResponse<T = any> = {
    /** The HTTP status code of the response. */
    status: number;
    /** Status message returned by the server. (e.g. "OK" with a 200 status) */
    statusText: string;
    /** Data response from Discord not having yet been parsed into json. */
    data: T;
    /** If the response failed validation. */
    isApiError?: true;
};

export declare type RequestFormDataFunction = () => Pick<RequestOptions, 'headers' | 'params'> & {
    data?: Record<string, unknown> | FormData_2 | undefined;
};

/** Optional parameters for a Discord REST request. */
export declare interface RequestOptions {
    /** Data to send in the body of the request. */
    data?: unknown | undefined;
    /** Headers to send with the request. */
    headers?: Record<string, unknown> | undefined;
    /** Url params to send with the request. */
    params?: Record<string, unknown> | undefined;
    /** Function to generate form that will be used in place of data. Overwrites `data` and `headers`. */
    createForm?: RequestFormDataFunction | undefined;
    /** If `true`, executes the request locally ignoring any rpc services. Be sure to `startQueue()` to handle rate limited requests. */
    local?: boolean;
    /** Set to true to not retry the request on a bucket 429 rate limit. */
    returnOnRateLimit?: boolean;
    /** Set to true to not retry the request on a global rate limit. */
    returnOnGlobalRateLimit?: boolean;
    /** A known hard value for the bot's global rate limits. Defaults to 50. */
    globalRateLimitMax?: number;
    /** Time in milliseconds to add to 1 second internal global rate limit reset timer. */
    globalRateLimitResetPadding?: number;
    /** Discord api version to use when making requests. Default: 10 */
    version?: number;
    /**
     * The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides both "returnOn" options.
     * Leave `undefined` for indefinite retries. `0` is effectively `returnOnRateLimit = true` and `returnOnGlobalRateLimit = true`.
     */
    maxRateLimitRetry?: number;
    /** Set by the rpc request service to preempt parsing the response before sending it to the client. */
    transformResponse?: (x: Record<string, unknown>) => Record<string, unknown>;
    /** Check if status is okay. Return with `false` to throw an error. Default throw on non-200 code. */
    validateStatus?: null | ((status: number) => boolean);
}

/** A queue for rate limited requests waiting to be sent. */
export declare class RequestQueue {
    #private;
    /**
     * Creates a new requests queue for rate limits requests.
     * @param apiClient Api client through which to emit events.
     */
    constructor(apiClient: Api);
    end(): void;
    /**
     * Adds any number of requests to the queue.
     * @param items Request objects being queued.
     */
    push(...items: QueuedRequest[]): void;
    private processQueue;
    private sendRequest;
}

declare interface RequestService {
    hello(): Promise<void>;
    request<T>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>>;
    allowFallback: boolean;
    target: string;
}

export declare type ResolvedData = {
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

export declare type Resume = {
    /** Session token */
    token: string;
    /** Session ID */
    session_id: string;
    /** Last sequence number received */
    seq: number;
};

export declare type Role = {
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

export declare type RoleSelectMenu = {
    type: 6;
} & Omit<SelectMenu, 'options' | 'channel_types'>;

export declare type RoleSubscriptionData = {
    /** the id of the sku and listing that the user is subscribed to */
    role_subscription_listing_id: Snowflake;
    /** the name of the tier that the user is subscribed to */
    tier_name: string;
    /** the cumulative number of months that the user has been subscribed for */
    total_months_subscribed: number;
    /** whether this notification is for a renewal rather than a new purchase */
    is_renewal: boolean;
};

export declare type RoleTag = {
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

export declare const RPC_CLOSE_CODES: {
    readonly LOST_CONNECTION: 14;
};

declare type RpcArguments = [boolean, string | undefined, number, number, number, number | undefined];

declare interface RpcServerOptions {
    host?: string;
    port?: string | number;
    channel?: ServerCredentials;
    emitter?: EventEmitter;
    apiClient?: Api;
    globalRateLimitMax?: number;
    globalRateLimitResetPadding?: number;
}

export declare const SECOND_IN_MILLISECONDS = 1000;

export declare type SelectMenu = {
    /** Type of select menu component (text: `3`, user: `5`, role: `6`, mentionable: `7`, channels: `8`) */
    type: ComponentType;
    /** ID for the select menu; max 100 characters */
    custom_id: string;
    /** Specified choices in a select menu (only required and available for string selects (type `3`); max 25 */
    options?: SelectOption[];
    /** List of channel types to include in the channel select component (type `8`) */
    channel_types?: ChannelType[];
    /** Placeholder text if nothing is selected; max 150 characters */
    placeholder?: string;
    /** Minimum number of items that must be chosen (defaults to 1); min 0, max 25 */
    min_values?: number;
    /** Maximum number of items that can be chosen (defaults to 1); max 25 */
    max_values?: number;
    /** Whether select menu is disabled (defaults to `false`) */
    disabled?: boolean;
};

export declare type SelectOption = {
    /** User-facing name of the option; max 100 characters */
    label: string;
    /** Dev-defined value of the option; max 100 characters */
    value: string;
    /** Additional description of the option; max 100 characters */
    description?: string;
    /** `id`, `name`, and `animated` */
    emoji?: Partial<Emoji>;
    /** Will show this option as selected by default */
    default?: boolean;
};

/**
 * Rpc server.
 * @extends grpc.Server
 */
export declare class Server extends grpc.Server {
    #private;
    /** Emitter for debug logging. */
    emitter?: undefined | EventEmitter;
    /** Api client when the "request" service is added. */
    apiClient?: undefined | Api;
    /** Cache for rate limits when having client authorize against server. */
    rateLimitCache: RateLimitCache;
    /**
     * Creates a new rpc Server.
     * @param options
     */
    constructor(options?: RpcServerOptions);
    /** Establishes the arguments that will be passed to `bindAsync()` when starting the server. */
    private get bindArgs();
    /**
     * Adds the request service to this server. Allows the server to handle Discord API requests from clients.
     * @param token Discord token. Will be coerced into a bot token.
     * @param apiOptions Optional parameters for the api handler.
     */
    addRequestService(token: string, apiOptions?: ApiOptions): void;
    /** Adds the rate limit service to this server. Stores app-wide rate limits centrally and authorizes requests.. */
    addRateLimitService(): void;
    /** Start the server. */
    serve(): void;
    /** Emits a log event. */
    log(level: DebugLevel, message: string): void;
    /**
     * Emits logging events.
     * @param type Event name.
     * @param event Data emitted.
     */
    emit(type: string, event: IDebugEvent): void;
}

export declare type Service = [
/** Battle.net */
'battlenet' | 
/** eBay */
'ebay' | 
/** Epic Games */
'epicgames' | 
/** Facebook */
'facebook' | 
/** GitHub */
'github' | 
/** Instagram */
'instagram' | 
/** League of Legends */
'leagueoflegends' | 
/** PayPal */
'paypal' | 
/** PlayStation Network */
'playstation' | 
/** Reddit */
'reddit' | 
/** Riot Games */
'riotgames' | 
/** Spotify */
'spotify' | 
/** Skype */
'skype' | 
/** Steam */
'steam' | 
/** TikTok */
'tiktok' | 
/** Twitch */
'twitch' | 
/** Twitter */
'twitter' | 
/** Xbox */
'xbox' | 
/** YouTube */
'youtube'
];

export declare interface ServiceOptions {
    host?: string;
    port?: string | number;
    channel?: ChannelCredentials;
    allowFallback?: boolean;
}

export declare type SessionLimitData = {
    /** Total number of identifies application can make in this period. */
    total: number;
    /** Identifies remaining for this period. */
    remaining: number;
    /** How long in ms until `remaining` resets. */
    reset_after: number;
    /** How many shards are allowed to identify in parallel. */
    max_concurrency: number;
};

/** A script that spawns shards into pm2, injecting shard information into the Paracord client. */
export declare class ShardLauncher {
    #private;
    /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
    private static validateParams;
    /**
     * Creates a new shard launcher.
     * @param main Relative location of the app's entry file.
     * @param options Optional parameters for this handler.
     */
    constructor(main: string, options: ShardLauncherOptions);
    /**
     * Launches shards.
     * pm2Options
     */
    launch(pm2Options?: StartOptions): Promise<void>;
    launchShard(shardIds: InternalShardIds, shardCount: number, pm2Options: StartOptions): Promise<void>;
}

export declare interface ShardLauncherOptions {
    token?: string;
    shardIds?: InternalShardIds;
    shardChunks?: InternalShardIds[];
    shardCount?: number;
    appName?: string;
    env?: Record<string, unknown>;
}

export declare function shortMethod(method: string): "" | "g" | "p" | "o" | "a" | "d";

export declare type Snowflake = string;

export declare type SortOrderType = 
/** LATEST_ACTIVITY */
0 | 
/** CREATION_DATE */
1;

export declare type STAGE_INSTANCE_CREATE_EVENT = StageInstance;

export declare type STAGE_INSTANCE_DELETE_EVENT = StageInstance;

export declare type STAGE_INSTANCE_UPDATE_EVENT = StageInstance;

export declare type StageInstance = {
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
    /** The id of the scheduled event for this Stage instance */
    guild_scheduled_event_id: Snowflake | null;
};

declare interface StartOptions {
    /**
     * Enable or disable auto restart after process failure (default: true).
     */
    autorestart?: boolean;
    /**
     * List of exit codes that should allow the process to stop (skip autorestart).
     */
    stop_exit_codes?: number[];
    /**
     * An arbitrary name that can be used to interact with (e.g. restart) the process
     * later in other commands. Defaults to the script name without its extension
     * (eg “testScript” for “testScript.js”)
     */
    name?: string;
    /**
     * The path of the script to run
     */
    script?: string;
    /**
     * A string or array of strings composed of arguments to pass to the script.
     */
    args?: string | string[];
    /**
     * A string or array of strings composed of arguments to call the interpreter process with.
     * Eg “–harmony” or [”–harmony”,”–debug”]. Only applies if interpreter is something other
     * than “none” (its “node” by default).
     */
    interpreter_args?: string | string[];
    /**
     * The working directory to start the process with.
     */
    cwd?: string;
    /**
     * (Default: “~/.pm2/logs/app_name-out.log”) The path to a file to append stdout output to.
     * Can be the same file as error.
     */
    output?: string;
    /**
     * (Default: “~/.pm2/logs/app_name-error.err”) The path to a file to append stderr output to. Can be the same file as output.
     */
    error?: string;
    /**
     * The display format for log timestamps (eg “YYYY-MM-DD HH:mm Z”). The format is a moment display format.
     */
    log_date_format?: string;
    /**
     * Default: “~/.pm2/logs/~/.pm2/pids/app_name-id.pid”)
     * The path to a file to write the pid of the started process. The file will be overwritten.
     * Note that the file is not used in any way by pm2 and so the user is free to manipulate or
     * remove that file at any time. The file will be deleted when the process is stopped or the daemon killed.
     */
    pid?: string;
    /**
     * The minimum uptime of the script before it’s considered successfully started.
     */
    min_uptime?: number;
    /**
     * The maximum number of times in a row a script will be restarted if it exits in less than min_uptime.
     */
    max_restarts?: number;
    /**
     * If sets and script’s memory usage goes about the configured number, pm2 restarts the script.
     * Uses human-friendly suffixes: ‘K’ for kilobytes, ‘M’ for megabytes, ‘G’ for gigabytes’, etc. Eg “150M”.
     */
    max_memory_restart?: number | string;
    /**
     * Arguments to pass to the interpreter
     */
    node_args?: string | string[];
    /**
     * Prefix logs with time
     */
    time?: boolean;
    /**
     * This will make PM2 listen for that event. In your application you will need to add process.send('ready');
     * when you want your application to be considered as ready.
     */
    wait_ready?: boolean;
    /**
     * (Default: 1600)
     * The number of milliseconds to wait after a stop or restart command issues a SIGINT signal to kill the
     * script forceably with a SIGKILL signal.
     */
    kill_timeout?: number;
    /**
     * (Default: 0) Number of millseconds to wait before restarting a script that has exited.
     */
    restart_delay?: number;
    /**
     * (Default: “node”) The interpreter for your script (eg “python”, “ruby”, “bash”, etc).
     * The value “none” will execute the ‘script’ as a binary executable.
     */
    interpreter?: string;
    /**
     * (Default: ‘fork’) If sets to ‘cluster’, will enable clustering
     * (running multiple instances of the script).
     */
    exec_mode?: string;
    /**
     * (Default: 1) How many instances of script to create. Only relevant in exec_mode ‘cluster’.
     */
    instances?: number;
    /**
     * (Default: false) If true, merges the log files for all instances of script into one stderr log
     * and one stdout log. Only applies in ‘cluster’ mode. For example, if you have 4 instances of
     * ‘test.js’ started via pm2, normally you would have 4 stdout log files and 4 stderr log files,
     * but with this option set to true you would only have one stdout file and one stderr file.
     */
    merge_logs?: boolean;
    /**
     * If set to true, the application will be restarted on change of the script file.
     */
    watch?: boolean|string[];
    /**
     * (Default: false) By default, pm2 will only start a script if that script isn’t
     * already running (a script is a path to an application, not the name of an application
     * already running). If force is set to true, pm2 will start a new instance of that script.
     */
    force?: boolean;
    ignore_watch?: string[];
    cron?: any;
    execute_command?: any;
    write?: any;
    source_map_support?: any;
    disable_source_map_support?: any;
    /**
     * The environment variables to pass on to the process.
     */
    env?: { [key: string]: string; };
    /**
     * NameSpace for the process
     * @default 'default'
     * @example 'production'
     * @example 'development'
     * @example 'staging'
     */
    namespace?: string;
}

export declare type STARTUP_GUILD_EVENT = GUILD_CREATE_EVENT | UNAVAILABLE_GUILD;

export declare type StatusType = 
/** Online */
'online' | 
/** Do Not Disturb */
'dnd' | 
/** AFK */
'idle' | 
/** Invisible and shown as offline */
'invisible' | 
/** Offline */
'offline';

export declare type Sticker = {
    /** id of the sticker */
    id: Snowflake;
    /** for standard stickers, id of the pack the sticker is from */
    pack_id?: Snowflake;
    /** name of the sticker */
    name: string;
    /** description of the sticker */
    description: string | null;
    /** autocomplete/suggestion tags for the sticker (max 200 characters) */
    tags: string;
    /** Deprecated previously the sticker asset hash, now an empty string */
    asset?: string;
    /** type of sticker */
    type: StickerFormatType;
    /** type of sticker format */
    format_type: number;
    /** whether this guild sticker can be used, may be false due to loss of Server Boosts */
    available?: boolean;
    /** id of the guild that owns this sticker */
    guild_id?: Snowflake;
    /** the user that uploaded the guild sticker */
    user?: User;
    /** the standard sticker's sort order within its pack */
    sort_value?: number;
};

export declare type StickerFormatType = 
/** PNG */
1 | 
/** APNG */
2 | 
/** LOTTIE */
3 | 
/** GIF */
4;

export declare type StickerItem = {
    /** id of the sticker */
    id: Snowflake;
    /** name of the sticker */
    name: string;
    /** type of sticker format */
    format_type: number;
};

export declare type StickerPack = {
    /** id of the sticker pack */
    id: Snowflake;
    /** the stickers in the pack */
    stickers: Sticker[];
    /** name of the sticker pack */
    name: string;
    /** id of the pack's SKU */
    sku_id: Snowflake;
    /** id of a sticker in the pack which is shown as the pack's icon */
    cover_sticker_id?: Snowflake;
    /** description of the sticker pack */
    description: string;
    /** id of the sticker pack's banner image */
    banner_asset_id?: Snowflake;
};

export declare type StringSelectMenu = {
    type: 3;
} & Omit<SelectMenu, 'channel_types'> & Pick<Required<SelectMenu>, 'options'>;

export declare function stripLeadingSlash(url: string): string;

export declare type SubMessageComponent = NonLinkButton | LinkButton | StringSelectMenu | UserSelectMenu | RoleSelectMenu | MentionableSelectMenu | ChannelSelectMenu;

export declare enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 2,
    SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 4,
    SUPPRESS_JOIN_NOTIFICATION_REPLIES = 8,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS = 16,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES = 32
}

export declare type Team = {
    /** a hash of the image of the team's icon */
    icon: string | null;
    /** the unique id of the team */
    id: Snowflake;
    /** the members of the team */
    members: TeamMember[];
    /** the name of the team */
    name: string;
    /** the user id of the current team owner */
    owner_user_id: Snowflake;
};

export declare type TeamMember = {
    /** the user's membership state on the team */
    membership_state: MembershipStateType;
    /** will always be `""]` */
    permissions: string[];
    /** the id of the parent team of which they are a member */
    team_id: Snowflake;
    /** the avatar, discriminator, id, and username of the user */
    user: Partial<User>;
};

export declare type TextInput = {
    /** `4` for a text input */
    type: 4;
    /** Developer-defined identifier for the input; max 100 characters */
    custom_id: string;
    /** The Text Input Style */
    style: number;
    /** Label for this component; max 45 characters */
    label: string;
    /** Minimum input length for a text input; min 0, max 4000 */
    min_length?: number;
    /** Maximum input length for a text input; min 1, max 4000 */
    max_length?: number;
    /** Whether this component is required to be filled (defaults to `true`) */
    required?: boolean;
    /** Pre-filled value for this component; max 4000 characters */
    value?: string;
    /** Custom placeholder text if the input is empty; max 100 characters */
    placeholder?: string;
};

export declare type TextInputStyleType = 
/** Short */
1 | 
/** Paragraph */
2;

export declare type THREAD_CREATE_EVENT = GuildThread & {
    newly_created: true;
};

export declare type THREAD_DELETE_EVENT = Pick<Required<Channel>, 'id' | 'guild_id' | 'parent_id' | 'type'>;

export declare type THREAD_LIST_SYNC_EVENT = ThreadListSyncEventField;

export declare type THREAD_MEMBER_UPDATE_EVENT = ThreadMember & ThreadMemberUpdateEventExtraField;

export declare type THREAD_MEMBERS_UPDATE_EVENT = ThreadMembersUpdateEventField;

export declare type ThreadListSyncEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** Parent channel IDs whose threads are being synced.If omitted, then threads were synced for the entire guild.This array may contain channel_ids that have no active threads as well, so you know to clear that data. */
    channel_ids?: Snowflake[];
    /** All active threads in the given channels that the current user can access */
    threads: Channel[];
    /** All thread member objects from the synced threads for the current user, indicating which threads the current user has been added to */
    members: ThreadMember[];
};

export declare type ThreadMember = {
    /** ID of the thread */
    id?: Snowflake;
    /** ID of the user */
    user_id?: Snowflake;
    /** Time the user last joined the thread */
    join_timestamp: ISO8601timestamp;
    /** Any user-thread settings, currently only used for notifications */
    flags: number;
    /** Additional information about the user */
    member?: GuildMember;
};

export declare type ThreadMembersUpdateEventField = {
    /** ID of the thread */
    id: Snowflake;
    /** ID of the guild */
    guild_id: Snowflake;
    /** Approximate number of members in the thread, capped at 50 */
    member_count: number;
    /** Users who were added to the thread */
    added_members?: ThreadMember[];
    /** ID of the users who were removed from the thread */
    removed_member_ids?: Snowflake[];
};

export declare type ThreadMemberUpdateEventExtraField = {
    /** ID of the guild */
    guild_id: Snowflake;
};

export declare type ThreadMetadata = {
    /** whether the thread is archived */
    archived: boolean;
    /** the thread will stop showing in the channel list after `auto_archive_duration` minutes of inactivity, can be set to: 60, 1440, 4320, 10080 */
    auto_archive_duration: number;
    /** timestamp when the thread's archive status was last changed, used for calculating recent activity */
    archive_timestamp: ISO8601timestamp;
    /** whether the thread is locked; when a thread is locked, only users with MANAGE_THREADS can unarchive it */
    locked: boolean;
    /** whether non-moderators can add other non-moderators to a thread; only available on private threads */
    invitable?: boolean;
    /** timestamp when the thread was created; only populated for threads created after 2022-01-09 */
    create_timestamp?: ISO8601timestamp | null;
};

/**
 * Extract a timestamp from a Discord snowflake.
 * @param snowflake Discord snowflake.
 */
export declare function timestampFromSnowflake(snowflake: Snowflake): number;

/**
 * Returns a timestamp of some time in the future.
 * @param milliseconds Number of milliseconds from now to base the timestamp on.
 */
export declare function timestampNMillisecondsInFuture(milliseconds: number): number;

/**
 * Returns a timestamp of some time in the future.
 * @param seconds Number of seconds from now to base the timestamp on.
 */
export declare function timestampNSecondsInFuture(seconds: number): number;

export declare type TriggerMetadata = {
    /** KEYWORD */
    keyword_filter: string[];
    /** KEYWORD */
    regex_patterns: string[];
    /** KEYWORD_PRESET */
    presets: KeywordPresetType[];
    /** KEYWORD, KEYWORD_PRESET */
    allow_list: string[];
    /** MENTION_SPAM */
    mention_total_limit: number;
    /** MENTION_SPAM */
    mention_raid_protection_enabled: boolean;
};

export declare type TriggerType = 
/** KEYWORD */
1 | 
/** SPAM */
3 | 
/** KEYWORD_PRESET */
4 | 
/** MENTION_SPAM */
5;

export declare type TYPING_START_EVENT = TypingStartEventField;

export declare type TypingStartEventField = {
    /** ID of the channel */
    channel_id: Snowflake;
    /** ID of the guild */
    guild_id?: Snowflake;
    /** ID of the user */
    user_id: Snowflake;
    /** Unix time (in seconds) of when the user started typing */
    timestamp: number;
    /** Member who started typing if this happened in a guild */
    member?: GuildMember;
};

export declare type UNAVAILABLE_GUILD = {
    id: string;
    unavailable: true;
};

export declare type UnavailableGuild = {
    id: Snowflake;
    unavailable: true;
};

export declare type User = {
    /** the user's id */
    id: Snowflake;
    /** the user's username, not unique across the platform */
    username: string;
    /** the user's 4-digit discord-tag */
    discriminator: string;
    /** the user's avatar hash */
    avatar: string | null;
    /** whether the user belongs to an OAuth2 application */
    bot?: boolean;
    /** whether the user is an Official Discord System user (part of the urgent message system) */
    system?: boolean;
    /** whether the user has two factor enabled on their account */
    mfa_enabled?: boolean;
    /** the user's banner hash */
    banner?: string | null;
    /** the user's banner color encoded as an integer representation of hexadecimal color code */
    accent_color?: number | null;
    /** the user's chosen language option */
    locale?: string;
    /** whether the email on this account has been verified */
    verified?: boolean;
    /** the user's email */
    email?: string | null;
    /** the flags on a user's account */
    flags?: UserFlags;
    /** the type of Nitro subscription on a user's account */
    premium_type?: number;
    /** the public flags on a user's account */
    public_flags?: number;
    global_name?: string;
};

export declare type USER_UPDATE_EVENT = User;

export declare enum UserFlags {
    STAFF = 1,
    PARTNER = 2,
    HYPESQUAD = 4,
    BUG_HUNTER_LEVEL_1 = 8,
    HYPESQUAD_ONLINE_HOUSE_1 = 64,
    HYPESQUAD_ONLINE_HOUSE_2 = 128,
    HYPESQUAD_ONLINE_HOUSE_3 = 256,
    PREMIUM_EARLY_SUPPORTER = 512,
    TEAM_PSEUDO_USER = 1024,
    BUG_HUNTER_LEVEL_2 = 16384,
    VERIFIED_BOT = 65536,
    VERIFIED_DEVELOPER = 131072,
    CERTIFIED_MODERATOR = 262144,
    BOT_HTTP_INTERACTIONS = 524288,
    ACTIVE_DEVELOPER = 4194304
}

export declare type UserSelectMenu = {
    type: 5;
} & Omit<SelectMenu, 'options' | 'channel_types'>;

export declare type VerificationLevel = 
/** NONE */
0 | 
/** LOW */
1 | 
/** MEDIUM */
2 | 
/** HIGH */
3 | 
/** VERY_HIGH */
4;

export declare type VideoQualityMode = [
/** AUTO */
1 | 
/** FULL */
2
];

export declare type VisibilityType = 
/** None */
0 | 
/** Everyone */
1;

export declare type VOICE_SERVER_UPDATE_EVENT = VoiceServerUpdateEventField;

export declare type VOICE_STATE_UPDATE_EVENT = VoiceState;

export declare type VoiceRegion = {
    /** unique ID for the region */
    id: string;
    /** name of the region */
    name: string;
    /** true for a single server that is closest to the current user's client */
    optimal: boolean;
    /** whether this is a deprecated voice region (avoid switching to these) */
    deprecated: boolean;
    /** whether this is a custom voice region (used for events/etc) */
    custom: boolean;
};

export declare type VoiceServerUpdateEventField = {
    /** Voice connection token */
    token: string;
    /** Guild this voice server update is for */
    guild_id: Snowflake;
    /** Voice server host */
    endpoint: string | null;
};

export declare type VoiceState = {
    /** the guild id this voice state is for */
    guild_id?: Snowflake;
    /** the channel id this user is connected to */
    channel_id: Snowflake | null;
    /** the user id this voice state is for */
    user_id: Snowflake;
    /** the guild member this voice state is for */
    member?: GuildMember;
    /** the session id for this voice state */
    session_id: string;
    /** whether this user is deafened by the server */
    deaf: boolean;
    /** whether this user is muted by the server */
    mute: boolean;
    /** whether this user is locally deafened */
    self_deaf: boolean;
    /** whether this user is locally muted */
    self_mute: boolean;
    /** whether this user is streaming using "Go Live" */
    self_stream?: boolean;
    /** whether this user's camera is enabled */
    self_video: boolean;
    /** whether this user's permission to speak is denied */
    suppress: boolean;
    /** the time at which the user requested to speak */
    request_to_speak_timestamp: ISO8601timestamp | null;
};

export declare type Webhook = {
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

export declare type WEBHOOKS_UPDATE_EVENT = WebhooksUpdateEventField;

export declare type WebhooksUpdateEventField = {
    /** ID of the guild */
    guild_id: Snowflake;
    /** ID of the channel */
    channel_id: Snowflake;
};

export declare type WebhookType = 
/** Incoming */
1 | 
/** Channel Follower */
2 | 
/** Application */
3;

/** Information about the current request count and time that it should reset in relation to Discord rate limits. https://discord.com/developers/docs/topics/gateway#rate-limiting */
export declare type WebsocketRateLimitCache = {
    /** Timestamp in ms when the request limit is expected to reset. */
    resetTimestamp: number;
    /** Number of requests made since last reset. */
    count: number;
};

export declare type WelcomeScreen = {
    /** the server description shown in the welcome screen */
    description: string | null;
    /** the channels shown in the welcome screen, up to 5 */
    welcome_channels: WelcomeScreenChannel[];
};

export declare type WelcomeScreenChannel = {
    /** the channel's id */
    channel_id: Snowflake;
    /** the description shown for the channel */
    description: string;
    /** the emoji id, if the emoji is custom */
    emoji_id: Snowflake | null;
    /** the emoji name if custom, the unicode character if standard, or `null` if no emoji is set */
    emoji_name: string | null;
};

/** A `request` method of an axios instance wrapped to decrement the associated rate limit cached state if one exists. */
export declare type WrappedRequest<T = any, R = ApiResponse<T>> = (request: ApiRequest) => Promise<R>;

export { }
