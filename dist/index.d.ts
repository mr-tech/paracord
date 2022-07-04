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
    name: string;
    type: ActivityType;
    url?: string | null;
    created_at: number;
    timestamps?: ActivityTimestamp;
    application_id?: Snowflake;
    details?: string | null;
    state?: string | null;
    emoji?: ActivityEmoji | null;
    party?: ActivityParty;
    assets?: ActivityAsset;
    secrets?: ActivitySecret;
    instance?: boolean;
    flags?: ActivityFlags;
    buttons?: Button[];
};

export declare type ActivityAsset = {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
};

export declare type ActivityButton = {
    label: string;
    url: string;
};

export declare type ActivityEmoji = {
    name: string;
    id?: Snowflake;
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
    id?: string;
    size?: [number, number];
};

export declare type ActivitySecret = {
    join?: string;
    spectate?: string;
    match?: string;
};

export declare type ActivityTimestamp = {
    start?: number;
    end?: number;
};

export declare type ActivityType = 0 | 1 | 2 | 3 | 4 | 5;

export declare type AllowedMention = {
    parse: AllowedMentionType[];
    roles: Snowflake[];
    users: Snowflake[];
    replied_user: boolean;
};

export declare type AllowedMentionType = 'roles' | 'users' | 'everyone';

export declare class Api {
    #private;
    rpcRequestService?: undefined | RequestService;
    events?: undefined | Record<string, string>;
    private static shouldQueueRequest;
    private static validateParams;
    private static createWrappedRequestMethod;
    static extractBucketHashKey(method: string, url: string): string[];
    constructor(token: string, options?: IApiOptions);
    get hasRateLimitService(): boolean;
    get hasRequestService(): boolean;
    log: (level: DebugLevel, message: string, data?: undefined | unknown) => void;
    private emit;
    addRequestService: (serviceOptions?: IServiceOptions) => Promise<boolean>;
    addRateLimitService: (serviceOptions?: IServiceOptions) => Promise<boolean>;
    private checkRpcServiceConnection;
    private recreateRpcService;
    private reattemptConnectInFuture;
    startQueue: (interval?: number) => void;
    stopQueue: () => void;
    request: <T extends ResponseData = any>(method: Method, url: string, options?: IRequestOptions) => Promise<IApiResponse<T> | RemoteApiResponse<T>>;
    private handleRequestLocal;
    private handleRequestRemote;
    sendRequest: <T extends ResponseData>(request: ApiRequest, fromQueue?: undefined | true) => Promise<IResponseState<T>>;
    private authorizeRequestWithServer;
    private handleResponse;
    private handleRateLimitedRequest;
    private updateRateLimitCache;
    private updateRpcCache;
    private enqueueRequest;
}

declare namespace Api_2 {
    export {
        Api as default,
        ApiRequest,
        BaseRequest,
        RateLimit,
        RateLimitCache,
        RateLimitHeaders,
        RateLimitMap,
        RateLimitTemplate,
        RateLimitTemplateMap,
        RequestQueue,
        IApiOptions,
        RequestFormDataFunction,
        IRequestOptions,
        WrappedRequest,
        RateLimitState,
        IServiceOptions,
        ResponseData,
        IApiResponse,
        RateLimitedResponse,
        IRateLimitState,
        IResponseState,
        ApiError
    }
}

export declare const API_GLOBAL_RATE_LIMIT = 50;

export declare const API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = 1000;

export declare const API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = 50;

export declare const API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS: number;

export declare interface ApiError<T = any, D = any> extends Error {
    config: ApiRequest<D>['config'];
    code?: string;
    request?: any;
    response?: IApiResponse<T> | RemoteApiResponse<T>;
    isApiError: boolean;
    toJSON: () => object;
}

export declare class ApiRequest<T extends ResponseData = any> extends BaseRequest {
    data: Record<string, unknown> | undefined;
    headers: Record<string, unknown> | undefined;
    createForm: RequestFormDataFunction | undefined;
    response: Promise<IApiResponse<T>> | IApiResponse<T> | undefined;
    waitUntil: number | undefined;
    returnOnRateLimit: boolean;
    returnOnGlobalRateLimit: boolean;
    retriesLeft?: undefined | number;
    running: boolean;
    constructor(method: Method, url: string, topLevelResource: string, topLevelID: string, bucketHash: undefined | string, bucketHashKey: string, options?: Partial<IRequestOptions>);
    get config(): AxiosRequestConfig;
    assignIfStricterWait(waitUntil: number): void;
}

export declare type Application = {
    id: Snowflake;
    name: string;
    icon: string | null;
    description: string;
    rpc_origins?: string[];
    bot_public: boolean;
    bot_require_code_grant: boolean;
    terms_of_service_url?: string;
    privacy_policy_url?: string;
    owner?: Partial<User>;
    verify_key: string;
    team: Team | null;
    guild_id?: Snowflake;
    primary_sku_id?: Snowflake;
    slug?: string;
    cover_image?: string;
    flags?: number;
    tags?: string[];
    install_params?: InstallParam;
    custom_install_url?: string;
};

export declare type ApplicationCommand = {
    id: Snowflake;
    type?: ApplicationCommandType;
    application_id: Snowflake;
    guild_id?: Snowflake;
    name: string;
    name_localizations?: AvailableLocale | null;
    description: string;
    description_localizations?: AvailableLocale | null;
    options?: ApplicationCommandOption[];
    default_member_permissions?: string | null;
    dm_permission?: boolean | null;
    default_permission?: boolean | null;
    version: Snowflake;
};

export declare type ApplicationCommandInteractionDataOption = {
    name: string;
    type: ApplicationCommandOptionType;
    value?: string | number;
    options?: ApplicationCommandInteractionDataOption[];
    focused?: boolean;
};

export declare type ApplicationCommandOption = {
    type: ApplicationCommandOptionType;
    name: string;
    name_localizations?: AvailableLocale | null;
    description: string;
    description_localizations?: AvailableLocale | null;
    required?: boolean;
    choices?: ApplicationCommandOptionChoice[];
    options?: ApplicationCommandOption[];
    channel_types?: ChannelType[];
    min_value?: number;
    max_value?: number;
    autocomplete?: boolean;
};

export declare type ApplicationCommandOptionChoice = {
    name: string;
    name_localizations?: AvailableLocale | null;
    value: string | number;
};

export declare type ApplicationCommandOptionType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export declare type ApplicationCommandPermission = {
    id: Snowflake;
    type: ApplicationCommandPermissionType;
    permission: boolean;
};

export declare type ApplicationCommandPermissionType = 1 | 2 | 3;

export declare type ApplicationCommandType = 1 | 2 | 3;

export declare enum ApplicationFlags {
    GATEWAY_PRESENCE = 4096,
    GATEWAY_PRESENCE_LIMITED = 8192,
    GATEWAY_GUILD_MEMBERS = 16384,
    GATEWAY_GUILD_MEMBERS_LIMITED = 32768,
    VERIFICATION_PENDING_GUILD_LIMIT = 65536,
    EMBEDDED = 131072,
    GATEWAY_MESSAGE_CONTENT = 262144,
    GATEWAY_MESSAGE_CONTENT_LIMITED = 524288
}

export declare type Attachment = {
    id: Snowflake;
    filename: string;
    description?: string;
    content_type?: string;
    size: number;
    url: string;
    proxy_url: string;
    height?: number | null;
    width?: number | null;
    ephemeral?: boolean;
};

export declare type AuditLog = {
    audit_log_entries: AuditLogEntry[];
    guild_scheduled_events: GuildScheduledEvent[];
    integrations: Partial<Integration>[];
    threads: Channel[];
    users: User[];
    webhooks: Webhook[];
};

