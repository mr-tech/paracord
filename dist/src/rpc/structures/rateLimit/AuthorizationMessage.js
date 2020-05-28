"use strict";
module.exports = class AuthorizationMessage {
    constructor(resetAfter) {
        this.resetAfter = resetAfter;
    }
    get proto() {
        return { reset_after: this.resetAfter };
    }
    static validateOutgoing(authorization) {
        if (authorization.resetAfter === undefined) {
            throw Error("'resetAfter' must be a defined number");
        }
    }
    static validateIncoming(message) {
        if (message.reset_after === undefined) {
            throw Error("received invalid message. missing property 'reset_after'");
        }
    }
    static fromProto(message) {
        AuthorizationMessage.validateIncoming(message);
        return new AuthorizationMessage(message.reset_after);
    }
};
