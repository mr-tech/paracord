import type { AxiosRequestConfig, Method } from 'axios';
import BaseRequest from './BaseRequest';

import type {
  IApiResponse, IRequestOptions, ResponseData, RequestFormDataFunction,
} from '../types';

/**
 * A request that will be made to Discord's REST API.
 * @extends BaseRequest
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default class Request<T extends ResponseData = any> extends BaseRequest {
  /** Data to send in the body of the request.  */
  public data: Record<string, unknown> | undefined;

  /** Additional headers to send with the request. */
  public headers: Record<string, unknown> | undefined;

  /** Function to generate form that will be used in place of data. Overwrites `data` and `headers`. */
  public createForm: RequestFormDataFunction | undefined;

  /** If queued, will be the response when this request is sent. */
  public response: Promise<IApiResponse<T>> | IApiResponse<T> | undefined;

  /** If queued when using the rate limit rpc service, a timestamp of when the request will first be available to try again. */
  public waitUntil: number | undefined;

  /** Set to true not try request on a bucket 429 rate limit. */
  public returnOnRateLimit: boolean;

  /** Set to true to not retry the request on a global rate limit. */
  public returnOnGlobalRateLimit: boolean;

  /** The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides either of the "returnOn" options. */
  public retriesLeft?: number;

  public running: boolean;

  /**
   * Creates a new request object.
   *
   * @param method HTTP method of the request.
   * @param url Discord REST endpoint target of the request. (e.g. channels/123)
   * @param options Optional parameters for this request.
   */
  public constructor(method: Method, url: string, topLevelResource: string, topLevelID: string, bucketHash: undefined | string, bucketHashKey: string, options: Partial<IRequestOptions> = {}) {
    super(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey);

    const {
      data, headers, createForm, returnOnRateLimit, returnOnGlobalRateLimit, maxRateLimitRetry,
    } = options;

    // this.data = data !== undefined ? objectKeysCamelToSnake(data) : data;
    this.createForm = createForm;
    this.data = data;
    this.headers = headers;
    this.returnOnRateLimit = returnOnRateLimit ?? false;
    this.returnOnGlobalRateLimit = returnOnGlobalRateLimit ?? false;
    this.retriesLeft = maxRateLimitRetry;
    this.running = false;
  }

  /** Data relevant to sending this request via axios. */
  public get config(): AxiosRequestConfig {
    let data;
    let headers;
    if (this.createForm) {
      ({ data, headers } = this.createForm());
    } else {
      ({ data, headers } = this);
    }
    return {
      method: this.method,
      url: this.url,
      data,
      headers,
      validateStatus: null, // Tells axios not to throw errors when non-200 response codes are encountered.
    };
  }

  /** Assigns a stricter value to `waitUntil`.
   * Strictness is defined by the value that decreases the chance of getting rate limited.
   * @param waitUntil A timestamp of when the request will first be available to try again when queued due to rate limits.
   */
  public assignIfStricterWait(waitUntil: number): void {
    if (this.waitUntil === undefined || this.waitUntil < waitUntil) {
      this.waitUntil = waitUntil;
    }
  }
}
