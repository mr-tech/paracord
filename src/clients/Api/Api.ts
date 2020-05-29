
import axios from 'axios';
import type { EventEmitter } from 'events';
import { coerceTokenToBotLike } from '../../utils/Utils';
import { RequestService, RateLimitService } from '../../rpc/services';

import {
  RateLimitCache,
  ApiRequest,
  RequestQueue,
  RateLimitHeaders,
} from './structures';

import {
  LOG_LEVELS,
  LOG_SOURCES,
  DISCORD_API_URL,
  DISCORD_API_DEFAULT_VERSION,
} from '../../constants';

import {
  WrappedRequest, IApiOptions, IServiceOptions, IApiResponse, IRequestOptions,
} from './types';
import { RemoteApiResponse } from '../../rpc/types';
import { DebugLevel } from '../../types';

/** A client used to interact with Discord's REST API and navigate its rate limits. */
export default class Api {
  /** Contains rate limit state information. For use when not using rpc; or in fallback. */
  private rateLimitCache: RateLimitCache;

  /** Rate limited requests queue. For use when not using rpc; or in fallback, */
  private requestQueue: RequestQueue;

  /**  Interval for processing rate limited requests on the queue. */
  private requestQueueProcessInterval?: NodeJS.Timer;

  /** When using Rpc, the service through which to pass requests to the server. */
  private rpcRequestService?: RequestService;

  /** When using Rpc, the service through which to get authorization to make requests. */
  private rpcRateLimitService?: RateLimitService;

  /** Whether or not this client should handle requests locally for as long as it cannot connect to the rpc server. */
  private allowFallback: boolean;

  /** Key:Value mapping this client's events to user's preferred emitted value. */
  public events?: Record<string, string>;

  /**  */
  private emitter?: EventEmitter;

  private wrappedRequest: WrappedRequest;

  /**
   * Creates a new Api client.
   * @param token Discord token. Will be coerced into a bot token.
   * @param options Optional parameters for this handler.
   */
  constructor(token: string, options: IApiOptions = {}) {
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
    this.wrappedRequest = this.createWrappedRequest(botToken, requestOptions);
  }

  /*
   ********************************
   ********* CONSTRUCTOR **********
   ********************************
   */

  /**
   * Throws errors and warnings if the parameters passed to the constructor aren't sufficient.
   * @private
   *
   * @param token Discord bot token.
   */
  private static validateParams(token: string): void {
    if (token === undefined) {
      throw Error('client requires a bot token');
    }
  }

  /**
   * Creates an isolated axios instance for use by this REST handler.
   * @private
   */
  private createWrappedRequest(token: string, requestOptions: IRequestOptions | void): WrappedRequest {
    const instance = axios.create({
      baseURL: `${DISCORD_API_URL}/${DISCORD_API_DEFAULT_VERSION}`,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        'X-RateLimit-Precision': 'millisecond',
      },
      ...(requestOptions || {}),
    });

    /** @type`axios.request()` decorated with rate limit handling. */
    return this.rateLimitCache.wrapRequest(instance.request);
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
   * @param serverOptions
   */
  public addRequestService(serverOptions: IServiceOptions = {}): void {
    if (
      this.rpcRateLimitService !== undefined
      || this.rpcRequestService !== undefined
    ) {
      throw Error(
        'A rpc service has already been defined for this client. Only one may be added.',
      );
    }

    this.rpcRequestService = new RequestService(serverOptions || {});
    this.allowFallback = serverOptions.allowFallback !== false;

    {
      const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
      this.log('INFO', message);
    }

    if (!this.allowFallback) {
      const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
      this.log('WARNING', message);
    }
  }

