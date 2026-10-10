"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const clientEndedError_1 = __importDefault(require("./clientEndedError"));
/**
 * A queue for rate limited requests waiting to be sent.
 */
class RequestQueue {
    /** The queue. */
    #queue;
    /** Api client through which to emit events. */
    #apiClient;
    #processing = false;
    #ended = false;
    #processInterval;
    /**
     * Creates a new requests queue for rate limits requests.
     * @param apiClient Api client through which to emit events.
     */
    constructor(apiClient) {
        this.#queue = [];
        this.#apiClient = apiClient;
        this.#processInterval = setInterval(this.processQueue, 1000);
    }
    end() {
        clearInterval(this.#processInterval);
        this.#ended = true;
        this.#queue.splice(0).forEach((item) => item.reject((0, clientEndedError_1.default)()));
    }
    /**
     * Adds any number of requests to the queue.
     * @param items Request objects being queued.
     */
    push(...items) {
        if (this.#ended) {
            items.forEach((item) => item.reject((0, clientEndedError_1.default)()));
            return;
        }
        this.#queue.push(...items);
    }
    processQueue = () => {
        if (this.#processing)
            return;
        this.#processing = true;
        try {
            this.#queue.sort((a, b) => a.request.createdAt - b.request.createdAt);
            for (let i = 0; i < this.#queue.length; ++i) {
                if (this.#apiClient.maxExceeded)
                    break;
                const item = this.#queue[i];
                if (!item)
                    break; // this shouldn't happen, but just in case
                const allow = item.request.waitUntil === undefined || item.request.waitUntil < new Date().getTime();
                if (allow) {
                    this.#queue.splice(i--, 1);
                    void this.sendRequest(item);
                }
            }
        }
        finally {
            this.#processing = false;
        }
    };
    async sendRequest(queuedItem) {
        try {
            const response = await this.#apiClient.sendRequest(queuedItem.request, true);
            if (typeof response !== 'string') {
                queuedItem.resolve(response);
            }
            else {
                const message = 'Requeuing request.';
                this.#apiClient.log('DEBUG', 'REQUEST_REQUEUED', message, { request: queuedItem.request, reason: response });
                setImmediate(() => this.push(queuedItem)); // break out of the current stack in case sendRequest returns synchronously
            }
        }
        catch (err) {
            queuedItem.reject(err);
        }
    }
}
exports.default = RequestQueue;
