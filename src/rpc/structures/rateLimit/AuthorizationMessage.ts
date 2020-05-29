import { AuthorizationProto } from '../../types';

/** A class for the AuthorizationMessage protobuf. */
export default class AuthorizationMessage {
  /** How long in ms the client should wait before attempting to authorize this request. */
  public resetAfter: number

  /**
   * Translates the rpc message into an instance of this class.
   * @param {AuthorizationProto} message Message received by client.
   */
  public static fromProto(message: AuthorizationProto): AuthorizationMessage {
    AuthorizationMessage.validateIncoming(message);

    return new AuthorizationMessage(message.reset_after);
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to client.
   */
  private static validateOutgoing(authorization: AuthorizationMessage): void {
    if (authorization.resetAfter === undefined) {
      throw Error("'resetAfter' must be a defined number");
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by client.
   */
  private static validateIncoming(message: AuthorizationProto): void {
    if (message.reset_after === undefined) {
      throw Error("received invalid message. missing property 'reset_after'");
    }
  }

  /**
   * Creates a new AuthorizationMessage sent from client to server.
   * @param resetAfter How long in ms the client should wait before attempting to authorize this request.
   */
  public constructor(resetAfter: number) {
    this.resetAfter = resetAfter;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): AuthorizationProto {
    AuthorizationMessage.validateOutgoing(this);

    return { reset_after: this.resetAfter };
  }
}
