"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const definition = (0, common_1.loadProtoDefinition)('rate_limit');
/** Definition for the identity rate limit rpc service. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class RateLimitService extends definition.RateLimitService {
    /** host:port the service is pointed at. */
    target;
    /** If unable to connect, whether or not the client is allowed to fallback to making the request locally */
    allowFallback;
    /**
     * Creates an rate limit service.
     * @param options Options for this service.
     */
    constructor(options) {
        const { host, port, channel, allowFallback, } = (0, common_1.mergeOptionsWithDefaults)(options ?? {});
        const dest = `${host}:${port}`;
        super(dest, channel);
        this.target = dest;
        this.allowFallback = allowFallback || false;
    }
    /** Check for healthy connection. */
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
    /**
     * Receives authorization from rate limit handling server to make the request.
     * @param request The request being authorized.
     */
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
    /**
     * Sends rate limit headers to server so that it can update the cache.
     * @param request The request being authorized.
     */
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
