import { describe, it, expect } from 'vitest';
import ResponseMessage from '../../src/rpc/structures/request/ResponseMessage';

import type { ResponseProto } from '../../src/rpc/types';

/**
 * Plan 001 WP-7 step 2 (AC-7.1, AC-7.2, qa WP7-F1/F3): the client's decode of a proxied
 * response. `fromProto` does one `JSON.parse` with a fallthrough to the raw string (the
 * pre-existing shape), then — new here — tolerates an old (pre-WP-7) server's double
 * JSON encoding: where the once-decoded value is itself a string that is further valid
 * JSON of a non-string type (object, array, null, number, boolean), the second decoding
 * is used instead. A genuine string body whose text happens to be valid JSON of a
 * non-string type (e.g. `"42"`, `"true"`, `"{}"`) is indistinguishable from a double
 * encoding on every pairing and is decoded as the non-string type — a named, permanent,
 * accepted residue (AC-7.1's tolerance residue), asserted here rather than left silent.
 *
 * The old server's wire shape is reproduced by formula, not by running archived code:
 * `apiOptions.requestOptions.transformResponse = (data) => data` (identity) leaves
 * `res.data` as Discord's raw response text, and the guard then does
 * `res.data ? JSON.stringify(res.data) : undefined` — so the wire `data` field is
 * `JSON.stringify(<raw Discord response text>)`, i.e. `JSON.stringify(JSON.stringify(value))`
 * for a JSON body. That formula is what A-2 and qa measured live at `3f20308`
 * (`wp7-shapes-ee277b5.json`); reproducing it here verifies the client's decode against
 * the exact bytes the old server is known to send, without spinning up two incompatible
 * module versions in one process.
 */
function proto(data?: string): ResponseProto {
  return { status_code: 200, status_text: 'OK', data };
}

function oldServerWire(value: unknown): string {
  return JSON.stringify(JSON.stringify(value));
}

describe('ResponseMessage.fromProto — new-server pairing (single encoding, AC-7.1)', () => {
  it.each([
    ['object', { id: '123' }],
    ['array', [1, 2, 3]],
    ['string', 'plain'],
    ['number', 42],
    ['boolean', true],
    ['null', null],
    ['empty string', ''],
    ['zero', 0],
    ['false', false],
  ])('decodes a singly-encoded %s to the original value', (_label, value) => {
    const wire = JSON.stringify(value);
    const { data } = ResponseMessage.fromProto(proto(wire));
    expect(data).toEqual(value);
  });

  it('decodes an absent body to undefined', () => {
    const { data } = ResponseMessage.fromProto(proto(undefined));
    expect(data).toBeUndefined();
  });
});

describe('ResponseMessage.fromProto — old-server pairing (double encoding, AC-7.2)', () => {
  it.each([
    ['object', { id: '123' }],
    ['array', [1, 2, 3]],
    ['null', null],
  ])('tolerates a doubly-encoded %s and recovers the original value', (_label, value) => {
    const { data } = ResponseMessage.fromProto(proto(oldServerWire(value)));
    expect(data).toEqual(value);
  });

  it('recovers a doubly-encoded number and boolean too — the tolerance only re-parses when the second decode is a non-string type (AC-7.2: "number and boolean recover under step 2\'s rule")', () => {
    expect(ResponseMessage.fromProto(proto(oldServerWire(42))).data).toBe(42);
    expect(ResponseMessage.fromProto(proto(oldServerWire(true))).data).toBe(true);
  });

  it('does NOT recover a genuine string — AC-7.2 groups {string} with the ambiguous residue and attributes recovery to number/boolean only, since a second parse yielding a further string would be indistinguishable from tolerating a plain string that starts and ends with quote characters', () => {
    const { data } = ResponseMessage.fromProto(proto(oldServerWire('plain')));
    expect(data).toBe('"plain"'); // the once-decoded intermediate, left alone — the named ambiguous residue
  });

  it('names the permanent residue: a genuine string whose text is JSON of a non-string type mis-decodes on every pairing, including (new server, new client) where there is no double encoding at all', () => {
    // Not a double encoding — Discord's actual body is the 2-character string "42",
    // singly encoded (as any current-server response is). The tolerance cannot tell
    // this from a double encoding and recovers the wrong type. Documented, not silent
    // (AC-7.1's "Tolerance residue", a permanent, accepted cost of the (old server, new
    // client) window's defence).
    const singlyEncodedGenuineString = JSON.stringify('42');
    const { data } = ResponseMessage.fromProto(proto(singlyEncodedGenuineString));
    expect(data).toBe(42); // wrong per local semantics (would be the string "42"), and accepted
  });
});
