import { describe, it, expect } from 'vitest';
import { setPendingOrigin, takePendingOrigin } from '../../src/clients/Gateway/structures/closeOrigin';

/**
 * WP-1 step 2 (F-26's failure counter reads origin). A cross-class handoff with no
 * new parameter on any exported method (AC-1.8: the api-report must not move) — a
 * call site tags the gateway key with an origin immediately before calling a public
 * `close()`-family method; the layer that actually resolves the close consumes it.
 */
describe('closeOrigin (set/consume, one-shot per key)', () => {
  it('returns undefined when nothing was set for the key', () => {
    expect(takePendingOrigin({})).toBeUndefined();
  });

  it('returns what was set, then clears it (single consumption)', () => {
    const key = {};
    setPendingOrigin(key, 'transport');
    expect(takePendingOrigin(key)).toBe('transport');
    expect(takePendingOrigin(key)).toBeUndefined();
  });

  it('keys are independent', () => {
    const a = {};
    const b = {};
    setPendingOrigin(a, 'discord');
    expect(takePendingOrigin(b)).toBeUndefined();
    expect(takePendingOrigin(a)).toBe('discord');
  });
});
