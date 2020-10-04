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

import { ApiRequest } from '.';
import Api from '../Api';

/** A queue for rate limited requests waiting to be sent. */
export default class RequestQueue {
  /** Whether or not the `process()` method is already executing. */
  #processing: boolean;

  /** The queue. */
  #queue: Array<ApiRequest | null>;

  /** The internal value of the length of the queue. */
  #length: number;

  /** Api client through which to emit events. */
  #apiClient: Api;

  /**
   * Creates a new requests queue for rate limits requests.
   *
   * @param apiClient Api client through which to emit events.
   */
  public constructor(apiClient: Api) {
    this.#processing = false;
    this.#queue = [];
    this.#length = 0;
    this.#apiClient = apiClient;
  }

  /** The length of the queue. */
  private get length(): number {
    return this.#length;
  }

  public startQueue(interval: number): NodeJS.Timer {
    return setInterval(this.process.bind(this), interval);
  }

  /**
   * Adds any number of requests to the queue.
   * @param items Request objects being queued.
   */
  public push(...items: ApiRequest[]): void {
    items.forEach((i) => {
      this.#queue[++this.#length - 1] = i;
    });
  }

  /**
   * Removes requests from the queue.
   * @param indices Indices of the requests to be removed.
   */
  private spliceMany(indices: Array<number | null>): void {
    if (indices.length === 0) return;

    this.#length = 0;

    // Re-assign values to array indexes, shifting up all remaining requests when an index should be skipped.
    for (let idx = 0; idx < this.#queue.length; ++idx) {
      // undefined = past end of array; null = past end of requests in array (rest are null)
      if (this.#queue[idx] === undefined || this.#queue[idx] === null) break;
      if (!indices.includes(idx)) {
        this.#queue[this.#length] = this.#queue[idx];
        ++this.#length;
      }
    }

    // Assigns `null` to the remaining indices.
    for (let idx = this.#length; idx < this.#queue.length; ++idx) {
      if (this.#queue[idx] === undefined || this.#queue[idx] === null) break;

      this.#queue[idx] = null;
    }
  }

  /** Iterates over the queue, sending any requests that are no longer rate limited. */
  private process(): void {
    if (this.length === 0 || this.#processing) return;

    try {
      this.#processing = true;

      /* Following lines are the quintessential premature micro-optimization. */
      const removedIndices: Array<number | null> = [];

      for (let queueIdx = 0; queueIdx < this.length; ++queueIdx) {
        if (this.processIteration(queueIdx)) {
          removedIndices.push(queueIdx);
        }
      }

      this.spliceMany(removedIndices);
    } finally {
      this.#processing = false;
    }
  }

  /**
   * Handles an item on the queue.
   * @param queueIdx Index of the current place in the queue.
   * @param processedIndices The indices of requests to remove from th queue.
   */
  private processIteration(queueIdx: number): boolean {
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

  private async sendRequest(request: ApiRequest): Promise<void> {
    const { response } = await this.#apiClient.sendRequest(request, true);
    if (response && response.status !== 429) {
      request.response = response;
    }
  }
}
