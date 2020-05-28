/** A class for the RequestMessage protobuf */
export default class RequestMessage {
  /** HTTP method of the request. */
  method: string;

  /** Discord REST endpoint target of the request. (e.g. channels/123) */
  url: string;

  /** Data to send in the body of the request. */
  data: any | undefined;

  /** Headers to send with the request. */
  headers: Object | undefined;

  /**
   * Create a new RequestMessage sent from client to server.
   *
   * @param {string} method HTTP method of the request.
   * @param {string} url Discord endpoint url. (e.g. channels/123)
   * @param {IApiOptions} options Optional parameters for this request.
   */
  constructor(method:string, url:string, options: IApiOptions = {}) {
  /** @type {string}  */
    this.method = method;
    /** @type {string}  */
    this.url = url;
    /** @type {*}  */
    this.data = options.data;
    /** @type {Object}  */
    this.headers = options.headers;
  }

  /** @type {RequestProto} The properties of this message formatted for sending over rpc. */
  get proto() {
    const proto: RequestProto = {
      method: this.method,
      url: this.url,
    };

    if (this.data !== undefined) {
      proto.data = JSON.stringify(this.data);
    }

    if (this.headers !== undefined) {
      proto.headers = JSON.stringify(this.headers);
    }

    RequestMessage.validateOutgoing(proto);

    return proto;
  }

  /** Verifies that the message being sent is valid. */
  static validateOutgoing(request: RequestProto) {
    if (typeof request.method !== 'string') {
      throw Error("'method' must be type 'string'");
    }
    if (typeof request.url !== 'string') {
      throw Error("'url' must be type 'string'");
    }
    // TODO: implement time out
    //   if (
    //     request.time_out !== undefined
    //       && typeof request.time_out !== 'number'
    //   ) {
    //     throw Error("'time_out' must be type 'number'");
    //   }
  }

  /**
   * Validates that the message being received is valid.
   *
   * @param {RequestProto} message
   */
  static validateIncoming(message: RequestProto) {
    if (message.method === undefined) {
      throw Error("received invalid message. missing property 'method'");
    }
    if (message.url === undefined) {
      throw Error("received invalid message. missing property 'url'");
    }
  }

  /** Validate incoming message and translate it into common state. */
  static fromProto(message: RequestProto): RequestMessage {
    RequestMessage.validateIncoming(message);

    const { method, url, ...options } = message;

    if (options.data !== undefined) {
      options.data = JSON.parse(options.data);
    }
    if (options.headers !== undefined) {
      options.headers = JSON.parse(options.headers);
    }

    return new RequestMessage(method, url, options);
  }
}
