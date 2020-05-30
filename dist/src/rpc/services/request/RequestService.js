"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const definition = common_1.loadProtoDefinition('request');
class RequestService extends definition.RequestService {
    constructor(options) {
        const { host, port, channel, protoOptions, allowFallback, } = common_1.mergeOptionsWithDefaults(options || {});
        const dest = `${host}:${port}`;
        super(dest, channel, protoOptions);
        this.target = dest;
        this.allowFallback = allowFallback || false;
    }
    request(apiRequest) {
        const message = new structures_1.RequestMessage(apiRequest).proto;
        return new Promise((resolve, reject) => {
            super.request(message, (err, res) => {
                if (err === null) {
                    reject(err);
                }
                else if (res === undefined) {
                    reject(Error('no message'));
                }
                else {
                    resolve(structures_1.ResponseMessage.fromProto(res));
                }
            });
        });
    }
}
exports.default = RequestService;
