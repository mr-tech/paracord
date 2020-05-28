/* eslint-disable prefer-destructuring */
import { RequestMessage, ResponseMessage } from '../../structures';
import { loadProtoDefinition, constructorDefaults } from '../common';

const definition = loadProtoDefinition('request');

/** Definition for the request service. */
// @ts-ignore: interface can in fact be extended
export default class RequestService extends definition.RequestService {
  /** host:port the service is pointed at. */
  target: string;

  /**
   * Creates a request service.
   *
   * @param {ServiceOptions} options
   */
  constructor(options: ServiceOptions) {
    const { dest, channel, protoOptions } = constructorDefaults(options || {});
    super(dest, channel, protoOptions);
    this.target = dest;
  }

  /** Sends the information to make a request to Discord to the server. returning a promise with the response. */
  request(req: ApiRequest) {
    const { method, url, ...options } = req;
    const message = new RequestMessage(method, url, options).proto;

    return new Promise<IApiResponse>((resolve, reject) => {
      super.request(message, (err: any, res: ResponseProto) => {
        if (err === null) {
          resolve(ResponseMessage.fromProto(res));
        } else {
          reject(err);
        }
      });
    });
  }
}
