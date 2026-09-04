import { describe, it, expect } from 'vitest';
import {
  setPendingOrigin, takePendingOrigin, setPendingCloseIntent, takePendingCloseIntent,
} from '../../src/clients/Gateway/structures/closeOrigin';

/**
 * `Gateway.handleClose` → `Paracord` is the one hop with no way around a side channel:
 * `Gateway.handleClose` is private, `Paracord`'s listener is registered on the public
 * `GATEWAY_CLOSE` event whose own shape stays `{shouldReconnect, code, gateway}`, and
 * the two run in the same synchronous `emit()` call, so the write always precedes the
 * read with nothing able to intervene between them.
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

/**
 * `Paracord.timeoutShard` → `Gateway.close()` is the one producer that still cannot
 * reach `Session#close`/`Websocket#close` by a direct parameter — `Gateway.close()` is
 * `@public` and shared with every real consumer, so the one call this library makes on
 * its own behalf still needs to say so out of band. A distinct channel from
 * `setPendingOrigin`/`takePendingOrigin` above — same key shape (a `Gateway` instance),
 * unrelated storage — so a value written for one hop can never be read by the other.
 */
describe('closeOrigin (close-intent channel, independent of the origin channel above)', () => {
  it('returns undefined when nothing was set for the key', () => {
    expect(takePendingCloseIntent({})).toBeUndefined();
  });

  it('returns what was set, then clears it (single consumption)', () => {
    const key = {};
    setPendingCloseIntent(key, 'transport');
    expect(takePendingCloseIntent(key)).toBe('transport');
    expect(takePendingCloseIntent(key)).toBeUndefined();
  });

  it('does not share storage with the origin channel — same key, both directions', () => {
    const key = {};
    setPendingOrigin(key, 'discord');
    expect(takePendingCloseIntent(key)).toBeUndefined();
    expect(takePendingOrigin(key)).toBe('discord');

    setPendingCloseIntent(key, 'transport');
    expect(takePendingOrigin(key)).toBeUndefined();
    expect(takePendingCloseIntent(key)).toBe('transport');
  });
});
