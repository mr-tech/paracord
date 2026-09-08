import { describe, it, expect } from 'vitest';
import {
  setPendingOrigin, takePendingOrigin, setPendingCloseIntent, takePendingCloseIntent,
} from '../../src/clients/Gateway/structures/closeOrigin';

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
