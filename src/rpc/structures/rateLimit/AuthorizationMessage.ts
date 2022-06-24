import { AuthorizationProto } from '../../types';

/** A class for the AuthorizationMessage protobuf. */
export default class AuthorizationMessage {
  /** How long in ms the client should wait before attempting to authorize this request. */
  public waitFor: number;

  /** When rate limited, if the rate limit is global. */
  public global: boolean;

  /**
   * Translates the rpc message into an instance of this class.
   * @param message Message received by client.
   */
  public static fromProto(message: AuthorizationProto): AuthorizationMessage {
    AuthorizationMessage.validateIncoming(message);

    return new AuthorizationMessage(message.wait_for, message.global);
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to client.
   */
  private static validateOutgoing(authorization: AuthorizationMessage): void {
    if (authorization.waitFor === undefined) {
      throw Error("'waitFor' must be a defined number");
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by client.
   */
  private static validateIncoming(message: AuthorizationProto): void {
    if (message.wait_for === undefined) {
      throw Error("received invalid message. missing property 'wait_for'");
    }
  }

  /**
   * Creates a new AuthorizationMessage sent from client to server.
   * @param waitFor How long in ms the client should wait before attempting to authorize this request.
   */
  public constructor(waitFor: number, global: boolean) {
    this.waitFor = waitFor;
    this.global = global;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): AuthorizationProto {
    AuthorizationMessage.validateOutgoing(this);

    return { wait_for: this.waitFor, global: this.global };
  }
}
