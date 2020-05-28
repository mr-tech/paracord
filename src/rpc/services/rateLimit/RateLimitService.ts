/* eslint-disable prefer-destructuring */
import {
  RequestMetaMessage,
  AuthorizationMessage,
  RateLimitStateMessage,
} from '../../structures/rateLimit';
import { loadProtoDefinition, constructorDefaults } from '../common';

const definition = loadProtoDefinition('rate_limit');

/** Definition for the identity lock rpc service. */
// @ts-ignore: interface can in fact be extended
export default class RateLimitService extends definition.RateLimitService {
  /** host:port the service is pointed at. */
  target: string;

  /**
   * Creates an identity lock service.
   *
   * @param {ServiceOptions} options
   */
  constructor(options: ServiceOptions) {
    const { dest, channel, protoOptions } = constructorDefaults(options || {});
    super(dest, channel, protoOptions);
    this.target = dest;
  }

  /**
   * Receives authorization from rate limit handling server to make the request.
   *
   * @param {ApiRequest} request The request being authorized.
   * @returns {Promise<AuthorizationMessage>}
   */
  authorize(request: ApiRequest): Promise<AuthorizationMessage> {
    const { method, url } = request;

    const message = new RequestMetaMessage(method, url).proto;

    return new Promise((resolve, reject) => {
      super.authorize(message, (err: any, res: AuthorizationProto) => {
        if (err === null) {
          resolve(AuthorizationMessage.fromProto(res));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   *
   * @param {ApiRequest} request The request being authorized.
   * @returns {Promise<void>}
   */
  update(request: ApiRequest, global: boolean, bucket: string, limit: number, remaining: number, resetAfter: number) {
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
      super.update(message, (err: any) => {
        if (err === null) {
          resolve();
        } else {
          reject(err);
        }
      });
    });
  }
}
