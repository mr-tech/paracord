"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _token, _lockTimeout, _emitter;
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const utils_1 = require("../../../utils");
const StatusMessage_1 = __importDefault(require("./StatusMessage"));
class Lock {
    constructor(emitter) {
        _token.set(this, void 0);
        _lockTimeout.set(this, void 0);
        _emitter.set(this, void 0);
        __classPrivateFieldGet(this, _token);
        __classPrivateFieldGet(this, _lockTimeout);
        __classPrivateFieldSet(this, _emitter, emitter);
    }
    acquire(timeOut, token) {
        let success = false;
        let message;
        if (__classPrivateFieldGet(this, _token) === undefined) {
            token = utils_1.createUnsafeUuid();
            this.lock(timeOut, token);
            success = true;
        }
        else if (__classPrivateFieldGet(this, _token) === token) {
            this.lock(timeOut, token);
            success = true;
        }
        else {
            message = 'Already locked by a different client.';
            token = undefined;
        }
        return new StatusMessage_1.default(success, message, token);
    }
    release(token) {
        let success = false;
        let message;
        if (__classPrivateFieldGet(this, _token) === undefined) {
            success = true;
        }
        else if (token === undefined) {
            message = 'No token provided.';
        }
        else if (__classPrivateFieldGet(this, _token) === token) {
            this.unlock();
            success = true;
        }
        else {
            message = 'Locked by a different client.';
        }
        return new StatusMessage_1.default(success, message);
    }
    lock(timeOut, token) {
        let message;
        if (__classPrivateFieldGet(this, _lockTimeout) === undefined) {
            message = `Lock acquired. Timeout: ${timeOut}ms. Token: ${token}`;
        }
        else {
            message = `Lock refreshed. Token: ${token}`;
        }
        __classPrivateFieldGet(this, _emitter) && __classPrivateFieldGet(this, _emitter).emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS.DEBUG,
            message,
        });
        __classPrivateFieldGet(this, _lockTimeout) && clearTimeout(__classPrivateFieldGet(this, _lockTimeout));
        __classPrivateFieldSet(this, _token, token);
        __classPrivateFieldSet(this, _lockTimeout, setTimeout(() => {
            this.release(token);
            __classPrivateFieldGet(this, _emitter) && __classPrivateFieldGet(this, _emitter).emit('DEBUG', {
                source: constants_1.LOG_SOURCES.RPC,
                level: constants_1.LOG_LEVELS.DEBUG,
                message: `Lock expired after ${timeOut}ms. Token: ${token}`,
            });
        }, timeOut));
    }
    unlock() {
        __classPrivateFieldGet(this, _lockTimeout) && clearTimeout(__classPrivateFieldGet(this, _lockTimeout));
        __classPrivateFieldSet(this, _lockTimeout, undefined);
        __classPrivateFieldSet(this, _token, undefined);
    }
}
exports.default = Lock;
_token = new WeakMap(), _lockTimeout = new WeakMap(), _emitter = new WeakMap();
