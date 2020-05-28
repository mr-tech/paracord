"use strict";
const { LockRequestMessage, StatusMessage, TokenMessage, } = require('../../structures');
const { loadProtoDefinition, constructorDefaults } = require('../common');
const definition = loadProtoDefinition('identify_lock');
module.exports = class IdentifyLockService extends definition.LockService {
    constructor(options) {
        const defaultArgs = constructorDefaults(options || {});
        super(...defaultArgs);
        this.target = defaultArgs[0];
        this.allowFallback;
        this.duration;
        this.token;
    }
    acquire() {
        const message = new LockRequestMessage(this.duration, this.token).proto;
        return new Promise((resolve, reject) => {
            super.acquire(message, (err, res) => {
                if (err === null) {
                    const statusMessage = StatusMessage.fromProto(res);
                    ({ token: this.token } = statusMessage);
                    resolve(statusMessage);
                }
                else {
                    reject(err);
                }
            });
        });
    }
    release() {
        const message = new TokenMessage(this.token).proto;
        return new Promise((resolve, reject) => {
            super.release(message, (err, res) => {
                if (err === null) {
                    resolve(StatusMessage.fromProto(res));
                }
                else {
                    reject(err);
                }
            });
        });
    }
};
