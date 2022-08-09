/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { Method } from 'axios';
import { EventEmitter } from 'events';

import { RateLimitService, RequestService, RemoteApiResponse } from '../../rpc';
import { coerceTokenToBotLike, stripLeadingSlash } from '../../utils';
import {
  PARACORD_URL, PARACORD_VERSION_NUMBER, DISCORD_API_DEFAULT_VERSION,
  DISCORD_API_URL, LOG_LEVELS, LOG_SOURCES, RPC_CLOSE_CODES,
  API_GLOBAL_RATE_LIMIT, API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS, LogSource, API_DEBUG_CODES, ApiDebugCode, ApiDebugCodeName,
} from '../../constants';

import {
  RateLimitCache, RateLimitHeaders, RequestQueue, ApiRequest,
} from './structures';

import type { DebugLevel } from '../../@types';
import type {
  IApiOptions, IApiResponse, IRateLimitState, IRequestOptions, IResponseState, IServiceOptions, ResponseData, WrappedRequest, RateLimitedResponse, ApiDebugEvent,
} from './types';

function isRateLimitResponse(response: IApiResponse | RateLimitedResponse): response is RateLimitedResponse {
  return response.status === 429;
}

/** A client used to interact with Discord's REST API and navigate its rate limits. */
export default class Api {
  /** When using Rpc, the service through which to pass requests to the server. */
  public rpcRequestService?: undefined | RequestService;

  /** Key:Value mapping this client's events to user's preferred emitted value. */
  public events?: undefined | Record<string, string>;

  /** Contains rate limit state information. For use when not using rpc; or in fallback. */
  #rateLimitCache: RateLimitCache;

  /** Rate limited requests queue. For use when not using rpc; or in fallback, */
  #requestQueue: RequestQueue;

  /**  Interval for processing rate limited requests on the queue. */
  #requestQueueProcessInterval: NodeJS.Timer;

  /** When using Rpc, the service through which to get authorization to make requests. */
  #rpcRateLimitService?: undefined | RateLimitService;

  /** Whether or not this client should handle requests locally for as long as it cannot connect to the rpc server. */
  #allowFallback: boolean;

  #emitter?: undefined | EventEmitter;

  #makeRequest: WrappedRequest;

  #rpcServiceOptions?: undefined | IServiceOptions;

  #connectingToRpcService: boolean;

  #requestOptions: IRequestOptions;

  public static isApiDebugEvent(event: unknown): event is ApiDebugEvent {
    function hasSource(evt = event): evt is { source: LogSource } {
      return !!(event && typeof event === 'object' && 'source' in event);
    }
    return hasSource(event) && event.source === LOG_SOURCES.API;
  }

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
      baseURL: `${DISCORD_API_URL}/v${requestOptions?.version ?? DISCORD_API_DEFAULT_VERSION}`, // TODO does not support webhooks
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
   * Takes the method and url "minor parameters" to create a key used in navigating rate limits. Condenses common paths.
   * @param method HTTP method of the request.
   * @param rateLimitMinorParameters Request method and parameters in the url following the major parameter.
   * @returns A key used internally to find related buckets.
   */
  public static extractBucketHashKey(method: string, url: string): string[] {
    const [topLevelResource, topLevelID, ...rateLimitMinorParameters] = stripLeadingSlash(url).split('/');

    const key = [];

    if (method === 'GET') key.push('g');
    else if (method === 'PUT') key.push('u');
    else if (method === 'POST') key.push('o');
    else if (method === 'PATCH') key.push('a');
    else if (method === 'DELETE') key.push('d');

    for (const param of rateLimitMinorParameters) {
      switch (param) {
        case 'channels':
          key.push('c');
          break;
        case 'audit-log':
          key.push('a');
          break;
        case 'members':
          key.push('m');
          break;
        case 'guilds':
          key.push('g');
          break;
        case 'messages':
          key.push('s');
          break;
        case 'roles':
          key.push('r');
          break;
        case 'webhooks':
          key.push('w');
          break;
        default:
          key.push(param);
      }
    }

    return [topLevelResource, topLevelID, key.join('-')];
  }

