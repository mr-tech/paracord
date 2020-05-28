"use strict";
const RequestMetaMessage = require('./RequestMetaMessage');
module.exports = class RateLimitStateMessage {
    constructor(requestMeta, global, bucket, limit, remaining, resetAfter) {
        this.requestMeta = requestMeta;
        this.global = global || false;
        this.bucket = bucket;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAfter = resetAfter;
    }
    get proto() {
        RateLimitStateMessage.validateOutgoing(this);
        return {
            request_meta: this.requestMeta.proto,
            bucket: this.bucket,
            limit: this.limit,
            remaining: this.remaining,
            reset_after: this.resetAfter,
            global: this.global,
        };
    }
    static validateOutgoing(rateLimitState) {
        const { requestMeta, global, bucket, remaining, resetAfter, limit, } = rateLimitState;
        if (requestMeta === undefined
            || !(requestMeta instanceof RequestMetaMessage)) {
            throw Error("'requestMeta' must be a defined RequestMetaMessage");
        }
        if (global === undefined) {
            throw Error("'global' must be a defined boolean if bucket is defined");
        }
        if (bucket !== undefined) {
            if (remaining === undefined) {
                throw Error("'remaining' must be a defined number if bucket is defined");
            }
            if (resetAfter === undefined) {
                throw Error("'resetAfter' must be a defined number if bucket is defined");
            }
            if (limit === undefined) {
                throw Error("'limit' must be a defined number if bucket is defined");
            }
        }
    }
    static validateIncoming(message) {
        if (message.request_meta === undefined) {
            throw Error("received invalid message. missing property 'request_meta'");
        }
        if (message.global === undefined) {
            throw Error("received invalid message. missing property 'global'");
        }
        if (message.bucket !== undefined) {
            if (message.remaining === undefined) {
                throw Error("received invalid message. missing property 'remaining'");
            }
            if (message.reset_after === undefined) {
                throw Error("received invalid message. missing property 'reset_after'");
            }
            if (message.limit === undefined) {
                throw Error("received invalid message. missing property 'limit'");
            }
        }
    }
    static fromProto(message) {
        RateLimitStateMessage.validateIncoming(message);
        return new RateLimitStateMessage(RequestMetaMessage.fromProto(message.request_meta), message.global, message.bucket, message.limit, message.remaining, message.reset_after);
    }
};
