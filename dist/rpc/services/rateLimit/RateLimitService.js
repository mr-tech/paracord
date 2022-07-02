"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const definition = (0, common_1.loadProtoDefinition)('rate_limit');
class RateLimitService extends definition.RateLimitService {
    target;
    allowFallback;
    constructor(options) {
        const { host, port, channel, allowFallback, } = (0, common_1.mergeOptionsWithDefaults)(options ?? {});
        const dest = `${host}:${port}`;
        super(dest, channel);
        this.target = dest;
        this.allowFallback = allowFallback || false;
    }
    hello() {
        return new Promise((resolve, reject) => {
            super.hello(undefined, (err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    authorize(request) {
        const { method, url } = request;
        const message = new structures_1.RequestMetaMessage(method, url).proto;
        return new Promise((resolve, reject) => {
            super.authorize(message, (err, res) => {
                if (err !== null) {
                    reject(err);
                }
                else if (res === undefined) {
                    reject(Error('no message'));
                }
                else {
                    resolve(structures_1.AuthorizationMessage.fromProto(res));
                }
            });
        });
    }
    update(request, global, bucketHash, limit, remaining, resetAfter, retryAfter) {
        const { method, url } = request;
        const requestMeta = new structures_1.RequestMetaMessage(method, url);
        const message = new structures_1.RateLimitStateMessage(requestMeta, global, bucketHash, limit, remaining, resetAfter, retryAfter).proto;
        return new Promise((resolve, reject) => {
            super.update(message, (err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.default = RateLimitService;
