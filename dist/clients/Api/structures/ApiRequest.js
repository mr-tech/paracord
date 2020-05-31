"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRequest_1 = __importDefault(require("./BaseRequest"));
class Request extends BaseRequest_1.default {
    constructor(method, url, options = {}) {
        super(method, url);
        const { data, headers, allowQueue, } = options;
        this.data = data;
        this.headers = headers;
        this.allowQueue = allowQueue !== null && allowQueue !== void 0 ? allowQueue : true;
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
