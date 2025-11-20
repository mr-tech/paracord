import { AuthorizationMessage, RateLimitStateMessage, RequestMetaMessage } from '../../structures';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';

import type { GrpcObject, ServiceError } from '@grpc/grpc-js';
import type { IServerOptions } from '../../../@types';
import type { ApiRequest } from '../../../clients';
import type { AuthorizationProto } from '../../types';

export interface RateLimitService {
  target: string;
  allowFallback: boolean;
  hello(): Promise<void>;
  authorize(request: ApiRequest): Promise<AuthorizationMessage>;
  update(request: ApiRequest, global: boolean, bucketHash: string | undefined, limit: number, remaining: number, resetAfter: number, retryAfter: number | undefined): Promise<void>;
}

const createRateLimitService = (options: Partial<IServerOptions>): RateLimitService => {
  const definition: GrpcObject = loadProtoDefinition('rate_limit');

  /** Definition for the identity rate limit rpc service. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class RateLimitService extends (definition.RateLimitService as any) {
  /** host:port the service is pointed at. */
    public target: string;

    /** If unable to connect, whether or not the client is allowed to fallback to making the request locally */
    public allowFallback: boolean;

    /**
   * Creates an rate limit service.
   * @param options Options for this service.
   */
    public constructor(opts: Partial<IServerOptions>) {
      const {
        host, port, channel, allowFallback,
      } = mergeOptionsWithDefaults(opts ?? {});

      const dest = `${host}:${port}`;

      super(dest, channel, {
        'grpc.enable_channelz': 0,
        'grpc.max_connection_idle_ms': 10000, // Close idle connections after 10s
        'grpc.max_connection_age_ms': 30000, // Force connection close after 30s
      });

      this.target = dest;
      this.allowFallback = allowFallback || false;
    }

    /** Check for healthy connection. */
    public hello(): Promise<void> {
      return new Promise((resolve, reject) => {
        super.hello(undefined, (err: ServiceError) => {
          if (err !== null) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
   * Receives authorization from rate limit handling server to make the request.
   * @param request The request being authorized.
   */
    public authorize(request: ApiRequest): Promise<AuthorizationMessage> {
      const { method, url } = request;

      const message = new RequestMetaMessage(method, url).proto;
      return new Promise((resolve, reject) => {
        super.authorize(message, (err: ServiceError, res?: AuthorizationProto) => {
          if (err !== null) {
            reject(err);
          } else if (res === undefined) {
            reject(Error('no message'));
          } else {
            resolve(AuthorizationMessage.fromProto(res));
          }
        });
      });
    }

    /**
   * Sends rate limit headers to server so that it can update the cache.
   * @param request The request being authorized.
   */
    public update(request: ApiRequest, global: boolean, bucketHash: string | undefined, limit: number, remaining: number, resetAfter: number, retryAfter: number | undefined): Promise<void> {
      const { method, url } = request;
      const requestMeta = new RequestMetaMessage(method, url);
      const message = new RateLimitStateMessage(
        requestMeta,
        global,
        bucketHash,
        limit,
        remaining,
        resetAfter,
        retryAfter,
      ).proto;

      return new Promise((resolve, reject) => {
        super.update(message, (err: ServiceError) => {
          if (err !== null) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  return new RateLimitService(options) as RateLimitService;
};

export default createRateLimitService;
