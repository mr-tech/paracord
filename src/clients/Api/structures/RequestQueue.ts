/*
  This structure doesn't have to be as complex as it is and was partly a fun experiment in doing some manual array allocation.
  While in some cases, having a fixed-size array is beneficial by removing the overhead of constantly allocation/freeing memory
  for every single item, there's no reason to believe that there would be any tangible benefits in maintaining such an array here.
*/

/*
    TODO(lando): should prevent new requests from cutting in line.
    A possible solution could be to iterate over the queue and check for a match rateLimitKey.
    This solution may be preferred over tracking state of the rate limit key, it's simpler.
 */

// TODO(lando): Do some logging on this in prod to make sure it doesn't memory leak.

import Api from '../Api';
import { RateLimitCache, ApiRequest } from '.';

/** A queue for rate limited requests waiting to be sent. */
export default class RequestQueue {
  /** The cache used to check the state of rate limits. */
  private rateLimitCache: RateLimitCache;

  /** Whether or not the `process()` method is already executing. */
  private processing: boolean;

  /** The queue. */
  private queue: Array<ApiRequest | null>;

  /** The internal value of the length of the queue. */
  private _length: number;

  /** Api client through which to emit events. */
  private apiClient: Api;

  /**
   * Creates a new requests queue for rate limits requests.
   *
   * @param {RateLimitCache} rateLimitCache The cache used to check the state of rate limits.
   * @param {TypeApi} apiClient Api client through which to emit events.
   */
  public constructor(rateLimitCache: RateLimitCache, apiClient: Api) {
    this.rateLimitCache = rateLimitCache;
    this.processing = false;
    this.queue = [];
    this._length = 0;
    this.apiClient = apiClient;
  }

  /** @type {number} The length of the queue. */
  private get length() {
    return this._length;
  }

  /**
   * Adds any number of requests to the queue.
   * @param {...Request} items Request objects being queued.
   */
  public push(...items: Array<ApiRequest>): void {
    items.forEach((i) => {
      this.queue[++this._length - 1] = i;
    });
  }

  /**
   * Removes requests from the queue.
   *
   * @param {number[]} indices Indices of the requests to be removed.
   */
  private spliceMany(indices: Array<number | null>) {
    if (indices.length === 0) return;

    this._length = 0;

    // Re-assign values to array indexes, shifting up all remaining requests when an index should be skipped.
    for (let idx = 0; idx < this.queue.length; ++idx) {
      // undefined = past end of array; null = past end of requests in array (rest are null)
      if (this.queue[idx] === undefined || this.queue[idx] === null) break;
      if (!indices.includes(idx)) {
        this.queue[this._length] = this.queue[idx];
        ++this._length;
      }
    }

    // Assigns `null` to the remaining indices.
    for (let idx = this._length; idx < this.queue.length; ++idx) {
      if (this.queue[idx] === undefined || this.queue[idx] === null) break;

      this.queue[idx] = null;
    }
  }

  /** Iterates over the queue, sending any requests that are no longer rate limited. */
  public async process(): Promise<void> {
    if (this.length === 0 || this.processing) return;

    try {
      this.processing = true;

      /* Following lines are the quintessential premature micro-optimization. */
      const removedIndices: Array<number | null> = [];

      for (let queueIdx = 0; queueIdx < this.length; ++queueIdx) {
        await this.processIteration(queueIdx, removedIndices);
      }

      this.spliceMany(removedIndices);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Handles an item on the queue.
   * @param queueIdx Index of the current place in the queue.
   * @param processedIndices The indices of requests to remove from th queue.
   */
  private async processIteration(queueIdx: number, removedIndices: Array<number | null>) {
    const request = this.queue[queueIdx];

    if (request === null) {
      return;
    }
    if (request.waitUntil !== undefined && request.waitUntil > new Date().getTime()) {
      return;
    }

    try {
      // if (request.timeout <= new Date().getTime()) {
      //   removedIndices.push(queueIdx);
      // } else
      if (await this.apiClient.returnOkToMakeRequest(request)) {
        request.response = this.apiClient.sendQueuedRequest(request);

        removedIndices.push(queueIdx);
      }
    } catch (err) {
      if (err.code === 14) {
        removedIndices.push(queueIdx);
      }
    }
  }
}
