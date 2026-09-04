import computeBackoffMs from '../Gateway/structures/backoffSchedule';

import type { CloseOrigin } from '../Gateway/structures/closeOrigin';

interface FailureCounterState {
  n: number;
  notBefore: number;
  /** Whether READY/RESUMED has fired since the last close was recorded for this key. */
  reachedReady: boolean;
}

let state = new WeakMap<object, FailureCounterState>();

function stateFor(key: object): FailureCounterState {
  let s = state.get(key);
  if (!s) {
    s = { n: 0, notBefore: 0, reachedReady: false };
    state.set(key, s);
  }
  return s;
}

/**
 * READY or RESUMED fired for `key` — the failure counter table's phase becomes
 * "after" for the next close this key sees.
 * @internal
 */
export function markReady(key: object): void {
  const s = stateFor(key);
  s.n = 0;
  s.reachedReady = true;
}

/**
 * Records a close for `key` per the failure-counter table (F-26): "after" phase
 * (READY/RESUMED reached since the last close) resets n to 0 and sets the next
 * not-before to `closedAt` regardless of origin; "before" phase leaves n (and the
 * existing not-before) for `consumer` origin, or increments n and sets
 * `notBefore = closedAt + computeBackoffMs(n)` for `transport`/`discord` origin.
 * @internal
 */
export function recordClose(key: object, origin: CloseOrigin, closedAt: number): void {
  const s = stateFor(key);

  if (s.reachedReady) {
    s.n = 0;
    s.notBefore = closedAt;
    s.reachedReady = false;
    return;
  }

  if (origin === 'consumer') {
    return;
  }

  s.n += 1;
  s.notBefore = closedAt + computeBackoffMs(s.n);
}

/** Whether `key`'s not-before has passed as of `now`. @internal */
export function isEligible(key: object, now: number): boolean {
  return now >= stateFor(key).notBefore;
}

/** Test-only: clears every key's state. @internal */
export function resetAll(): void {
  state = new WeakMap();
}
