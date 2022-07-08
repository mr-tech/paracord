"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A class for the RequestMetaMessage protobuf. */
class RequestMetaMessage {
    /** HTTP method of the request. */
    method;
    /** Discord endpoint url. (e.g. channels/123) */
    url;
    /**
     * Translates the rpc message into an instance of this class.
     * @param message Message received by server.
     */
    static fromProto(message) {
        RequestMetaMessage.validateIncoming(message);
        return new RequestMetaMessage(message.method, message.url);
    }
    /**
     * Verifies that the message being sent is valid.
     * @param message Message being sent to server.
     */
    static validateOutgoing(message) {
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
    static validateIncoming(message) {
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
    constructor(method, url) {
        this.method = method;
        this.url = url;
    }
    /** The properties of this message formatted for sending over rpc. */
    get proto() {
        RequestMetaMessage.validateOutgoing(this);
        return { method: this.method, url: this.url };
    }
}
exports.default = RequestMetaMessage;
