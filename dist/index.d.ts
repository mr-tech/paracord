/**
 * Paracord — A TypeScript/Node.js toolkit for building scalable Discord bots.
 *
 * Provides REST (`Api`), Gateway (`Gateway`), multi-shard orchestration (`Paracord`),
 * pm2-based shard launching (`ShardLauncher`), and optional gRPC services (`Server`)
 * for centralized rate limits and remote REST requests.
 *
 * All Discord payload types come from `discord-api-types/v10`.
 *
 * @packageDocumentation
 */

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
     *
     * @example
     * ```ts
     * const api = new Api('myBotToken');
     * const res = await api.request('GET', '/channels/123456789');
     * console.log(res.data);
     * ```
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
    /**
     * Single-flight — every concurrent caller shares one in-flight recreation,
     * reading `#recreateInFlight` and closing the predecessor before its replacement is
     * assigned. The kind (`usesRateLimitService`) is captured before anything is cleared,
     * and the clear-then-assign sequence inside `recreate` carries no `await`, so no
     * concurrent caller can ever observe the service field `undefined` — the field the
     * `add*Service` guard tests, and the only way a rate-limit client could otherwise
     * silently acquire a request service (or vice versa).
     */
    private recreateRpcService;
    private reattemptConnectInFuture;
    setToken(token: string): void;
    /**
     * Makes a request to Discord, handling any rate limits and returning when a non-429 response is received.
     * @param method HTTP method of the request.
     * @param url Discord endpoint url. (e.g. "/channels/abc123")
     * @param options Optional parameters for a Discord REST request.
     * @returns Response to the request made.
     *
     * @example
     * ```ts
     * // GET a channel
     * const res = await api.request('GET', '/channels/123456789');
     * // POST a message
     * const msg = await api.request('POST', '/channels/123/messages', {
     *   data: { content: 'Hello!' },
     * });
     * ```
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

/** Numeric codes identifying the type of API debug event. Used in `ApiDebugEvent.code`. */
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

/** Maximum number of global rate limit requests per second. Default: 50. */
export declare const API_GLOBAL_RATE_LIMIT = 50;

/** Duration in ms of the global rate limit reset window (1 second). */
export declare const API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = 1000;

/** Extra padding in ms added to the global rate limit reset timer to avoid edge-case 429s. */
export declare const API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = 50;

/** Time in ms after which cached rate limit buckets expire and are cleaned up (5 minutes). */
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
    /** Interval in milliseconds between queue processing cycles. Controls how often rate-limited requests are retried. */
    queueLoopInterval?: number;
    /** Maximum number of concurrent in-flight requests. Requests exceeding this limit are queued. */
    maxConcurrency?: number;
}

/* Excluded from this release type: ApiRequest */

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

/* Excluded from this release type: BaseRequest */

/**
 * Returns a new object that is a clone of the original.
 * @param object Object to clone.
 */
export declare function clone<T>(object: T): T;

/* Excluded from this release type: CloseOrigin */

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

/** Default wait time in ms before connecting to the gateway bot endpoint (5 seconds). */
export declare const DEFAULT_GATEWAY_BOT_WAIT: number;

/** Default Discord REST API version. */
export declare const DISCORD_API_DEFAULT_VERSION = 10;

/** Base URL for the Discord REST API. */
export declare const DISCORD_API_URL = "https://discord.com/api";

/** Base URL for the Discord CDN (avatars, icons, etc.). */
export declare const DISCORD_CDN_URL = "https://cdn.discordapp.com";

/** Discord epoch in Unix ms (2015-01-01T00:00:00.000Z). Used for snowflake timestamp extraction. */
export declare const DISCORD_EPOCH = 1420070400000;

/** Discord gateway WebSocket protocol version. */
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
     *
     * @example
     * ```ts
     * const gateway = new Gateway('myBotToken', {
     *   identity: { intents: 32767, shard: [0, 1] },
     *   emitter: myEmitter,
     *   wsUrl: 'wss://gateway.discord.gg',
     *   wsParams: { v: '10', encoding: 'json' },
     * });
     * gateway.login();
     * ```
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
    login: () => void;
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

/** Gateway WebSocket connection rate limit: max requests per minute. */
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

/** Number of gateway requests reserved per minute for critical tasks (heartbeats, identifies). */
export declare const GATEWAY_REQUEST_BUFFER = 4;

