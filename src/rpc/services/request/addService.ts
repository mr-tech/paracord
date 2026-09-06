/* eslint-disable callback-return */
import { Api, ApiOptions } from '../../../clients';
import { LOG_LEVELS, LOG_SOURCES } from '../../../constants';
import { RequestMessage, ResponseMessage } from '../../structures';
import { loadProto } from '../common';

import type { UntypedServiceImplementation } from '@grpc/grpc-js';
import type { PackageDefinition, ServiceDefinition } from '@grpc/proto-loader';
import type RpcServer from '../../server/RpcServer';
import type { RequestProto, ResponseProto, TServiceCallbackError } from '../../types';

interface ServiceRequest extends PackageDefinition {
  RequestService: ServiceDefinition;
}

/**
 * Create callback functions for the request service.
 * @param server
 */
export default (server: RpcServer, token: string, apiOptions: ApiOptions = {}): void => {
  server.apiClient = new Api(token, apiOptions);

  const requestProto = loadProto<ServiceRequest>('request');
  server.addService(requestProto.RequestService, {
    hello: hello.bind(server),
    request: request.bind(server),
  } as UntypedServiceImplementation);

  server.emit('DEBUG', {
    source: LOG_SOURCES.RPC,
    level: LOG_LEVELS.INFO,
    message: 'The request service has been added to the server.',
  });
};

function hello(
  this: RpcServer,
  _: unknown,
  callback: (a: TServiceCallbackError) => void,
) {
  callback(null);
}

function request(
  this: RpcServer,
  call: { request: RequestProto },
  callback: (a: TServiceCallbackError, b?: ResponseProto) => void,
) {
  if (this.apiClient === undefined) {
    callback('api client not initialize');
    return;
  }

  try {
    const {
      method, url, data, headers, params, returnOnRateLimit, returnOnGlobalRateLimit, maxRateLimitRetry,
    } = RequestMessage.fromProto(call.request);

    // `exactOptionalPropertyTypes`: `RequestOptions`' three retry-policy members are
    // declared `?: boolean`/`?: number`, not `?: boolean | undefined`, so an explicit
    // `undefined` value is only ever spread in, never assigned as a present key.
    this.apiClient.request(method, url, {
      data,
      headers,
      params,
      ...(returnOnRateLimit !== undefined ? { returnOnRateLimit } : {}),
      ...(returnOnGlobalRateLimit !== undefined ? { returnOnGlobalRateLimit } : {}),
      ...(maxRateLimitRetry !== undefined ? { maxRateLimitRetry } : {}),
    })
      .then((res) => {
        callback(
          null,
          new ResponseMessage(res.status, res.statusText, res.data !== undefined ? JSON.stringify(res.data) : undefined).proto,
        );
      })
      .catch((err) => callback(err));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.response) {
      callback(err);
    } else {
      callback(err);
    }
  }
}
