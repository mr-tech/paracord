import { RequestMessage, ResponseMessage } from '../../structures';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';

import type { GrpcObject, ServiceError } from '@grpc/grpc-js';
import type { IServerOptions } from '../../../@types';
import type { ApiRequest } from '../../../clients';
import type { RemoteApiResponse, ResponseProto } from '../../types';

export interface RequestService {
  hello(): Promise<void>;
  request<T>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>>;
  allowFallback: boolean;
  target: string;
}

const createRequestService = (options: Partial<IServerOptions>): RequestService => {
  const definition: GrpcObject = loadProtoDefinition('request');

  /** Definition for the request service. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class RequestService extends (definition.RequestService as any) {
  /** host:port the service is pointed at. */
    public target: string;

    /** If unable to connect, whether or not the client is allowed to fallback to making the request locally */
    public allowFallback: boolean;

    /**
   * Creates a request service.
   * @param options Options for this service.
   */
    public constructor(opts: Partial<IServerOptions>) {
      const {
        host, port, channel, allowFallback,
      } = mergeOptionsWithDefaults(opts ?? {});

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

    /** Sends the information to make a request to Discord to the server. returning a promise with the response. */
    public request<T>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>> {
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
  return new RequestService(options) as RequestService;
};

export default createRequestService;
