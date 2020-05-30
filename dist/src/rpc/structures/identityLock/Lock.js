"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StatusMessage_1 = __importDefault(require("./StatusMessage"));
const Utils_1 = require("../../../Utils");
const constants_1 = require("../../../constants");
class Lock {
    constructor(emitter) {
        this.token;
        this.lockTimeout;
        this.emitter = emitter;
    }
    acquire(timeOut, token) {
        let success = false;
        let message;
        if (this.token === undefined) {
            token = Utils_1.createUnsafeUuid();
            this.lock(timeOut, token);
            success = true;
        }
        else if (this.token === token) {
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
        if (this.token === undefined) {
            success = true;
        }
        else if (token === undefined) {
            message = 'No token provided.';
        }
        else if (this.token === token) {
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
        if (this.lockTimeout === undefined) {
            message = `Lock acquired. Timeout: ${timeOut}ms. Token: ${token}`;
        }
        else {
            message = `Lock refreshed. Token: ${token}`;
        }
        this.emitter && this.emitter.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS.DEBUG,
            message,
        });
        this.lockTimeout && clearTimeout(this.lockTimeout);
        this.token = token;
        this.lockTimeout = setTimeout(() => {
            this.release(token);
            this.emitter && this.emitter.emit('DEBUG', {
                source: constants_1.LOG_SOURCES.RPC,
                level: constants_1.LOG_LEVELS.DEBUG,
                message: `Lock expired after ${timeOut}ms. Token: ${token}`,
            });
        }, timeOut);
    }
    unlock() {
        this.lockTimeout && clearTimeout(this.lockTimeout);
        this.lockTimeout = undefined;
        this.token = undefined;
    }
}
exports.default = Lock;
