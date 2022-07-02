import type { EventEmitter } from 'events';
import type * as Api from '../Api';
import type Gateway from './Gateway';
import type { UserEvents } from '../../@types';
import type {
  IdentifyConnectionProperties, GatewayPresenceUpdate, Presence, Snowflake, AugmentedGuildMember,
} from '../../discord';

export interface GatewayOptions {
  /** An object containing information for identifying with the gateway. `shard` property will be overwritten when using Paracord Shard Launcher. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
  identity: IdentityOptions;
  /** Emitter through which Discord gateway events are sent. */
  emitter: EventEmitter;
  /** Key:Value mapping DISCORD_EVENT to user's preferred emitted name. */
  events?: undefined | UserEvents;
  /** Paracord rest API handler. */
  api?: undefined | Api.default;
  // /** Whether or not to keep all properties on Discord objects in their original snake case. */
  /** Websocket url to connect to. */
  wsUrl?: undefined | string;
  /** Time (in ms) subtracted from the heartbeat interval. Useful for applications that tread a thin line between timeouts. */
  heartbeatIntervalOffset?: undefined | number;
  /** Number of heartbeats to allow without ACK during start up before killing the connection and trying again.  */
  startupHeartbeatTolerance?: undefined | number;
  /** Function returning boolean indicated if the gateway should consider the client "starting" or not.  */
  isStartingFunc?: undefined | StartupCheckFunction;
  /** Array of Gateway inline heartbeat checks functions for use when internally sharding. */
  checkSiblingHeartbeats?: undefined | Gateway['checkIfShouldHeartbeat'][];
  /** Discord gateway version to use. Default: 9 */
  version?: undefined | number;
}

type ErrorResponse = {
  /** error message */
  message: string;
  /** Discord error code */
  code: number;
}

export type Heartbeat = number;

export interface GatewayBotResponse extends Api.IApiResponse, ErrorResponse {
    /** websocket url */
    url: string;
    /** recommended shard count */
    shards: number;
    /** state of the limits for this period of time */
    sessionStartLimit: SessionLimitData;
}

export type SessionLimitData = {
  /** Total number of identifies application can make in this period. */
  total: number;
  /** Identifies remaining for this period. */
  remaining: number;
  /** How long in ms until `remaining` resets. */
  resetAfter: number;
  /** How many shards are allowed to identify in parallel. */
  maxConcurrency: number;
}

/** Information about the current request count and time that it should reset in relation to Discord rate limits. https://discord.com/developers/docs/topics/gateway#rate-limiting */
export type WebsocketRateLimitCache = {
  /** Timestamp in ms when the request limit is expected to reset. */
  resetTimestamp: number;
  /** How many more requests will be allowed. */
  remainingRequests: number;
}

export type IdentityOptions = {
  /** authentication token */
  token?: undefined | string;

  /** used for Guild Sharding */
  shard?: undefined | [number, number]; // (shardId, numShards);

  /** information about the client and how it's connecting */
  properties?: undefined | IdentifyConnectionProperties;

  /** whether this connection supports compression of packets */
  compress?: undefined | boolean; // false

  /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  largeThreshold?: undefined | number; // 50

  /** presence structure for initial presence information */
  presence?: undefined | GatewayPresenceUpdate;

  /** enables dispatching of guild subscription events (presence and typing events) */
  guildSubscriptions?: undefined | boolean; // true

  /** the Gateway Intents you wish to receive */
  intents: number;
}

export type GatewayCloseEvent = {
  shouldReconnect: boolean,
  code: number,
  gateway: Gateway
}

export type StartupCheckFunction = (x: Gateway) => boolean;
