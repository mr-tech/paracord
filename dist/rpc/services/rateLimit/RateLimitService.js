"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const definition = common_1.loadProtoDefinition('rate_limit');
class RateLimitService extends definition.RateLimitService {
    constructor(options) {
        const { host, port, channel, protoOptions, allowFallback, } = common_1.mergeOptionsWithDefaults(options || {});
        const dest = `${host}:${port}`;
        super(dest, channel, protoOptions);
        this.target = dest;
        this.allowFallback = allowFallback || false;
    }
    authorize(request) {
        const { method, url } = request;
        const message = new structures_1.RequestMetaMessage(method, url).proto;
        return new Promise((resolve, reject) => {
            super.request(message, (err, res) => {
                if (err === null) {
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
    update(request, global, bucket, limit, remaining, resetAfter) {
        const { method, url } = request;
        const requestMeta = new structures_1.RequestMetaMessage(method, url);
        const message = new structures_1.RateLimitStateMessage(requestMeta, global, bucket, limit, remaining, resetAfter).proto;
        return new Promise((resolve, reject) => {
            super.request(message, (err) => {
                if (err === null) {
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
