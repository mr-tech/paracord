"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LockRequestMessage {
    constructor(timeOut, token) {
        this.timeOut = timeOut;
        this.token = token;
    }
    static fromProto(message) {
        LockRequestMessage.validateIncoming(message);
        return new LockRequestMessage(message.time_out, message.token);
    }
    static validateOutgoing(lockRequest) {
        if (lockRequest.timeOut === undefined) {
            throw Error("'timeOut' must be a defined number");
        }
        if (typeof lockRequest.timeOut !== 'number') {
            throw Error("'timeOut' must be type 'number'");
        }
        if (lockRequest.token !== undefined && typeof lockRequest.token !== 'string') {
            throw Error("'token' must be type 'string'");
        }
    }
    static validateIncoming(message) {
        if (message.time_out === undefined) {
            throw Error("received invalid message. missing property 'time_out'");
        }
    }
    get proto() {
        LockRequestMessage.validateOutgoing(this);
        return { time_out: this.timeOut, token: this.token };
    }
}
exports.default = LockRequestMessage;
