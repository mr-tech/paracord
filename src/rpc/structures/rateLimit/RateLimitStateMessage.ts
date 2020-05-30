import RequestMetaMessage from './RequestMetaMessage';
import { RateLimitStateProto } from '../../types';

/** A class for the RateLimitStateMessage protobuf. */
export default class RateLimitStateMessage {
  /** Meta data from the requests used to identify the rate limit. */
  public requestMeta: RequestMetaMessage

  /** From Discord - If the request was globally rate limited. */
  public global: boolean;

  /** From Discord - Id of the rate limit bucket. */
  public bucket: string;

  /** From Discord - Number of requests that can be made between rate limit triggers. */
  public limit: number;

  /** From Discord - Number of requests available before hitting rate limit. */
  public remaining: number;

  /** From Discord - How long in ms the rate limit resets. */
  public resetAfter: number;

  /**
   * Translates the rpc message into an instance of this class.
   * @param message Message received by server.
   */
  public static fromProto(message: RateLimitStateProto): RateLimitStateMessage {
    RateLimitStateMessage.validateIncoming(message);

    return new RateLimitStateMessage(
      RequestMetaMessage.fromProto(message.request_meta),
      message.global,
      message.bucket,
      message.limit,
      message.remaining,
      message.reset_after,
    );
  }

  /**
   * Verifies that the message being sent is valid.
   * @param message Message being sent to server.
   */
  private static validateOutgoing(message: RateLimitStateMessage): void {
    const {
      requestMeta,
      global,
      bucket,
      remaining,
      resetAfter,
      limit,
    } = message;

    if (
      requestMeta === undefined
      || !(requestMeta instanceof RequestMetaMessage)
    ) {
      throw Error("'requestMeta' must be a defined RequestMetaMessage");
    }
    if (global === undefined) {
      throw Error("'global' must be a defined boolean if bucket is defined");
    }

    if (bucket !== undefined) {
      if (remaining === undefined) {
        throw Error(
          "'remaining' must be a defined number if bucket is defined",
        );
      }
      if (resetAfter === undefined) {
        throw Error(
          "'resetAfter' must be a defined number if bucket is defined",
        );
      }
      if (limit === undefined) {
        throw Error("'limit' must be a defined number if bucket is defined");
      }
    }
  }

  /**
   * Validates that the message being received is valid.
   * @param message Message received by server.
   */
  private static validateIncoming(message: RateLimitStateProto): void {
    if (message.request_meta === undefined) {
      throw Error("received invalid message. missing property 'request_meta'");
    }
    if (message.global === undefined) {
      throw Error("received invalid message. missing property 'global'");
    }

    if (message.bucket !== undefined) {
      if (message.remaining === undefined) {
        throw Error("received invalid message. missing property 'remaining'");
      }
      if (message.reset_after === undefined) {
        throw Error("received invalid message. missing property 'reset_after'");
      }
      if (message.limit === undefined) {
        throw Error("received invalid message. missing property 'limit'");
      }
    }
  }

  /**
   * Creates a new RateLimitStateMessage sent from client to server.
   * @param requestMeta Meta data from the requests used to identify the rate limit.
   * @param global From Discord - If the request was globally rate limited.
   * @param bucket From Discord - Id of the rate limit bucket.
   * @param limit From Discord - Number of requests that can be made between rate limit triggers.
   * @param remaining From Discord - Number of requests available before hitting rate limit.
   * @param resetAfter From Discord - How long in ms the rate limit resets.
   */
  public constructor(
    requestMeta:RequestMetaMessage,
    global: boolean,
    bucket: string,
    limit: number,
    remaining: number,
    resetAfter: number,
  ) {
    this.requestMeta = requestMeta;
    this.global = global || false;
    this.bucket = bucket;
    this.limit = limit;
    this.remaining = remaining;
    this.resetAfter = resetAfter;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): RateLimitStateProto {
    RateLimitStateMessage.validateOutgoing(this);

    return {
      request_meta: this.requestMeta.proto,
      bucket: this.bucket,
      limit: this.limit,
      remaining: this.remaining,
      reset_after: this.resetAfter,
      global: this.global,
    };
  }
}
