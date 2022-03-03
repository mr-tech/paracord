/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';
import type { EventEmitter } from 'events';
import { DebugLevel } from '../../common';
import {
  PARACORD_URL, PARACORD_VERSION_NUMBER, DISCORD_API_DEFAULT_VERSION, DISCORD_API_URL, LOG_LEVELS, LOG_SOURCES, RPC_CLOSE_CODES, API_GLOBAL_RATE_LIMIT, API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS,
} from '../../constants';

import { RateLimitService, RequestService } from '../../rpc/services';
import { RemoteApiResponse } from '../../rpc/types';
import { coerceTokenToBotLike, objectKeysSnakeToCamel } from '../../utils';
import {
  RateLimitCache, RateLimitHeaders, RequestQueue, ApiRequest,
} from './structures';
import {
  IApiOptions, IApiResponse, IRateLimitState, IRequestOptions, IResponseState, IServiceOptions, ResponseData, WrappedRequest,
} from './types';

/** A client used to interact with Discord's REST API and navigate its rate limits. */
export default class Api {
  /** When using Rpc, the service through which to pass requests to the server. */
  public rpcRequestService?: RequestService;

  /** Key:Value mapping this client's events to user's preferred emitted value. */
  public events?: Record<string, string>;

  /** Contains rate limit state information. For use when not using rpc; or in fallback. */
  #rateLimitCache: RateLimitCache;

  /** Rate limited requests queue. For use when not using rpc; or in fallback, */
  #requestQueue: RequestQueue;

  /**  Interval for processing rate limited requests on the queue. */
  #requestQueueProcessInterval?: NodeJS.Timer;

  /** When using Rpc, the service through which to get authorization to make requests. */
  #rpcRateLimitService?: RateLimitService;

  /** Whether or not this client should handle requests locally for as long as it cannot connect to the rpc server. */
  #allowFallback: boolean;

  #emitter?: EventEmitter;

  #makeRequest: WrappedRequest;

  #rpcServiceOptions?: IServiceOptions;

