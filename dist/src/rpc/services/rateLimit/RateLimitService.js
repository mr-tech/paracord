"use strict";
const { RequestMetaMessage, AuthorizationMessage, RateLimitStateMessage, } = require('../../structures');
const { loadProtoDefinition, constructorDefaults } = require('../common');
const definition = loadProtoDefinition('rate_limit');
module.exports = class RateLimitService extends definition.RateLimitService {
    constructor(options) {
        const defaultArgs = constructorDefaults(options || {});
        super(...defaultArgs);
        this.target = defaultArgs[0];
    }
    authorize(request) {
        const { method, url } = request;
        const message = new RequestMetaMessage(method, url).proto;
        return new Promise((resolve, reject) => {
            super.authorize(message, (err, res) => {
                if (err === null) {
                    resolve(AuthorizationMessage.fromProto(res));
                }
                else {
                    reject(err);
                }
            });
        });
    }
    update(request, global, bucket, limit, remaining, resetAfter) {
        const { method, url } = request;
        const requestMeta = new RequestMetaMessage(method, url);
        const message = new RateLimitStateMessage(requestMeta, global, bucket, limit, remaining, resetAfter).proto;
        return new Promise((resolve, reject) => {
            super.update(message, (err) => {
                if (err === null) {
                    resolve();
                }
                else {
                    reject(err);
                }
            });
        });
    }
};
