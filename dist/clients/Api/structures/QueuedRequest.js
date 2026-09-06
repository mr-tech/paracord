"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class QueuedRequest {
    #request;
    #resolve;
    #reject;
    constructor(request, resolve, reject) {
        this.#request = request;
        this.#resolve = resolve;
        this.#reject = reject;
    }
    get request() {
        return this.#request;
    }
    resolve(response) {
        this.#resolve(response);
    }
    reject(reason) {
        this.#reject(reason);
    }
}
exports.default = QueuedRequest;
