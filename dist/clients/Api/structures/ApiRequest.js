"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRequest_1 = __importDefault(require("./BaseRequest"));
class Request extends BaseRequest_1.default {
    data;
    headers;
    createForm;
    response;
    waitUntil;
    returnOnRateLimit;
    returnOnGlobalRateLimit;
    retriesLeft;
    running;
    constructor(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey, options = {}) {
        super(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey);
        const { data, headers, createForm, returnOnRateLimit, returnOnGlobalRateLimit, maxRateLimitRetry, } = options;
        this.createForm = createForm;
        this.data = data;
        this.headers = headers;
        this.returnOnRateLimit = returnOnRateLimit ?? false;
        this.returnOnGlobalRateLimit = returnOnGlobalRateLimit ?? false;
        this.retriesLeft = maxRateLimitRetry;
        this.running = false;
    }
    get config() {
        let data;
        let headers;
        if (this.createForm) {
            ({ data, headers } = this.createForm());
        }
        else {
            ({ data, headers } = this);
        }
        return {
            method: this.method,
            url: this.url,
            data,
            headers,
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
