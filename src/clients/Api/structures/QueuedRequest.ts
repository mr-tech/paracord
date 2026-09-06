import { ApiResponse } from '../types';

import ApiRequest from './ApiRequest';

export default class QueuedRequest {
  #request: ApiRequest;

  #resolve: (response: ApiResponse) => void;

  #reject: (reason?: unknown) => void;

  constructor(request: ApiRequest, resolve: (response: ApiResponse) => void, reject: (reason?: unknown) => void) {
    this.#request = request;
    this.#resolve = resolve;
    this.#reject = reject;
  }

  get request() {
    return this.#request;
  }

  resolve(response: ApiResponse) {
    this.#resolve(response);
  }

  reject(reason?: unknown) {
    this.#reject(reason);
  }
}
