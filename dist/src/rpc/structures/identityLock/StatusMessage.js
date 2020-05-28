"use strict";
module.exports = class StatusMessage {
    constructor(didSucceed, message, token) {
        this.success = didSucceed;
        this.message = message;
        this.token = token;
    }
    get proto() {
        StatusMessage.validateOutgoing(this);
        return {
            success: this.success,
            message: this.message,
            token: this.token,
        };
    }
    static validateOutgoing(status) {
        if (typeof status.success !== 'boolean') {
            throw Error("'success' must be type 'boolean'");
        }
        if (status.success === false && !status.message) {
            throw Error("a message must be provided when 'success' is false");
        }
    }
    static validateIncoming(message) {
        if (message.success === undefined) {
            throw Error("received invalid message. missing property 'success'");
        }
    }
    static fromProto(message) {
        this.validateIncoming(message);
        return new StatusMessage(message.success, message.message, message.token);
    }
};