export declare type GatewayCloseCode = typeof GATEWAY_CLOSE_CODES[keyof typeof GATEWAY_CLOSE_CODES];

/** Emitted when a gateway WebSocket connection closes. */
export declare type GatewayCloseEvent = {
    /** Whether the client will attempt to reconnect automatically. */
    shouldReconnect: boolean;
    /** The WebSocket close code. See `GATEWAY_CLOSE_CODES` for known values. */
    code: number;
    /** The gateway instance that closed. */
    gateway: Gateway;
};

export declare type GatewayEvent = `${GatewayDispatchEvents}` | 'HELLO' | 'INVALID_SESSION';

/** Emitted when a heartbeat acknowledgement is received from Discord. */
export declare type GatewayHeartbeatAckEvent = {
    /** Round-trip latency in milliseconds. */
    latency: number;
    /** The gateway instance that received the ack. */
    gateway: Gateway;
};

/** Emitted when a heartbeat is sent to Discord. */
export declare type GatewayHeartbeatSentEvent = {
    /** Difference in ms between the scheduled heartbeat time and the actual send time. */
    scheduleDiff: number;
    /** The gateway instance that sent the heartbeat. */
    gateway: Gateway;
};

/* Excluded from this release type: GatewayIdentify */

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

/** One gigabyte in bytes (1073741824). */
export declare const GIGABYTE_IN_BYTES = 1073741824;

export declare type HandleEventCallback = (eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent, data: unknown, shard: Gateway) => void;

/* Excluded from this release type: Heartbeat */

/** One hour in milliseconds (3600000). */
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

/** Numeric log severity levels. Higher values = more verbose. */
export declare const LOG_LEVELS: {
    readonly FATAL: 0;
    readonly ERROR: 1;
    readonly WARNING: 2;
    readonly INFO: 4;
    readonly DEBUG: 5;
};

/** Numeric identifiers for log event sources. Used in debug event `source` field. */
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

/** One minute in milliseconds (60000). */
export declare const MINUTE_IN_MILLISECONDS: number;

/** Constant used to identify role-type permission overwrites (vs member-type). */
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
     *
     * @example
     * ```ts
     * const bot = new Paracord('myBotToken', {
     *   gatewayOptions: {
     *     wsUrl: 'wss://gateway.discord.gg',
     *     wsParams: { v: '10', encoding: 'json' },
     *   },
     * });
     * bot.on('MESSAGE_CREATE', (data, shard) => console.log(data));
     * await bot.login({ identity: { intents: 32767 }, shards: [0, 1], shardCount: 2 });
     * ```
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

/** Library homepage URL. */
export declare const PARACORD_URL = "https://paracordjs.com/";

/** Library version number. */
export declare const PARACORD_VERSION_NUMBER = "0.5";

export declare type ParacordEvent = 'PARACORD_STARTUP_COMPLETE' | 'SHARD_STARTUP_COMPLETE';

export declare type ParacordGatewayEvent = 'DEBUG' | 'GATEWAY_OPEN' | 'GATEWAY_CLOSE' | 'GATEWAY_RESUME' | 'GATEWAY_IDENTIFY' | 'HEARTBEAT_SENT' | 'HEARTBEAT_ACK' | 'GUILD_MEMBERS_CHUNK' | 'REQUEST_GUILD_MEMBERS';

export declare type ParacordGatewayOptions = Omit<GatewayOptions, 'emitter' | 'identity'>;

/** Options passed to `Paracord.login()` to start gateway connections. */
export declare interface ParacordLoginOptions {
    /** Identify payload structure shared across all shards. The `shard` property is set internally per shard. */
    identity: IdentityOptions;
    /** Array of shard IDs to spawn. Each ID must be less than `shardCount`. */
    shards?: number[];
    /** Total number of shards the bot is running across all processes. */
    shardCount?: number;
    /** Function that determines if the gateway is allowed to connect. */
    allowConnection?: undefined | ((gw: Gateway) => boolean | Promise<boolean>);
}

