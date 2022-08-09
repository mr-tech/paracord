"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_DEBUG_CODES = exports.OVERWRITE_ROLE_VALUE = exports.RPC_CLOSE_CODES = exports.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS = exports.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = exports.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = exports.API_GLOBAL_RATE_LIMIT = exports.LOG_LEVELS = exports.LOG_SOURCES = exports.PERMISSIONS = exports.DISCORD_CDN_URL = exports.DISCORD_EPOCH = exports.DISCORD_API_DEFAULT_VERSION = exports.DISCORD_API_URL = exports.GATEWAY_CLOSE_CODES = exports.GATEWAY_OP_CODES = exports.ZLIB_CHUNKS_SIZE = exports.DEFAULT_GATEWAY_BOT_WAIT = exports.GATEWAY_REQUEST_BUFFER = exports.GATEWAY_MAX_REQUESTS_PER_MINUTE = exports.DISCORD_WS_VERSION = exports.GIGABYTE_IN_BYTES = exports.HOUR_IN_MILLISECONDS = exports.MINUTE_IN_MILLISECONDS = exports.SECOND_IN_MILLISECONDS = exports.PARACORD_URL = exports.PARACORD_VERSION_NUMBER = void 0;
exports.PARACORD_VERSION_NUMBER = '0.5';
exports.PARACORD_URL = 'https://paracordjs.com/';
exports.SECOND_IN_MILLISECONDS = 1e3;
exports.MINUTE_IN_MILLISECONDS = 60 * exports.SECOND_IN_MILLISECONDS;
exports.HOUR_IN_MILLISECONDS = 60 * exports.MINUTE_IN_MILLISECONDS;
exports.GIGABYTE_IN_BYTES = 1073741824;
exports.DISCORD_WS_VERSION = 10;
/** Gateway websocket connection rate limit. */
exports.GATEWAY_MAX_REQUESTS_PER_MINUTE = 120;
/** A buffer the reserves this amount of gateway requests every minute for critical tasks. */
exports.GATEWAY_REQUEST_BUFFER = 4;
exports.DEFAULT_GATEWAY_BOT_WAIT = 5 * exports.SECOND_IN_MILLISECONDS;
exports.ZLIB_CHUNKS_SIZE = 65535;
/** https://discord.com/developers/docs/topics/opcodes-and-status-codes */
exports.GATEWAY_OP_CODES = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
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
    RECONNECT: 4992,
    SESSION_INVALIDATED: 4993,
    SESSION_INVALIDATED_RESUMABLE: 4994,
    HEARTBEAT_TIMEOUT: 4995,
    USER_TERMINATE_RESUMABLE: 4996,
    USER_TERMINATE_RECONNECT: 4997,
    USER_TERMINATE: 4998,
    UNKNOWN: 4999, // Something odd happened. Refer to other ERROR level logging events.
};
exports.DISCORD_API_URL = 'https://discord.com/api';
exports.DISCORD_API_DEFAULT_VERSION = 9;
/** Discord epoch (2015-01-01T00:00:00.000Z) */
exports.DISCORD_EPOCH = 1420070400000;
exports.DISCORD_CDN_URL = 'https://cdn.discordapp.com';
/** A permissions map for operations relevant to the library. */
exports.PERMISSIONS = {
    ADMINISTRATOR: BigInt(0x8),
};
/** For internal logging. */
exports.LOG_SOURCES = {
    GATEWAY: 0,
    API: 1,
    PARACORD: 2,
    RPC: 3,
};
exports.LOG_LEVELS = {
    FATAL: 0,
    ERROR: 1,
    WARNING: 2,
    INFO: 4,
    DEBUG: 5,
};
exports.API_GLOBAL_RATE_LIMIT = 50;
exports.API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = 1000;
exports.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = 50;
exports.API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS = 5 * exports.MINUTE_IN_MILLISECONDS;
exports.RPC_CLOSE_CODES = {
    LOST_CONNECTION: 14,
};
exports.OVERWRITE_ROLE_VALUE = 0;
exports.API_DEBUG_CODES = {
    GENERAL: 1,
    REQUEST_SENT: 2,
    REQUEST_QUEUED: 3,
    RESPONSE_RECEIVED: 4,
    RATE_LIMITED: 5,
};
