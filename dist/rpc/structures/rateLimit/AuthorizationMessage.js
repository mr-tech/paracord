"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuthorizationMessage {
    waitFor;
    global;
    static fromProto(message) {
        AuthorizationMessage.validateIncoming(message);
        return new AuthorizationMessage(message.wait_for, message.global);
    }
    static validateOutgoing(authorization) {
        if (authorization.waitFor === undefined) {
            throw Error("'waitFor' must be a defined number");
        }
    }
    static validateIncoming(message) {
        if (message.wait_for === undefined) {
            throw Error("received invalid message. missing property 'wait_for'");
        }
    }
    constructor(waitFor, global) {
        this.waitFor = waitFor;
        this.global = global;
    }
    get proto() {
        AuthorizationMessage.validateOutgoing(this);
        return { wait_for: this.waitFor, global: this.global };
    }
}
exports.default = AuthorizationMessage;
