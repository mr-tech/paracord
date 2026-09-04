"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takePendingCloseIntent = exports.setPendingCloseIntent = exports.takePendingOrigin = exports.setPendingOrigin = void 0;
const pendingOrigin = new WeakMap();
/**
 * Tags `key` with `origin`, to be read exactly once by {@link takePendingOrigin}. The
 * one hop this library still resolves out of band: `Gateway.handleClose` (private)
 * writes it immediately before emitting the public `GATEWAY_CLOSE` event, whose own
 * shape stays `{shouldReconnect, code, gateway}`, and `Paracord`'s listener — the only
 * reader — runs inside that same synchronous `emit()` call, so the write always
 * precedes the read with nothing able to intervene between them.
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
const pendingCloseIntent = new WeakMap();
/**
 * Tags `key` with the origin a subsequent call to `Gateway.close()` on that same
 * instance should carry, read exactly once by {@link takePendingCloseIntent}. Storage
 * distinct from {@link setPendingOrigin} above — the two hops this library resolves out
 * of band never share a map, so a value written for one can never be read by the other.
 * `Gateway.close()` is `@public` and shared with every real caller, so this is the one
 * remaining producer that cannot pass origin as a parameter directly: everywhere else in
 * the library, a call site that knows why it is closing calls `Session#close`/
 * `Websocket#close` with that origin as an argument.
 * @internal
 */
function setPendingCloseIntent(key, origin) {
    pendingCloseIntent.set(key, origin);
}
exports.setPendingCloseIntent = setPendingCloseIntent;
/**
 * Reads and clears whatever {@link setPendingCloseIntent} tagged `key` with, or
 * `undefined` if nothing was tagged. `Gateway.close()` reads this as its first action,
 * before any other branch (including its own early return for a session-less gateway),
 * so the read and the write can never be separated by a path that consumes neither.
 * @internal
 */
function takePendingCloseIntent(key) {
    const origin = pendingCloseIntent.get(key);
    pendingCloseIntent.delete(key);
    return origin;
}
exports.takePendingCloseIntent = takePendingCloseIntent;
