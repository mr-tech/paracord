"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuthorizationMessage {
    constructor(resetAfter, global) {
        this.resetAfter = resetAfter;
        this.global = global;
    }
    static fromProto(message) {
        AuthorizationMessage.validateIncoming(message);
        return new AuthorizationMessage(message.reset_after, message.global);
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
    get proto() {
        AuthorizationMessage.validateOutgoing(this);
        return { reset_after: this.resetAfter, global: this.global };
    }
}
exports.default = AuthorizationMessage;
