/// <reference types="node" />

import { APIGuild } from 'discord-api-types/v10';
import { APIGuildChannel } from 'discord-api-types/v10';
import { APIGuildMember } from 'discord-api-types/v10';
import { APIUser } from 'discord-api-types/v10';
import type { AxiosInstance } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ChannelCredentials } from '@grpc/grpc-js';
import { ChannelType } from 'discord-api-types/v10';
import { EventEmitter } from 'events';
import type { default as FormData_2 } from 'form-data';
import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { GatewayIdentifyProperties } from 'discord-api-types/v10';
import { GatewayPresenceUpdateData } from 'discord-api-types/v10';
import { GatewayReceivePayload } from 'discord-api-types/v10';
import { GatewayRequestGuildMembersData } from 'discord-api-types/v10';
import { GatewayResumeData } from 'discord-api-types/v10';
import { GatewayURLQuery } from 'discord-api-types/v10';
import * as grpc from '@grpc/grpc-js';
import { Method } from 'axios';
import type { ServerCredentials } from '@grpc/grpc-js';
import { Snowflake } from 'discord-api-types/v10';
import ws from 'ws';

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
    setToken(token: string): void;
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

declare type AvatarParams = {
    fileType?: undefined | 'png' | 'jpg' | 'webp' | 'gif';
    animate?: boolean;
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

/**
 * Creates the discord cdn link for a guild's icon.
 * @param guild Guild whose icon url to generate.s
 * @param fileType File extension of the image.
 */
export declare function constructGuildIcon(guild: Pick<APIGuild, 'id' | 'icon_hash'>, fileType?: string): string | undefined;

/**
 * Creates the discord cdn link for a user's avatar.
 * @param user User whose avatar url to generate.
 * @param fileType File extension of the image.
 */
export declare function constructUserAvatarUrl(user: Pick<APIUser, 'id' | 'avatar'> & {
    discriminator?: string;
}, { fileType, animate }?: AvatarParams): string;

declare type DebugLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export declare const DEFAULT_GATEWAY_BOT_WAIT: number;

export declare const DISCORD_API_DEFAULT_VERSION = 10;

export declare const DISCORD_API_URL = "https://discord.com/api";

export declare const DISCORD_CDN_URL = "https://cdn.discordapp.com";

/** Discord epoch (2015-01-01T00:00:00.000Z) */
export declare const DISCORD_EPOCH = 1420070400000;

export declare const DISCORD_WS_VERSION = 10;

declare interface EventHandler extends EventEmitter {
    handleEvent: HandleEventCallback;
}

/** A client to handle a Discord gateway connection. */
export declare class Gateway {
    #private;
    /**
     * Creates a new Discord gateway handler.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
    constructor(token: string, options: GatewayOptions);
    /** [ShardID, ShardCount] to identify with; `undefined` if not sharding. */
    get shard(): GatewayIdentify['shard'];
    /** The shard id that this gateway is connected to. */
    get id(): number;
    get compression(): boolean;
    setCompression(compress: boolean): void;
    /** This gateway's active websocket connection. */
    get ws(): ws | undefined;
    /** Whether or not the websocket is open. */
    get connected(): boolean;
    get resumable(): boolean;
    /** Whether or not the client is currently resuming a session. */
    get resuming(): boolean;
    get options(): GatewayOptions;
    get heartbeat(): Heartbeat | undefined;
    get isFetchingMembers(): boolean;
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
    setToken(token: string): void;
    /**
     * Sends a `Request Guild Members` websocket message.
     * @param guildId Id of the guild to request members from.
     * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
     */
    requestGuildMembers(options: GatewayRequestGuildMembersData): boolean;
    updatePresence(presence: GatewayPresenceUpdateData): boolean;
    login: () => Promise<void>;
    close(code?: GatewayCloseCode, flushWait?: number): void;
    checkIfShouldHeartbeat(): void;
    /**
     * Handles emitting events from Discord. Will first pass through `this.#emitter.handleEvent` function if one exists.
     * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
     * @param data Data of the event from Discord.
     */
    private handleEvent;
    private handleClose;
    /** Uses the close code to determine what message to log and if the client should attempt to reconnect.
     * @param code Code that came with the websocket close event.
     * @return Whether or not the client should attempt to login again.
     */
    private handleCloseCode;
    private clearSession;
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

/** A buffer the reserves this amount of gateway requests every minute for critical tasks. */
export declare const GATEWAY_REQUEST_BUFFER = 4;

export declare type GatewayCloseCode = typeof GATEWAY_CLOSE_CODES[keyof typeof GATEWAY_CLOSE_CODES];

export declare type GatewayCloseEvent = {
    shouldReconnect: boolean;
    code: number;
    gateway: Gateway;
};

export declare type GatewayEvent = `${GatewayDispatchEvents}` | 'HELLO' | 'INVALID_SESSION';

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
    updatePresence(presence: GatewayPresenceUpdateData): void;
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
    wsParams: GatewayURLQuery;
    /** Time in seconds subtracted from the heartbeat interval. Useful for applications that tread a thin line between timeouts. */
    heartbeatIntervalOffset?: undefined | number;
    /** How long to wait after a heartbeat ack before timing out the shard. */
    heartbeatTimeoutSeconds?: undefined | number;
    /** Array of Gateway inline heartbeat checks functions for use when internally sharding. */
    checkSiblingHeartbeats?: undefined | Heartbeat['checkIfShouldHeartbeat'][];
    /** Discord gateway version to use. Default: 10 */
    version?: undefined | number;
}

export declare type GatewayRequestMembersEvent = {
    options: GatewayRequestGuildMembersData;
    gateway: Gateway;
};

export declare const GIGABYTE_IN_BYTES = 1073741824;

export declare type HandleEventCallback = (eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent, data: unknown, shard: Gateway) => void;

export declare class Heartbeat {
    #private;
    constructor(params: Params);
    get recentTimestamp(): number | undefined;
    private checkDestroyed;
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
    /**
     * Clears old heartbeat timeout and starts a new one.
     */
    private scheduleNextHeartbeat;
    sendHeartbeat: () => void;
    /** Checks if heartbeat ack was received. */
    private checkForAck;
}

export declare const HOUR_IN_MILLISECONDS: number;

declare interface IDebugEvent {
    source: number;
    level: number;
    message: string;
}

export declare type IdentityOptions = {
    /** authentication token */
    token?: undefined | string;
    /** used for Guild Sharding */
    shard?: undefined | [number, number];
    /** information about the client and how it's connecting */
    properties?: undefined | GatewayIdentifyProperties;
    /** whether this connection supports compression of packets */
    compress?: undefined | boolean;
    /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    largeThreshold?: undefined | number;
    /** presence structure for initial presence information */
    presence?: undefined | GatewayPresenceUpdateData;
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

export declare type InternalShardIds = number[];

export declare function isApiError(val: unknown): val is ApiError;

export declare function isObject(v: unknown): boolean;

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

/**
 * Returns a timestamp of some time in the future. -1 if provide timestamp has already passed
 * @param timestamp Unix timestamp.
 */
export declare function millisecondsFromNow(timestamp: number): number;

export declare const MINUTE_IN_MILLISECONDS: number;

export declare const OVERWRITE_ROLE_VALUE = 0;

/** A client that manages multiple Gateway clients. */
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
    setToken(token: string): void;
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

declare interface Params {
    gateway: Gateway;
    websocket: Websocket;
    heartbeatIntervalOffset?: undefined | number;
    heartbeatTimeoutSeconds?: undefined | number;
    log: Gateway['log'];
}

declare type PermissibleChannel = Pick<APIGuildChannel<ChannelType>, 'id' | 'permission_overwrites'>;

declare type PermissibleGuild = Pick<APIGuild, 'id' | 'owner_id' | 'roles'>;

declare type PermissibleMember = Pick<Required<APIGuildMember>, 'user' | 'roles'>;

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

export declare interface ServiceOptions {
    host?: string;
    port?: string | number;
    channel?: ChannelCredentials;
    allowFallback?: boolean;
}

export declare class Session {
    #private;
    constructor(params: SessionParams);
    get connection(): undefined | ws;
    /** Whether or not the websocket is open. */
    get connected(): boolean;
    /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
    get resumable(): boolean;
    /** Whether or not the client is currently resuming a session. */
    get resuming(): boolean;
    get sequence(): null | number;
    get websocket(): undefined | Websocket;
    get gateway(): Gateway;
    get identity(): GatewayIdentify;
    get isFetchingMembers(): boolean;
    log: Gateway['log'];
    emit: Gateway['emit'];
    /**
     * Sends a `Request Guild Members` websocket message.
     * @param guildId Id of the guild to request members from.
     * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
     */
    requestGuildMembers(options: GatewayRequestGuildMembersData): boolean;
    /**
     * Connects to Discord's event gateway.
     * @param _websocket Ignore. For unittest dependency injection only.
     */
    login: () => Promise<void>;
    close(code: GatewayCloseCode, flushWaitTime?: number): void;
    send: Websocket['send'];
    destroy(): void;
    private constructWsUrl;
    /** Processes incoming messages from Discord's gateway.
     * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
     */
    handleMessage(p: GatewayReceivePayload): void;
    /**
     * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
     * @param data From Discord.
     */
    private handleReady;
    /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
    private handleResumed;
    /**
     * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
     * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
     * @param resumable Whether or not Discord has said that the connection as able to be resumed.
     */
    private handleInvalidSession;
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
    handleEvent(type: GatewayEvent | ParacordGatewayEvent, data: unknown): void;
    /**
     * Updates the sequence value of Discord's gateway if it's larger than the current.
     * @param s Sequence value from Discord.
     */
    private updateSequence;
    private handleClose;
    private handleGuildMemberChunk;
    private updateRequestMembersState;
}

declare interface SessionParams extends Pick<GatewayOptions, 'wsUrl' | 'wsParams'> {
    gateway: Gateway;
    identity: GatewayIdentify;
    log: Gateway['log'];
    handleEvent: Gateway['handleEvent'];
    emit: Gateway['emit'];
    onClose: Gateway['handleClose'];
}

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

declare interface StartOptions {
    /**
     * Enable or disable auto start after process added (default: true).
     */
    autostart?: boolean;
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

export declare function stripLeadingSlash(url: string): string;

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

declare class Websocket {
    #private;
    /** This this.#connection's heartbeat manager. */
    get heart(): undefined | Heartbeat;
    /**
     * Connects to Discord's event gateway.
     * @param _websocket Ignore. For unittest dependency injection only.
     */
    constructor(params: WebsocketParams);
    get heartbeat(): Heartbeat;
    private setupConnection;
    get connection(): ws;
    /** Whether or not the websocket is open. */
    get connected(): boolean;
    close(code: GatewayCloseCode, flushWaitTime?: number): void;
    destroy(): void;
    /** Assigned to websocket `onopen`. */
    private handleWsOpen;
    /** Starts the timeout for the connection to Discord. */
    private startConnectTimeout;
    private clearConnectTimeout;
    /** Assigned to websocket `onerror`. */
    private handleWsError;
    /** Assigned to websocket `onclose`. Cleans up and attempts to re-connect with a fresh connection after waiting some time.
     * @param event Object containing information about the close.
     */
    private handleWsClose;
    /** Assigned to websocket `onmessage`. */
    private handleWsMessage;
    private decompress;
    /** Processes incoming messages from Discord's gateway.
     * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
     */
    private handleMessage;
    /**
     * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
     * @param data From Discord.
     */
    private handleHello;
    handleEvent(type: GatewayEvent | ParacordGatewayEvent, data: unknown): void;
    /** Proxy for inline heartbeat checking. */
    private checkHeartbeatInline;
    sendHeartbeat(): void;
    /**
     * Sends a websocket message to Discord.
     * @param op Gateway Opcode https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
     * @param data Data of the message.
     * @returns true if the packet was sent; false if the packet was not due to rate limiting or websocket not open.
     */
    send(op: typeof GATEWAY_OP_CODES['HEARTBEAT'], data: number): boolean;
    send(op: typeof GATEWAY_OP_CODES['IDENTIFY'], data: GatewayIdentify): boolean;
    send(op: typeof GATEWAY_OP_CODES['RESUME'], data: GatewayResumeData): boolean;
    send(op: typeof GATEWAY_OP_CODES['REQUEST_GUILD_MEMBERS'], data: GatewayRequestGuildMembersData): boolean;
    send(op: typeof GATEWAY_OP_CODES['GATEWAY_PRESENCE_UPDATE'], data: GatewayPresenceUpdateData): boolean;
    /**
     * Returns whether or not the message to be sent will exceed the rate limit or not, taking into account padded buffers for high priority packets (e.g. heartbeats, resumes).
     * @param op Op code of the message to be sent.
     * @returns true if sending message won't exceed rate limit or padding; false if it will
     */
    private isPacketRateLimited;
    /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
    private updateWsRateLimit;
    private startCloseTimeout;
}

declare interface WebsocketParams {
    ws: typeof ws;
    session: Session;
    url: string;
    onClose: Session['handleClose'];
}

/** A `request` method of an axios instance wrapped to decrement the associated rate limit cached state if one exists. */
export declare type WrappedRequest<T = any, R = ApiResponse<T>> = (request: ApiRequest) => Promise<R>;

export { }
