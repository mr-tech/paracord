/**
 * What decided to close a gateway connection, per the failure-counter table (F-26):
 * `consumer` = `Gateway.close()`/`Paracord.end()` called from outside the library;
 * `transport` = a socket error/1006, `CONNECT_TIMEOUT`, `HEARTBEAT_TIMEOUT`, the zlib
 * path; `discord` = a close frame from the server, or Discord's own RECONNECT/
 * INVALID_SESSION message.
 * @internal
 */
export type CloseOrigin = 'consumer' | 'transport' | 'discord';

const pendingOrigin = new WeakMap<object, CloseOrigin>();

/**
 * Tags `key` with `origin`, to be read exactly once by {@link takePendingOrigin}. Used
 * as a handoff between a call site that knows why a close is happening and the layer
 * that resolves it — a call site marks it immediately before invoking the next layer's
 * `close()`-family method, since none of those public methods can take a new parameter
 * without moving the api-report (AC-1.8).
 * @internal
 */
export function setPendingOrigin(key: object, origin: CloseOrigin): void {
  pendingOrigin.set(key, origin);
}

/**
 * Reads and clears whatever {@link setPendingOrigin} tagged `key` with, or `undefined`
 * if nothing was tagged.
 * @internal
 */
export function takePendingOrigin(key: object): CloseOrigin | undefined {
  const origin = pendingOrigin.get(key);
  pendingOrigin.delete(key);
  return origin;
}
