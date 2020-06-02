
import axios from 'axios';
import type { EventEmitter } from 'events';
import { DebugLevel } from '../../common';
import {
  DISCORD_API_DEFAULT_VERSION, DISCORD_API_URL, LOG_LEVELS, LOG_SOURCES, RPC_CLOSE_CODES,
} from '../../constants';
import { RateLimitService, RequestService } from '../../rpc/services';
import { RemoteApiResponse } from '../../rpc/types';
import { coerceTokenToBotLike, objectKeysSnakeToCamel } from '../../utils';
import {
  RateLimitCache, RateLimitHeaders, RequestQueue, ApiRequest,
} from './structures';
import {
  IApiOptions, IApiResponse, IRateLimitState, IRequestOptions, IResponseState, IServiceOptions, WrappedRequest,
} from './types';

/** A client used to interact with Discord's REST API and navigate its rate limits. */
export default class Api {
  /** Contains rate limit state information. For use when not using rpc; or in fallback. */
  private rateLimitCache: RateLimitCache;

  /** Rate limited requests queue. For use when not using rpc; or in fallback, */
  private requestQueue: RequestQueue;

  /**  Interval for processing rate limited requests on the queue. */
  private requestQueueProcessInterval?: NodeJS.Timer;

  /** When using Rpc, the service through which to pass requests to the server. */
  public rpcRequestService?: RequestService;

  /** When using Rpc, the service through which to get authorization to make requests. */
  private rpcRateLimitService?: RateLimitService;

  /** Whether or not this client should handle requests locally for as long as it cannot connect to the rpc server. */
  private allowFallback: boolean;

  /** Key:Value mapping this client's events to user's preferred emitted value. */
  public events?: Record<string, string>;

  private emitter?: EventEmitter;

  private wrappedAxiosInstance: WrappedRequest;

  private rpcServiceOptions?: IServiceOptions;

  private static shouldQueueRequest(request: ApiRequest, globalRateLimited: boolean): boolean {
    const { returnOnRateLimit, returnOnGlobalRateLimit } = request;

    if (request.retriesLeft !== undefined) {
      if (--request.retriesLeft <= 0) return false;
    } else {
      if (returnOnRateLimit && !globalRateLimited) return false;
      if (returnOnGlobalRateLimit && globalRateLimited) return false;
    }

    return true;
  }

  /**
   * Throws errors and warnings if the parameters passed to the constructor aren't sufficient.
   * @param token Discord bot token.
   */
  private static validateParams(token: string): void {
    if (token === undefined) {
      throw Error('client requires a bot token');
    }
  }

  /** Creates an isolated axios instance for use by this REST handler. */
  private static createWrappedAxiosInstance(rateLimitCache:RateLimitCache, token: string, requestOptions: IRequestOptions | undefined): WrappedRequest {
    const instance = axios.create({
      baseURL: `${DISCORD_API_URL}/${DISCORD_API_DEFAULT_VERSION}`,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        'X-RateLimit-Precision': 'millisecond',
        'Accept-Encoding': 'gzip,deflate',
      },
      ...(requestOptions ?? {}),
    });

