"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StatusMessage {
    constructor(didSucceed, message, token) {
        this.success = didSucceed;
        this.message = message;
        this.token = token;
    }
    static fromProto(message) {
        this.validateIncoming(message);
        return new StatusMessage(message.success, message.message, message.token);
    }
    static validateOutgoing(message) {
        if (typeof message.success !== 'boolean') {
            throw Error("'success' must be type 'boolean'");
        }
        if (message.success === false && !message.message) {
            throw Error("a message must be provided when 'success' is false");
        }
    }
    static validateIncoming(message) {
        if (message.success === undefined) {
            throw Error("received invalid message. missing property 'success'");
        }
    }
    get proto() {
        StatusMessage.validateOutgoing(this);
        return {
            success: this.success,
            message: this.message,
            token: this.token,
        };
    }
}
exports.default = StatusMessage;
