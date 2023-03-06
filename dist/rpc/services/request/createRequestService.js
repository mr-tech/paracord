"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const common_1 = require("../common");
const createRequestService = (options) => {
    const definition = (0, common_1.loadProtoDefinition)('request');
    /** Definition for the request service. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    class RequestService extends definition.RequestService {
        /** host:port the service is pointed at. */
        target;
        /** If unable to connect, whether or not the client is allowed to fallback to making the request locally */
        allowFallback;
        /**
       * Creates a request service.
       * @param options Options for this service.
       */
        constructor(opts) {
            const { host, port, channel, allowFallback, } = (0, common_1.mergeOptionsWithDefaults)(opts ?? {});
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
        /** Sends the information to make a request to Discord to the server. returning a promise with the response. */
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
    return new RequestService(options);
};
exports.default = createRequestService;
