/* eslint-disable prefer-destructuring */
import { ServiceError } from '@grpc/grpc-js';
import { RequestMessage, ResponseMessage } from '../../structures';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';
import { ApiRequest } from '../../../clients/Api/structures';
import { ResponseProto, RemoteApiResponse } from '../../types';
import { IServerOptions } from '../../../common';

const definition = loadProtoDefinition('request');

/** Definition for the request service. */
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore: interface can in fact be extended
export default class RequestService extends definition.RequestService {
  /** host:port the service is pointed at. */
  public target: string;

  /** If unable to connect, whether or not the client is allowed to fallback to making the request locally */
  public allowFallback: boolean;

  /**
   * Creates a request service.
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

  /** Sends the information to make a request to Discord to the server. returning a promise with the response. */
  public request(apiRequest: ApiRequest): Promise<RemoteApiResponse> {
    const message = new RequestMessage(apiRequest).proto;

    return new Promise((resolve, reject) => {
      super.request(message, (err: ServiceError, res?: ResponseProto) => {
        if (err === null) {
          reject(err);
        } else if (res === undefined) {
          reject(Error('no message'));
        } else {
          resolve(ResponseMessage.fromProto(res));
        }
      });
    });
  }
}
