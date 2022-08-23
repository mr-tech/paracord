/* eslint-disable no-sync */
import * as grpc from '@grpc/grpc-js';

import { Api, RateLimitCache, ApiOptions } from '../../clients';
import {
  API_GLOBAL_RATE_LIMIT, LOG_LEVELS, LOG_SOURCES, API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS,
} from '../../constants';
import { addRateLimitService, addRequestService } from '../services';

import type { DebugLevel } from '../../@types';
import type { IDebugEvent, RpcServerOptions } from '../types';
import type { EventEmitter } from 'events';

/**
 * Rpc server.
 * @extends grpc.Server
 */
export default class RpcServer extends grpc.Server {
  /** Emitter for debug logging. */
  public emitter?: undefined | EventEmitter;

  /** Api client when the "request" service is added. */
  public apiClient?: undefined | Api;

  /** Cache for rate limits when having client authorize against server. */
  public rateLimitCache: RateLimitCache;

  /** Destination host. */
  #host: string;

  /** Destination port. */
  #port: string | number;

  /** GRPC channel to receive connections with. */
  #channel: grpc.ServerCredentials;

  /**
   * Creates a new rpc Server.
   * @param options
   */
  public constructor(options: RpcServerOptions = {}) {
    super();
    const {
      host, port, channel, emitter, globalRateLimitMax, globalRateLimitResetPadding, apiClient,
    } = options;

    this.#host = host ?? '127.0.0.1';
    this.#port = port ?? '50051';
    this.#channel = channel ?? grpc.ServerCredentials.createInsecure();
    this.emitter = emitter;
    this.apiClient = apiClient;
    this.rateLimitCache = new RateLimitCache(
      globalRateLimitMax ?? API_GLOBAL_RATE_LIMIT,
      globalRateLimitResetPadding ?? API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS,
      apiClient,
    );
  }

  /** Establishes the arguments that will be passed to `bindAsync()` when starting the server. */
  private get bindArgs(): [string, grpc.ServerCredentials, (e: Error | null, port?: undefined | number) => void] {
    const callback = (e: Error | null) => {
      if (e !== null) {
        this.emit('DEBUG', {
          source: LOG_SOURCES.RPC,
          level: LOG_LEVELS.FATAL,
          message: e.message,
        });
      } else {
        try {
          this.start();
          const message = `Rpc server running at http://${this.#host}:${this.#port}`;
          this.emit('DEBUG', {
            source: LOG_SOURCES.RPC,
            level: LOG_LEVELS.INFO,
            message,
          });
        } catch (err: unknown) {
          if (err instanceof Error) {
            if (err.message === 'server must be bound in order to start') {
              /* eslint-disable-next-line no-console */
              console.error('server must be bound in order to start. maybe this host:port is already in use?');
            }
          } else {
            throw err;
          }
        }
      }
    };

    return [`${this.#host}:${this.#port}`, this.#channel, callback];
  }

  /**
   * Adds the request service to this server. Allows the server to handle Discord API requests from clients.
   * @param token Discord token. Will be coerced into a bot token.
   * @param apiOptions Optional parameters for the api handler.
   */
  public addRequestService(token: string, apiOptions: ApiOptions = {}): void {
    addRequestService(this, token, apiOptions);
  }

  /** Adds the rate limit service to this server. Stores app-wide rate limits centrally and authorizes requests.. */
  public addRateLimitService(): void {
    addRateLimitService(this);
  }

  /** Start the server. */
  public serve(): void {
    const [dest, channel, callback] = this.bindArgs;
    this.bindAsync(dest, channel, callback);
  }

  /** Emits a log event. */
  public log(level: DebugLevel, message: string): void {
    this.emit('DEBUG', {
      source: LOG_SOURCES.RPC,
      level: LOG_LEVELS[level],
      message,
    });
  }

  /**
   * Emits logging events.
   * @param type Event name.
   * @param event Data emitted.
   */
  public emit(type: string, event: IDebugEvent): void {
    this.emitter && this.emitter.emit(type, event);
  }
}