  #connectingToRpcService: boolean;

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
  private static createWrappedRequestMethod(rateLimitCache: RateLimitCache, token: string, requestOptions: IRequestOptions | undefined): WrappedRequest {
    const instance = axios.create({
      baseURL: `${DISCORD_API_URL}/${DISCORD_API_DEFAULT_VERSION}`, // TODO does not support webhooks
      headers: {
        Authorization: token,
        'User-Agent': `DiscordBot (${PARACORD_URL}, ${PARACORD_VERSION_NUMBER})`,
        'Content-Type': 'application/json',
        'X-RateLimit-Precision': 'millisecond',
        'Accept-Encoding': 'gzip,deflate',
      },
      ...(requestOptions ?? {}),
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => ({
        status: 500, headers: {}, data: { message: error.message },
      }),
    );

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

    this.#rateLimitCache = new RateLimitCache(true, options.requestOptions?.globalRateLimitMax ?? API_GLOBAL_RATE_LIMIT, options.requestOptions?.globalRateLimitResetPadding ?? API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS, this);
    this.#requestQueue = new RequestQueue(this);
    this.#requestQueueProcessInterval;

    const { emitter, events, requestOptions } = options;

    this.#emitter = emitter;
    this.events = events;

    this.rpcRequestService;
    this.#rpcRateLimitService;
    this.#allowFallback = false;
    this.#connectingToRpcService = false;

    const botToken = coerceTokenToBotLike(token);
    this.#makeRequest = Api.createWrappedRequestMethod(this.#rateLimitCache, botToken, requestOptions);
  }

  public get hasRateLimitService(): boolean {
    return this.#rpcRateLimitService !== undefined;
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
  public log = (level: DebugLevel, message: string, data?: unknown): void => {
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
  private emit = (type: string, data: unknown): void => {
    if (this.#emitter !== undefined) {
      this.#emitter.emit(type, data);
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
   * @returns `true` is connection was successful.
   */
  public addRequestService = (serviceOptions: IServiceOptions = {}): Promise<boolean> => {
    if (
      this.hasRateLimitService
      || this.hasRequestService
    ) {
      throw Error(
        'An rpc service has already been defined for this client. Only one may be added.',
      );
    }

    this.rpcRequestService = new RequestService(serviceOptions);
    this.#allowFallback = this.rpcRequestService.allowFallback;

    if (this.#rpcServiceOptions === undefined) {
      {
        const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
        this.log('INFO', message);
      }

      if (!this.#allowFallback) {
        const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
        this.log('WARNING', message);
      }
    }

    this.#rpcServiceOptions = serviceOptions;

    return this.checkRpcServiceConnection(this.rpcRequestService);
  }

  /**
   * Adds the service that first checks with a server before making a request to Discord.
   * @param serviceOptions
   * @returns `true` is connection was successful.
   */
  public addRateLimitService = (serviceOptions: IServiceOptions = {}): Promise<boolean> => {
    if (
      this.hasRateLimitService
      || this.hasRequestService
    ) {
      throw Error(
        'A rpc service has already been defined for this client. Only one may be added.',
      );
    }

    this.#rpcRateLimitService = new RateLimitService(serviceOptions);
    this.#allowFallback = serviceOptions.allowFallback !== false;

    if (this.#rpcServiceOptions === undefined) {
      {
        const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.#rpcRateLimitService.target}`;
        this.log('INFO', message);
      }

      if (!this.#allowFallback) {
        const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
        this.log('WARNING', message);
      }
    }

    this.#rpcServiceOptions = serviceOptions;

    return this.checkRpcServiceConnection(this.#rpcRateLimitService);
  }

  /**
   * @returns `true` is connection was successful.
   */
  private checkRpcServiceConnection = async (service: RateLimitService | RequestService): Promise<boolean> => {
    try {
      await service.hello();
      this.#connectingToRpcService = false;
      this.log('DEBUG', 'Successfully established connection to Rpc server.');
      return true;
    } catch (err) {
      if (!this.#connectingToRpcService) {
        if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION) {
          this.#connectingToRpcService = true;
          this.reattemptConnectInFuture(1);
        } else {
          this.log('ERROR', 'Received unexpected error when connecting to Rpc service.', err);
        }
      }
    }

    return false;
  }

  // TODO: reach out to grpc maintainers to find out why the current state goes bad after this error
  private async recreateRpcService(): Promise<boolean> {
    if (this.hasRateLimitService) {
      this.#rpcRateLimitService = undefined;
      return this.addRateLimitService(this.#rpcServiceOptions);
    }

    this.rpcRequestService = undefined;
    return this.addRequestService(this.#rpcServiceOptions);
  }

  private reattemptConnectInFuture(delay: number) {
    this.log('WARNING', `Failed to connect to Rpc server. Trying again in ${delay} seconds.`);

    setTimeout(async () => {
      const success = await this.recreateRpcService();
      if (!success) {
        const newDelay = delay + 1 < 10 ? delay + 1 : 10;
        this.reattemptConnectInFuture(newDelay);
      }
    }, delay * 1e3);
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
  public startQueue = (interval = 100): void => {
    if (this.#requestQueueProcessInterval === undefined) {
      this.log('INFO', 'Starting request queue.');
      this.#requestQueueProcessInterval = this.#requestQueue.startQueue(interval);
    } else {
      throw Error('request queue already started');
    }
  }

  /** Stops the request rate limit queue processing. */
  public stopQueue = (): void => {
    if (this.#requestQueueProcessInterval !== undefined) {
      this.log('INFO', 'Stopping request queue.');
      clearInterval(this.#requestQueueProcessInterval);
      this.#requestQueueProcessInterval = undefined;
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
  public request = async <T extends ResponseData = any>(method: string, url: string, options: IRequestOptions = {}): Promise<IApiResponse<T> | RemoteApiResponse<T>> => {
    const { local, keepCase } : IRequestOptions = options;

    if (url.startsWith('/')) {
      url = url.slice(1);
    }

    const request = new ApiRequest(method.toUpperCase(), url, options);

    let response: IApiResponse<T> | RemoteApiResponse<T>;
    if (this.rpcRequestService === undefined || local) {
      response = await this.handleRequestLocal<T>(request);
    } else {
      response = await this.handleRequestRemote(this.rpcRequestService, request);
    }

    if (!keepCase) {
      if (Array.isArray(response.data)) response.data = (response.data as any[]).map((d) => objectKeysSnakeToCamel(d)) as T;
      else response.data = objectKeysSnakeToCamel(response.data);
    }

    return response;
  }

  /**
   * Send the request and handle 429's.
   * @param request The request being sent.
   * @returns axios response.
   */
  private async handleRequestLocal<T extends ResponseData>(request: ApiRequest): Promise<IApiResponse<T>> {
    if (this.#requestQueueProcessInterval === undefined) {
      const message = 'Making a request with a local Api client without a running request queue. Please invoke `startQueue()` on this client so that rate limits may be handled.';
      this.log('WARNING', message);
    }

    const { response, ...rateLimitState } = await this.sendRequest<T>(request);
    if (response !== undefined) {
      return this.handleResponse(request, response);
    }

    const customResponse: IApiResponse<T> = {
      status: 429,
      statusText: 'Too Many Requests',
      'retry-after': rateLimitState.resetAfter,
      data: <any>{ ...rateLimitState },
      headers: {
        _paracord: true,
        'x-ratelimit-global': rateLimitState.global ?? false,
      },
    };
    return customResponse;
  }

  /**
   * Sends the request to the rpc server for handling.
   * @param request ApiRequest being made.
   */
  private async handleRequestRemote<T extends ResponseData>(rpcRequestService: RequestService, request: ApiRequest): Promise<RemoteApiResponse<T>> {
    this.log('DEBUG', 'Sending request over Rpc to server.', request);

    if (this.#connectingToRpcService) {
      if (this.#allowFallback) {
        const message = 'Client is connecting to RPC server. Falling back to handling request locally.';
        this.log('WARNING', message);
        return this.handleRequestLocal(request);
      }

      throw Error('Client is connecting to RPC server. Unable to make request.');
    }

    try {
      return await rpcRequestService.request(request);
    } catch (err) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION && this.#allowFallback) {
        await this.recreateRpcService();
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
  public sendRequest = async <T extends ResponseData>(request: ApiRequest, fromQueue?: true): Promise<IResponseState<T>> => {
    try {
      request.running = true;

      let rateLimitState: IRateLimitState | undefined;
      if (this.hasRateLimitService) {
        rateLimitState = await this.authorizeRequestWithServer(request);
      }

      if (rateLimitState === undefined) {
        rateLimitState = this.#rateLimitCache.returnIsRateLimited(request);
      }

      const { resetAfter, global } = rateLimitState;
      if (resetAfter === 0) {
        const message = 'Sending request.';
        this.log('DEBUG', message, request);
        return { response: await this.#makeRequest(request), resetAfter: 0 };
      }
      request.running = false;

      if (!Api.shouldQueueRequest(request, global ?? false)) {
        return rateLimitState;
      }

      request.assignIfStricterWait(new Date().getTime() + resetAfter);

      if (!fromQueue) {
        const message = 'Enqueuing request.';
        this.log('DEBUG', message, request);
        return { response: await this.enqueueRequest(request), resetAfter: 0 };
      }

      const message = 'Requeuing request.';
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
  private async authorizeRequestWithServer(request: ApiRequest): Promise<IRateLimitState | undefined> {
    if (this.#connectingToRpcService) {
      if (this.#allowFallback) {
        const message = 'Client is connecting to RPC server. Fallback is allowed. Allowing request to be made.';
        this.log('WARNING', message);
        return undefined;
      }

      throw Error('Client is connecting to RPC server. Unable to authorize request.');
    }

    try {
      const authorizationMessage = await (<RateLimitService> this.#rpcRateLimitService).authorize(request);

      const { resetAfter, global } = authorizationMessage;
      if (resetAfter === 0) {
        return { resetAfter };
      }

      return { resetAfter, global };
    } catch (err) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION && this.#allowFallback) {
        this.recreateRpcService();
        const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
        this.log('ERROR', message);
        return undefined;
      }
      throw err;
    }
  }

  private async handleResponse<T extends ResponseData>(request: ApiRequest, response: IApiResponse<T>): Promise<IApiResponse<T>> {
    this.log('DEBUG', 'Response received.', { request, response });

    if (Object.keys(response.headers).length) {
      const rateLimitHeaders = RateLimitHeaders.extractRateLimitFromHeaders(
        response.headers,
      );

      const allowQueue = Api.shouldQueueRequest(request, rateLimitHeaders.global ?? false);
      while (response.status === 429 && allowQueue) {
        if (this.#requestQueueProcessInterval === undefined) {
          const message = 'A request has been rate limited, queued, and will not be processed. Please invoke `startQueue()` on this client so that rate limited requests may be handled.';
          this.log('WARNING', message);
        } else {
          return new Promise<IApiResponse<T>>((resolve) => {
            this.handleRateLimitedRequest<T>(request, rateLimitHeaders).then(async (res) => resolve(await this.handleResponse<T>(request, res)));
          });
        }
      }

      this.updateRateLimitCache(request, rateLimitHeaders);
    }

    return response;
  }

  /**
   * Updates the rate limit state and queues the request.
   * @param headers Response headers.
   * @param request Request being sent.
   */
  private handleRateLimitedRequest<T extends ResponseData>(request: ApiRequest, rateLimitHeaders: RateLimitHeaders): Promise<IApiResponse<T>> {
    let message: string;
    if (rateLimitHeaders.global) {
      message = `Request global rate limited: ${request.method} ${request.url}`;
    } else {
      message = `Request rate limited: ${request.method} ${request.url}`;
    }
    this.log('DEBUG', message, rateLimitHeaders);

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
    this.#rateLimitCache.update(request, rateLimitHeaders);
    this.updateRpcCache(request, rateLimitHeaders);
  }

  private async updateRpcCache(request: ApiRequest, rateLimitHeaders: RateLimitHeaders) {
    if (this.#rpcRateLimitService !== undefined && !this.#connectingToRpcService) {
      try {
        const [global, bucket, limit, remaining, resetAfter] = rateLimitHeaders.rpcArgs;
        await this.#rpcRateLimitService.update(
          request, global, bucket, limit, remaining, resetAfter,
        );
      } catch (err) {
        if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION) {
          const success = await this.recreateRpcService();
          if (!success) throw err;
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
  private enqueueRequest<T extends ResponseData>(request: ApiRequest): Promise<IApiResponse<T>> {
    // request.timeout = new Date().getTime() + timeout;

    this.#requestQueue.push(request);
    request.response = undefined;

    /** Continuously checks if the response has returned. */
    function checkRequest<T extends ResponseData>(resolve: (x: IApiResponse<T> | Promise<IApiResponse<T>>) => void): void {
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
