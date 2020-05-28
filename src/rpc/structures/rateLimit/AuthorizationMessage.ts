/** A class for the AuthorizationMessage protobuf. */
export default class AuthorizationMessage {
  /** How long in ms the client should wait before attempting to authorize this request. */
  resetAfter: number

  /**
   * Creates a new AuthorizationMessage sent from client to server.
   *
   * @param {number} resetAfter How long in ms the client should wait before attempting to authorize this request.
   */
  constructor(resetAfter: number) {
    this.resetAfter = resetAfter;
  }

  /** @type {AuthorizationProto} The properties of this message formatted for sending over rpc. */
  get proto() {
    // AuthorizationMessage.validateOutgoing(this);

    return { reset_after: this.resetAfter };
  }

  /**
   * Verifies that the message being sent is valid.
   *
   * @param {AuthorizationMessage} requestMeta
   */
  static validateOutgoing(authorization: AuthorizationMessage) {
    if (authorization.resetAfter === undefined) {
      throw Error("'resetAfter' must be a defined number");
    }
  }

  /**
   * Validates that the message being received is valid.
   *
   * @param {AuthorizationProto} message
   */
  static validateIncoming(message: AuthorizationProto) {
    if (message.reset_after === undefined) {
      throw Error("received invalid message. missing property 'reset_after'");
    }
  }

  /**
   * Translates the rpc message into an instance of this class.
   *
   * @param {AuthorizationProto} message
   * @return {AuthorizationMessage}
   */
  static fromProto(message: AuthorizationProto) {
    AuthorizationMessage.validateIncoming(message);

    return new AuthorizationMessage(message.reset_after);
  }
};
