"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TokenMessage {
    constructor(value) {
        this.value = value;
    }
    static fromProto(message) {
        TokenMessage.validateIncoming(message);
        return new TokenMessage(message.value);
    }
    static validateOutgoing(message) {
        if (message.value === undefined) {
            throw Error("'value' must be a defined string");
        }
        if (typeof message.value !== 'string') {
            throw Error("'value' must be type 'string'");
        }
    }
    static validateIncoming(message) {
        if (message.value === undefined) {
            throw Error("received invalid message. missing property 'value'");
        }
    }
    get proto() {
        TokenMessage.validateOutgoing(this);
        return { value: this.value };
    }
}
exports.default = TokenMessage;
