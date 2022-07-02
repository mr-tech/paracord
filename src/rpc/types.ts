import type { EventEmitter } from 'events';
import type { Method } from 'axios';
import type { ServerCredentials, ServiceError } from '@grpc/grpc-js';
import type { Api, ResponseData } from '../clients';

export interface RpcServerOptions{
  host?: string;
  port?: string | number;
  channel?: ServerCredentials;
  emitter?: EventEmitter;
  apiClient?: Api;
  globalRateLimitMax?: number;
  globalRateLimitResetPadding?: number;
}

export interface IDebugEvent {
  source: number,
  level: number,
  message: string
}

export type TServiceCallbackError = null | string | ServiceError;

export type RequestProto = {
  /** HTTP method of the request. */
  method: Method;
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
  wait_for: number;
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
  bucket_hash: string | undefined;
  /** From Discord - number of requests available before hitting rate limit. */
  remaining: number;
  /** From Discord - rate limit request cap. */
  limit: number;
  /** From Discord - How long in ms the rate limit resets. */
  reset_after: number;
  /** From Discord - How long in ms the rate limit resets. (sub limit) */
  retry_after: number | undefined;
  /** From Discord - If the request was globally rate limited. */
  global: boolean;
}

export interface IRequestMessage {
  /** HTTP method of the request. */
  method: Method;
  /** Discord endpoint url. (e.g. channels/123) */
  url: string;
  /** JSON encoded data to send in the body of the request. */
  data?: undefined | Record<string, unknown>;
  /** JSON encoded headers to send with the request. */
  headers?: undefined | Record<string, unknown>;
}

export type RequestMetaProto = {
  /** HTTP method of the request. */
  method: Method;
  /** Discord endpoint url. (e.g. channels/123) */
  url: string;
}

export type RemoteApiResponse<T extends ResponseData = any> = {
  /** The HTTP status code of the response. */
  status: number;
  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  statusText: string;
  /** Data response from Discord not having yet been parsed into json. */
  data: T;
  /** If the response failed validation. */
  isApiError?: true;
}
