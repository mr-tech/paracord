
// const TokenMessage = require("./TokenMessage");

import { StatusProto } from '../../types';

/** A class for the StatusMessage protobuf. */
export default class StatusMessage {
  /** Whether or not the operation was successful. */
  public success: boolean;

  /** Reason why the operation failed. */
  public message: string | undefined;

  /** Unique id given to the last client to acquire the lock. */
  public token: string | undefined;

  /**
   * Validate incoming message and translate it into common state.
   * @param message Message received by client.
   */
  public static fromProto(message: StatusProto): StatusMessage {
    this.validateIncoming(message);

    return new StatusMessage(
      message.success,
      message.message,
      message.token,
      // message.token ? TokenMessage.fromProto(message.token).value : undefined
    );
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to client.
   */
  private static validateOutgoing(message: StatusMessage) {
    if (typeof message.success !== 'boolean') {
      throw Error("'success' must be type 'boolean'");
    }
    if (message.success === false && !message.message) {
      throw Error("a message must be provided when 'success' is false");
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by client.
   */
  private static validateIncoming(message: StatusProto) {
    if (message.success === undefined) {
      throw Error("received invalid message. missing property 'success'");
    }
  }

  /**
   * Creates a new StatusMessage sent from server to client.
   * @param didSucceed Whether or not the operation was successful.
   * @param message Reason why the operation failed.
   * @param token Unique id given to the last client to acquire the lock.
   */
  public constructor(didSucceed: boolean, message: string | undefined, token?: string) {
    this.success = didSucceed;
    this.message = message;
    this.token = token;
    // if (token !== undefined) {
    //   this.token = new TokenMessage(token);
    // }
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): StatusProto {
    StatusMessage.validateOutgoing(this);

    return {
      success: this.success,
      message: this.message,
      token: this.token,
    };
  }
}
