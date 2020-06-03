
import { ChannelCredentials } from '@grpc/grpc-js';
import type { EventEmitter } from 'events';
import { UserEvents } from '../../common';
import type { ApiRequest } from './structures';

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
  keepCase?: boolean;
  /** Set to true to not retry the request on a bucket 429 rate limit. */
  returnOnRateLimit?: false;
  /** Set to true to not retry the request on a global rate limit. */
  returnOnGlobalRateLimit?: false;
  /**
   * The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides both "returnOn" options.
   * Leave `undefined` for indefinite retries. `0` is effectively `returnOnRateLimit = true` and `returnOnGlobalRateLimit = true`.
   */
  maxRateLimitRetry?: number;
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
  channel?: ChannelCredentials;
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

  headers: Record<string, unknown>;
}

export type IRateLimitState = {
  resetAfter: number;
  global?: boolean;
}

export type IResponseState = IRateLimitState & {
  response?: IApiResponse
}
