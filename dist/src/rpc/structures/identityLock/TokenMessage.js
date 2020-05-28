"use strict";
module.exports = class TokenMessage {
    constructor(value) {
        this.value = value;
    }
    get proto() {
        TokenMessage.validateOutgoing(this);
        return { value: this.value };
    }
    static validateOutgoing(token) {
        if (token.value === undefined) {
            throw Error("'value' must be a defined string");
        }
        if (typeof token.value !== 'string') {
            throw Error("'value' must be type 'string'");
        }
    }
    static validateIncoming(message) {
        if (message.value === undefined) {
            throw Error("received invalid message. missing property 'value'");
        }
    }
    static fromProto(message) {
        TokenMessage.validateIncoming(message);
        return new TokenMessage(message.value);
    }
};
