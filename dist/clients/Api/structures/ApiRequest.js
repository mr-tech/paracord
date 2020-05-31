"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
class Request extends _1.BaseRequest {
    constructor(method, url, options) {
        super(method, url);
        this.data;
        this.headers = undefined;
        this.response = undefined;
        this.waitUntil = undefined;
        Object.assign(this, options);
    }
    get sendData() {
        return {
            method: this.method,
            url: this.url,
            data: this.data,
            headers: this.headers,
            validateStatus: null,
        };
    }
    assignIfStricterWait(waitUntil) {
        if (this.waitUntil === undefined || this.waitUntil < waitUntil) {
            this.waitUntil = waitUntil;
        }
    }
}
exports.default = Request;
