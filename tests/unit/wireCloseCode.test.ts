import { describe, it, expect } from 'vitest';
import isValidWireCloseCode from '../../src/clients/Gateway/structures/wireCloseCode';

/**
 * Matches `ws`'s own `isValidStatusCode` (node_modules/ws/lib/validation.js) exactly,
 * restated rather than imported (AC-1.9) so a `close()` caller's code can be checked
 * before it ever reaches `ws`.
 */
describe('isValidWireCloseCode', () => {
  it('accepts 1000-1014 except 1004, 1005, 1006', () => {
    for (let code = 1000; code <= 1014; code += 1) {
      const want = code !== 1004 && code !== 1005 && code !== 1006;
      expect(isValidWireCloseCode(code)).toBe(want);
    }
  });

  it('rejects 1006 (ABNORMAL) specifically — RFC 6455 §7.4.1 forbids sending it', () => {
    expect(isValidWireCloseCode(1006)).toBe(false);
  });

  it('accepts 3000-4999', () => {
    expect(isValidWireCloseCode(3000)).toBe(true);
    expect(isValidWireCloseCode(4999)).toBe(true);
    expect(isValidWireCloseCode(4998)).toBe(true);
  });

  it('rejects codes outside both ranges, including ones a JS (non-TS-typed) caller could pass', () => {
    for (const code of [999, 1015, 2000, 2999, 5000, 65535]) {
      expect(isValidWireCloseCode(code)).toBe(false);
    }
  });
});