/** Configuration options for the Paracord multi-shard orchestrator. */
export declare interface ParacordOptions {
    /** Gateway configuration applied to all shards (emitter and identity are set internally). */
    gatewayOptions: ParacordGatewayOptions;
    /** During startup, the maximum number of unavailable guilds allowed before forcing the shard as ready. */
    unavailableGuildTolerance?: number;
    /** During startup, time in seconds to wait since the last GUILD_CREATE before forcing the shard as ready. Used together with `unavailableGuildTolerance`. */
    unavailableGuildWait?: number;
    /** Time in seconds before a shard's startup is considered timed out and the shard is reconnected. */
    shardStartupTimeout?: number;
    /** Shard IDs on which to enable gateway payload compression. */
    compressShards?: number[];
}

/** Emitted per shard when it completes its startup sequence. */
export declare interface ParacordStartupEvent {
    /** The gateway that completed startup. */
    shard: Gateway;
    /** `true` if startup was forced due to unavailable guild tolerance being reached. */
    forced?: boolean;
    /** `true` if the shard resumed an existing session rather than fresh-identifying. */
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

/* Excluded from this release type: QueuedRequest */

/* Excluded from this release type: RateLimit */

/** From Discord - A uid that identifies a group of requests that share a rate limit. */
declare type RateLimitBucketHash = string;

/* Excluded from this release type: RateLimitCache */

export declare interface RateLimitedResponse extends ApiResponse<{
    retry_after: number;
    global: boolean;
    message: string;
}> {
    status: 429;
    statusText: 'Too Many Requests';
}

/* Excluded from this release type: RateLimitHeaders */

/* Excluded from this release type: RateLimitMap */

export declare type RateLimitState = {
    waitFor: number;
    global?: boolean;
};

/* Excluded from this release type: RateLimitTemplate */

/* Excluded from this release type: RateLimitTemplateMap */

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

/* Excluded from this release type: RequestQueue */

declare interface RequestService {
    hello(): Promise<void>;
    request<T>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>>;
    allowFallback: boolean;
    target: string;
    /** Closes the underlying channel. Synchronous — never awaited. */
    close(): void;
}

/** Close codes used when the gRPC connection to an RPC service is lost. */
export declare const RPC_CLOSE_CODES: {
    readonly LOST_CONNECTION: 14;
};

declare type RpcArguments = [boolean, string | undefined, number, number, number, number | undefined];

/** Configuration options for the gRPC server (RpcServer/Server). */
declare interface RpcServerOptions {
    /** Host address to bind to. Default: `'127.0.0.1'`. */
    host?: string;
    /** Port to listen on. Default: `'50051'`. */
    port?: string | number;
    /** gRPC server credentials. Default: insecure. */
    channel?: ServerCredentials;
    /** Event emitter for debug log events. */
    emitter?: EventEmitter;
    /** Pre-configured Api client for the request service to use. If not provided, one is created internally. */
    apiClient?: Api;
    /** Maximum number of global rate limit requests per second. Default: `50`. */
    globalRateLimitMax?: number;
    /** Extra milliseconds added to the global rate limit reset timer. Default: `50`. */
    globalRateLimitResetPadding?: number;
}

/** One second in milliseconds (1000). */
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
     * @param options Server configuration options.
     *
     * @example
     * ```ts
     * const server = new RpcServer({ host: '127.0.0.1', port: '50051' });
     * server.addRateLimitService();
     * server.addRequestService('myBotToken');
     * server.serve();
     * ```
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

/** Options for connecting to an RPC service (rate limit or request). */
export declare interface ServiceOptions {
    /** RPC server host. Default: `'127.0.0.1'`. */
    host?: string;
    /** RPC server port. Default: `'50051'`. */
    port?: string | number;
    /** gRPC channel credentials. Default: insecure channel. */
    channel?: ChannelCredentials;
    /** Whether to fall back to local handling when the RPC server is unreachable. Default: `true`. */
    allowFallback?: boolean;
}

/* Excluded from this release type: Session */

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
     *
     * @example
     * ```ts
     * const launcher = new ShardLauncher('./bot.js', {
     *   token: 'myBotToken',
     *   shardIds: [0, 1, 2],
     *   shardCount: 3,
     * });
     * await launcher.launch();
     * ```
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

/* Excluded from this release type: Websocket */

declare interface WebsocketParams {
    ws: typeof ws;
    session: Session;
    url: string;
    onClose: Session['handleClose'];
}

/** A `request` method of an axios instance wrapped to decrement the associated rate limit cached state if one exists. */
export declare type WrappedRequest<T = any, R = ApiResponse<T>> = (request: ApiRequest) => Promise<R>;

export { }
