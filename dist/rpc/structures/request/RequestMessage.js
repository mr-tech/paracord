"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A class for the RequestMessage protobuf */
class RequestMessage {
    /** HTTP method of the request. */
    method;
    /** Discord REST endpoint target of the request. (e.g. channels/123) */
    url;
    /** Data to send in the body of the request. */
    data;
    /** Headers to send with the request. */
    headers;
    /**
     * Validate incoming message and translate it into common state.
     * @param message Message received by server.
     */
    static fromProto(message) {
        RequestMessage.validateIncoming(message);
        const { method, url, ...options } = message;
        let data;
        let headers;
        if (options.data !== undefined) {
            data = JSON.parse(options.data);
        }
        if (options.headers !== undefined) {
            headers = JSON.parse(options.headers);
        }
        return new RequestMessage({
            method, url, data, headers,
        });
    }
    /**
     * Verifies that the message being sent is valid.
     * @param message Message being sent to server.
     */
    static validateOutgoing(request) {
        if (typeof request.method !== 'string') {
            throw Error("'method' must be type 'string'");
        }
        if (typeof request.url !== 'string') {
            throw Error("'url' must be type 'string'");
        }
        // TODO: implement time out
        //   if (
        //     request.time_out !== undefined
        //       && typeof request.time_out !== 'number'
        //   ) {
        //     throw Error("'time_out' must be type 'number'");
        //   }
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
    /** Create a new RequestMessage sent from client to server. */
    constructor(apiRequest) {
        this.method = apiRequest.method;
        this.url = apiRequest.url;
        this.data = apiRequest.data;
        this.headers = apiRequest.headers;
    }
    /** The properties of this message formatted for sending over rpc. */
    get proto() {
        const proto = {
            method: this.method,
            url: this.url,
        };
        if (this.data !== undefined) {
            proto.data = JSON.stringify(this.data);
        }
        if (this.headers !== undefined) {
            proto.headers = JSON.stringify(this.headers);
        }
        RequestMessage.validateOutgoing(proto);
        return proto;
    }
}
exports.default = RequestMessage;
