import { TokenProto } from '../../types';

/** A class for the TokenMessage protobuf. */
export default class TokenMessage {
  /** The unique id given to the last client to acquire the lock. */
  public value: string;

  /**
   * Validate incoming message and translate it into common state.
   * @param message Message received by server.
   */
  public static fromProto(message: TokenProto): TokenMessage {
    TokenMessage.validateIncoming(message);

    return new TokenMessage(message.value);
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to server.
   */
  private static validateOutgoing(message: TokenMessage): void {
    if (message.value === undefined) {
      throw Error("'value' must be a defined string");
    }
    if (typeof message.value !== 'string') {
      throw Error("'value' must be type 'string'");
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by server.
   */
  private static validateIncoming(message: TokenProto): void {
    if (message.value === undefined) {
      throw Error("received invalid message. missing property 'value'");
    }
  }

  /**
   * Create a new TokenMessage sent from the client to server.
   * @param value The unique id given to the last client to acquire the lock.
   */
  public constructor(value: string) {
    this.value = value;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): TokenProto {
    TokenMessage.validateOutgoing(this);

    return { value: this.value };
  }
}
