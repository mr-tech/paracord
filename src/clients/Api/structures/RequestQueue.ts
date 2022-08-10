import type Api from '../Api';
import type QueuedRequest from './QueuedRequest';

/** A queue for rate limited requests waiting to be sent. */
export default class RequestQueue {
  /** The queue. */
  #queue: QueuedRequest[];

  /** Api client through which to emit events. */
  #apiClient: Api;

  /**
   * Creates a new requests queue for rate limits requests.
   * @param apiClient Api client through which to emit events.
   */
  public constructor(apiClient: Api) {
    this.#queue = [];
    this.#apiClient = apiClient;

    setInterval(this.processQueue, 100);
  }

  public get queue() {
    return this.#queue;
  }

  /**
   * Adds any number of requests to the queue.
   * @param items Request objects being queued.
   */
  public push(...items: QueuedRequest[]): void {
    for (const item of items) {
      for (let i = this.#queue.length; i >= 0; --i) {
        const queueItem = this.#queue[i];
        if (i === 0) {
          this.#queue.push(item);
        } else if (queueItem && queueItem.request.createdAt < item.request.createdAt) {
          this.#queue.splice(i + 1, 0, item);
        }
      }
    }
  }

  private processQueue = (): void => {
    const remove: QueuedRequest[] = [];
    for (const item of this.#queue) {
      if (this.#apiClient.maxExceeded) break;

      if (this.processIteration(item)) {
        remove.push(item);
      }
    }
    if (remove.length) this.spliceMany(remove);
  };

  private spliceMany(removedItems: QueuedRequest[]): void {
    const old = this.#queue;
    this.#queue = old.filter((item) => !removedItems.includes(item));
  }

  /**
   * Handles an item on the queue.
   * @param queueIdx Index of the current place in the queue.
   * @param processedIndices The indices of requests to remove from th queue.
   */
  private processIteration(queuedItem: QueuedRequest): boolean {
    const { request } = queuedItem;
    if (request.waitUntil !== undefined && request.waitUntil > new Date().getTime()) {
      return false;
    }
    void this.sendRequest(queuedItem);
    return true;
  }

  private async sendRequest(queuedItem: QueuedRequest): Promise<void> {
    try {
      const response = await this.#apiClient.sendRequest(queuedItem.request, true);
      if (typeof response !== 'string') {
        queuedItem.resolve(response);
      } else {
        const message = 'Requeuing request.';
        this.#apiClient.log('DEBUG', 'REQUEST_REQUEUED', message, { request: queuedItem.request, reason: response });
        this.push(queuedItem);
      }
    } catch (err) {
      queuedItem.reject(err);
    }
  }
}
