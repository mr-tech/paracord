/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventEmitter } from 'events';
import type FormData from 'form-data';
import type { ChannelCredentials } from '@grpc/grpc-js';
import type { RemoteApiResponse } from '../../rpc';
import type {
  API_DEBUG_CODES, ApiDebugCodeName, LogLevel, LOG_SOURCES,
} from '../../constants';
import type { ApiRequest, RateLimitHeaders } from './structures';

export type { RemoteApiResponse } from '../../rpc';

/** Optional parameters for this api handler. */
export interface ApiOptions {
  /** Event emitter through which to emit debug and warning events. */
  emitter?: EventEmitter;
  requestOptions?: RequestOptions;
  queueLoopInterval?: number;
  maxConcurrency?: number;
}

export type RequestFormDataFunction = () => Pick<RequestOptions, 'headers' | 'params'> & {
  data?: Record<string, unknown> | FormData | undefined
}

/** Optional parameters for a Discord REST request. */
export interface RequestOptions {
  /** Data to send in the body of the request. */
  data?: Record<string, unknown> | undefined;
  /** Headers to send with the request. */
  headers?: Record<string, unknown> | undefined;
  /** Url params to send with the request. */
  params?: Record<string, unknown> | undefined;
  /** Function to generate form that will be used in place of data. Overwrites `data` and `headers`. */
  createForm?: RequestFormDataFunction | undefined;
  /** If `true`, executes the request locally ignoring any rpc services. Be sure to `startQueue()` to handle rate limited requests. */
  local?: boolean;
  /** Set to true to not retry the request on a bucket 429 rate limit. */
  returnOnRateLimit?: boolean;
  /** Set to true to not retry the request on a global rate limit. */
  returnOnGlobalRateLimit?: boolean;
  /** A known hard value for the bot's global rate limits. Defaults to 50. */
  globalRateLimitMax?: number;
  /** Time in milliseconds to add to 1 second internal global rate limit reset timer. */
  globalRateLimitResetPadding?: number;
  /** Discord api version to use when making requests. Default: 10 */
  version?: number;
  /**
   * The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides both "returnOn" options.
   * Leave `undefined` for indefinite retries. `0` is effectively `returnOnRateLimit = true` and `returnOnGlobalRateLimit = true`.
   */
  maxRateLimitRetry?: number;
  /** Set by the rpc request service to preempt parsing the response before sending it to the client. */
  transformResponse?: (x: Record<string, unknown>) => Record<string, unknown>;
  /** Check if status is okay. Return with `false` to throw an error. Default throw on non-200 code. */
  validateStatus?: null | ((status: number) => boolean);
}

/** A `request` method of an axios instance wrapped to decrement the associated rate limit cached state if one exists. */
export type WrappedRequest<T extends ResponseData = any, R = ApiResponse<T>> = (request: ApiRequest) => Promise<R>;

/** The known state of a rate limit. */
export type IncomingRateLimit = {
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
export interface ServiceOptions {
  host?: string;
  port?: string | number;
  channel?: ChannelCredentials;
  allowFallback?: boolean;
}

export type ResponseData = Record<string, any> | Array<unknown>;
// Request Service
export interface ApiResponse<T extends ResponseData = any> {
  /** The HTTP status code of the response. */
  status: number;
  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  statusText: string;
  /** The data returned by Discord. */
  data: T;

  headers: Record<string, unknown>;

  /** How long the client should wait in ms before trying again. */
  retry_after?: number;
}

export interface RateLimitedResponse extends ApiResponse<{
    retry_after: number;
    global: boolean;
    message: string;
}> {
  status: 429;
  statusText: 'Too Many Requests',
}

export type RateLimitState = {
  waitFor: number;
  global?: boolean;
}

export interface ApiError<T = any> extends Error {
  config: ApiRequest['config'];
  code?: string;
  request?: any;
  response?: ApiResponse<T> | RemoteApiResponse<T>;
  isApiError: boolean;
  toJSON: () => object;
}

export type ApiDebugEvent<T extends ApiDebugCodeName = ApiDebugCodeName> = {
  source: typeof LOG_SOURCES.API,
  level: LogLevel,
  message: string,
  code: typeof API_DEBUG_CODES[T];
  data: ApiDebugData[T];
}

export interface ApiDebugData extends Record<ApiDebugCodeName, unknown> {
  GENERAL: undefined;
  ERROR: unknown;
  REQUEST_SENT: { request: ApiRequest };
  REQUEST_QUEUED: { request: ApiRequest, reason: string };
  REQUEST_REQUEUED: { request: ApiRequest, reason: string };
  RESPONSE_RECEIVED: { request: ApiRequest, response: ApiResponse | RateLimitedResponse };
  RATE_LIMITED: { request: ApiRequest, headers: RateLimitHeaders, queued: boolean };
}
export type ApiDebugDataType = ApiDebugData[keyof ApiDebugData];
