"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestQueue {
    #processing;
    #queue;
    #length;
    #apiClient;
    constructor(apiClient) {
        this.#processing = false;
        this.#queue = [];
        this.#length = 0;
        this.#apiClient = apiClient;
    }
    get length() {
        return this.#length;
    }
    startQueue(interval) {
        return setInterval(this.process, interval);
    }
    push(...items) {
        items.forEach((i) => {
            this.#queue[++this.#length - 1] = i;
        });
    }
    spliceMany(indices) {
        if (indices.size === 0)
            return;
        this.#length = 0;
        for (let idx = 0; idx < this.#queue.length; ++idx) {
            if (this.#queue[idx] === undefined || this.#queue[idx] === null)
                break;
            if (!indices.has(idx)) {
                this.#queue[this.#length] = this.#queue[idx];
                ++this.#length;
            }
        }
        for (let idx = this.#length; idx < this.#queue.length; ++idx) {
            if (this.#queue[idx] === undefined || this.#queue[idx] === null)
                break;
            this.#queue[idx] = null;
        }
    }
    process = () => {
        if (this.length === 0 || this.#processing)
            return;
        try {
            this.#processing = true;
            const removedIndices = [];
            for (let queueIdx = 0; queueIdx < this.length; ++queueIdx) {
                if (this.processIteration(queueIdx)) {
                    removedIndices.push(queueIdx);
                }
            }
            this.spliceMany(new Set(removedIndices));
        }
        finally {
            this.#processing = false;
        }
    };
    processIteration(queueIdx) {
        const request = this.#queue[queueIdx];
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
    async sendRequest(request) {
        const { response } = await this.#apiClient.sendRequest(request, true);
        if (response && response.status !== 429) {
            request.response = response;
        }
    }
}
exports.default = RequestQueue;
