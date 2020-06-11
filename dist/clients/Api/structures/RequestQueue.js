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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _processing, _queue, _length, _apiClient;
Object.defineProperty(exports, "__esModule", { value: true });
class RequestQueue {
    constructor(apiClient) {
        _processing.set(this, void 0);
        _queue.set(this, void 0);
        _length.set(this, void 0);
        _apiClient.set(this, void 0);
        __classPrivateFieldSet(this, _processing, false);
        __classPrivateFieldSet(this, _queue, []);
        __classPrivateFieldSet(this, _length, 0);
        __classPrivateFieldSet(this, _apiClient, apiClient);
    }
    get length() {
        return __classPrivateFieldGet(this, _length);
    }
    startQueue(interval) {
        return setInterval(this.process.bind(this), interval);
    }
    push(...items) {
        items.forEach((i) => {
            __classPrivateFieldGet(this, _queue)[__classPrivateFieldSet(this, _length, +__classPrivateFieldGet(this, _length) + 1) - 1] = i;
        });
    }
    spliceMany(indices) {
        if (indices.length === 0)
            return;
        __classPrivateFieldSet(this, _length, 0);
        for (let idx = 0; idx < __classPrivateFieldGet(this, _queue).length; ++idx) {
            if (__classPrivateFieldGet(this, _queue)[idx] === undefined || __classPrivateFieldGet(this, _queue)[idx] === null)
                break;
            if (!indices.includes(idx)) {
                __classPrivateFieldGet(this, _queue)[__classPrivateFieldGet(this, _length)] = __classPrivateFieldGet(this, _queue)[idx];
                __classPrivateFieldSet(this, _length, +__classPrivateFieldGet(this, _length) + 1);
            }
        }
        for (let idx = __classPrivateFieldGet(this, _length); idx < __classPrivateFieldGet(this, _queue).length; ++idx) {
            if (__classPrivateFieldGet(this, _queue)[idx] === undefined || __classPrivateFieldGet(this, _queue)[idx] === null)
                break;
            __classPrivateFieldGet(this, _queue)[idx] = null;
        }
    }
    process() {
        if (this.length === 0 || __classPrivateFieldGet(this, _processing))
            return;
        try {
            __classPrivateFieldSet(this, _processing, true);
            const removedIndices = [];
            for (let queueIdx = 0; queueIdx < this.length; ++queueIdx) {
                if (this.processIteration(queueIdx)) {
                    removedIndices.push(queueIdx);
                }
            }
            this.spliceMany(removedIndices);
        }
        finally {
            __classPrivateFieldSet(this, _processing, false);
        }
    }
    processIteration(queueIdx) {
        const request = __classPrivateFieldGet(this, _queue)[queueIdx];
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
            const { response } = yield __classPrivateFieldGet(this, _apiClient).sendRequest(request, true);
            if (response !== undefined) {
                request.response = response;
            }
        });
    }
}
exports.default = RequestQueue;
_processing = new WeakMap(), _queue = new WeakMap(), _length = new WeakMap(), _apiClient = new WeakMap();
