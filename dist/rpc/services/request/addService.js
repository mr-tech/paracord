"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable callback-return */
const clients_1 = require("../../../clients");
const constants_1 = require("../../../constants");
const structures_1 = require("../../structures");
const common_1 = require("../common");
/**
 * Create callback functions for the request service.
 * @param server
 */
exports.default = (server, token, apiOptions = {}) => {
    apiOptions.requestOptions = apiOptions.requestOptions ?? {};
    apiOptions.requestOptions.transformResponse = (data) => data;
    server.apiClient = new clients_1.Api(token, apiOptions);
    const requestProto = (0, common_1.loadProto)('request');
    server.addService(requestProto.RequestService, {
        hello: hello.bind(server),
        request: request.bind(server),
    });
    server.emit('DEBUG', {
        source: constants_1.LOG_SOURCES.RPC,
        level: constants_1.LOG_LEVELS.INFO,
        message: 'The request service has been added to the server.',
    });
};
function hello(_, callback) {
    callback(null);
}
function request(call, callback) {
    if (this.apiClient === undefined) {
        callback('api client not initialize');
        return;
    }
    try {
        const { method, url, data, headers, } = structures_1.RequestMessage.fromProto(call.request);
        this.apiClient.request(method, url, { data, headers })
            .then((res) => {
            callback(null, new structures_1.ResponseMessage(res.status, res.statusText, res.data ? JSON.stringify(res.data) : undefined).proto);
        })
            .catch((err) => callback(err));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (err) {
        if (err.response) {
            callback(err);
        }
        else {
            callback(err);
        }
    }
}
