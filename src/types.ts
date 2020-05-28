
import type { EventEmitter } from 'events';
import type { ApiRequest } from './clients/Api/structures';


// /**
//  * @callback WrappedRequest A `request` method of an axios instance
//  * wrapped to decrement the associated rate limit cached state if one exists.
//  *
//  * @param {import("./clients/Api/structures/Request")} request Data for axios' request method.
//  * @returns {*} Response from Discord.
//  */

export type RpcArguments = [boolean, string, number, number, number]

export interface IServerOptions {
  host?: string;
  port?: number | string;
  allowFallback?: boolean;
}

// API
/** Optional parameters for this api handler. */
export interface IApiOptions {
  /** Event emitter through which to emit debug and warning events. */
  emitter?: EventEmitter;
  events?: Record<string, string>;
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
}


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

export type DebugLevel = 'FATAL'| 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'


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

export type RequestProto = {
  /** HTTP method of the request. */
  method: string;
  /** Discord endpoint url. (e.g. channels/123) */
  url: string;
  /** JSON encoded data to send in the body of the request. */
  data?: string;
  /** JSON encoded headers to send with the request. */
  headers?: string;
}

export type AuthorizationProto = {
  /** How long the client should wait in ms before asking to authorize the request again, if at all. */
  /* eslint-disable-next-line camelcase */
  reset_after: number;
}

export type ResponseProto = {
  /** The HTTP status code of the response. */
  /* eslint-disable-next-line camelcase */
  status_code: number;
  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  /* eslint-disable-next-line camelcase */
  status_text: string;
  /** JSON encoded data returned by Discord. */
  data: string;
}

// /**
//   * @export typedef GatewayLockServerOptions
//   *
//   * @property  {void|IServiceOptions} mainServerOptions Options for connecting this service to the identifylock server. Will not be released except by time out. Best used for global minimum wait time. Pass `null` to ignore.
//    * @property  {IServiceOptions} [serverOptions] Options for connecting this service to the identifylock server. Will be acquired and released in order.
//   */


// /** @export typedef {import("./clients/Api")} Api */

// /** @export typedef {import("./clients/Gateway")} Gateway */

// /** @export typedef {import("./clients/Paracord")} Paracord */


// /** @export typedef {import("./rpc/services/identifyLock/IdentifyLockService")} IdentifyLockService */

// /** @export typedef {import("./clients/Api/structures/RateLimit")} RateLimit */

// /** @export typedef {import("./clients/Api/structures/RateLimitCache")} RateLimitCache */

// /** @export typedef {import("./clients/Api/structures/RateLimitMap")} RateLimitMap */

// // /** @export typedef {import("./clients/Api/structures/Request")} Request */

// /** @export typedef {import("./clients/Api/structures/RequestQueue")} RequestQueue */

// /** @export typedef {import("./clients/Paracord/structures/Guild")} Guild */

// /** @export typedef {import("./rpc/structures/identityLock/Lock")} Lock */

// /** @export typedef {import("./rpc/server/Server")} Server */

// /** @export typedef {import("./clients/Api/structures/BaseRequest"} BaseRequest */

// /** @export typedef {import("./rpc/structures/rateLimit/RequestMetaMessage")} RequestMetaMessage */


// /**
//  * @export typedef ResponseHeaders Rate limit state with the bucket id. TODO(lando): add docs link
//  * @property {string} bucket From Discord - the id of the rate limit bucket.
//  * @property {RateLimitState} state
//  */

// // export type Function WrappedRequest: (BaseRequest | import("./clients/Api/structures/Request")) => any;


// // Gateway

// /**
//  * @export typedef GatewayOptions Optional parameters for this gateway handler.
//  *
//  * @property {Object<string, any>} [identity] An object containing information for identifying with the gateway. `shard` property will be overwritten when using Paracord's Shard Launcher. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure
//  * @property {import("events").EventEmitter} [emitter] Emitter through which Discord gateway events are sent.
//  * @property {Object<string, string>} [events] Key:Value mapping DISCORD_EVENT to user's preferred emitted name.
//  * @property {RequestService|Api} [api]
//  */

// /** @export typedef {import("./clients/Gateway/structures/Identity")} Identity */

// /** @export typedef {[number, number]} Shard [ShardID, ShardCount] to identify with. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure */


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


// /**
//  * @export typedef RpcServerOptions
//  *
//  * @property {string} [host]
//  * @property {string|number} [port]
//  * @property {import("events").EventEmitter} [emitter]
//  * @property {RpcServerBindArgs} [bindArgs]
//  */

// /**
//  * @export typedef RpcServerBindArgs
//  *
//  * @property {string|number} port
//  * @property {import("@grpc/grpc-js").ServerCredentials} creds
//  * @property {Function} callback
//  */


// /**
//  * @export typedef StatusMessage
//  *
//  * @property {boolean} success true, the operation was a success; false, the operation failed.
//  * @property {string} message Reason for the failed operation.
//  * @property {string} token Unique id given to the last client to acquire the lock.
//  */

// /**
//  * @export typedef LockRequestProto
//  *
//  * @property {number} time_out How long in ms the server should wait before expiring the lock.
//  * @property {string} token Unique id given to the last client to acquire the lock.
//  */

// /**
//  * @export typedef TokenProto
//  *
//  * @property {string} value The string value of the token.
//  */

// /**
//  * @export typedef StatusProto
//  *
//  * @property {boolean} success Whether or not the operation was successful.
//  * @property {string|void} [message] Reason why the operation failed.
//  * @property {string|void} token Unique id given to the last client to acquire the lock.
//  */


// /**
//  * @export typedef RequestMetaProto
//  *
//  * @property {string} method HTTP method of the request.
//  * @property {string} url Discord endpoint url. (e.g. channels/123)
//  */

// /**
//  * @export typedef RateLimitStateProto
//  *
//  * @property {string} bucket From Discord - the id of the rate limit bucket.
//  * @property {number} remaining From Discord - number of requests available before hitting rate limit.
//  * @property {number} limit From Discord - rate limit request cap.
//  * @property {number|void} reset_timestamp When the rate limit requests remaining rests to `limit`.
//  */


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