  /**
   * Creates a new Api client.
   * @param token Discord token. Will be coerced into a bot token.
   * @param options Optional parameters for this handler.
   */
  public constructor(token: string, options: IApiOptions = {}) {
    Api.validateParams(token);

    this.#rateLimitCache = new RateLimitCache(
      options.requestOptions?.globalRateLimitMax ?? API_GLOBAL_RATE_LIMIT,
      options.requestOptions?.globalRateLimitResetPadding ?? API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS,
      this,
    );

    const requestQueue = new RequestQueue(this);
    this.#requestQueue = requestQueue;
    this.#requestQueueProcessInterval = this.#requestQueue.startQueue(options.queueLoopInterval ?? 100);

    const { emitter, events, requestOptions } = options;

    this.#requestOptions = requestOptions ?? {};

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
  public log = (level: DebugLevel, message: string, data?: ApiDebugEvent['data'], code: ApiDebugCode = API_DEBUG_CODES.GENERAL): void => {
    const event: ApiDebugEvent = {
      source: LOG_SOURCES.API,
      level: LOG_LEVELS[level],
      message,
      code,
    };

    if (data) event.data = data;

    this.emit('DEBUG', event);
  };

  /**
   * Emits all events if `this.events` is undefined; otherwise will emit those defined as keys in `this.events` as the paired value.
   * @param type Type of event. (e.g. "DEBUG" or "CHANNEL_CREATE")
   * @param data Data to send with the event.
   */
  private emit = (type: string, data: unknown): void => {
    if (this.#emitter !== undefined) {
      this.#emitter.emit(type, data);
    }
  };

