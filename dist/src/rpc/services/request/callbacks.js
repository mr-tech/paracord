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
const { RequestMessage, ResponseMessage } = require('../../structures');
module.exports = function (server) {
    function request(call, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { method, url, options } = RequestMessage.fromProto(call.request);
                const res = yield server.apiClient.request(method, url, options);
                callback(null, new ResponseMessage(res.status, res.statusText, res.data).proto);
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
    return { request };
};
