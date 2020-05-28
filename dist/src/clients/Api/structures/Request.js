"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const BaseRequest_1 = __importDefault(require("./BaseRequest"));
module.exports = class Request extends BaseRequest_1.default {
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
};