  /**
   * Adds the service that first checks with a server before making a request to Discord.
   * @param serverOptions
   */
  public addRateLimitService(serverOptions: IServiceOptions = {}): void {
    if (
      this.rpcRateLimitService !== undefined
      || this.rpcRequestService !== undefined
    ) {
      throw Error(
        'A rpc service has already been defined for this client. Only one may be added.',
      );
    }

    this.rpcRateLimitService = new RateLimitService(serverOptions || {});
    this.allowFallback = serverOptions.allowFallback !== false;

    {
      const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.rpcRateLimitService.target}`;
      this.log('INFO', message);
    }

    if (!this.allowFallback) {
      const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
      this.log('WARNING', message);
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
      this.requestQueueProcessInterval = setInterval(
        this.requestQueue.process.bind(this.requestQueue),
        interval,
      );
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

  /**
   * Makes a request from the queue.
   * @param request ApiRequest being made.
   */
  public sendQueuedRequest(request: ApiRequest): Promise<IApiResponse> {
    const message = `Sending queued request: ${request.method} ${request.url}`;
    this.log('DEBUG', message, request);
    return this.wrappedRequest(request);
  }

  /*
   ********************************
   *********** REQUEST ************
   ********************************
   */

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
      if (err.code === 14 && this.allowFallback) {
        const message = 'Could not reach RPC server. Falling back to handling request locally.';
        this.log('ERROR', message);

        return this.handleRequestLocal(request);
      }
      throw err;
    }
  }

  /**
   * Makes a request to Discord, handling any rate limits and returning when a non-429 response is received.
   *
   * @param method HTTP method of the request.
   * @param url Discord endpoint url. (e.g. "/channels/abc123")
   * @param options
   * @param options.data Data to send with the request.
   * @param options.headers Headers to send with the request. "Authorization" and "Content-Type" will override the defaults.
   * @param options.local If true, executes the request locally ignoring any rpc services. Be sure to `startQueue()` to handle rate limited requests.
   * @returns Response to the request made.
   */
  public async request(method: string, url: string, options: IRequestOptions = {}): Promise<IApiResponse | RemoteApiResponse> {
    const { data, headers, local } : {
      data?: Record<string, unknown>;
      headers?: Record<string, unknown>;
      local?: boolean;
    } = options;

    if (url.startsWith('/')) {
      url = url.slice(1);
    }

    const request = new ApiRequest(method.toUpperCase(), url, {
      data,
      headers,
    });

    if (this.rpcRequestService === undefined || local) {
      return this.handleRequestLocal(request);
    }

    return this.handleRequestRemote(this.rpcRequestService, request);
  }

  /**
   * Send the request and handle 429's.
   * @private
   *
   * @param request The request being sent.
   * @returns axios response.
   */
  private async handleRequestLocal(request: ApiRequest): Promise<IApiResponse> {
    if (this.requestQueueProcessInterval === undefined) {
      const message = 'Making a request with a local Api client without a running request queue. Please invoke `startQueue()` on this client so that rate limits may be handled.';
      this.log('WARNING', message);
    }

    // TODO(lando): Review 429-handling logic. This loop may be stacking calls.

    let response = await this.sendRequest(request);
    let rateLimitHeaders = RateLimitHeaders.extractRateLimitFromHeaders(
      response.headers,
    );

    while (response.status === 429) {
      rateLimitHeaders = RateLimitHeaders.extractRateLimitFromHeaders(
        response.headers,
      );
      if (this.requestQueueProcessInterval === undefined) {
        const message = 'A request has been rate limited and will not be processed. Please invoke `startQueue()` on this client so that rate limits may be handled.';
        this.log('WARNING', message);
      }
      response = await this.handleRateLimitedRequest(request, rateLimitHeaders);
    }

    if (rateLimitHeaders !== undefined) {
      this.updateRateLimitCache(request, rateLimitHeaders);
    }

    return response;
  }

  /**
   * Updates the local rate limit cache and sends an update to the server if there is one.
   * @param request The request made.
   * @param  rateLimitHeaders Headers from the response.
   */
  private updateRateLimitCache(request: ApiRequest, rateLimitHeaders: RateLimitHeaders) {
    this.rateLimitCache.update(request, rateLimitHeaders);
    this.updateRpcCache(request, rateLimitHeaders);
  }

  private async updateRpcCache(request: ApiRequest, rateLimitHeaders: RateLimitHeaders) {
    if (this.rpcRateLimitService !== undefined
    ) {
      try {
        const [global, bucket, limit, remaining, resetAfter] = rateLimitHeaders.rpcArgs;
        await this.rpcRateLimitService.update(
          request, global, bucket, limit, remaining, resetAfter,
        );
      } catch (err) {
        if (err.code !== 14) {
          throw err;
        }
      }
    }
  }

  /**
   * Determines how the request will be made based on the client's options and makes it.
   * @param request ApiRequest being made,
   */
  private async sendRequest(request: ApiRequest): Promise<IApiResponse> {
    let isRateLimited;
    if (this.rpcRateLimitService !== undefined) {
      isRateLimited = !(await this.authorizeRequestWithServer(request));
    } else {
      isRateLimited = this.rateLimitCache.returnIsRateLimited(request);
    }

    if (!isRateLimited) {
      const message = `Sending request: ${request.method} ${request.url}`;
      this.log('DEBUG', message, request);
      return this.wrappedRequest(request);
    }

    const message = `Enqueuing request: ${request.method} ${request.url}`;
    this.log('DEBUG', message, request);
    return this.enqueueRequest(request);
  }

  /**
   * Checks request against relevant service or cache to see if it will trigger a rate limit.
   * @param request ApiRequest being made.
   * @returns `true` if request will not trigger a rate limit.
   */
  public returnOkToMakeRequest(request: ApiRequest): boolean | Promise<boolean> {
    if (this.rpcRateLimitService !== undefined) {
      return this.authorizeRequestWithServer(request);
    }

    return !this.rateLimitCache.returnIsRateLimited(request);
  }

  /**
   * Gets authorization from the server to make the request.
   * @param request ApiRequest being made.
   * @returns `true` if server has authorized the request.
   */
  private async authorizeRequestWithServer(request: ApiRequest): Promise<boolean> {
    if (this.rpcRateLimitService !== undefined) {
      try {
        const { resetAfter } = await this.rpcRateLimitService.authorize(request);

        if (resetAfter === 0) {
          return true;
        }

        if (
          request.waitUntil === undefined
          || request.waitUntil < new Date().getTime()
        ) {
          const waitUntil = new Date().getTime() + resetAfter;
          request.assignIfStricterWait(waitUntil);
        }
        return false;
      } catch (err) {
        if (err.code === 14 && this.allowFallback) {
          const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
          this.log('ERROR', message);

          return true;
        }
        throw err;
      }
    }

    return false;
  }

  /**
   * Updates the rate limit state and queues the request.
   * @param headers Response headers.
   * @param request ApiRequest being sent.
   * @returns axios response.
   */
  private handleRateLimitedRequest(request: ApiRequest, rateLimitHeaders: RateLimitHeaders | undefined) {
    let message;
    if (rateLimitHeaders === undefined || rateLimitHeaders.global) {
      message = `ApiRequest global rate limited: ${request.method} ${request.url}`;
    } else {
      message = `ApiRequest rate limited: ${request.method} ${request.url}`;
    }

    this.log('DEBUG', message, rateLimitHeaders);

    if (rateLimitHeaders !== undefined) {
      this.updateRateLimitCache(request, rateLimitHeaders);
    }

    return this.enqueueRequest(request);
  }

  /**
   * Puts the Api ApiRequest onto the queue to be executed when the rate limit has reset.
   * @param request The Api ApiRequest to queue.
   * @returns Resolves as the response to the request.
   */
  private enqueueRequest(request: ApiRequest): Promise<IApiResponse> {
    // request.timeout = new Date().getTime() + timeout;

    this.requestQueue.push(request);
    request.response = undefined;

    /** Continuously checks if the response has returned. */
    function checkRequest(resolve: (x: Promise<IApiResponse>) => void): void {
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
