/* eslint-disable prefer-destructuring */
import { GrpcObject, ServiceError } from '@grpc/grpc-js';
import { ApiRequest } from '../../../clients/Api/structures';
import { IServerOptions } from '../../../common';
import { AuthorizationMessage, RateLimitStateMessage, RequestMetaMessage } from '../../structures';
import { AuthorizationProto } from '../../types';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';

const definition: GrpcObject = loadProtoDefinition('rate_limit');

/** Definition for the identity lock rpc service. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default class RateLimitService extends (definition.RateLimitService as any) {
  /** host:port the service is pointed at. */
  public target: string;

  /** If unable to connect, whether or not the client is allowed to fallback to making the request locally */
  public allowFallback: boolean;

  /**
   * Creates an identity lock service.
   * @param options Options for this service.
   */
  public constructor(options: Partial<IServerOptions>) {
    const {
      host, port, channel, allowFallback,
    } = mergeOptionsWithDefaults(options ?? {});

    const dest = `${host}:${port}`;

    super(dest, channel);

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
  public update(request: ApiRequest, global: boolean, bucket: string | undefined, limit: number, remaining: number, resetAfter: number): Promise<void> {
    const { method, url } = request;
    const requestMeta = new RequestMetaMessage(method, url);
    const message = new RateLimitStateMessage(
      requestMeta,
      global,
      bucket,
      limit,
      remaining,
      resetAfter,
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
