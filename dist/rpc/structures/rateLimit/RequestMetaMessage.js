"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestMetaMessage {
    constructor(method, url) {
        this.method = method;
        this.url = url;
    }
    static fromProto(message) {
        RequestMetaMessage.validateIncoming(message);
        return new RequestMetaMessage(message.method, message.url);
    }
    static validateOutgoing(message) {
        if (message.method === undefined) {
            throw Error("'method' must be a defined string");
        }
        if (message.url === undefined) {
            throw Error("'url' must be a defined string");
        }
    }
    static validateIncoming(message) {
        if (message.method === undefined) {
            throw Error("received invalid message. missing property 'method'");
        }
        if (message.url === undefined) {
            throw Error("received invalid message. missing property 'url'");
        }
    }
    get proto() {
        RequestMetaMessage.validateOutgoing(this);
        return { method: this.method, url: this.url };
    }
}
exports.default = RequestMetaMessage;
