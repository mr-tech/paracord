"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const DEFAULT_LOCK_DURATION = 6e3;
const definition = common_1.loadProtoDefinition('identify_lock');
class IdentifyLockService extends definition.LockService {
    constructor(options) {
        const { host, port, channel, protoOptions, allowFallback, } = common_1.mergeOptionsWithDefaults(options || {});
        const dest = `${host}:${port}`;
        super(dest, channel, protoOptions);
        this.target = dest;
        this.allowFallback = allowFallback;
        this.duration = options.duration || DEFAULT_LOCK_DURATION;
    }
    get token() {
        return this._token;
    }
    clearToken() {
        this._token = undefined;
    }
    acquire() {
        const message = new structures_1.LockRequestMessage(this.duration, this.token).proto;
        return new Promise((resolve, reject) => {
            super.acquire(message, (err, res) => {
                if (err === null) {
                    reject(err);
                }
                else if (res === undefined) {
                    reject(Error('no message'));
                }
                else {
                    const statusMessage = structures_1.StatusMessage.fromProto(res);
                    ({ token: this._token } = statusMessage);
                    resolve(statusMessage);
                }
            });
        });
    }
    release() {
        if (this.token === undefined)
            return new structures_1.StatusMessage(false, 'token undefined');
        const message = new structures_1.TokenMessage(this.token).proto;
        return new Promise((resolve, reject) => {
            super.release(message, (err, res) => {
                if (err === null) {
                    reject(err);
                }
                else if (res === undefined) {
                    reject(Error('no message'));
                }
                else {
                    resolve(structures_1.StatusMessage.fromProto(res));
                }
            });
        });
    }
}
exports.default = IdentifyLockService;
