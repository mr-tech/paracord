"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestMessage {
    method;
    url;
    data;
    headers;
    static fromProto(message) {
        RequestMessage.validateIncoming(message);
        const { method, url, ...options } = message;
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
    constructor(apiRequest) {
        this.method = apiRequest.method;
        this.url = apiRequest.url;
        this.data = apiRequest.data;
        this.headers = apiRequest.headers;
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