export declare type AuditLogChange = {
    new_value?: string | number | boolean | null;
    old_value?: string | number | boolean | null;
    key: string;
};

export declare type AuditLogEntry = {
    target_id: string | null;
    changes?: AuditLogChange[];
    user_id: Snowflake | null;
    id: Snowflake;
    action_type: AuditLogEventType;
    options?: OptionalAuditEntryInfo;
    reason?: string;
};

export declare type AuditLogEventType = 1 | 10 | 11 | 12 | 13 | 14 | 15 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 30 | 31 | 32 | 40 | 41 | 42 | 50 | 51 | 52 | 60 | 61 | 62 | 72 | 73 | 74 | 75 | 80 | 81 | 82 | 83 | 84 | 85 | 90 | 91 | 92 | 100 | 101 | 102 | 110 | 111 | 112 | 121;

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
    choices: ApplicationCommandOptionChoice[];
};

export declare type AvailableLocale = Partial<Record<Locale, string>>;

declare type AvatarParams = {
    fileType?: undefined | 'png' | 'jpg' | 'webp' | 'gif';
    animate?: boolean;
};

export declare type Ban = {
    reason: string | null;
    user: User;
};

export declare class BaseRequest {
    method: Method;
    url: string;
    bucketHashKey: string;
    topLevelResource: string;
    private topLevelID;
    rateLimitKey: undefined | string;
    static formatRateLimitKey(tlr: string, tlrID: string, bucketHash: string): string;
    constructor(method: Method, url: string, topLevelResource: string, topLevelID: string, bucketHash: undefined | string, bucketHashKey: string);
    getRateLimitKey(bucketHash?: undefined): undefined | string;
    getRateLimitKey(bucketHash: string): string;
}

export declare type Button = {
    type: 2;
    style: ButtonStyleType;
    label?: string;
    emoji?: Partial<Emoji>;
    custom_id?: string;
    url?: string;
    disabled?: boolean;
};

export declare type ButtonEmoji = Pick<Emoji, 'name' | 'id' | 'animated'>;

export declare type ButtonStyleType = 1 | 2 | 3 | 4 | 5;

export declare type CasedGuildRequestMember = Omit<GuildRequestMember, 'guild_id' | 'user_ids'> & {
    guildId: GuildRequestMember['guild_id'];
    userIds: GuildRequestMember['user_ids'];
};

export declare type Channel = {
    id: Snowflake;
    type: ChannelType;
    guild_id?: Snowflake;
    position?: number;
    permission_overwrites?: Overwrite[];
    name?: string | null;
    topic?: string | null;
    nsfw?: boolean;
    last_message_id?: Snowflake | null;
    bitrate?: number;
    user_limit?: number;
    rate_limit_per_user?: number;
    recipients?: User[];
    icon?: string | null;
    owner_id?: Snowflake;
    application_id?: Snowflake;
    parent_id?: Snowflake | null;
    last_pin_timestamp?: ISO8601timestamp | null;
    rtc_region?: string | null;
    video_quality_mode?: number;
    message_count?: number;
    member_count?: number;
    thread_metadata?: ThreadMetadata;
    member?: ThreadMember;
    default_auto_archive_duration?: number;
    permissions?: string;
    flags?: number;
};

export declare type CHANNEL_CREATE_EVENT = GuildChannel;

export declare type CHANNEL_DELETE_EVENT = GuildChannel;

export declare type CHANNEL_PINS_UPDATE_EVENT = ChannelPinsUpdateEventField;

export declare type CHANNEL_UPDATE_EVENT = GuildChannel;

export declare enum ChannelFlags {
    PINNED = 2
}

export declare type ChannelMention = {
    id: Snowflake;
    guild_id: Snowflake;
    type: ChannelType;
    name: string;
};

export declare type ChannelPinsUpdateEventField = {
    guild_id?: Snowflake;
    channel_id: Snowflake;
    last_pin_timestamp?: ISO8601timestamp | null;
};

export declare type ChannelType = 0 | 1 | 2 | 3 | 4 | 5 | 10 | 11 | 12 | 13 | 14 | 15;

export declare type ClientStatus = {
    desktop?: string;
    mobile?: string;
    web?: string;
};

export declare function clone<T>(object: T): T;

export declare function coerceTokenToBotLike(token: string): string;

export declare type Component = ActionRowComponent;

export declare type ComponentType = 1 | 2 | 3 | 4;

export declare function computeChannelPerms({ member, guild, channel, stopOnOwnerAdmin, }: {
    member: PermissibleMember;
    guild: PermissibleGuild;
    channel: PermissibleChannel;
    stopOnOwnerAdmin?: boolean;
}): bigint;

export declare function computeGuildPerms({ member, guild, stopOnOwnerAdmin }: {
    member: PermissibleMember;
    guild: PermissibleGuild;
    stopOnOwnerAdmin?: boolean;
}): bigint;

export declare type Connection = {
    id: string;
    name: string;
    type: string;
    revoked?: boolean;
    integrations?: Partial<Integration>[];
    verified: boolean;
    friend_sync: boolean;
    show_activity: boolean;
    visibility: number;
};

export declare function constructGuildIcon(guild: Pick<Guild, 'id' | 'icon_hash'>, fileType?: string): string | undefined;

export declare function constructUserAvatarUrl(user: Pick<User, 'id' | 'discriminator' | 'avatar'>, { fileType, animate }?: AvatarParams): string;

declare type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export declare const DEFAULT_GATEWAY_BOT_WAIT: number;

export declare type DefaultMessageNotificationLevel = 0 | 1;

export declare const DISCORD_API_DEFAULT_VERSION = 9;

export declare const DISCORD_API_URL = "https://discord.com/api";

export declare const DISCORD_CDN_URL = "https://cdn.discordapp.com";

export declare const DISCORD_EPOCH = 1420070400000;

export declare const DISCORD_WS_VERSION = 10;

export declare type Embed = {
    title?: string;
    type?: string;
    description?: string;
    url?: string;
    timestamp?: ISO8601timestamp;
    color?: number;
    footer?: EmbedFooter;
    image?: EmbedImage;
    thumbnail?: EmbedThumbnail;
    video?: EmbedVideo;
    provider?: EmbedProvider;
    author?: EmbedAuthor;
    fields?: EmbedField[];
};

export declare type EmbedAuthor = {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
};

export declare type EmbedField = {
    name: string;
    value: string;
    inline?: boolean;
};

export declare type EmbedFooter = {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
};

export declare type EmbedImage = {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
};

export declare type EmbedProvider = {
    name?: string;
    url?: string;
};

export declare type EmbedThumbnail = {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
};

export declare type EmbedVideo = {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
};

export declare type Emoji = {
    id: Snowflake | null;
    name: string | null;
    roles?: Role[];
    user?: User;
    require_colons?: boolean;
    managed?: boolean;
    animated?: boolean;
    available?: boolean;
};

declare type ErrorResponse = {
    message: string;
    code: number;
};

export declare type EventFunction = (...any: unknown[]) => unknown;

export declare type EventFunctions = Record<string, EventFunction>;

export declare type ExplicitContentFilterLevel = 0 | 1 | 2;

export declare type FollowedChannel = {
    channel_id: Snowflake;
    webhook_id: Snowflake;
};

