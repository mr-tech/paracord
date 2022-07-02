"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RequestMetaMessage_1 = __importDefault(require("./RequestMetaMessage"));
class RateLimitStateMessage {
    requestMeta;
    global;
    bucketHash;
    limit;
    remaining;
    resetAfter;
    retryAfter;
    static fromProto(message) {
        RateLimitStateMessage.validateIncoming(message);
        return new RateLimitStateMessage(RequestMetaMessage_1.default.fromProto(message.request_meta), message.global, message.bucket_hash, message.limit, message.remaining, message.reset_after, message.retry_after);
    }
    static validateOutgoing(message) {
        const { requestMeta, global, bucketHash, remaining, resetAfter, limit, } = message;
        if (requestMeta === undefined
            || !(requestMeta instanceof RequestMetaMessage_1.default)) {
            throw Error("'requestMeta' must be a defined RequestMetaMessage");
        }
        if (global === undefined) {
            throw Error("'global' must be a defined boolean if bucket is defined");
        }
        if (bucketHash !== undefined) {
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
        if (message.bucket_hash !== undefined) {
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
    constructor(requestMeta, global, bucketHash, limit, remaining, resetAfter, retryAfter) {
        this.requestMeta = requestMeta;
        this.global = global || false;
        this.bucketHash = bucketHash;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAfter = resetAfter;
        this.retryAfter = retryAfter;
    }
    get proto() {
        RateLimitStateMessage.validateOutgoing(this);
        return {
            request_meta: this.requestMeta.proto,
            bucket_hash: this.bucketHash,
            limit: this.limit,
            remaining: this.remaining,
            reset_after: this.resetAfter,
            retry_after: this.retryAfter,
            global: this.global,
        };
    }
}
exports.default = RateLimitStateMessage;
