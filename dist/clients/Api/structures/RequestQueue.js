"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A queue for rate limited requests waiting to be sent. */
class RequestQueue {
    /** The queue. */
    #queue;
    /** Api client through which to emit events. */
    #apiClient;
    /**
     * Creates a new requests queue for rate limits requests.
     * @param apiClient Api client through which to emit events.
     */
    constructor(apiClient) {
        this.#queue = [];
        this.#apiClient = apiClient;
        setInterval(this.processQueue, 1000);
    }
    /**
     * Adds any number of requests to the queue.
     * @param items Request objects being queued.
     */
    push(...items) {
        this.#queue.push(...items);
        this.#queue.sort(({ request: { createdAt: a } }, { request: { createdAt: b } }) => a - b);
    }
    processQueue = () => {
        const remove = [];
        for (const item of this.#queue) {
            if (this.#apiClient.maxExceeded)
                break;
            const allow = item.request.waitUntil === undefined || item.request.waitUntil < new Date().getTime();
            if (allow) {
                void this.sendRequest(item);
                remove.push(item);
            }
        }
        if (remove.length) {
            this.#queue = this.#queue.filter((item) => !remove.includes(item));
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
                this.push(queuedItem);
            }
        }
        catch (err) {
            queuedItem.reject(err);
        }
    }
}
exports.default = RequestQueue;
