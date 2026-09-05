import { RequestMessage, ResponseMessage } from '../../structures';
import { loadProtoDefinition, mergeOptionsWithDefaults, withCallDeadline } from '../common';

import type { GrpcObject, ServiceError } from '@grpc/grpc-js';
import type { IServerOptions } from '../../../@types';
import type { ApiRequest } from '../../../clients';
import type { RemoteApiResponse, ResponseProto } from '../../types';

export interface RequestService {
  hello(): Promise<void>;
  request<T>(apiRequest: ApiRequest): Promise<RemoteApiResponse<T>>;
  allowFallback: boolean;
  target: string;
  /** Closes the underlying channel. Synchronous — never awaited. */
  close(): void;
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

      // Same channel args as the rate-limit service's, once its two inert
      // `max_connection_*` args are gone — this service passed none before.
      super(dest, channel, {
        'grpc.enable_channelz': 0,
      });

      this.target = dest;
      this.allowFallback = allowFallback || false;
    }

    /** Check for healthy connection. */
    public hello(): Promise<void> {
      return new Promise((resolve, reject) => {
        super.hello(undefined, withCallDeadline(), (err: ServiceError) => {
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
        super.request(message, withCallDeadline(), (err: ServiceError, res?: ResponseProto) => {
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

    /** Closes the underlying channel (`grpc.Client#close`, synchronous). */
    public close(): void {
      super.close();
    }
  }
  return new RequestService(options) as RequestService;
};

export default createRequestService;
