import { EventEmitter } from 'events';
import { Identify } from '../../types';
import { UserEvents } from '../../common';
import Api from '../Api/Api';
import { IApiResponse } from '../Api/types';

export interface GatewayOptions {
  /** An object containing information for identifying with the gateway. `shard` property will be overwritten when using Paracord's Shard Launcher. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure */
  identity: Partial<Identify>;
  /** Emitter through which Discord gateway events are sent. */
  emitter: EventEmitter;
  /** Key:Value mapping DISCORD_EVENT to user's preferred emitted name. */
  events: UserEvents;
  /** Paracord rest API handler. */
  api: Api;
}

type ErrorResponse = {
  /** error message */
  message: string;
  /** Discord error code */
  code: number;
}

export interface GatewayBotResponse extends IApiResponse {
  data: {
    /** websocket url */
    url: string;
    /** state of the limits for this period of time */
    sessionStartLimit: SessionLimitData;
    /** recommended shard count */
    shards: number;
  } & ErrorResponse
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
