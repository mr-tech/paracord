"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takePendingOrigin = exports.setPendingOrigin = void 0;
const pendingOrigin = new WeakMap();
/**
 * Tags `key` with `origin`, to be read exactly once by {@link takePendingOrigin}. Used
 * as a handoff between a call site that knows why a close is happening and the layer
 * that resolves it — a call site marks it immediately before invoking the next layer's
 * `close()`-family method, since none of those public methods can take a new parameter
 * without moving the api-report (AC-1.8).
 * @internal
 */
function setPendingOrigin(key, origin) {
    pendingOrigin.set(key, origin);
}
exports.setPendingOrigin = setPendingOrigin;
/**
 * Reads and clears whatever {@link setPendingOrigin} tagged `key` with, or `undefined`
 * if nothing was tagged.
 * @internal
 */
function takePendingOrigin(key) {
    const origin = pendingOrigin.get(key);
    pendingOrigin.delete(key);
    return origin;
}
exports.takePendingOrigin = takePendingOrigin;
