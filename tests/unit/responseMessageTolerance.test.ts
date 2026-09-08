import { describe, it, expect } from 'vitest';
import ResponseMessage from '../../src/rpc/structures/request/ResponseMessage';

import type { ResponseProto } from '../../src/rpc/types';

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
    expect(data).toBe('"plain"');
  });

  it('names the permanent residue: a genuine string whose text is JSON of a non-string type mis-decodes on every pairing, including (new server, new client) where there is no double encoding at all', () => {
    const singlyEncodedGenuineString = JSON.stringify('42');
    const { data } = ResponseMessage.fromProto(proto(singlyEncodedGenuineString));
    expect(data).toBe(42);
  });
});
