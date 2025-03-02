import type Api from '../Api';
import type QueuedRequest from './QueuedRequest';

/** A queue for rate limited requests waiting to be sent. */
export default class RequestQueue {
  /** The queue. */
  #queue: QueuedRequest[];

  /** Api client through which to emit events. */
  #apiClient: Api;

  #processing = false;

  #processInterval: NodeJS.Timeout;

  /**
   * Creates a new requests queue for rate limits requests.
   * @param apiClient Api client through which to emit events.
   */
  public constructor(apiClient: Api) {
    this.#queue = [];
    this.#apiClient = apiClient;

    this.#processInterval = setInterval(this.processQueue, 1000);
  }

  public end() {
    clearInterval(this.#processInterval);
  }

  /**
   * Adds any number of requests to the queue.
   * @param items Request objects being queued.
   */
  public push(...items: QueuedRequest[]): void {
    this.#queue.push(...items);
  }

  private processQueue = (): void => {
    if (this.#processing) return;

    this.#processing = true;
    try {
      this.#queue.sort((a, b) => a.request.createdAt - b.request.createdAt);

      for (let i = 0; i < this.#queue.length; ++i) {
        if (this.#apiClient.maxExceeded) break;

        const item = this.#queue[i];
        if (!item) break; // this shouldn't happen, but just in case

        const allow = item.request.waitUntil === undefined || item.request.waitUntil < new Date().getTime();
        if (allow) {
          this.#queue.splice(i--, 1);
          void this.sendRequest(item);
        }
      }
    } finally {
      this.#processing = false;
    }
  };

  private async sendRequest(queuedItem: QueuedRequest): Promise<void> {
    try {
      const response = await this.#apiClient.sendRequest(queuedItem.request, true);
      if (typeof response !== 'string') {
        queuedItem.resolve(response);
      } else {
        const message = 'Requeuing request.';
        this.#apiClient.log('DEBUG', 'REQUEST_REQUEUED', message, { request: queuedItem.request, reason: response });
        setImmediate(() => this.push(queuedItem)); // break out of the current stack in case sendRequest returns synchronously
      }
    } catch (err) {
      queuedItem.reject(err);
    }
  }
}
