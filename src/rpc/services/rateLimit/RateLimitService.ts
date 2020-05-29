/* eslint-disable prefer-destructuring */
import { ServiceError } from '@grpc/grpc-js';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';
import { IServerOptions } from '../../../types';
import { ApiRequest } from '../../../clients/Api/structures';
import { AuthorizationMessage, RequestMetaMessage, RateLimitStateMessage } from '../../structures';
import { AuthorizationProto } from '../../types';

const definition = loadProtoDefinition('rate_limit');

/** Definition for the identity lock rpc service. */
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore: interface can in fact be extended
export default class RateLimitService extends definition.RateLimitService {
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
      host, port, channel, protoOptions, allowFallback,
    } = mergeOptionsWithDefaults(options || {});

    const dest = `${host}:${port}`;

    super(dest, channel, protoOptions);

    this.target = dest;
    this.allowFallback = allowFallback || false;
  }

  /**
   * Receives authorization from rate limit handling server to make the request.
   * @param request The request being authorized.
   */
  public authorize(request: ApiRequest): Promise<AuthorizationMessage> {
    const { method, url } = request;

    const message = new RequestMetaMessage(method, url).proto;

    return new Promise((resolve, reject) => {
      super.request(message, (err: ServiceError, res?: AuthorizationProto) => {
        if (err === null) {
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
  public update(request: ApiRequest, global: boolean, bucket: string, limit: number, remaining: number, resetAfter: number): Promise<void> {
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
      super.request(message, (err: ServiceError) => {
        if (err === null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