    /** `axios.request()` decorated with rate limit handling. */
    return rateLimitCache.wrapRequest(instance.request);
  }

  /**
   * Creates a new Api client.
   * @param token Discord token. Will be coerced into a bot token.
   * @param options Optional parameters for this handler.
   */
  public constructor(token: string, options: IApiOptions = {}) {
    Api.validateParams(token);

    this.rateLimitCache = new RateLimitCache();
    this.requestQueue = new RequestQueue(this.rateLimitCache, this);
    this.requestQueueProcessInterval;

    const { emitter, events, requestOptions } = options;

    this.emitter = emitter;
    this.events = events;

    this.rpcRequestService;
    this.rpcRateLimitService;
    this.allowFallback = false;

    const botToken = coerceTokenToBotLike(token);
    this.wrappedAxiosInstance = Api.createWrappedAxiosInstance(this.rateLimitCache, botToken, requestOptions);
  }

  public get hasRateLimitService(): boolean {
    return this.rpcRateLimitService !== undefined;
  }

  public get hasRequestService(): boolean {
    return this.rpcRequestService !== undefined;
  }

  /*
   ********************************
   *********** INTERNAL ***********
   ********************************
   */

  /**
   * Simple alias for logging events emitted by this client.
   * @param level Key of the logging level of this message.
   * @param message Content of the log
   * @param [data] Data pertinent to the event.
   */
  private log(level: DebugLevel, message: string, data?: unknown): void {
    this.emit('DEBUG', {
      source: LOG_SOURCES.API,
      level: LOG_LEVELS[level],
      message,
      data,
    });
  }

  /**
   * Emits all events if `this.events` is undefined; otherwise will emit those defined as keys in `this.events` as the paired value.
   * @param type Type of event. (e.g. "DEBUG" or "CHANNEL_CREATE")
   * @param data Data to send with the event.
   */
  private emit(type: string, data: unknown): void {
    if (this.emitter !== undefined) {
      this.emitter.emit(type, data);
    }
  }

  /*
   ********************************
   ********* RPC SERVICE **********
   ********************************
   */

  /**
   * Adds the service that has a server make requests to Discord on behalf of the client.
   * @param serviceOptions
   */
  public addRequestService(serviceOptions: IServiceOptions = {}): void {
    if (
      this.hasRateLimitService
      || this.hasRequestService
    ) {
      throw Error(
        'An rpc service has already been defined for this client. Only one may be added.',
      );
    }

    this.rpcRequestService = new RequestService(serviceOptions);
    this.allowFallback = this.rpcRequestService.allowFallback;

    if (this.rpcServiceOptions === undefined) {
      {
        const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
        this.log('INFO', message);
      }

      if (!this.allowFallback) {
        const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
        this.log('WARNING', message);
      }
    }

    this.rpcServiceOptions = serviceOptions;
  }

  /**
   * Adds the service that first checks with a server before making a request to Discord.
   * @param serviceOptions
   */
  public addRateLimitService(serviceOptions: IServiceOptions = {}): void {
    if (
      this.hasRateLimitService
      || this.hasRequestService
    ) {
      throw Error(
        'A rpc service has already been defined for this client. Only one may be added.',
      );
    }

    this.rpcRateLimitService = new RateLimitService(serviceOptions);
    this.allowFallback = serviceOptions.allowFallback !== false;

    if (this.rpcServiceOptions === undefined) {
      {
        const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.rpcRateLimitService.target}`;
        this.log('INFO', message);
      }

      if (!this.allowFallback) {
        const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
        this.log('WARNING', message);
      }
    }

    this.rpcServiceOptions = serviceOptions;
  }

  // TODO: reach out to grpc maintainers to find out why the current state goes bad after this error
  private recreateRpcService(): void {
    if (this.hasRateLimitService) {
      this.rpcRateLimitService = undefined;
      this.addRateLimitService(this.rpcServiceOptions);
    } else {
      this.rpcRequestService = undefined;
      this.addRequestService(this.rpcServiceOptions);
    }
  }

  /*
   ********************************
   ******** REQUEST QUEUE *********
   ********************************
   */

  /**
   * Starts the request rate limit queue processing.
   * @param interval Time between checks in ms.
   */
  public startQueue(interval = 100): void {
    if (this.requestQueueProcessInterval === undefined) {
      this.log('INFO', 'Starting request queue.');
      this.requestQueueProcessInterval = this.requestQueue.startQueue(interval);
    } else {
      throw Error('request queue already started');
    }
  }

  /** Stops the request rate limit queue processing. */
  public stopQueue(): void {
    if (this.requestQueueProcessInterval !== undefined) {
      this.log('INFO', 'Stopping request queue.');
      clearInterval(this.requestQueueProcessInterval);
      this.requestQueueProcessInterval = undefined;
    }
  }

  /*
   ********************************
   *********** REQUEST ************
   ********************************
   */

  /**
   * Makes a request to Discord, handling any rate limits and returning when a non-429 response is received.
   * @param method HTTP method of the request.
   * @param url Discord endpoint url. (e.g. "/channels/abc123")
   * @param options Optional parameters for a Discord REST request.
   * @returns Response to the request made.
   */
  public async request(method: string, url: string, options: IRequestOptions = {}): Promise<IApiResponse | RemoteApiResponse> {
    const { local, keepCase } : IRequestOptions = options;

    if (url.startsWith('/')) {
      url = url.slice(1);
    }

    const request = new ApiRequest(method.toUpperCase(), url, options);

    let response: IApiResponse | RemoteApiResponse;
    if (this.rpcRequestService === undefined || local) {
      response = await this.handleRequestLocal(request);
    } else {
      response = await this.handleRequestRemote(this.rpcRequestService, request);
    }

    if (!keepCase) response.data = objectKeysSnakeToCamel(<Record<string, unknown>>response.data);

    return response;
  }

  /**
   * Send the request and handle 429's.
   * @param request The request being sent.
   * @returns axios response.
   */
  async handleRequestLocal(request: ApiRequest): Promise<IApiResponse> {
    if (this.requestQueueProcessInterval === undefined) {
      const message = 'Making a request with a local Api client without a running request queue. Please invoke `startQueue()` on this client so that rate limits may be handled.';
      this.log('WARNING', message);
    }

    let { response, ...rateLimitState } = await this.sendRequest(request);
    if (response !== undefined) {
      response = await this.handleResponse(request, response);
    }

    if (response === undefined) {
      return {
        status: 429, statusText: 'Too Many Requests', data: { ...rateLimitState }, headers: { _paracord: true, 'x-ratelimit-global': true },
      };
    }

    return response;
  }

  /**
   * Sends the request to the rpc server for handling.
   * @param request ApiRequest being made.
   */
  private async handleRequestRemote(rpcRequestService: RequestService, request: ApiRequest): Promise<RemoteApiResponse> {
    this.emit('DEBUG', {
      source: LOG_SOURCES.API,
      level: LOG_LEVELS.DEBUG,
      message: 'Sending request over Rpc to server.',
    });

    try {
      return await rpcRequestService.request(request);
    } catch (err) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION && this.allowFallback) {
        this.recreateRpcService();
        const message = 'Could not reach RPC server. Falling back to handling request locally.';
        this.log('ERROR', message);

        return this.handleRequestLocal(request);
      }
      throw err;
    }
  }

  /**
   * Determines how the request will be made based on the client's options and makes it.
   * @param request ApiRequest being made,
   */
  async sendRequest(request: ApiRequest, fromQueue?: true): Promise<IResponseState> {
    try {
      request.running = true;

      let rateLimitState: IRateLimitState | undefined;
      if (this.hasRateLimitService) {
        rateLimitState = await this.authorizeRequestWithServer(request);
      }

      if (rateLimitState === undefined) {
        rateLimitState = this.rateLimitCache.returnIsRateLimited(request);
      }

      const { resetAfter, global } = rateLimitState;
      if (resetAfter === 0) {
        const message = `Sending request: ${request.method} ${request.url}`;
        this.log('DEBUG', message, request);
        return { response: await this.wrappedAxiosInstance(request), resetAfter: 0 };
      }

      if (!Api.shouldQueueRequest(request, global ?? false)) {
        return rateLimitState;
      }

      const { waitUntil } = request;
      if (waitUntil === undefined) {
        request.assignIfStricterWait(new Date().getTime() + resetAfter);
      }

      console.log('waitUntil', request.waitUntil);
      console.log('resetAfter', resetAfter);

      if (!fromQueue) {
        const message = `Enqueuing request: ${request.method} ${request.url}`;
        this.log('DEBUG', message, request);
        return { response: await this.enqueueRequest(request), resetAfter: 0 };
      }

      const message = `Requeuing request: ${request.method} ${request.url}`;
      this.log('DEBUG', message, request);

      return { resetAfter: -1 };
    } finally {
      request.running = false;
    }
  }

  /**
   * Gets authorization from the server to make the request.
   * @param request ApiRequest being made.
   */
  public async authorizeRequestWithServer(request: ApiRequest): Promise<IRateLimitState> {
    try {
      const authorizationMessage = await (<RateLimitService> this.rpcRateLimitService).authorize(request);

      const { resetAfter, global } = authorizationMessage;
      if (resetAfter === 0) {
        return { resetAfter };
      }

      return { resetAfter, global };
    } catch (err) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION && this.allowFallback) {
        this.recreateRpcService();
        const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
        this.log('ERROR', message);

        return { resetAfter: 0 };
      }
      throw err;
    }
  }

  private async handleResponse(request: ApiRequest, response: IApiResponse): Promise<IApiResponse> {
    let rateLimitHeaders = RateLimitHeaders.extractRateLimitFromHeaders(
      response.headers,
    );

    let allowQueue = Api.shouldQueueRequest(request, rateLimitHeaders.global ?? false);
    while (response.status === 429 && allowQueue) {
      if (this.requestQueueProcessInterval === undefined) {
        const message = 'A request has been rate limited, queued, and will not be processed. Please invoke `startQueue()` on this client so that rate limited requests may be handled.';
        this.log('WARNING', message);
      }
      response = await this.handleRateLimitedRequest(request, rateLimitHeaders);
      rateLimitHeaders = RateLimitHeaders.extractRateLimitFromHeaders(response.headers);
      allowQueue = Api.shouldQueueRequest(request, rateLimitHeaders.global ?? false);
    }

    this.updateRateLimitCache(request, rateLimitHeaders);

    return response;
  }

  /**
   * Updates the rate limit state and queues the request.
   * @param headers Response headers.
   * @param request Request being sent.
   */
  private handleRateLimitedRequest(request: ApiRequest, rateLimitHeaders: RateLimitHeaders): Promise<IApiResponse> {
    let message;
    if (rateLimitHeaders.global) {
      message = `Request global rate limited: ${request.method} ${request.url}`;
    } else {
      message = `Request rate limited: ${request.method} ${request.url}`;
    }
    this.log('DEBUG', message, rateLimitHeaders);

    console.log('RateLimitHeaders', rateLimitHeaders);

    this.updateRateLimitCache(request, rateLimitHeaders);

    const { resetAfter } = rateLimitHeaders;
    const { waitUntil } = request;
    if (waitUntil === undefined && resetAfter !== undefined) {
      request.assignIfStricterWait(new Date().getTime() + resetAfter);
    }

    return this.enqueueRequest(request);
  }

  /**
   * Updates the local rate limit cache and sends an update to the server if there is one.
   * @param request The request made.
   * @param rateLimitHeaders Headers from the response.
   */
  private updateRateLimitCache(request: ApiRequest, rateLimitHeaders: RateLimitHeaders) {
    this.rateLimitCache.update(request, rateLimitHeaders);
    this.updateRpcCache(request, rateLimitHeaders);
  }

  private async updateRpcCache(request: ApiRequest, rateLimitHeaders: RateLimitHeaders) {
    if (this.rpcRateLimitService !== undefined) {
      try {
        const [global, bucket, limit, remaining, resetAfter] = rateLimitHeaders.rpcArgs;
        await this.rpcRateLimitService.update(
          request, global, bucket, limit, remaining, resetAfter,
        );
      } catch (err) {
        if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION) {
          this.recreateRpcService();
        } else {
          throw err;
        }
      }
    }
  }


  /**
   * Puts the Api Request onto the queue to be executed when the rate limit has reset.
   * @param request The Api Request to queue.
   * @returns Resolves as the response to the request.
   */
  private enqueueRequest(request: ApiRequest): Promise<IApiResponse> {
    // request.timeout = new Date().getTime() + timeout;

    this.requestQueue.push(request);
    request.response = undefined;

    /** Continuously checks if the response has returned. */
    function checkRequest(resolve: (x: IApiResponse | Promise<IApiResponse>) => void): void {
      const { response } = request;
      if (response !== undefined) {
        resolve(response);
      } else {
        setTimeout(() => checkRequest(resolve));
      }

      // } else if (timeout < new Date().getTime()) { } - keeping this temporarily for posterity
    }

    return new Promise(checkRequest);
  }
}
