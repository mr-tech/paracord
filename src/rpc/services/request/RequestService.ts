/* eslint-disable prefer-destructuring */
import { GrpcObject, ServiceError } from '@grpc/grpc-js';
import { ApiRequest } from '../../../clients/Api/structures';
import { ResponseData } from '../../../clients/Api/types';
import { IServerOptions } from '../../../common';
import { RequestMessage, ResponseMessage } from '../../structures';
import { RemoteApiResponse, ResponseProto } from '../../types';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';

const definition: GrpcObject = loadProtoDefinition('request');

/** Definition for the request service. */
export default class RequestService extends (definition.RequestService as any) {
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
      host, port, channel, allowFallback,
    } = mergeOptionsWithDefaults(options ?? {});

    const dest = `${host}:${port}`;

    super(dest, channel);

    this.target = dest;
    this.allowFallback = allowFallback || false;
  }

  /** Sends the information to make a request to Discord to the server. returning a promise with the response. */
  public request<T extends ResponseData>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>> {
    const message = new RequestMessage(apiRequest).proto;

    return new Promise((resolve, reject) => {
      super.request(message, (err: ServiceError, res?: ResponseProto) => {
        if (err !== null) {
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
