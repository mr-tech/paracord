import { BaseRequest } from '.';
import { IRequestOptions, IApiResponse } from '../types';

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
  public response: Promise<IApiResponse> | undefined;

  /** If queued when using the rate limit rpc service, a timestamp of when the request will first be available to try again. */
  public waitUntil: number | undefined;

  /**
   * Creates a new request object.
   *
   * @param method HTTP method of the request.
   * @param url Discord REST endpoint target of the request. (e.g. channels/123)
   * @param options Optional parameters for this request.
   */
  public constructor(method: string, url: string, options?: Partial<IRequestOptions>) {
    super(method, url);
    this.data;
    this.headers = undefined;
    this.response = undefined;
    this.waitUntil = undefined;

    Object.assign(this, options);
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
   * @param {number} waitUntil A timestamp of when the request will first be available to try again when queued due to rate limits.
   */
  public assignIfStricterWait(waitUntil: number): void {
    if (this.waitUntil === undefined || this.waitUntil < waitUntil) {
      this.waitUntil = waitUntil;
    }
  }
}
