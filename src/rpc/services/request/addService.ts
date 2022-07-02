/* eslint-disable callback-return */
import { UntypedServiceImplementation } from '@grpc/grpc-js';
import { PackageDefinition, ServiceDefinition } from '@grpc/proto-loader';
import Api from '../../../clients/Api/Api';
import { IApiOptions } from '../../../clients/Api/types';
import { LOG_LEVELS, LOG_SOURCES } from '../../../constants';
import RpcServer from '../../server/RpcServer';
import { RequestMessage, ResponseMessage } from '../../structures';
import { RequestProto, ResponseProto, TServiceCallbackError } from '../../types';
import { loadProto } from '../common';

interface ServiceRequest extends PackageDefinition {
  RequestService: ServiceDefinition;
}

const requestProto = loadProto<ServiceRequest>('request');

/**
 * Create callback functions for the request service.
 * @param server
 */
export default (server: RpcServer, token: string, apiOptions: IApiOptions = {}): void => {
  apiOptions.requestOptions = apiOptions.requestOptions ?? {};
  apiOptions.requestOptions.transformResponse = (data) => data;

  server.apiClient = new Api(token, apiOptions);
  server.apiClient.startQueue();

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

async function request(
  this: RpcServer,
  call: { request: RequestProto },
  callback: (a: TServiceCallbackError, b?: ResponseProto) => void,
) {
  if (this.apiClient === undefined) {
    callback("lock doesn't exist");
    return;
  }

  try {
    const {
      method, url, data, headers,
    } = RequestMessage.fromProto(call.request);

    const res = await this.apiClient.request(method, url, { data, headers });

    callback(
      null,
      new ResponseMessage(res.status, res.statusText, res.data ? JSON.stringify(res.data) : undefined).proto,
    );
  } catch (err: any) {
    if (err.response) {
      callback(err);
    } else {
      callback(err);
    }
  }
}
