import computeBackoffMs from '../Gateway/structures/backoffSchedule';

import type { CloseOrigin } from '../Gateway/structures/closeOrigin';

interface FailureCounterState {
  n: number;
  notBefore: number;
  reachedReady: boolean;
}

const state = new WeakMap<object, FailureCounterState>();

function stateFor(key: object): FailureCounterState {
  let s = state.get(key);
  if (!s) {
    s = { n: 0, notBefore: 0, reachedReady: false };
    state.set(key, s);
  }
  return s;
}

export function markReady(key: object): void {
  const s = stateFor(key);
  s.n = 0;
  s.reachedReady = true;
}

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

export function isEligible(key: object, now: number): boolean {
  return now >= stateFor(key).notBefore;
}
