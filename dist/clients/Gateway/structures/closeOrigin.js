"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takePendingOrigin = exports.setPendingOrigin = void 0;
const pendingOrigin = new WeakMap();
/**
 * Tags `key` with `origin`, to be read exactly once by {@link takePendingOrigin}. Used
 * as a handoff between a call site that knows why a close is happening and the layer
 * that resolves it — a call site marks it immediately before invoking the next layer's
 * `close()`-family method, since those are public signatures and cannot take a new
 * parameter without changing the package's published API surface.
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
