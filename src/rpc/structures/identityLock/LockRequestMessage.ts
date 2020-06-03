import { LockRequestProto } from '../../types';

/** A class for the LockRequestMessage protobuf. */
export default class LockRequestMessage {
  /** How long in ms the server should wait before expiring the lock. */
  public timeOut: number;

  /** Unique id given to the last client that acquired the lock. */
  public token: string | undefined;

  /**
   * Translates the rpc message into an instance of this class.
   * @param message Message received by server.
   */
  public static fromProto(message: LockRequestProto): LockRequestMessage {
    LockRequestMessage.validateIncoming(message);

    return new LockRequestMessage(message.time_out, message.token);
  }

  /**
   * Verifies that the message being sent is valid.
   * @param lockRequest Message being sent to server.
   */
  private static validateOutgoing(lockRequest: LockRequestMessage): void {
    if (lockRequest.timeOut === undefined) {
      throw Error("'timeOut' must be a defined number");
    }
    if (typeof lockRequest.timeOut !== 'number') {
      throw Error("'timeOut' must be type 'number'");
    }
    if (lockRequest.token !== undefined && typeof lockRequest.token !== 'string') {
      throw Error("'token' must be type 'string'");
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by server.
   */
  private static validateIncoming(message: LockRequestProto): void {
    if (message.time_out === undefined) {
      throw Error("received invalid message. missing property 'time_out'");
    }
  }

  /**
   * Creates a new LockRequestMessage sent from client to server.
   * @param timeOut How long in ms the server should wait before expiring the lock.
   * @param token Unique id given to the last client to acquire the lock.
   */
  public constructor(timeOut: number, token?: string) {
    this.timeOut = timeOut;
    this.token = token;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): LockRequestProto {
    LockRequestMessage.validateOutgoing(this);

    return { time_out: this.timeOut, token: this.token };
  }
}
