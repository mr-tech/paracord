import { EventEmitter } from 'events';
import { ServerCredentials, ServiceError } from '@grpc/grpc-js';
import Api from '../clients/Api/Api';
import { Lock } from './structures';

export interface RpcServerOptions{
  host?: string;
  port?: string | number;
  channel?: ServerCredentials;
  emitter?: EventEmitter;
  apiClient?: Api;
  identifyLock?: Lock;
}

export interface IDebugEvent {
  source: number,
  level: number,
  message: string
}

// export interface IDebugEmitter {
//   on(event: 'DEBUG', listener: (x: IDebugEvent) => void): this;
// }


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
export type TServiceCallbackError = null | string | ServiceError;

export type LockRequestProto = {
  /** How long in ms the server should wait before expiring the lock. */
  /* eslint-disable-next-line camelcase */
  time_out: number;
  /** token Unique id given to the last client to acquire the lock. */
  token: string | undefined;
}

export type TokenProto = {
  /** value The string value of the token. */
  value: string;
}

export type StatusProto = {
  /** Whether or not the operation was successful. */
  success: boolean;
  /** Reason why the operation failed. */
  message: string | undefined;
  /** Unique id given to the last client to acquire the lock. */
  token: string | undefined;
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
  /** When rate limited, if the rate limit is global. */
  global: boolean;
}

export type ResponseProto = {
  /** The HTTP status code of the response. */
  /* eslint-disable-next-line camelcase */
  status_code: number;
  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  /* eslint-disable-next-line camelcase */
  status_text: string;
  /** Data response from Discord not having yet been parsed into json. */
  data: string | undefined ;
}

export type RateLimitStateProto = {
  /* eslint-disable-next-line camelcase */
  request_meta: RequestMetaProto;
  /** From Discord - the id of the rate limit bucket. */
  bucket: string | undefined;
  /** From Discord - number of requests available before hitting rate limit. */
  remaining: number;
  /** From Discord - rate limit request cap. */
  limit: number;
  /** From Discord - How long in ms the rate limit resets. */
  /* eslint-disable-next-line camelcase */
  reset_after: number;
  /** From Discord - If the request was globally rate limited. */
  global: boolean;
}

export interface IRequestMessage {
  /** HTTP method of the request. */
  method: string;
  /** Discord endpoint url. (e.g. channels/123) */
  url: string;
  /** JSON encoded data to send in the body of the request. */
  data?: undefined | Record<string, unknown>;
  /** JSON encoded headers to send with the request. */
  headers?: undefined | Record<string, unknown>;
}

export type RequestMetaProto = {
  /** HTTP method of the request. */
  method: string;
  /** Discord endpoint url. (e.g. channels/123) */
  url: string;
}

export type RemoteApiResponse = {
  /** The HTTP status code of the response. */
  status: number;
  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  statusText: string;
  /** Data response from Discord not having yet been parsed into json. */
  data: Record<string, unknown>;
}
