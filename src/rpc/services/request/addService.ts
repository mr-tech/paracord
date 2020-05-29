/* eslint-disable callback-return */
import { RequestMessage, ResponseMessage } from '../../structures';
import RpcServer from '../../server/RpcServer';
import { loadProto } from '../common';
import { IApiOptions } from '../../../clients/Api/types';
import Api from '../../../clients/Api/Api';
import {
  ResponseProto, TServiceCallbackError, RequestProto,
} from '../../types';
import { LOG_SOURCES, LOG_LEVELS } from '../../../constants';

const requestProto = loadProto('request');

/**
 * Create callback functions for the request service.
 * @param server
 */
export default (server: RpcServer, token: string, apiOptions: IApiOptions = {}): void => {
  apiOptions.requestOptions = apiOptions.requestOptions || {};
  apiOptions.requestOptions.transformResponse = (data) => data;

  server.apiClient = new Api(token, apiOptions);
  server.apiClient.startQueue();

  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  // @ts-ignore: interface can in fact be extended
  server.addService(requestProto.LockService, {
    request: request.bind(server),
  });

  server.emit('DEBUG', {
    source: LOG_SOURCES.RPC,
    level: LOG_LEVELS.INFO,
    message: 'The request service has been added to the server.',
  });
};

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
  } catch (err) {
    if (err.response) {
      callback(err);
    } else {
      callback(err);
    }
  }
}
