import { EventEmitter } from 'events';
import { UserEvents } from '../../common';
import Api from '../Api/Api';
import { IApiResponse } from '../Api/types';
import {
  Identify, IdentifyConnectionProperties, GatewayStatusUpdate, RawPresence, RawGuildMember, Snowflake,
} from '../../types';
import Gateway from './Gateway';

export interface GatewayOptions {
  /** An object containing information for identifying with the gateway. `shard` property will be overwritten when using Paracord Shard Launcher. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
  identity: Identify;
  /** Emitter through which Discord gateway events are sent. */
  emitter: EventEmitter;
  /** Key:Value mapping DISCORD_EVENT to user's preferred emitted name. */
  events?: UserEvents;
  /** Paracord rest API handler. */
  api: Api;
  // /** Whether or not to keep all properties on Discord objects in their original snake case. */
  // keepCase: false;
  /** Websocket url to connect to. */
  wsUrl?: string;
  /** Time (in ms) subtracted from the heartbeat interval. Useful for applications that tread a thin line between timeouts. */
  heartbeatIntervalOffset?: number;
  /** Number of heartbeats to allow without ACK during start up before killing the connection and trying again.  */
  startupHeartbeatTolerance?: number;
  /** Function returning boolean indicated if the gateway should consider the client "starting" or not.  */
  isStartingFunc?: StartupCheckFunction;
  /** Array of Gateway inline heartbeat checks functions for use when internally sharding. */
  checkSiblingHeartbeats?: Gateway['checkIfShouldHeartbeat'][];
}

type ErrorResponse = {
  /** error message */
  message: string;
  /** Discord error code */
  code: number;
}

export type Heartbeat = number;

export interface GatewayBotResponse extends IApiResponse<any>, ErrorResponse {
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
  token: string;

  /** used for Guild Sharding */
  shard?: [number, number]; // (shardId, numShards);

  /** information about the client and how it's connecting */
  properties?: IdentifyConnectionProperties;

  /** whether this connection supports compression of packets */
  compress?: boolean; // false

  /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  largeThreshold?: number; // 50

  /** presence structure for initial presence information */
  presence?: GatewayStatusUpdate;

  /** enables dispatching of guild subscription events (presence and typing events) */
  guildSubscriptions?: boolean; // true

  /** the Gateway Intents you wish to receive */
  intents?: number;
}

export type GatewayCloseEvent = {
  shouldReconnect: boolean,
  code: number,
  gateway: Gateway
}

export type StartupCheckFunction = (x: Gateway) => boolean;

export interface GuildMemberChunk {
  guild_id: Snowflake;
  members: Omit<RawGuildMember, 'guild_id'>[];
  chunk_index: number;
  chunk_count: number;
  not_found?: number;
  presences?: Omit<RawPresence, 'guild_id'>[];
  nonce?: string;
}
