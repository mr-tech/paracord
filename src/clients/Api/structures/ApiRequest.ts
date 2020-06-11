import { IApiResponse, IRequestOptions } from '../types';
import BaseRequest from './BaseRequest';

/**
 * A request that will be made to Discord's REST API.
 * @extends BaseRequest
 */
export default class Request extends BaseRequest {
  /** Data to send in the body of the request.  */
  public data: Record<string, unknown> | undefined;

  /** Additional headers to send with the request. */
  public headers: Record<string, unknown> | undefined;

  /** If queued, will be the response when this request is sent. */
  public response: Promise<IApiResponse> | IApiResponse | undefined;

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
  public constructor(method: string, url: string, options: Partial<IRequestOptions> = {}) {
    super(method, url);

    const {
      data, headers, returnOnRateLimit, returnOnGlobalRateLimit, maxRateLimitRetry,
    } = options;

    // this.data = data !== undefined ? objectKeysCamelToSnake(data) : data;
    this.data = data;
    this.headers = headers;
    this.returnOnRateLimit = returnOnRateLimit ?? false;
    this.returnOnGlobalRateLimit = returnOnGlobalRateLimit ?? false;
    this.retriesLeft = maxRateLimitRetry;
    this.running = false;
  }

  /** Data relevant to sending this request via axios. */
  public get sendData(): Record<string, unknown> {
    return {
      method: this.method,
      url: this.url,
      data: this.data,
      headers: this.headers,
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
