export const PARACORD_VERSION_NUMBER = '0.5';
export const PARACORD_URL = 'https://paracordjs.com/';
export const SECOND_IN_MILLISECONDS = 1e3;
export const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;
export const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;
export const GIGABYTE_IN_BYTES = 1073741824;
export const DISCORD_WS_VERSION = 10;
/** Gateway websocket connection rate limit. */
export const GATEWAY_MAX_REQUESTS_PER_MINUTE = 120;
/** A buffer the reserves this amount of gateway requests every minute for critical tasks. */
export const GATEWAY_REQUEST_BUFFER = 4;
export const DEFAULT_GATEWAY_BOT_WAIT = 5 * SECOND_IN_MILLISECONDS;
/** https://discord.com/developers/docs/topics/opcodes-and-status-codes */
export const GATEWAY_OP_CODES = {
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
} as const;

export type GatewayCloseCode = typeof GATEWAY_CLOSE_CODES[keyof typeof GATEWAY_CLOSE_CODES]
/** https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes */
export const GATEWAY_CLOSE_CODES = {
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
  CONNECT_TIMEOUT: 4990, // The websocket didn't receive a HELLO from Discord in time.
  INTERNAL_TERMINATE_RECONNECT: 4991, // Something internal caused a reconnect.
  RECONNECT: 4992, // Received request from Discord to reconnect.
  SESSION_INVALIDATED: 4993, // Received an Invalid Session message and cannot resume
  SESSION_INVALIDATED_RESUMABLE: 4994, // Received an Invalid Session message but can resume
  HEARTBEAT_TIMEOUT: 4995, // Heartbeat has timed out
  USER_TERMINATE_RESUMABLE: 4996, // Closed by user. Start new connection and resume.
  USER_TERMINATE_RECONNECT: 4997, // Closed by user. Start new session.
  USER_TERMINATE: 4998, // Closed by user. Do not reconnect.
  UNKNOWN: 4999, // Something odd happened. Refer to other ERROR level logging events.
} as const;

export const DISCORD_API_URL = 'https://discord.com/api';
export const DISCORD_API_DEFAULT_VERSION = 10;
/** Discord epoch (2015-01-01T00:00:00.000Z) */
export const DISCORD_EPOCH = 1420070400000;
export const DISCORD_CDN_URL = 'https://cdn.discordapp.com';
/** For internal logging. */
export const LOG_SOURCES = {
  GATEWAY: 0,
  API: 1,
  PARACORD: 2,
  RPC: 3,
} as const;
export type LogSource = typeof LOG_SOURCES[keyof typeof LOG_SOURCES]
export const LOG_LEVELS = {
  FATAL: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 4,
  DEBUG: 5,
} as const;
export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS]
export const API_GLOBAL_RATE_LIMIT = 50;
export const API_GLOBAL_RATE_LIMIT_RESET_MILLISECONDS = 1000;
export const API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS = 50;
export const API_RATE_LIMIT_EXPIRE_AFTER_MILLISECONDS = 5 * MINUTE_IN_MILLISECONDS;
export const RPC_CLOSE_CODES = {
  LOST_CONNECTION: 14,
} as const;

export const OVERWRITE_ROLE_VALUE = 0;

export const API_DEBUG_CODES = {
  GENERAL: 1,
  ERROR: 2,
  REQUEST_SENT: 3,
  REQUEST_QUEUED: 4,
  REQUEST_REQUEUED: 5,
  RESPONSE_RECEIVED: 6,
  RATE_LIMITED: 7,
  SERVER_ERROR: 8,
} as const;

export type ApiDebugCodeName = keyof typeof API_DEBUG_CODES;
export type ApiDebugCode = typeof API_DEBUG_CODES[ApiDebugCodeName]
