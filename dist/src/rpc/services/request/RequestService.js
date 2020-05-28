"use strict";
const { RequestMessage, ResponseMessage } = require('../../structures');
const { loadProtoDefinition, constructorDefaults } = require('../common');
const definition = loadProtoDefinition('request');
module.exports = class RequestService extends definition.RequestService {
    constructor(options) {
        const defaultArgs = constructorDefaults(options || {});
        super(...defaultArgs);
        this.target = defaultArgs[0];
    }
};
{
    const message = new RequestMessage(method, url, options).proto;
    return new Promise((resolve, reject) => {
        super.request(message, (err, res) => {
            if (err === null) {
                resolve(ResponseMessage.fromProto(res));
            }
            else {
                reject(err);
            }
        });
    });
}
;