export declare class Gateway {
    #private;
    lastKnownSessionLimitData?: undefined | SessionLimitData;
    private static validateOptions;
    constructor(token: string, options: GatewayOptions);
    get resumable(): boolean;
    get shard(): GatewayIdentify['shard'];
    get id(): number;
    get connected(): boolean;
    get online(): boolean;
    get ws(): ws | undefined;
    get heartbeatAck(): boolean;
    get lastHeartbeatTimestamp(): number | undefined;
    get nextHeartbeatTimestamp(): number | undefined;
    private log;
    private emit;
    requestGuildMembers(options: GuildRequestMember): boolean;
    login: (_websocket?: typeof ws) => Promise<void>;
    private getWebsocketUrl;
    private handleBadStatus;
    private assignWebsocketMethods;
    private handleEvent;
    private handleGuildMemberChunk;
    private updateRequestMembersState;
    private _onopen;
    private checkIfStarting;
    private _onerror;
    private _onclose;
    private handleCloseCode;
    private clearSession;
    private clearHeartbeat;
    private _onmessage;
    private decompress;
    private handleMessage;
    private _checkIfShouldHeartbeat;
    checkIfShouldHeartbeat: () => void;
    private handleReady;
    private handleResumed;
    private handleHello;
    private startHeartbeat;
    private refreshHeartbeatTimeout;
    private refreshHeartbeatAckTimeout;
    private checkHeartbeatAck;
    private handleMissedHeartbeatAck;
    private allowMissingAckOnStartup;
    private sendHeartbeat;
    private _sendHeartbeat;
    private handleHeartbeatAck;
    private connect;
    private resume;
    private identify;
    private send;
    private canSendPacket;
    private updateWsRateLimit;
    private handleInvalidSession;
    private updateSequence;
}

export declare const GATEWAY_CLOSE_CODES: {
    CLEAN: number;
    GOING_AWAY: number;
    ABNORMAL: number;
    UNKNOWN_ERROR: number;
    UNKNOWN_OPCODE: number;
    DECODE_ERROR: number;
    NOT_AUTHENTICATED: number;
    AUTHENTICATION_FAILED: number;
    ALREADY_AUTHENTICATED: number;
    SESSION_NO_LONGER_VALID: number;
    INVALID_SEQ: number;
    RATE_LIMITED: number;
    SESSION_TIMEOUT: number;
    INVALID_SHARD: number;
    SHARDING_REQUIRED: number;
    INVALID_VERSION: number;
    INVALID_INTENT: number;
    DISALLOWED_INTENT: number;
    RECONNECT: number;
    SESSION_INVALIDATED: number;
    SESSION_INVALIDATED_RESUMABLE: number;
    HEARTBEAT_TIMEOUT: number;
    USER_TERMINATE_RESUMABLE: number;
    USER_TERMINATE_RECONNECT: number;
    USER_TERMINATE: number;
    UNKNOWN: number;
};

export declare type GATEWAY_IDENTIFY_EVENT = null;

export declare const GATEWAY_MAX_REQUESTS_PER_MINUTE = 120;

export declare const GATEWAY_OP_CODES: {
    DISPATCH: number;
    HEARTBEAT: number;
    IDENTIFY: number;
    RESUME: number;
    RECONNECT: number;
    REQUEST_GUILD_MEMBERS: number;
    INVALID_SESSION: number;
    HELLO: number;
    HEARTBEAT_ACK: number;
};

export declare type GATEWAY_OPEN_EVENT = null;

export declare const GATEWAY_REQUEST_BUFFER = 4;

export declare interface GatewayBotResponse extends Api_2.IApiResponse, ErrorResponse {
    url: string;
    shards: number;
    sessionStartLimit: SessionLimitData;
}

export declare type GatewayCloseEvent = {
    shouldReconnect: boolean;
    code: number;
    gateway: Gateway;
};

export declare type GatewayEvent = 'HELLO' | 'READY' | 'RESUMED' | 'RECONNECT' | 'INVALID_SESSION' | 'CHANNEL_CREATE' | 'CHANNEL_UPDATE' | 'CHANNEL_DELETE' | 'CHANNEL_PINS_UPDATE' | 'THREAD_CREATE' | 'THREAD_UPDATE' | 'THREAD_DELETE' | 'THREAD_LIST_SYNC' | 'THREAD_MEMBER_UPDATE' | 'THREAD_MEMBERS_UPDATE' | 'GUILD_CREATE' | 'GUILD_UPDATE' | 'GUILD_DELETE' | 'GUILD_BAN_ADD' | 'GUILD_BAN_REMOVE' | 'GUILD_EMOJIS_UPDATE' | 'GUILD_STICKERS_UPDATE' | 'GUILD_INTEGRATIONS_UPDATE' | 'GUILD_MEMBER_ADD' | 'GUILD_MEMBER_REMOVE' | 'GUILD_MEMBER_UPDATE' | 'GUILD_MEMBERS_CHUNK' | 'GUILD_ROLE_CREATE' | 'GUILD_ROLE_UPDATE' | 'GUILD_ROLE_DELETE' | 'GUILD_SCHEDULED_EVENT_CREATE' | 'GUILD_SCHEDULED_EVENT_UPDATE' | 'GUILD_SCHEDULED_EVENT_DELETE' | 'GUILD_SCHEDULED_EVENT_USER_ADD' | 'GUILD_SCHEDULED_EVENT_USER_REMOVE' | 'INTEGRATION_CREATE' | 'INTEGRATION_UPDATE' | 'INTEGRATION_DELETE' | 'INTEGRATION_CREATE' | 'INVITE_CREATE' | 'INVITE_DELETE' | 'MESSAGE_CREATE' | 'MESSAGE_UPDATE' | 'MESSAGE_DELETE' | 'MESSAGE_DELETE_BULK' | 'MESSAGE_REACTION_ADD' | 'MESSAGE_REACTION_REMOVE' | 'MESSAGE_REACTION_REMOVE_ALL' | 'MESSAGE_REACTION_REMOVE_EMOJI' | 'PRESENCE_UPDATE' | 'STAGE_INSTANCE_CREATE' | 'STAGE_INSTANCE_DELETE' | 'STAGE_INSTANCE_UPDATE' | 'TYPING_START' | 'USER_UPDATE' | 'VOICE_STATE_UPDATE' | 'VOICE_SERVER_UPDATE' | 'WEBHOOKS_UPDATE';

export declare class GatewayIdentify {
    #private;
    readonly shard?: [number, number];
    readonly token: string;
    constructor(token: string, identity: Partial<IdentityOptions>);
    get compress(): boolean | undefined;
    toJSON(): Partial<GatewayIdentify>;
}

export declare type GatewayMap = Map<number, Gateway>;

export declare interface GatewayOptions {
    identity: IdentityOptions;
    emitter: EventEmitter;
    events?: undefined | UserEvents;
    api?: undefined | Api_2.default;
    wsUrl?: undefined | string;
    heartbeatIntervalOffset?: undefined | number;
    startupHeartbeatTolerance?: undefined | number;
    isStartingFunc?: undefined | StartupCheckFunction;
    checkSiblingHeartbeats?: undefined | Gateway['checkIfShouldHeartbeat'][];
    version?: undefined | number;
}

export declare type GatewayPayload = {
    op: number;
    d: string | number | boolean | null;
    s: number | null;
    t: string | null;
};

export declare type GatewayPresence = Omit<Presence, 'user'> & {
    user: {
        id: string;
    };
};

export declare type GatewayPresenceUpdate = {
    since: number | null;
    activities: Activity[];
    status: StatusType;
    afk: boolean;
};

export declare type GatewayURLQueryStringParam = {
    v: number;
    encoding: string;
    compress?: string;
};

export declare type GatewayVoiceStateUpdate = {
    guild_id: Snowflake;
    channel_id: Snowflake | null;
    self_mute: boolean;
    self_deaf: boolean;
};

export declare type GetGuildWidget = {
    id: Snowflake;
    name: string;
    instant_invite: string | null;
    channels: Partial<Channel>[];
    members: Partial<User>[];
    presence_count: number;
};

export declare const GIGABYTE_IN_BYTES = 1073741824;

