"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A class for the AuthorizationMessage protobuf. */
class AuthorizationMessage {
    /** How long in ms the client should wait before attempting to authorize this request. */
    waitFor;
    /** When rate limited, if the rate limit is global. */
    global;
    /**
     * Translates the rpc message into an instance of this class.
     * @param message Message received by client.
     */
    static fromProto(message) {
        AuthorizationMessage.validateIncoming(message);
        return new AuthorizationMessage(message.wait_for, message.global);
    }
    /**
     * Verifies that the message being sent is valid.
     * @param message Message being sent to client.
     */
    static validateOutgoing(authorization) {
        if (authorization.waitFor === undefined) {
            throw Error("'waitFor' must be a defined number");
        }
    }
    /**
     * Validates that the message being received is valid.
     * @param message Message received by client.
     */
    static validateIncoming(message) {
        if (message.wait_for === undefined) {
            throw Error("received invalid message. missing property 'wait_for'");
        }
    }
    /**
     * Creates a new AuthorizationMessage sent from client to server.
     * @param waitFor How long in ms the client should wait before attempting to authorize this request.
     */
    constructor(waitFor, global) {
        this.waitFor = waitFor;
        this.global = global;
    }
    /** The properties of this message formatted for sending over rpc. */
    get proto() {
        AuthorizationMessage.validateOutgoing(this);
        return { wait_for: this.waitFor, global: this.global };
    }
}
exports.default = AuthorizationMessage;
