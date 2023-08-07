import BaseRequest from './BaseRequest';

import type { AxiosRequestConfig, Method, RawAxiosRequestHeaders } from 'axios';
import type { RequestOptions, RequestFormDataFunction } from '../types';

/**
 * A request that will be made to Discord's REST API.
 * @extends BaseRequest
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default class ApiRequest extends BaseRequest {
  /** Data to send in the body of the request.  */
  public data: unknown | undefined;

  /** Additional headers to send with the request. */
  public headers: Record<string, unknown> | undefined;

  /** Additional params to send with the request. */
  public params: Record<string, unknown> | undefined;

  /** Function to generate form that will be used in place of data. Overwrites `data` and `headers`. */
  public createForm: RequestFormDataFunction | undefined;

  /** If queued when using the rate limit rpc service, a timestamp of when the request will first be available to try again. */
  public waitUntil: number | undefined;

  /** Set to true not try request on a bucket 429 rate limit. */
  public returnOnRateLimit: boolean;

  /** Set to true to not retry the request on a global rate limit. */
  public returnOnGlobalRateLimit: boolean;

  public attempts = 0;

  /** The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides either of the "returnOn" options. */
  public retriesLeft?: undefined | number;

  /** Timestamp of when the request was created. */
  public createdAt: number;

  public startTime: undefined | number;

  public completeTime: undefined | number;

  public get duration(): undefined | number {
    if (this.startTime === undefined || this.completeTime === undefined) return undefined;
    return this.completeTime - this.startTime;
  }

  /**
   * Creates a new request object.
   *
   * @param method HTTP method of the request.
   * @param url Discord REST endpoint target of the request. (e.g. channels/123)
   * @param options Optional parameters for this request.
   */
  public constructor(
    method: Method,
    url: string,
    topLevelResource: string,
    topLevelID: string,
    bucketHash: undefined | string,
    bucketHashKey: string,
    options: Partial<RequestOptions> = {},
  ) {
    super(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey);

    const {
      data, headers, params, createForm, returnOnRateLimit, returnOnGlobalRateLimit, maxRateLimitRetry,
    } = options;

    this.createForm = createForm;
    this.data = data;
    this.headers = headers;
    this.params = params;
    this.returnOnRateLimit = returnOnRateLimit ?? false;
    this.returnOnGlobalRateLimit = returnOnGlobalRateLimit ?? false;
    this.retriesLeft = maxRateLimitRetry;
    this.createdAt = new Date().getTime();
  }

  /** Data relevant to sending this request via axios. */
  public get config(): AxiosRequestConfig {
    let data;
    let headers;
    let params;
    if (this.createForm) {
      ({ data, headers, params } = this.createForm());
    } else {
      ({ data, headers, params } = this);
    }
    return {
      method: this.method,
      url: this.url,
      data,
      headers: headers as RawAxiosRequestHeaders,
      params,
      validateStatus: null, // Tells axios not to throw errors when non-200 response codes are encountered.
    };
  }

  /** Assigns a stricter value to `waitUntil`.
   * Strictness is defined by the value that decreases the chance of getting rate limited.
   * @param waitUntil A timestamp of when the request will first be available to try again when queued due to rate limits.
   */
  public assignIfStricter(waitUntil: number): void {
    if (this.waitUntil === undefined || this.waitUntil < waitUntil) {
      this.waitUntil = waitUntil;
    }
  }
}