export declare type Guild = {
    id: Snowflake;
    name: string;
    icon: string | null;
    icon_hash?: string | null;
    splash: string | null;
    discovery_splash: string | null;
    owner?: boolean;
    owner_id: Snowflake;
    permissions?: string;
    region?: VoiceRegion | null;
    afk_channel_id: Snowflake | null;
    afk_timeout: number;
    widget_enabled?: boolean;
    widget_channel_id?: Snowflake | null;
    verification_level: VerificationLevel;
    default_message_notifications: DefaultMessageNotificationLevel;
    explicit_content_filter: ExplicitContentFilterLevel;
    roles: Role[];
    emojis: Emoji[];
    features: GuildFeatureType[];
    mfa_level: MFALevel;
    application_id: Snowflake | null;
    system_channel_id: Snowflake | null;
    system_channel_flags: SystemChannelFlags;
    rules_channel_id: Snowflake | null;
    joined_at?: ISO8601timestamp;
    large?: boolean;
    unavailable?: boolean;
    member_count?: number;
    voice_states?: Partial<VoiceState>[];
    members?: GuildMember[];
    channels?: Channel[];
    threads?: Channel[];
    presences?: Partial<Presence>[];
    max_presences?: number | null;
    max_members?: number;
    vanity_url_code: string | null;
    description: string | null;
    banner: string | null;
    premium_tier: PremiumTier;
    premium_subscription_count?: number;
    preferred_locale: string;
    public_updates_channel_id: Snowflake | null;
    max_video_channel_users?: number;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    welcome_screen?: WelcomeScreen;
    nsfw_level: GuildNSFWLevel;
    stage_instances?: StageInstance[];
    stickers?: Sticker[];
    guild_scheduled_events?: GuildScheduledEvent[];
    premium_progress_bar_enabled: boolean;
};

export declare type GUILD_BAN_ADD_EVENT = GuildBanAddEventField;

export declare type GUILD_BAN_REMOVE_EVENT = GuildBanRemoveEventField;

