import { RequestMetaProto } from '../../types';

/** A class for the RequestMetaMessage protobuf. */
export default class RequestMetaMessage {
  /** HTTP method of the request. */
  public method: string;

  /** Discord endpoint url. (e.g. channels/123) */
  public url: string;

  /**
   * Translates the rpc message into an instance of this class.
   * @param message Message received by server.
   */
  public static fromProto(message: RequestMetaProto): RequestMetaMessage {
    RequestMetaMessage.validateIncoming(message);

    return new RequestMetaMessage(message.method, message.url);
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to server.
   */
  private static validateOutgoing(message: RequestMetaMessage): void {
    if (message.method === undefined) {
      throw Error("'method' must be a defined string");
    }
    if (message.url === undefined) {
      throw Error("'url' must be a defined string");
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by server.
   */
  private static validateIncoming(message: RequestMetaProto): void {
    if (message.method === undefined) {
      throw Error("received invalid message. missing property 'method'");
    }
    if (message.url === undefined) {
      throw Error("received invalid message. missing property 'url'");
    }
  }

  /**
   * Creates a new RequestMetaMessage sent from client to server.
   * @param method HTTP method of the request.
   * @param url Discord endpoint url. (e.g. channels/123)
   */
  public constructor(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): RequestMetaProto {
    RequestMetaMessage.validateOutgoing(this);

    return { method: this.method, url: this.url };
  }
}
