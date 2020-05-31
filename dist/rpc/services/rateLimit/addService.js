"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../../clients/Api/structures");
const constants_1 = require("../../../constants");
const structures_2 = require("../../structures");
const common_1 = require("../common");
const rateLimitProto = common_1.loadProto('rate_limit');
exports.default = (server) => {
    server.rateLimitCache.startSweepInterval();
    server.addService(rateLimitProto.LockService, {
        authorize: authorize.bind(server),
        update: update.bind(server),
    });
    server.emit('DEBUG', {
        source: constants_1.LOG_SOURCES.RPC,
        level: constants_1.LOG_LEVELS.INFO,
        message: 'The rate limit service has been to the server.',
    });
};
function authorize(call, callback) {
    try {
        const { method, url } = structures_2.RequestMetaMessage.fromProto(call.request);
        const request = new structures_1.BaseRequest(method, url);
        const resetAfter = this.rateLimitCache.authorizeRequestFromClient(request);
        if (resetAfter === 0) {
            const message = `Request approved. ${method} ${url}`;
            this.log('DEBUG', message);
        }
        else {
            const message = `Request denied. ${method} ${url}`;
            this.log('DEBUG', message);
        }
        const message = new structures_2.AuthorizationMessage(resetAfter).proto;
        callback(null, message);
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
        const { requestMeta, global, bucket, limit, remaining, resetAfter, } = structures_2.RateLimitStateMessage.fromProto(call.request);
        const { method, url } = requestMeta;
        const request = new structures_1.BaseRequest(method, url);
        if (bucket !== undefined) {
            const rateLimitHeaders = new structures_1.RateLimitHeaders(global, bucket, limit, remaining, resetAfter);
            this.rateLimitCache.update(request, rateLimitHeaders);
        }
        const message = `Rate limit cache updated: ${method} ${url} | Remaining: ${remaining}`;
        this.log('DEBUG', message);
        callback(null);
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
