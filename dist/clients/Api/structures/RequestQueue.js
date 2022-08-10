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
        setInterval(this.processQueue, 100);
    }
    get queue() {
        return this.#queue;
    }
    /**
     * Adds any number of requests to the queue.
     * @param items Request objects being queued.
     */
    push(...items) {
        for (const item of items) {
            for (let i = this.#queue.length; i >= 0; --i) {
                const queueItem = this.#queue[i];
                if (i === 0) {
                    this.#queue.push(item);
                }
                else if (queueItem && queueItem.request.createdAt < item.request.createdAt) {
                    this.#queue.splice(i + 1, 0, item);
                }
            }
        }
    }
    processQueue = () => {
        const remove = [];
        for (const item of this.#queue) {
            if (this.#apiClient.maxExceeded)
                break;
            if (this.processIteration(item)) {
                remove.push(item);
            }
        }
        if (remove.length)
            this.spliceMany(remove);
    };
    spliceMany(removedItems) {
        const old = this.#queue;
        this.#queue = old.filter((item) => !removedItems.includes(item));
    }
    /**
     * Handles an item on the queue.
     * @param queueIdx Index of the current place in the queue.
     * @param processedIndices The indices of requests to remove from th queue.
     */
    processIteration(queuedItem) {
        const { request } = queuedItem;
        if (request.waitUntil !== undefined && request.waitUntil > new Date().getTime()) {
            return false;
        }
        void this.sendRequest(queuedItem);
        return true;
    }
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
