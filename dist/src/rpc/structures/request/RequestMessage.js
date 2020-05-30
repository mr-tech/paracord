"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
class RequestMessage {
    constructor(apiRequest) {
        this.method = apiRequest.method;
        this.url = apiRequest.url;
        this.data = apiRequest.data;
        this.headers = apiRequest.headers;
    }
    static fromProto(message) {
        RequestMessage.validateIncoming(message);
        const { method, url } = message, options = __rest(message, ["method", "url"]);
        let data;
        let headers;
        if (options.data !== undefined) {
            data = JSON.parse(options.data);
        }
        if (options.headers !== undefined) {
            headers = JSON.parse(options.headers);
        }
        return new RequestMessage({
            method, url, data, headers,
        });
    }
    static validateOutgoing(request) {
        if (typeof request.method !== 'string') {
            throw Error("'method' must be type 'string'");
        }
        if (typeof request.url !== 'string') {
            throw Error("'url' must be type 'string'");
        }
    }
    static validateIncoming(message) {
        if (message.method === undefined) {
            throw Error("received invalid message. missing property 'method'");
        }
        if (message.url === undefined) {
            throw Error("received invalid message. missing property 'url'");
        }
    }
    get proto() {
        const proto = {
            method: this.method,
            url: this.url,
        };
        if (this.data !== undefined) {
            proto.data = JSON.stringify(this.data);
        }
        if (this.headers !== undefined) {
            proto.headers = JSON.stringify(this.headers);
        }
        RequestMessage.validateOutgoing(proto);
        return proto;
    }
}
exports.default = RequestMessage;
