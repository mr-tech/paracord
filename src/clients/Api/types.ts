
import type { EventEmitter } from 'events';
import type { ApiRequest } from './structures';
import { UserEvents } from '../../common';

/** Optional parameters for this api handler. */
export interface IApiOptions {
  /** Event emitter through which to emit debug and warning events. */
  emitter?: EventEmitter;
  events?: UserEvents;
  requestOptions?: IRequestOptions;
}

/** Optional parameters for a Discord REST request. */
export interface IRequestOptions {
  /** Data to send in the body of the request. */
  data?: Record<string, unknown>;
  /** Headers to send with the request. */
  headers?: Record<string, unknown> | undefined;
  /** If `true`, executes the request locally ignoring any rpc services. Be sure to `startQueue()` to handle rate limited requests. */
  local?: boolean;
  /** Whether or not to return the response data with camelCased keys. */
  keepSnake?: boolean;
  /** Set by the rpc request service to preempt parsing the response before sending it to the client. */
  transformResponse?: (x: Record<string, unknown>) => Record<string, unknown>;
}


/** A `request` method of an axios instance wrapped to decrement the associated rate limit cached state if one exists. */
export type WrappedRequest = (request: ApiRequest) => Promise<IApiResponse>;

/** The known state of a rate limit. */
export type RateLimitState = {
  /** Number of requests available before hitting rate limit. */
  remaining: number;
  /** From Discord - rate limit request cap. */
  limit: number;
  /** When the rate limit requests remaining rests to `limit`. */
  resetTimestamp: number | undefined;
  /** How long in ms until the rate limit resets. */
  resetAfter: number;
}

// RPC
export interface IServiceOptions {
  host?: string;
  port?: string | number;
  channel?: import('@grpc/grpc-js').ChannelCredentials;
  allowFallback?: boolean;
}

// Request Service
export interface IApiResponse {
  /** The HTTP status code of the response. */
  status: number;
  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  statusText: string;
  /** The data returned by Discord. */
  data: Record<string, unknown>;

  headers: Record<string, string>;
}


// // Paracord

// /**
//  * @export typedef ParacordOptions Optional parameters for this Paracord client.
//  *
//  * @property {Object<string, string>} [events] Key:Value mapping DISCORD_EVENT to user's preferred emitted name.
//  * @property {ApiOptions} [apiOptions]
//  * @property {GatewayOptions} [gatewayOptions]
//  */

// /**
//  * @export typedef ParacordLoginOptions Optional parameters for Paracord's login method.
//  *
//  * @param {Object<string, any>} [identity] An object containing information for identifying with the gateway. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure
//  * @property {number[]} [shards] Shards to spawn internally.
//  * @property {number} [shardCount] The total number of shards that will be handled by the bot.
//  * @property {number} [unavailableGuildTolerance] During a shard's start up, how many guilds may be unavailable before forcing ready.
//  * @property {number} [unavailableGuildWait] During a shard's start up, time in seconds to wait from the last GUILD_CREATE to force ready.
//  * @property {boolean} [allowEventsDuringStartup=false] During startup, if events should be emitted before `PARACORD_STARTUP_COMPLETE` is emitted. `GUILD_CREATE` events will never be emitted during start up.
//  */

// // Shard Launcher

// /**
//  * @export typedef ShardLauncherOptions
//  * @property {string} [token] Discord token. Used to find recommended shard count when no `shardIds` provided. Will be coerced into a bot token.
//  * @property {InternalShardIds} [shardIds] Ids of the shards to start internally. Ignored if `shardChunks` is defined.
//  * @property {InternalShardIds[]} [shardChunks] Arrays of shard Ids to launch. Each item will spawn a pm2 process with the designated shards internally.
//  * @property {number} [shardCount] Total number of shards this app will be running across all instances.
//  * @property {string} [appName] Name that will appear beside the shard number in pm2.
//  * @property {Object<string, any>} [env] Additional environment variables to load into the app.
//  */

// /** @export typedef {number[]} InternalShardIds Shard Ids designated to be spawned internally. */

// // Misc


// // moduleA.ts
// export default class ModuleA {
//   modB: MobuleB;

//   constructor(modB){
//     modB = modB
//   }

//   methodA(){
//     this.mobB.someMethod();
//   }
// }


// // modubleB.ts
// export default class ModuleB {
//   modA: MobuleA;

//   constructor(modA){
//     modA = modA
//   }

//   methodB(){
//     this.mobA.someMethod();
//   }
// }
