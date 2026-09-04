/**
 * What decided to close a gateway connection: `consumer` = `Gateway.close()`/
 * `Paracord.end()` called from outside the library; `transport` = a socket error/1006,
 * `CONNECT_TIMEOUT`, `HEARTBEAT_TIMEOUT`, the zlib path; `discord` = a close frame from
 * the server, or Discord's own RECONNECT/INVALID_SESSION message.
 * @internal
 */
export type CloseOrigin = 'consumer' | 'transport' | 'discord';

const pendingOrigin = new WeakMap<object, CloseOrigin>();

/**
 * Tags `key` with `origin`, to be read exactly once by {@link takePendingOrigin}. The
 * one hop this library still resolves out of band: `Gateway.handleClose` (private)
 * writes it immediately before emitting the public `GATEWAY_CLOSE` event, whose own
 * shape stays `{shouldReconnect, code, gateway}`, and `Paracord`'s listener — the only
 * reader — runs inside that same synchronous `emit()` call, so the write always
 * precedes the read with nothing able to intervene between them.
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

const pendingCloseIntent = new WeakMap<object, CloseOrigin>();

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
export function setPendingCloseIntent(key: object, origin: CloseOrigin): void {
  pendingCloseIntent.set(key, origin);
}

/**
 * Reads and clears whatever {@link setPendingCloseIntent} tagged `key` with, or
 * `undefined` if nothing was tagged. `Gateway.close()` reads this as its first action,
 * before any other branch (including its own early return for a session-less gateway),
 * so the read and the write can never be separated by a path that consumes neither.
 * @internal
 */
export function takePendingCloseIntent(key: object): CloseOrigin | undefined {
  const origin = pendingCloseIntent.get(key);
  pendingCloseIntent.delete(key);
  return origin;
}
