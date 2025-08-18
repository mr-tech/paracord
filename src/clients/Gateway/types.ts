import {
  GatewayDispatchEvents,
  GatewayIdentifyProperties, GatewayPresenceUpdateData, GatewayRequestGuildMembersData, GatewayURLQuery,
} from 'discord-api-types/v10';

import { Heartbeat } from './structures';

import type { EventHandler } from '../../@types';
import type Gateway from './Gateway';

export type GatewayEvent = `${GatewayDispatchEvents}` | 'HELLO' | 'INVALID_SESSION';

export type ParacordGatewayEvent = 'DEBUG' | 'GATEWAY_OPEN' | 'GATEWAY_CLOSE' | 'GATEWAY_RESUME' | 'GATEWAY_IDENTIFY'
| 'HEARTBEAT_SENT' | 'HEARTBEAT_ACK' | 'GUILD_MEMBERS_CHUNK' | 'REQUEST_GUILD_MEMBERS';

export type ParacordEvent = 'PARACORD_STARTUP_COMPLETE' | 'SHARD_STARTUP_COMPLETE'

export interface GatewayOptions {
  /** An object containing information for identifying with the gateway. `shard` property will be overwritten when using Paracord Shard Launcher. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
  identity: IdentityOptions;
  /** Emitter through which Discord gateway events are sent. */
  emitter: EventHandler;
  // /** Whether or not to keep all properties on Discord objects in their original snake case. */
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

export type IdentityOptions = {
  /** authentication token */
  token?: undefined | string;

  /** used for Guild Sharding */
  shard?: undefined | [number, number]; // (shardId, numShards);

  /** information about the client and how it's connecting */
  properties?: undefined | GatewayIdentifyProperties;

  /** whether this connection supports compression of packets */
  compress?: undefined | boolean; // false

  /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  largeThreshold?: undefined | number; // 50

  /** presence structure for initial presence information */
  presence?: undefined | GatewayPresenceUpdateData;

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

export type GatewayHeartbeatSentEvent = {
  scheduleDiff: number;
  gateway: Gateway;
}

export type GatewayHeartbeatAckEvent = {
  latency: number;
  gateway: Gateway;
}

export type GatewayRequestMembersEvent = {
  options: GatewayRequestGuildMembersData;
  gateway: Gateway;
}
