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
Object.defineProperty(exports, "__esModule", { value: true });
class RequestQueue {
    constructor(rateLimitCache, apiClient) {
        this.rateLimitCache = rateLimitCache;
        this.processing = false;
        this.queue = [];
        this._length = 0;
        this.apiClient = apiClient;
    }
    get length() {
        return this._length;
    }
    startQueue(interval) {
        return setInterval(this.process.bind(this), interval);
    }
    push(...items) {
        items.forEach((i) => {
            this.queue[++this._length - 1] = i;
        });
    }
    spliceMany(indices) {
        if (indices.length === 0)
            return;
        this._length = 0;
        for (let idx = 0; idx < this.queue.length; ++idx) {
            if (this.queue[idx] === undefined || this.queue[idx] === null)
                break;
            if (!indices.includes(idx)) {
                this.queue[this._length] = this.queue[idx];
                ++this._length;
            }
        }
        for (let idx = this._length; idx < this.queue.length; ++idx) {
            if (this.queue[idx] === undefined || this.queue[idx] === null)
                break;
            this.queue[idx] = null;
        }
    }
    process() {
        if (this.length === 0 || this.processing)
            return;
        try {
            this.processing = true;
            const removedIndices = [];
            for (let queueIdx = 0; queueIdx < this.length; ++queueIdx) {
                if (this.processIteration(queueIdx)) {
                    removedIndices.push(queueIdx);
                }
            }
            this.spliceMany(removedIndices);
        }
        finally {
            this.processing = false;
        }
    }
    processIteration(queueIdx) {
        const request = this.queue[queueIdx];
        if (request === null) {
            return false;
        }
        if (request.running) {
            return false;
        }
        if (request.response !== undefined) {
            return true;
        }
        if (request.waitUntil !== undefined && request.waitUntil > new Date().getTime()) {
            return false;
        }
        this.sendRequest(request);
        return false;
    }
    sendRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { response } = yield this.apiClient.sendRequest(request, true);
            if (response !== undefined) {
                request.response = response;
            }
        });
    }
}
exports.default = RequestQueue;
