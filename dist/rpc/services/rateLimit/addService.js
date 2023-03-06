"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clients_1 = require("../../../clients");
const constants_1 = require("../../../constants");
const structures_1 = require("../../structures");
const common_1 = require("../common");
/**
 * Create callback functions for the rate limit service.
 * @param server
 */
exports.default = (server) => {
    const rateLimitProto = (0, common_1.loadProto)('rate_limit');
    server.addService(rateLimitProto.RateLimitService, {
        hello: hello.bind(server),
        authorize: authorize.bind(server),
        update: update.bind(server),
    });
    server.emit('DEBUG', {
        source: constants_1.LOG_SOURCES.RPC,
        level: constants_1.LOG_LEVELS.INFO,
        message: 'The rate limit service has been to the server.',
    });
};
function hello(_, callback) {
    callback(null);
}
function authorize(call, callback) {
    try {
        const { method, url } = structures_1.RequestMetaMessage.fromProto(call.request);
        const [topLevelResource, topLevelID, bucketHashKey] = clients_1.Api.extractBucketHashKey(method, url);
        const bucketHash = this.rateLimitCache.getBucket(bucketHashKey);
        const request = new clients_1.BaseRequest(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey);
        const { waitFor, global } = this.rateLimitCache.authorizeRequestFromClient(request);
        if (waitFor === 0) {
            const message = `Request approved. ${method} ${url}`;
            this.log('DEBUG', message);
        }
        else {
            const message = `Request denied. ${method} ${url}`;
            this.log('DEBUG', message);
        }
        const message = new structures_1.AuthorizationMessage(waitFor, global ?? false).proto;
        callback(null, message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (err) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS.ERROR,
            message: err,
        });
        callback(err);
    }
}
function update(call, callback) {
    try {
        const { requestMeta: { method, url }, global, bucketHash, limit, remaining, resetAfter, retryAfter, } = structures_1.RateLimitStateMessage.fromProto(call.request);
        if (bucketHash !== undefined) {
            const rateLimitHeaders = new clients_1.RateLimitHeaders(global, bucketHash, limit, remaining, resetAfter, retryAfter);
            const [tlr, tlrID, bucketHashKey] = clients_1.Api.extractBucketHashKey(method, url);
            const rateLimitKey = clients_1.BaseRequest.formatRateLimitKey(tlr, tlrID, bucketHash);
            this.rateLimitCache.update(rateLimitKey, bucketHashKey, rateLimitHeaders);
        }
        const message = `Rate limit cache updated: ${method} ${url} | Remaining: ${remaining}`;
        this.log('DEBUG', message);
        callback(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (err) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS.ERROR,
            message: err.message,
        });
        callback(err);
    }
}
