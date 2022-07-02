import type { UntypedServiceImplementation } from '@grpc/grpc-js';
import type { PackageDefinition, ServiceDefinition } from '@grpc/proto-loader';
import { BaseRequest, RateLimitHeaders } from '../../../clients/Api/structures';
import { LOG_LEVELS, LOG_SOURCES } from '../../../constants';
import RpcServer from '../../server/RpcServer';
import { AuthorizationMessage, RateLimitStateMessage, RequestMetaMessage } from '../../structures';
import { AuthorizationProto, RateLimitStateProto, TServiceCallbackError } from '../../types';
import { loadProto } from '../common';
import Api from '../../../clients/Api/Api';

interface ServiceRateLimit extends PackageDefinition {
  RateLimitService: ServiceDefinition;
}

const rateLimitProto = loadProto<ServiceRateLimit>('rate_limit');

/**
 * Create callback functions for the rate limit service.
 * @param server
 */
export default (server: RpcServer): void => {
  server.rateLimitCache.startSweepInterval();
  server.addService(rateLimitProto.RateLimitService, {
    hello: hello.bind(server),
    authorize: authorize.bind(server),
    update: update.bind(server),
  } as UntypedServiceImplementation);

  server.emit('DEBUG', {
    source: LOG_SOURCES.RPC,
    level: LOG_LEVELS.INFO,
    message: 'The rate limit service has been to the server.',
  });
};

function hello(
  this: RpcServer,
  _: unknown,
  callback: (a: TServiceCallbackError) => void,
) {
  callback(null);
}

function authorize(
  this: RpcServer,
  call: { request: RequestMetaMessage },
  callback: (a: TServiceCallbackError, b?: AuthorizationProto) => void,
) {
  try {
    const { method, url } = RequestMetaMessage.fromProto(call.request);
    const [topLevelResource, topLevelID, bucketHashKey] = Api.extractBucketHashKey(method, url);
    const bucketHash = this.rateLimitCache.getBucket(bucketHashKey);

    const request = new BaseRequest(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey);
    const { waitFor, global } = this.rateLimitCache.authorizeRequestFromClient(request);

    if (waitFor === 0) {
      const message = `Request approved. ${method} ${url}`;
      this.log('DEBUG', message);
    } else {
      const message = `Request denied. ${method} ${url}`;
      this.log('DEBUG', message);
    }

    const message = new AuthorizationMessage(waitFor, global ?? false).proto;

    callback(null, message);
  } catch (err: any) {
    this.emit('DEBUG', {
      source: LOG_SOURCES.RPC,
      level: LOG_LEVELS.ERROR,
      message: err,
    });
    callback(err);
  }
}

function update(
  this: RpcServer,
  call: { request: RateLimitStateProto },
  callback: (a: TServiceCallbackError) => void,
) {
  try {
    const {
      requestMeta: { method, url },
      global,
      bucketHash,
      limit,
      remaining,
      resetAfter,
      retryAfter,
    } = RateLimitStateMessage.fromProto(call.request);

    if (bucketHash !== undefined) {
      const rateLimitHeaders = new RateLimitHeaders(
        global,
        bucketHash,
        limit,
        remaining,
        resetAfter,
        retryAfter,
      );
      const [tlr, tlrID, bucketHashKey] = Api.extractBucketHashKey(method, url);
      const rateLimitKey = BaseRequest.formatRateLimitKey(tlr, tlrID, bucketHash);
      this.rateLimitCache.update(rateLimitKey, bucketHashKey, rateLimitHeaders);
    }

    const message = `Rate limit cache updated: ${method} ${url} | Remaining: ${remaining}`;
    this.log('DEBUG', message);

    callback(null);
  } catch (err: any) {
    this.emit('DEBUG', {
      source: LOG_SOURCES.RPC,
      level: LOG_LEVELS.ERROR,
      message: err.message,
    });
    callback(err);
  }
}
