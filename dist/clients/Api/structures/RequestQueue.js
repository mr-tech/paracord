"use strict";
/*
  This structure doesn't have to be as complex as it is and was partly a fun experiment in doing some manual array allocation.
  While in some cases, having a fixed-size array is beneficial by removing the overhead of constantly allocation/freeing memory
  for every single item, there's no reason to believe that there would be any tangible benefits in maintaining such an array here.
*/
Object.defineProperty(exports, "__esModule", { value: true });
/*
    TODO(lando): should prevent new requests from cutting in line.
    A possible solution could be to iterate over the queue and check for a match rateLimitKey.
    This solution may be preferred over tracking state of the rate limit key, it's simpler.
 */
// TODO(lando): Do some logging on this in prod to make sure it doesn't memory leak.
const constants_1 = require("../../../constants");
/** A queue for rate limited requests waiting to be sent. */
class RequestQueue {
    /** Whether or not the `process()` method is already executing. */
    #processing;
    /** The queue. */
    #queue;
    /** The internal value of the length of the queue. */
    #length;
    /** Api client through which to emit events. */
    #apiClient;
    /**
     * Creates a new requests queue for rate limits requests.
     * @param apiClient Api client through which to emit events.
     */
    constructor(apiClient) {
        this.#processing = false;
        this.#queue = [];
        this.#length = 0;
        this.#apiClient = apiClient;
    }
    /** The length of the queue. */
    get length() {
        return this.#length;
    }
    get allocated() {
        return this.#queue.length;
    }
    startQueue(interval) {
        setInterval(this.reallocate, constants_1.HOUR_IN_MILLISECONDS);
        setInterval(this.processQueue, interval);
    }
    reallocate() {
        if (!this.#processing) {
            const oldQueue = this.#queue;
            this.#queue = [];
            for (const i of oldQueue) {
                if (i)
                    this.#queue.push(i);
            }
        }
    }
    /**
     * Adds any number of requests to the queue.
     * @param items Request objects being queued.
     */
    push(...items) {
        for (const item of items) {
            for (let i = this.#length; i >= 0; --i) {
                const queueItem = this.#queue[i];
                if (i === 0) {
                    this.#queue.push(item);
                }
                else if (queueItem && queueItem.createdAt < item.createdAt) {
                    this.#queue.splice(i + 1, 0, item);
                }
            }
            ++this.#length;
        }
    }
    /**
     * Removes requests from the queue.
     * @param indices Indices of the requests to be removed.
     */
    spliceMany(indices) {
        if (indices.size === 0)
            return;
        this.#length = 0;
        // Re-assign values to array indexes, shifting up all remaining requests when an index should be skipped.
        for (let idx = 0; idx < this.#queue.length; ++idx) {
            // undefined = past end of array; null = past end of requests in array (rest are null)
            if (this.#queue[idx] === undefined || this.#queue[idx] === null)
                break;
            if (!indices.has(idx)) {
                this.#queue[this.#length] = this.#queue[idx];
                ++this.#length;
            }
        }
        // Assigns `null` to the remaining indices.
        for (let idx = this.#length; idx < this.#queue.length; ++idx) {
            if (this.#queue[idx] === undefined || this.#queue[idx] === null)
                break;
            this.#queue[idx] = null;
        }
    }
    /** Iterates over the queue, sending any requests that are no longer rate limited. */
    processQueue = () => {
        if (this.length === 0 || this.#processing)
            return;
        try {
            this.#processing = true;
            /* Following lines are the quintessential premature micro-optimization. */
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
    /**
     * Handles an item on the queue.
     * @param queueIdx Index of the current place in the queue.
     * @param processedIndices The indices of requests to remove from th queue.
     */
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
