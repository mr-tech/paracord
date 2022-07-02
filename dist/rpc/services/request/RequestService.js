"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const definition = (0, common_1.loadProtoDefinition)('request');
class RequestService extends definition.RequestService {
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
    request(apiRequest) {
        const message = new structures_1.RequestMessage(apiRequest).proto;
        return new Promise((resolve, reject) => {
            super.request(message, (err, res) => {
                if (err !== null) {
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
