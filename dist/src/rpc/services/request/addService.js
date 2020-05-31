"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = __importDefault(require("../../../clients/Api/Api"));
const constants_1 = require("../../../constants");
const structures_1 = require("../../structures");
const common_1 = require("../common");
const requestProto = common_1.loadProto('request');
exports.default = (server, token, apiOptions = {}) => {
    apiOptions.requestOptions = apiOptions.requestOptions || {};
    apiOptions.requestOptions.transformResponse = (data) => data;
    server.apiClient = new Api_1.default(token, apiOptions);
    server.apiClient.startQueue();
    server.addService(requestProto.LockService, {
        request: request.bind(server),
    });
    server.emit('DEBUG', {
        source: constants_1.LOG_SOURCES.RPC,
        level: constants_1.LOG_LEVELS.INFO,
        message: 'The request service has been added to the server.',
    });
};
function request(call, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.apiClient === undefined) {
            callback("lock doesn't exist");
            return;
        }
        try {
            const { method, url, data, headers, } = structures_1.RequestMessage.fromProto(call.request);
            const res = yield this.apiClient.request(method, url, { data, headers });
            callback(null, new structures_1.ResponseMessage(res.status, res.statusText, res.data ? JSON.stringify(res.data) : undefined).proto);
        }
        catch (err) {
            if (err.response) {
                callback(err);
            }
            else {
                callback(err);
            }
        }
    });
}
