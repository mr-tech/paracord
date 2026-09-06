import FormData from 'form-data';

import type { Method } from 'axios';
import type { IRequestMessage, RequestProto } from '../../types';

/** A class for the RequestMessage protobuf */
export default class RequestMessage {
  /** HTTP method of the request. */
  public method: Method;

  /** Discord REST endpoint target of the request. (e.g. channels/123) */
  public url: string;

  /** Data to send in the body of the request. */
  public data?: undefined | unknown;

  /** Headers to send with the request. */
  public headers?: undefined | Record<string, unknown>;

  /** Url params to send with the request. */
  public params?: undefined | Record<string, unknown>;

  /** Set to true to not retry the request on a bucket 429 rate limit. */
  public returnOnRateLimit?: undefined | boolean;

  /** Set to true to not retry the request on a global rate limit. */
  public returnOnGlobalRateLimit?: undefined | boolean;

  /** The number of times to attempt to execute a rate limited request before returning with a local 429 response. */
  public maxRateLimitRetry?: undefined | number;

  /**
   * Validate incoming message and translate it into common state.
   * @param message Message received by server.
   */
  public static fromProto(message: RequestProto): RequestMessage {
    RequestMessage.validateIncoming(message);

    const {
      method, url, return_on_rate_limit: returnOnRateLimit, return_on_global_rate_limit: returnOnGlobalRateLimit,
      max_rate_limit_retry: retriesLeft, ...options
    } = message;

    let data;
    let headers;
    let params;
    if (options.data !== undefined) {
      data = JSON.parse(options.data);
    }
    if (options.headers !== undefined) {
      headers = JSON.parse(options.headers);
    }
    if (options.params !== undefined) {
      params = JSON.parse(options.params);
    }

    return new RequestMessage({
      method, url, data, headers, params, returnOnRateLimit, returnOnGlobalRateLimit, retriesLeft,
    });
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to server.
   */
  private static validateOutgoing(request: RequestProto): void {
    if (typeof request.method !== 'string') {
      throw Error("'method' must be type 'string'");
    }
    if (typeof request.url !== 'string') {
      throw Error("'url' must be type 'string'");
    }
    // TODO: implement time out
    //   if (
    //     request.time_out !== undefined
    //       && typeof request.time_out !== 'number'
    //   ) {
    //     throw Error("'time_out' must be type 'number'");
    //   }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by server.
   */
  private static validateIncoming(message: RequestProto): void {
    if (message.method === undefined) {
      throw Error("received invalid message. missing property 'method'");
    }
    if (message.url === undefined) {
      throw Error("received invalid message. missing property 'url'");
    }
  }

  /**
   * Create a new RequestMessage sent from client to server. `createForm`'s product is
   * resolved here — before the message is built — since a function cannot cross the
   * wire; its `data`, `headers` and `params` travel in those three fields instead. A
   * product whose `data` is multipart form data is not JSON-representable: its `data`
   * does not cross the wire, but its `headers` and `params` still do (unfunded
   * residue) — the message this constructs can announce a multipart `content-type`
   * boundary for a body it does not carry.
   */
  public constructor(apiRequest: IRequestMessage) {
    this.method = apiRequest.method;
    this.url = apiRequest.url;

    const {
      data, headers, params,
    } = apiRequest.createForm ? apiRequest.createForm() : apiRequest;

    this.data = data instanceof FormData ? undefined : data;
    this.headers = headers;
    this.params = params;
    this.returnOnRateLimit = apiRequest.returnOnRateLimit;
    this.returnOnGlobalRateLimit = apiRequest.returnOnGlobalRateLimit;
    this.maxRateLimitRetry = apiRequest.retriesLeft;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): RequestProto {
    const proto: RequestProto = {
      method: this.method,
      url: this.url,
    };

    if (this.data !== undefined) {
      proto.data = JSON.stringify(this.data);
    }

    if (this.headers !== undefined) {
      proto.headers = JSON.stringify(this.headers);
    }

    if (this.params !== undefined) {
      proto.params = JSON.stringify(this.params);
    }

    if (this.returnOnRateLimit !== undefined) {
      proto.return_on_rate_limit = this.returnOnRateLimit;
    }

    if (this.returnOnGlobalRateLimit !== undefined) {
      proto.return_on_global_rate_limit = this.returnOnGlobalRateLimit;
    }

    if (this.maxRateLimitRetry !== undefined) {
      proto.max_rate_limit_retry = this.maxRateLimitRetry;
    }

    RequestMessage.validateOutgoing(proto);

    return proto;
  }
}