  public on = (name: ApiDebugCodeName, listener: (event: ApiDebugEvent) => void) => {
    if (!this.#emitter) {
      this.#emitter = new EventEmitter();
    }

    const code = API_DEBUG_CODES[name];
    this.#emitter.on('DEBUG', (event) => {
      if (Api.isApiDebugEvent(event) && event.code === code) {
        listener(event);
      }
    });
  };

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
  };

  /**
   * Adds the service that first checks with a server before making a request to Discord.
   * @param serviceOptions
   * @returns `true` is connection was successful.
   */
  public addRateLimitService = (serviceOptions: IServiceOptions = {}): Promise<boolean> => {
    if (this.hasRateLimitService || this.hasRequestService) {
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
  };

  /**
   * @returns `true` is connection was successful.
   */
  private checkRpcServiceConnection = async (service: RateLimitService | RequestService): Promise<boolean> => {
    try {
      await service.hello();
      this.#connectingToRpcService = false;
      this.log('DEBUG', 'Successfully established connection to Rpc server.');
      return true;
    } catch (err: any) {
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
  };

  // TODO: reach out to grpc maintainers to find out why the current state goes bad after this error
  private recreateRpcService(): Promise<boolean> {
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
  public request = async <T extends ResponseData = any>(method: Method, url: string, options: IRequestOptions = this.#requestOptions): Promise<IApiResponse<T> | RemoteApiResponse<T>> => {
    const { local = this.#requestOptions.local, validateStatus = this.#requestOptions.validateStatus } : IRequestOptions = options;

    const [topLevelResource, topLevelID, bucketHashKey] = Api.extractBucketHashKey(method, url);
    const bucketHash = this.#rateLimitCache.getBucket(bucketHashKey);
    const request = new ApiRequest(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey, options);

    let response: IApiResponse<T> | RemoteApiResponse<T>;
    if (this.rpcRequestService === undefined || local) {
      response = await this.handleRequestLocal<T>(request);
    } else {
      response = await this.handleRequestRemote(this.rpcRequestService, request);
    }

    if (validateStatus && !validateStatus(response.status)) {
      throw createError(new Error(response.statusText), request.config, response.status, request, response);
    }

    return response;
  };

  /**
   * Send the request and handle 429's.
   * @param request The request being sent.
   * @returns axios response.
   */
  private async handleRequestLocal<T extends ResponseData>(request: ApiRequest): Promise<IApiResponse<T>> {
    const { response, ...rateLimitState } = await this.sendRequest<T>(request);
    if (response !== undefined) {
      return this.handleResponse(request, response) as unknown as IApiResponse<T>; // TODO: There's nothing more permanent than this "temporary" solution
    }

    const customResponse: IApiResponse<T> = {
      status: 429,
      statusText: 'Too Many Requests',
      retry_after: rateLimitState.waitFor,
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
    } catch (err: any) {
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
  public sendRequest = async <T extends ResponseData>(request: ApiRequest, fromQueue?: undefined | true): Promise<IResponseState<T>> => {
    try {
      request.running = true;

      let rateLimitState: IRateLimitState | undefined;
      if (this.hasRateLimitService) {
        rateLimitState = await this.authorizeRequestWithServer(request);
      }

      if (rateLimitState === undefined) {
        rateLimitState = this.#rateLimitCache.isRateLimited(request);
      }

      const { waitFor, global } = rateLimitState;
      if (waitFor === 0) {
        const message = 'Sending request.';
        this.log('DEBUG', message, request, API_DEBUG_CODES.REQUEST);
        return { response: await this.#makeRequest(request), waitFor: 0 };
      }
      request.running = false;

      if (!Api.shouldQueueRequest(request, global ?? false)) {
        return rateLimitState;
      }

      request.assignIfStricterWait(new Date().getTime() + waitFor);

      if (!fromQueue) {
        const message = 'Enqueuing request.';
        this.log('DEBUG', message, request, API_DEBUG_CODES.REQUEST_QUEUED);
        return { response: await this.enqueueRequest(request), waitFor: 0 };
      }

      const message = 'Requeuing request.';
      this.log('DEBUG', message, request);

      return { waitFor: -1 };
    } finally {
      request.running = false;
    }
  };

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

      const { waitFor, global } = authorizationMessage;
      if (waitFor === 0) {
        return { waitFor };
      }

      return { waitFor, global };
    } catch (err: any) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION && this.#allowFallback) {
        this.recreateRpcService();
        const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
        this.log('ERROR', message);
        return undefined;
      }
      throw err;
    }
  }

  private async handleResponse<T extends ResponseData>(request: ApiRequest, response: IApiResponse<T> | RateLimitedResponse): Promise<IApiResponse<T> | RateLimitedResponse> {
    this.log('DEBUG', 'Response received.', { request, response }, API_DEBUG_CODES.RESPONSE);

    const rateLimitHeaders = RateLimitHeaders.extractRateLimitFromHeaders(
      response.headers,
      isRateLimitResponse(response) ? response.data.retry_after : undefined,
    );

    const allowQueue = Api.shouldQueueRequest(request, rateLimitHeaders.global ?? false);
    if (isRateLimitResponse(response) && allowQueue) {
      return new Promise<IApiResponse<T> | RateLimitedResponse>((resolve) => {
        this.handleRateLimitedRequest<T>(request, rateLimitHeaders).then(async (res) => resolve(await this.handleResponse<T>(request, res)));
      });
    }

    this.updateRateLimitCache(request, rateLimitHeaders);

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
    this.log('DEBUG', message, rateLimitHeaders, API_DEBUG_CODES.RATE_LIMIT);

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
    const { bucketHash } = rateLimitHeaders;
    if (bucketHash) {
      const rateLimitKey = request.getRateLimitKey(bucketHash);
      const { bucketHashKey } = request;
      this.#rateLimitCache.update(rateLimitKey, bucketHashKey, rateLimitHeaders);
    }
    this.updateRpcCache(request, rateLimitHeaders);
  }

  private async updateRpcCache(request: ApiRequest, rateLimitHeaders: RateLimitHeaders) {
    if (this.#rpcRateLimitService !== undefined && !this.#connectingToRpcService) {
      try {
        const [global, bucketHash, limit, remaining, resetAfter, retryAfter] = rateLimitHeaders.rpcArgs;
        await this.#rpcRateLimitService.update(request, global, bucketHash, limit, remaining, resetAfter, retryAfter);
      } catch (err: any) {
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
    function checkRequest(resolve: (x: IApiResponse<T> | Promise<IApiResponse<T>>) => void): void {
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

function createError(
  error: Error & Record<string, any>,
  config: ApiRequest['config'],
  code: number,
  request: ApiRequest,
  response: IApiResponse | RemoteApiResponse,
) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isApiError = true;

  error.toJSON = function toJSON() {
    return {
      message: this.message,
      name: this.name,
      stack: this.stack,
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null,
      data: this.response.data,
    };
  };
  return error;
}