export declare type GUILD_CREATE_EVENT = Pick<Required<Guild>, 'afk_channel_id' | 'afk_timeout' | 'application_id' | 'banner' | 'default_message_notifications' | 'description' | 'discovery_splash' | 'emojis' | 'guild_scheduled_events' | 'features' | 'icon' | 'id' | 'joined_at' | 'large' | 'max_members' | 'max_video_channel_users' | 'member_count' | 'mfa_level' | 'name' | 'nsfw_level' | 'owner_id' | 'preferred_locale' | 'premium_subscription_count' | 'premium_progress_bar_enabled' | 'premium_tier' | 'public_updates_channel_id' | 'region' | 'roles' | 'rules_channel_id' | 'splash' | 'stage_instances' | 'stickers' | 'system_channel_id' | 'vanity_url_code' | 'verification_level'> & {
    voice_states: Omit<VoiceState, 'guild_id'>[];
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

export declare type GUILD_UPDATE_EVENT = Pick<Required<Guild>, 'afk_channel_id' | 'afk_timeout' | 'application_id' | 'banner' | 'default_message_notifications' | 'description' | 'discovery_splash' | 'emojis' | 'features' | 'icon' | 'id' | 'max_members' | 'max_video_channel_users' | 'mfa_level' | 'name' | 'nsfw_level' | 'owner_id' | 'preferred_locale' | 'premium_subscription_count' | 'premium_progress_bar_enabled' | 'premium_tier' | 'public_updates_channel_id' | 'region' | 'roles' | 'rules_channel_id' | 'splash' | 'stickers' | 'system_channel_id' | 'vanity_url_code' | 'verification_level'> & {
    guild_id: string;
};

export declare type GuildApplicationCommandPermission = {
    id: Snowflake;
    application_id: Snowflake;
    guild_id: Snowflake;
    permissions: ApplicationCommandPermission[];
};

export declare type GuildBanAddEventField = {
    guild_id: Snowflake;
    user: User;
};

export declare type GuildBanRemoveEventField = {
    guild_id: Snowflake;
    user: User;
};

export declare type GuildCacheOptions = {
    roles?: false;
    emojis?: false;
    guildMembers?: false;
    guildChannels?: false;
    presences?: false;
    guildVoiceStates?: false;
};

export declare type GuildCategoryChannel = {
    type: 4;
    name: string;
} & Pick<Required<Channel>, 'guild_id' | 'id' | 'nsfw' | 'parent_id' | 'permission_overwrites' | 'position' | 'type'>;

export declare type GuildChannel = GuildTextChannel | GuildVoiceChannel | GuildCategoryChannel | GuildNewsChannel | GuildStageVoiceChannel;

export declare interface GuildEmoji extends Emoji {
    id: Snowflake;
}

export declare type GuildEmojisUpdateEventField = {
    guild_id: Snowflake;
    emojis: [];
};

export declare type GuildFeatureType = 'ANIMATED_BANNER' | 'ANIMATED_ICON' | 'BANNER' | 'COMMERCE' | 'COMMUNITY' | 'DISCOVERABLE' | 'FEATURABLE' | 'INVITE_SPLASH' | 'MEMBER_VERIFICATION_GATE_ENABLED' | 'MONETIZATION_ENABLED' | 'MORE_STICKERS' | 'NEWS' | 'PARTNERED' | 'PREVIEW_ENABLED' | 'PRIVATE_THREADS' | 'ROLE_ICONS' | 'SEVEN_DAY_THREAD_ARCHIVE' | 'THREE_DAY_THREAD_ARCHIVE' | 'TICKETED_EVENTS_ENABLED' | 'VANITY_URL' | 'VERIFIED' | 'VIP_REGIONS' | 'WELCOME_SCREEN_ENABLED';

export declare type GuildIntegrationsUpdateEventField = {
    guild_id: Snowflake;
};

export declare type GuildMember = {
    user?: User;
    nick?: string | null;
    avatar?: string | null;
    roles: Snowflake[];
    joined_at: ISO8601timestamp;
    premium_since?: ISO8601timestamp | null;
    deaf: boolean;
    mute: boolean;
    pending?: boolean;
    permissions?: string;
    communication_disabled_until?: ISO8601timestamp | null;
};

export declare type GuildMemberAddExtraField = {
    guild_id: Snowflake;
};

export declare type GuildMemberRemoveEventField = {
    guild_id: Snowflake;
    user: User;
};

export declare type GuildMembersChunkEventField = {
    guild_id: Snowflake;
    members: GuildMember[];
    chunk_index: number;
    chunk_count: number;
    not_found?: number[];
    presences?: Presence[];
    nonce?: string;
};

export declare type GuildMemberUpdateEventField = {
    guild_id: Snowflake;
    roles: Snowflake[];
    user: User;
    nick?: string | null;
    avatar: string | null;
    joined_at: ISO8601timestamp | null;
    premium_since?: ISO8601timestamp | null;
    deaf?: boolean;
    mute?: boolean;
    pending?: boolean;
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

export declare type GuildNSFWLevel = 0 | 1 | 2 | 3;

export declare type GuildPreview = {
    id: Snowflake;
    name: string;
    icon: string | null;
    splash: string | null;
    discovery_splash: string | null;
    emojis: Emoji[];
    features: GuildFeatureType[];
    approximate_member_count: number;
    approximate_presence_count: number;
    description: string | null;
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
    guild_id: Snowflake;
    query?: string;
    limit: number;
    presences?: boolean;
    user_ids?: Snowflake | Snowflake[];
    nonce?: string;
};

export declare type GuildRoleCreateEventField = {
    guild_id: Snowflake;
    role: Role;
};

export declare type GuildRoleDeleteEventField = {
    guild_id: Snowflake;
    role_id: Snowflake;
};

export declare type GuildRoleUpdateEventField = {
    guild_id: Snowflake;
    role: Role;
};

export declare type GuildScheduledEvent = {
    id: Snowflake;
    guild_id: Snowflake;
    channel_id: Snowflake | null;
    creator_id?: Snowflake | null;
    name: string;
    description?: string | null;
    scheduled_start_time: ISO8601timestamp;
    scheduled_end_time: ISO8601timestamp | null;
    privacy_level: GuildScheduledEventPrivacyLevel;
    status: GuildScheduledEventStatusType;
    entity_type: GuildScheduledEventEntityType;
    entity_id: Snowflake | null;
    entity_metadata: GuildScheduledEventEntityMetadata | null;
    creator?: GuildScheduledEventUser;
    user_count?: number;
    image?: string | null;
};

export declare type GuildScheduledEventEntityMetadata = {
    location?: string;
};

export declare type GuildScheduledEventEntityType = 1 | 2 | 3;

export declare type GuildScheduledEventPrivacyLevel = 2;

export declare type GuildScheduledEventStatusType = 1 | 2 | 3 | 4;

export declare type GuildScheduledEventUser = {
    guild_scheduled_event_id: Snowflake;
    user: User;
    member?: GuildMember;
};

export declare type GuildScheduledEventUserAddEventField = {
    guild_scheduled_event_id: Snowflake;
    user_id: Snowflake;
    guild_id: Snowflake;
};

export declare type GuildScheduledEventUserRemoveEventField = {
    guild_scheduled_event_id: Snowflake;
    user_id: Snowflake;
    guild_id: Snowflake;
};

export declare type GuildStageVoiceChannel = {
    type: 13;
    name: string;
} & Pick<Required<Channel>, 'bitrate' | 'guild_id' | 'id' | 'nsfw' | 'parent_id' | 'permission_overwrites' | 'position' | 'rtc_region' | 'topic' | 'type' | 'user_limit'>;

export declare type GuildStickersUpdateEventField = {
    guild_id: Snowflake;
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

export declare type GuildWidgetSetting = {
    enabled: boolean;
    channel_id: Snowflake | null;
};

export declare type Heartbeat = number;

export declare type Hello = {
    heartbeat_interval: number;
};

export declare type HELLO_EVENT = Hello;

export declare interface IApiOptions {
    emitter?: EventEmitter;
    events?: UserEvents;
    requestOptions?: IRequestOptions;
}

export declare interface IApiResponse<T extends ResponseData = any> {
    status: number;
    statusText: string;
    data: T;
    headers: Record<string, unknown>;
    retry_after?: number;
}

declare interface IDebugEvent {
    source: number;
    level: number;
    message: string;
}

export declare type Identify = {
    token: string;
    properties: IdentifyConnectionProperties;
    compress?: boolean;
    large_threshold?: number;
    shard?: [number, number];
    presence?: Presence;
    intents: number;
};

export declare type IdentifyConnectionProperties = {
    $os: string;
    $browser: string;
    $device: string;
};

export declare type IdentityOptions = {
    token?: undefined | string;
    shard?: undefined | [number, number];
    properties?: undefined | IdentifyConnectionProperties;
    compress?: undefined | boolean;
    largeThreshold?: undefined | number;
    presence?: undefined | GatewayPresenceUpdate;
    guildSubscriptions?: undefined | boolean;
    intents: number;
};

export declare type InstallParam = {
    scopes: string[];
    permissions: string;
};

export declare type Integration = {
    id: Snowflake;
    name: string;
    type: string;
    enabled?: boolean;
    syncing?: boolean;
    role_id?: Snowflake;
    enable_emoticons?: boolean;
    expire_behavior?: IntegrationExpireType;
    expire_grace_period?: number;
    user?: User;
    account: IntegrationAccount;
    synced_at?: ISO8601timestamp;
    subscriber_count?: number;
    revoked?: boolean;
    application?: Application;
};

export declare type INTEGRATION_CREATE_EVENT = Integration & IntegrationCreateEventAdditionalField;

export declare type INTEGRATION_DELETE_EVENT = IntegrationDeleteEventField;

export declare type INTEGRATION_UPDATE_EVENT = Integration & IntegrationUpdateEventAdditionalField;

export declare type IntegrationAccount = {
    id: string;
    name: string;
};

export declare type IntegrationApplication = {
    id: Snowflake;
    name: string;
    icon: string | null;
    description: string;
    bot?: User;
};

export declare type IntegrationCreateEventAdditionalField = {
    guild_id: Snowflake;
};

export declare type IntegrationDeleteEventField = {
    id: Snowflake;
    guild_id: Snowflake;
    application_id?: Snowflake;
};

export declare type IntegrationExpireType = 0 | 1;

export declare type IntegrationUpdateEventAdditionalField = {
    guild_id: Snowflake;
};

export declare type Interaction = {
    id: Snowflake;
    application_id: Snowflake;
    type: InteractionType;
    data?: InteractionData;
    guild_id?: Snowflake;
    channel_id?: Snowflake;
    member?: GuildMember;
    user?: User;
    token: string;
    version: number;
    message?: Message;
    locale?: string;
    guild_locale?: string;
};

export declare type INTERACTION_CREATE_EVENT = Interaction;

export declare type InteractionCallbackType = 1 | 4 | 5 | 6 | 7 | 8 | 9;

export declare type InteractionData = {
    id: Snowflake;
    name: string;
    type: ApplicationCommandOptionType;
    resolved?: ResolvedData;
    options?: ApplicationCommandInteractionDataOption[];
    guild_id?: Snowflake;
    custom_id?: string;
    component_type?: ComponentType;
    values?: SelectOption[];
    target_id?: Snowflake;
    components?: MessageComponent[];
};

export declare type InteractionResponse = {
    type: InteractionCallbackType;
    data?: MessageCallback | AutocompleteCallback | ModalCallback;
};

export declare type InteractionType = 1 | 2 | 3 | 4 | 5;

export declare type InternalShardIds = number[];

export declare type Invite = {
    code: string;
    guild?: Partial<Guild>;
    channel: Partial<Channel> | null;
    inviter?: User;
    target_type?: number;
    target_user?: User;
    target_application?: Partial<Application>;
    approximate_presence_count?: number;
    approximate_member_count?: number;
    expires_at?: ISO8601timestamp | null;
    stage_instance?: InviteStageInstance;
    guild_scheduled_event?: GuildScheduledEvent;
};

export declare type INVITE_CREATE_EVENT = InviteCreateEventField;

export declare type INVITE_DELETE_EVENT = InviteDeleteEventField;

export declare type InviteCreateEventField = {
    channel_id: Snowflake;
    code: string;
    created_at: ISO8601timestamp;
    guild_id?: Snowflake;
    inviter?: User;
    max_age: number;
    max_uses: number;
    target_type?: number;
    target_user?: User;
    target_application?: Partial<Application>;
    temporary: boolean;
    uses: number;
};

export declare type InviteDeleteEventField = {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    code: string;
};

export declare type InviteMetadata = {
    uses: number;
    max_uses: number;
    max_age: number;
    temporary: boolean;
    created_at: ISO8601timestamp;
};

export declare type InviteStageInstance = {
    members: Partial<GuildMember>[];
    participant_count: number;
    speaker_count: number;
    topic: string;
};

export declare type IRateLimitState = {
    waitFor: number;
    global?: boolean;
};

export declare interface IRequestOptions {
    data?: Record<string, unknown> | undefined;
    headers?: Record<string, unknown> | undefined;
    createForm?: RequestFormDataFunction | undefined;
    local?: boolean;
    returnOnRateLimit?: false;
    returnOnGlobalRateLimit?: false;
    globalRateLimitMax?: number;
    globalRateLimitResetPadding?: number;
    version?: number;
    maxRateLimitRetry?: number;
    transformResponse?: (x: Record<string, unknown>) => Record<string, unknown>;
    validateStatus?: null | ((status: number) => boolean);
}

export declare type IResponseState<T extends ResponseData> = IRateLimitState & {
    response?: IApiResponse<T>;
};

export declare function isApiError(val: unknown): val is ApiError;

declare interface IServerOptions {
    host: string;
    port: number | string;
    channel: ChannelCredentials;
    allowFallback: boolean;
}

export declare interface IServiceOptions {
    host?: string;
    port?: string | number;
    channel?: ChannelCredentials;
    allowFallback?: boolean;
}

export declare type ISO8601timestamp = string;

export declare function isObject(v: unknown): boolean;

export declare type KeysWithType<T> = {
    [K in keyof T]: T[K] extends Primitive ? K : never;
}[keyof T];

export declare type LinkButton = Omit<Button, 'custom_id' | 'style' | 'emoji'> & Required<Pick<Button, 'url'>> & {
    style: 5;
    emoji?: ButtonEmoji;
};

export declare type Locale = 'da' | 'de' | 'en-GB' | 'en-US' | 'es-ES' | 'fr' | 'hr' | 'it' | 'lt' | 'hu' | 'nl' | 'no' | 'pl' | 'pt-BR' | 'ro' | 'fi' | 'sv-SE' | 'vi' | 'tr' | 'cs' | 'el' | 'bg' | 'ru' | 'uk' | 'hi' | 'th' | 'zh-CN' | 'ja' | 'zh-TW' | 'ko';

export declare const LOG_LEVELS: {
    FATAL: number;
    ERROR: number;
    WARNING: number;
    INFO: number;
    DEBUG: number;
};

export declare const LOG_SOURCES: {
    GATEWAY: number;
    API: number;
    PARACORD: number;
    RPC: number;
};

export declare type MembershipStateType = 1 | 2;

export declare type Message = {
    id: Snowflake;
    channel_id: Snowflake;
    guild_id?: Snowflake;
    author: User;
    member?: Partial<GuildMember>;
    content: string;
    timestamp: ISO8601timestamp;
    edited_timestamp: ISO8601timestamp | null;
    tts: boolean;
    mention_everyone: boolean;
    mentions: User[];
    mention_roles: Role[];
    mention_channels?: ChannelMention[];
    attachments: Attachment[];
    embeds: Embed[];
    reactions?: Reaction[];
    nonce?: number | string;
    pinned: boolean;
    webhook_id?: Snowflake;
    type: MessageType;
    activity?: MessageActivity;
    application?: Partial<Application>;
    application_id?: Snowflake;
    message_reference?: MessageReference;
    flags?: MessageFlags;
    referenced_message?: Message | null;
    interaction?: MessageInteraction;
    thread?: Channel;
    components?: MessageComponent[];
    sticker_items?: StickerItem[];
    stickers?: Sticker[];
};

export declare type MESSAGE_CREATE_EVENT = Message;

export declare type MESSAGE_DELETE_BULK_EVENT = MessageDeleteBulkEventField;

export declare type MESSAGE_DELETE_EVENT = MessageDeleteEventField;

export declare type MESSAGE_REACTION_ADD_EVENT = MessageReactionAddEventField;

export declare type MESSAGE_REACTION_REMOVE_ALL_EVENT = MessageReactionRemoveAllEventField;

export declare type MESSAGE_REACTION_REMOVE_EMOJI_EVENT = MessageReactionRemoveEmojiEventField;

export declare type MESSAGE_REACTION_REMOVE_EVENT = MessageReactionRemoveEventField;

export declare type MESSAGE_UPDATE_EVENT = Partial<Message> & Pick<Message, 'id' | 'channel_id'>;

export declare type MessageActivity = {
    type: MessageActivityType;
    party_id?: string;
};

export declare type MessageActivityType = 1 | 2 | 3 | 5;

export declare type MessageCallback = {
    tts?: boolean;
    content?: string;
    embeds?: Embed[];
    allowed_mentions?: AllowedMention;
    flags?: MessageFlags;
    components?: MessageComponent[];
    attachments?: Partial<Attachment>[];
};

export declare type MessageComponent = ActionRowComponent;

export declare type MessageDeleteBulkEventField = {
    ids: Snowflake[];
    channel_id: Snowflake;
    guild_id?: Snowflake;
};

export declare type MessageDeleteEventField = {
    id: Snowflake;
    channel_id: Snowflake;
    guild_id?: Snowflake;
};

export declare enum MessageFlags {
    CROSSPOSTED = 1,
    IS_CROSSPOST = 2,
    SUPPRESS_EMBEDS = 4,
    SOURCE_MESSAGE_DELETED = 8,
    URGENT = 16,
    EPHEMERAL = 64,
    LOADING = 128,
    FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 256
}

export declare type MessageInteraction = {
    id: Snowflake;
    type: InteractionType;
    name: string;
    user: User;
    member?: Partial<GuildMember>;
};

export declare type MessageReactionAddEventField = {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    member?: GuildMember;
    emoji: Emoji;
};

export declare type MessageReactionRemoveAllEventField = {
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
};

export declare type MessageReactionRemoveEmojiEventField = {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    message_id: Snowflake;
    emoji: Partial<Emoji>;
};

export declare type MessageReactionRemoveEventField = {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    emoji: Emoji;
};

export declare type MessageReference = {
    message_id?: Snowflake;
    channel_id?: Snowflake;
    guild_id?: Snowflake;
    fail_if_not_exists?: boolean;
};

export declare type MessageType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 15 | 16 | 17 | 19 | 20 | 22 | 23;

export declare type MFALevel = 0 | 1;

export declare function millisecondsFromNow(timestamp: number): number;

export declare const MINUTE_IN_MILLISECONDS: number;

export declare type ModalCallback = {
    custom_id: string;
    title: string;
    components: Component[];
};

export declare type NonLinkButton = Omit<Button, 'url' | 'style' | 'emoji'> & Required<Pick<Button, 'custom_id'>> & {
    style: Exclude<ButtonStyleType, 5>;
    emoji?: ButtonEmoji;
};

export declare type OptionalAuditEntryInfo = {
    channel_id: Snowflake;
    count: string;
    delete_member_days: string;
    id: Snowflake;
    members_removed: string;
    message_id: Snowflake;
    role_name: string;
    type: string;
};

export declare type Overwrite = {
    id: Snowflake;
    type: 0 | 1;
    allow: string;
    deny: string;
};

export declare const OVERWRITE_ROLE_VALUE = 0;

declare class Paracord extends EventEmitter {
    #private;
    request: Api['request'];
    addRateLimitService: Api['addRateLimitService'];
    addRequestService: Api['addRequestService'];
    readonly gatewayLoginQueue: Gateway[];
    private static validateParams;
    constructor(token: string, options?: ParacordOptions);
    get startingGateway(): Gateway | undefined;
    get shards(): GatewayMap;
    get connecting(): boolean;
    eventHandler(eventType: string, data: unknown, shard: number): unknown;
    log(level: DebugLevel, message: string, data?: unknown): void;
    emit(event: string, ...args: unknown[]): boolean;
    login(options?: Partial<ParacordLoginOptions>): Promise<void>;
    private startGatewayLoginInterval;
    private processGatewayQueue;
    private startWithUnavailableGuilds;
    private enqueueGateways;
    private addNewGateway;
    private createGatewayOptions;
    init(): void;
    private setUpApi;
    private setUpGateway;
    private checkIfDoneStarting;
    private completeShardStartup;
    clearStartingShardState(): void;
    private completeStartup;
    private handleGatewayReady;
    private handleGatewayIdentify;
    private handleGatewayClose;
}
export { Paracord }
export default Paracord;

export declare const PARACORD_URL = "https://paracordjs.com/";

export declare const PARACORD_VERSION_NUMBER = "0.5";

export declare interface ParacordCacheOptions extends GuildCacheOptions {
    guilds?: false;
}

export declare interface ParacordLoginOptions {
    identity: IdentityOptions;
    shards?: number[];
    shardCount?: number;
    unavailableGuildTolerance?: number;
    unavailableGuildWait?: number;
    allowEventsDuringStartup?: true;
    startupHeartbeatTolerance?: number;
}

export declare interface ParacordOptions {
    events?: UserEvents;
    apiOptions?: Partial<IApiOptions>;
    gatewayOptions?: Partial<GatewayOptions>;
    autoInit?: boolean;
}

declare type PermissibleChannel = Pick<GuildChannel, 'id' | 'permission_overwrites'>;

declare type PermissibleGuild = Pick<Guild, 'id' | 'owner_id' | 'roles'>;

declare type PermissibleMember = Pick<Required<GuildMember>, 'user' | 'roles'>;

export declare const PERMISSIONS: {
    ADMINISTRATOR: bigint;
};

export declare type PremiumTier = 0 | 1 | 2 | 3;

export declare type PremiumType = 0 | 1 | 2;

export declare type Presence = {
    user: User;
    guild_id: Snowflake;
    status: StatusType;
    activities: Activity[];
    client_status: ClientStatus;
};

export declare type PRESENCE_UPDATE_EVENT = GatewayPresence;

declare type Primitive = string | number | boolean | null | undefined;

export declare type QueryStringParam = {
    with_user_count?: boolean;
};

export declare class RateLimit {
    #private;
    expires: number;
    constructor({ remaining, resetTimestamp, limit }: RateLimitState, template: RateLimitTemplate);
    get isRateLimited(): boolean;
    private get rateLimitHasReset();
    private get hasRemainingUses();
    get waitFor(): number;
    private refreshExpire;
    decrementRemaining(): void;
    assignIfStricter({ remaining, resetTimestamp, limit }: RateLimitState): void;
    private resetRemaining;
}

declare type RateLimitBucketHash = string;

export declare class RateLimitCache {
    #private;
    bucketHashes: Map<string, RateLimitBucketHash>;
    constructor(autoStartSweep: boolean, globalRateLimitMax: number, globalRateLimitResetPadding: number, logger?: Api);
    private get isGloballyRateLimited();
    private get globalRateLimitHasReset();
    private get globalRateLimitHasRemainingUses();
    private get globalRateLimitResetAfter();
    startSweepInterval(): void;
    wrapRequest(requestFunc: AxiosInstance['request']): WrappedRequest;
    private decrementGlobalRemaining;
    authorizeRequestFromClient(request: BaseRequest): IRateLimitState;
    update(rateLimitKey: string, bucketHashKey: string, rateLimitHeaders: RateLimitHeaders): void;
    isRateLimited(request: BaseRequest | ApiRequest): IRateLimitState;
    private resetGlobalRateLimit;
    private getRateLimitFromCache;
    getBucket(bucketHashKey: string): string | undefined;
    private rateLimitFromTemplate;
}

export declare interface RateLimitedResponse extends IApiResponse<{
    retry_after: number;
    global: boolean;
    message: string;
}> {
    status: 429;
    statusText: 'Too Many Requests';
}

export declare class RateLimitHeaders {
    global: boolean;
    bucketHash: string | undefined;
    limit: number;
    remaining: number;
    resetAfter: number;
    retryAfter: number;
    resetTimestamp: number;
    static extractRateLimitFromHeaders(headers: IApiResponse['headers'], retryAfter: undefined | number): RateLimitHeaders;
    constructor(global: boolean, bucketHash: string | undefined, limit: number, remaining: number, resetAfter: number, retryAfter: undefined | number);
    get hasState(): boolean;
    get rpcArgs(): RpcArguments;
}

export declare class RateLimitMap extends Map<string, RateLimit> {
    #private;
    constructor(logger?: undefined | Api);
    upsert(rateLimitKey: string, { remaining, limit, resetTimestamp, resetAfter: waitFor, }: RateLimitState, template: RateLimitTemplate): RateLimit;
    private sweepExpiredRateLimits;
    startSweepInterval: () => void;
}

export declare type RateLimitState = {
    remaining: number;
    limit: number;
    resetTimestamp: number | undefined;
    resetAfter: number;
};

export declare class RateLimitTemplate {
    limit: number;
    resetAfter: number;
    constructor({ limit, resetAfter }: RateLimitHeaders);
    update({ limit, resetAfter }: RateLimitHeaders): void;
}

export declare class RateLimitTemplateMap extends Map<string, RateLimitTemplate> {
    upsert(bucketHash: string, state: RateLimitHeaders): RateLimitTemplate;
    createAssumedRateLimit(bucketHash: string): RateLimit | undefined;
}

export declare type RawGuildType = AugmentedGuild | UnavailableGuild;

export declare type Reaction = {
    count: number;
    me: boolean;
    emoji: Partial<Emoji>;
};

export declare type READY_EVENT = ReadyEventField;

export declare type ReadyEventField = {
    v: number;
    user: User;
    guilds: UnavailableGuild[];
    session_id: string;
    shard?: [number, number];
    application: Partial<Application>;
};

declare type RemoteApiResponse<T extends ResponseData = any> = {
    status: number;
    statusText: string;
    data: T;
    isApiError?: true;
};

export declare type RequestFormDataFunction = () => {
    data?: Record<string, unknown> | FormData_2 | undefined;
    headers?: Record<string, unknown> | undefined;
};

export declare class RequestQueue {
    #private;
    constructor(apiClient: Api);
    private get length();
    startQueue(interval: number): NodeJS.Timer;
    push(...items: ApiRequest[]): void;
    private spliceMany;
    private process;
    private processIteration;
    private sendRequest;
}

declare class RequestService extends RequestService_base {
    target: string;
    allowFallback: boolean;
    constructor(options: Partial<IServerOptions>);
    hello(): Promise<void>;
    request<T extends ResponseData>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>>;
}

declare const RequestService_base: any;

export declare type ResolvedData = {
    users?: Record<Snowflake, User>;
    members?: Record<Snowflake, Partial<GuildMember>>;
    roles?: Record<Snowflake, Role>;
    channels?: Record<Snowflake, Partial<Channel>>;
    messages?: Record<Snowflake, Partial<Message>>;
    attachments?: Record<Snowflake, Attachment>;
};

export declare type ResponseData = Record<string, any> | Array<unknown>;

export declare type Resume = {
    token: string;
    session_id: string;
    seq: number;
};

export declare type Role = {
    id: Snowflake;
    name: string;
    color: number;
    hoist: boolean;
    icon?: string | null;
    unicode_emoji?: string | null;
    position: number;
    permissions: string;
    managed: boolean;
    mentionable: boolean;
    tags?: RoleTag;
};

export declare type RoleTag = {
    bot_id?: Snowflake;
    integration_id?: Snowflake;
    premium_subscriber?: null;
};

export declare const RPC_CLOSE_CODES: {
    LOST_CONNECTION: number;
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
    type: 3;
    custom_id: string;
    options: SelectOption[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
};

export declare type SelectOption = {
    label: string;
    value: string;
    description?: string;
    emoji?: Partial<Emoji>;
    default?: boolean;
};

export declare class Server extends grpc.Server {
    #private;
    emitter?: undefined | EventEmitter;
    apiClient?: undefined | Api;
    rateLimitCache: RateLimitCache;
    constructor(options?: RpcServerOptions);
    private get bindArgs();
    addRequestService(token: string, apiOptions?: IApiOptions): void;
    addRateLimitService(): void;
    serve(): void;
    log(level: DebugLevel, message: string): void;
    emit(type: string, event: IDebugEvent): void;
}

export declare type SessionLimitData = {
    total: number;
    remaining: number;
    resetAfter: number;
    maxConcurrency: number;
};

export declare class ShardLauncher {
    #private;
    private static validateParams;
    constructor(main: string, options: ShardLauncherOptions);
    launch(pm2Options?: StartOptions): Promise<void>;
    private getShardInfo;
    launchShard(shardIds: InternalShardIds, shardCount: number, pm2Options: StartOptions): Promise<void>;
    private getRecommendedShards;
    private detach;
}

export declare interface ShardLauncherOptions {
    token?: string;
    shardIds?: InternalShardIds;
    shardChunks?: InternalShardIds[];
    shardCount?: number;
    appName?: string;
    env?: Record<string, unknown>;
}

export declare type Snowflake = string;

export declare type STAGE_INSTANCE_CREATE_EVENT = StageInstance;

export declare type STAGE_INSTANCE_DELETE_EVENT = StageInstance;

export declare type STAGE_INSTANCE_UPDATE_EVENT = StageInstance;

export declare type StageInstance = {
    id: Snowflake;
    guild_id: Snowflake;
    channel_id: Snowflake;
    topic: string;
    privacy_level: number;
    discoverable_disabled: boolean;
    guild_scheduled_event_id: Snowflake | null;
};

declare interface StartOptions {
    /**
     * Enable or disable auto restart after process failure (default: true).
     */
    autorestart?: boolean;
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
}

export declare type STARTUP_GUILD_EVENT = GUILD_CREATE_EVENT | UNAVAILABLE_GUILD;

export declare type StartupCheckFunction = (x: Gateway) => boolean;

export declare type StatusType = 'online' | 'dnd' | 'idle' | 'invisible' | 'offline';

export declare type Sticker = {
    id: Snowflake;
    pack_id?: Snowflake;
    name: string;
    description: string | null;
    tags: string;
    asset?: string;
    type: StickerType;
    format_type: number;
    available?: boolean;
    guild_id?: Snowflake;
    user?: User;
    sort_value?: number;
};

export declare type StickerFormatType = 1 | 2 | 3;

export declare type StickerItem = {
    id: Snowflake;
    name: string;
    format_type: number;
};

export declare type StickerPack = {
    id: Snowflake;
    stickers: Sticker[];
    name: string;
    sku_id: Snowflake;
    cover_sticker_id?: Snowflake;
    description: string;
    banner_asset_id?: Snowflake;
};

export declare type StickerType = 1 | 2;

export declare function stripLeadingSlash(url: string): string;

export declare type SubMessageComponent = NonLinkButton | LinkButton | SelectMenu;

export declare enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 2,
    SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 4,
    SUPPRESS_JOIN_NOTIFICATION_REPLIES = 8
}

export declare type Team = {
    icon: string | null;
    id: Snowflake;
    members: TeamMember[];
    name: string;
    owner_user_id: Snowflake;
};

export declare type TeamMember = {
    membership_state: MembershipStateType;
    permissions: string[];
    team_id: Snowflake;
    user: Partial<User>;
};

export declare type TextInput = {
    type: 4;
    custom_id: string;
    style: number;
    label: string;
    min_length?: number;
    max_length?: number;
    required?: boolean;
    value?: string;
    placeholder?: string;
};

export declare type TextInputStyleType = 1 | 2;

export declare type THREAD_CREATE_EVENT = GuildThread & {
    newly_created: true;
};

export declare type THREAD_DELETE_EVENT = Pick<Required<Channel>, 'id' | 'guild_id' | 'parent_id' | 'type'>;

export declare type THREAD_LIST_SYNC_EVENT = ThreadListSyncEventField;

export declare type THREAD_MEMBER_UPDATE_EVENT = ThreadMember & ThreadMemberUpdateEventExtraField;

export declare type THREAD_MEMBERS_UPDATE_EVENT = ThreadMembersUpdateEventField;

export declare type ThreadListSyncEventField = {
    guild_id: Snowflake;
    channel_ids?: Snowflake[];
    threads: Channel[];
    members: ThreadMember[];
};

export declare type ThreadMember = {
    id?: Snowflake;
    user_id?: Snowflake;
    join_timestamp: ISO8601timestamp;
    flags: number;
};

export declare type ThreadMembersUpdateEventField = {
    id: Snowflake;
    guild_id: Snowflake;
    member_count: number;
    added_members?: ThreadMember[];
    removed_member_ids?: Snowflake[];
};

export declare type ThreadMemberUpdateEventExtraField = {
    guild_id: Snowflake;
};

export declare type ThreadMetadata = {
    archived: boolean;
    auto_archive_duration: number;
    archive_timestamp: ISO8601timestamp;
    locked: boolean;
    invitable?: boolean;
    create_timestamp?: ISO8601timestamp | null;
};

export declare function timestampFromSnowflake(snowflake: Snowflake): number;

export declare function timestampNMillisecondsInFuture(milliseconds: number): number;

export declare function timestampNSecondsInFuture(seconds: number): number;

export declare type TYPING_START_EVENT = TypingStartEventField;

export declare type TypingStartEventField = {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    user_id: Snowflake;
    timestamp: number;
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
    id: Snowflake;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string | null;
    accent_color?: number | null;
    locale?: string;
    verified?: boolean;
    email?: string | null;
    flags?: UserFlags;
    premium_type?: number;
    public_flags?: number;
};

export declare type USER_UPDATE_EVENT = User;

declare type UserEvents = Record<string, string>;

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
    BOT_HTTP_INTERACTIONS = 524288
}

export declare type VerificationLevel = 0 | 1 | 2 | 3 | 4;

export declare type VideoQualityMode = [
1 | 2
];

export declare type VisibilityType = 0 | 1;

export declare type VOICE_SERVER_UPDATE_EVENT = VoiceServerUpdateEventField;

export declare type VOICE_STATE_UPDATE_EVENT = VoiceState;

export declare type VoiceRegion = {
    id: string;
    name: string;
    optimal: boolean;
    deprecated: boolean;
    custom: boolean;
};

export declare type VoiceServerUpdateEventField = {
    token: string;
    guild_id: Snowflake;
    endpoint: string | null;
};

export declare type VoiceState = {
    guild_id?: Snowflake;
    channel_id: Snowflake | null;
    user_id: Snowflake;
    member?: GuildMember;
    session_id: string;
    deaf: boolean;
    mute: boolean;
    self_deaf: boolean;
    self_mute: boolean;
    self_stream?: boolean;
    self_video: boolean;
    suppress: boolean;
    request_to_speak_timestamp: ISO8601timestamp | null;
};

export declare type Webhook = {
    id: Snowflake;
    type: WebhookType;
    guild_id?: Snowflake | null;
    channel_id: Snowflake | null;
    user?: User;
    name: string | null;
    avatar: string | null;
    token?: string;
    application_id: Snowflake | null;
    source_guild?: Partial<Guild>;
    source_channel?: Partial<Channel>;
    url?: string;
};

export declare type WEBHOOKS_UPDATE_EVENT = WebhooksUpdateEventField;

export declare type WebhooksUpdateEventField = {
    guild_id: Snowflake;
    channel_id: Snowflake;
};

export declare type WebhookType = 1 | 2 | 3;

export declare type WebsocketRateLimitCache = {
    resetTimestamp: number;
    remainingRequests: number;
};

export declare type WelcomeScreen = {
    description: string | null;
    welcome_channels: WelcomeScreenChannel[];
};

export declare type WelcomeScreenChannel = {
    channel_id: Snowflake;
    description: string;
    emoji_id: Snowflake | null;
    emoji_name: string | null;
};

export declare type WrappedRequest<T extends ResponseData = any, R = IApiResponse<T>> = (request: ApiRequest) => Promise<R>;

export declare const ZLIB_CHUNKS_SIZE = 65535;

export { }
