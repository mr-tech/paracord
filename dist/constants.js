"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_DEBUG_CODES = exports.OVERWRITE_ROLE_VALUE = exports.RPC_CLOSE_CODES = exports.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS = exports.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = exports.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = exports.API_GLOBAL_RATE_LIMIT = exports.LOG_LEVELS = exports.LOG_SOURCES = exports.DISCORD_CDN_URL = exports.DISCORD_EPOCH = exports.DISCORD_API_DEFAULT_VERSION = exports.DISCORD_API_URL = exports.GATEWAY_CLOSE_CODES = exports.GATEWAY_OP_CODES = exports.DEFAULT_GATEWAY_BOT_WAIT = exports.GATEWAY_REQUEST_BUFFER = exports.GATEWAY_MAX_REQUESTS_PER_MINUTE = exports.DISCORD_WS_VERSION = exports.GIGABYTE_IN_BYTES = exports.HOUR_IN_MILLISECONDS = exports.MINUTE_IN_MILLISECONDS = exports.SECOND_IN_MILLISECONDS = exports.PARACORD_URL = exports.PARACORD_VERSION_NUMBER = void 0;
/** Library version number. */
exports.PARACORD_VERSION_NUMBER = '0.5';
/** Library homepage URL. */
exports.PARACORD_URL = 'https://paracordjs.com/';
/** One second in milliseconds (1000). */
exports.SECOND_IN_MILLISECONDS = 1e3;
/** One minute in milliseconds (60000). */
exports.MINUTE_IN_MILLISECONDS = 60 * exports.SECOND_IN_MILLISECONDS;
/** One hour in milliseconds (3600000). */
exports.HOUR_IN_MILLISECONDS = 60 * exports.MINUTE_IN_MILLISECONDS;
/** One gigabyte in bytes (1073741824). */
exports.GIGABYTE_IN_BYTES = 1073741824;
/** Discord gateway WebSocket protocol version. */
exports.DISCORD_WS_VERSION = 10;
/** Gateway WebSocket connection rate limit: max requests per minute. */
exports.GATEWAY_MAX_REQUESTS_PER_MINUTE = 120;
/** Number of gateway requests reserved per minute for critical tasks (heartbeats, identifies). */
exports.GATEWAY_REQUEST_BUFFER = 4;
/** Default wait time in ms before connecting to the gateway bot endpoint (5 seconds). */
exports.DEFAULT_GATEWAY_BOT_WAIT = 5 * exports.SECOND_IN_MILLISECONDS;
/** https://discord.com/developers/docs/topics/opcodes-and-status-codes */
exports.GATEWAY_OP_CODES = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    GATEWAY_PRESENCE_UPDATE: 3,
    GATEWAY_VOICE_STATE_UPDATE: 4,
    RESUME: 6,
    RECONNECT: 7,
    REQUEST_GUILD_MEMBERS: 8,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_ACK: 11,
};
/** https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes */
exports.GATEWAY_CLOSE_CODES = {
    CLEAN: 1000,
    GOING_AWAY: 1001,
    ABNORMAL: 1006,
    UNKNOWN_ERROR: 4000,
    UNKNOWN_OPCODE: 4001,
    DECODE_ERROR: 4002,
    NOT_AUTHENTICATED: 4003,
    AUTHENTICATION_FAILED: 4004,
    ALREADY_AUTHENTICATED: 4005,
    SESSION_NO_LONGER_VALID: 4006,
    INVALID_SEQ: 4007,
    RATE_LIMITED: 4008,
    SESSION_TIMEOUT: 4009,
    INVALID_SHARD: 4010,
    SHARDING_REQUIRED: 4011,
    INVALID_VERSION: 4012,
    INVALID_INTENT: 4013,
    DISALLOWED_INTENT: 4014,
    // The below are not Discord close events.
    CONNECT_TIMEOUT: 4990,
    INTERNAL_TERMINATE_RECONNECT: 4991,
    RECONNECT: 4992,
    SESSION_INVALIDATED: 4993,
    SESSION_INVALIDATED_RESUMABLE: 4994,
    HEARTBEAT_TIMEOUT: 4995,
    USER_TERMINATE_RESUMABLE: 4996,
    USER_TERMINATE_RECONNECT: 4997,
    USER_TERMINATE: 4998,
    UNKNOWN: 4999, // Something odd happened. Refer to other ERROR level logging events.
};
/** Base URL for the Discord REST API. */
exports.DISCORD_API_URL = 'https://discord.com/api';
/** Default Discord REST API version. */
exports.DISCORD_API_DEFAULT_VERSION = 10;
/** Discord epoch in Unix ms (2015-01-01T00:00:00.000Z). Used for snowflake timestamp extraction. */
exports.DISCORD_EPOCH = 1420070400000;
/** Base URL for the Discord CDN (avatars, icons, etc.). */
exports.DISCORD_CDN_URL = 'https://cdn.discordapp.com';
/** Numeric identifiers for log event sources. Used in debug event `source` field. */
exports.LOG_SOURCES = {
    GATEWAY: 0,
    API: 1,
    PARACORD: 2,
    RPC: 3,
};
/** Numeric log severity levels. Higher values = more verbose. */
exports.LOG_LEVELS = {
    FATAL: 0,
    ERROR: 1,
    WARNING: 2,
    INFO: 4,
    DEBUG: 5,
};
/** Maximum number of global rate limit requests per second. Default: 50. */
exports.API_GLOBAL_RATE_LIMIT = 50;
/** Duration in ms of the global rate limit reset window (1 second). */
exports.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = 1000;
/** Extra padding in ms added to the global rate limit reset timer to avoid edge-case 429s. */
exports.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = 50;
/** Time in ms after which cached rate limit buckets expire and are cleaned up (5 minutes). */
exports.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS = 5 * exports.MINUTE_IN_MILLISECONDS;
/** Close codes used when the gRPC connection to an RPC service is lost. */
exports.RPC_CLOSE_CODES = {
    LOST_CONNECTION: 14,
};
/** Constant used to identify role-type permission overwrites (vs member-type). */
exports.OVERWRITE_ROLE_VALUE = 0;
/** Numeric codes identifying the type of API debug event. Used in `ApiDebugEvent.code`. */
exports.API_DEBUG_CODES = {
    GENERAL: 1,
    ERROR: 2,
    REQUEST_SENT: 3,
    REQUEST_QUEUED: 4,
    REQUEST_REQUEUED: 5,
    RESPONSE_RECEIVED: 6,
    RATE_LIMITED: 7,
    SERVER_ERROR: 8,
};
