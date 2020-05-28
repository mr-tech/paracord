"use strict";
const StatusMessage = require('./StatusMessage');
const Utils = require('../../../utils');
const { LOG_SOURCES, LOG_LEVELS } = require('../../../constants');
module.exports = class Lock {
    constructor(emitter) {
        this.token;
        this.lockTimeout;
        this.emitter = emitter;
    }
    acquire(timeOut, token) {
        let success = false;
        let message;
        if (this.token === undefined) {
            token = Utils.uuid();
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
        return new StatusMessage(success, message, token);
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
        return new StatusMessage(success, message);
    }
    lock(timeOut, token) {
        let message;
        if (this.lockTimeout === undefined) {
            message = `Lock acquired. Timeout: ${timeOut}ms. Token: ${token}`;
        }
        else {
            message = `Lock refreshed. Token: ${token}`;
        }
        this.emitter.emit('DEBUG', {
            source: LOG_SOURCES.RPC,
            level: LOG_LEVELS.DEBUG,
            message,
        });
        clearTimeout(this.lockTimeout);
        this.token = token;
        this.lockTimeout = setTimeout(() => {
            this.release(token);
            this.emitter.emit('DEBUG', {
                source: LOG_SOURCES.RPC,
                level: LOG_LEVELS.DEBUG,
                message: `Lock expired after ${timeOut}ms. Token: ${token}`,
            });
        }, timeOut);
    }
    unlock() {
        clearTimeout(this.lockTimeout);
        this.lockTimeout = undefined;
        this.token = undefined;
    }
};
