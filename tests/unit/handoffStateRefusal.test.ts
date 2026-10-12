import { describe, it, expect } from 'vitest';
import handoffStateRefusal from '../../src/clients/Gateway/structures/handoffStateRefusal';

const VALID = {
  sessionId: 'HARNESS_SESSION', sequence: 7, shard: [3, 5] as [number, number], resumeUrl: 'wss://gateway.example/path',
};
const SHARD: [number, number] = [3, 5];

type Member = [string, unknown, [number, number] | undefined];

function withField(field: string, value: unknown): Record<string, unknown> {
  return { ...VALID, [field]: value };
}

const REFUSED: Member[] = [
  ['not an object: null', null, SHARD],
  ['not an object: undefined', undefined, SHARD],
  ['not an object: a string', 'HARNESS_SESSION', SHARD],
  ['sessionId empty', withField('sessionId', ''), SHARD],
  ['sessionId a number', withField('sessionId', 5), SHARD],
  ['sessionId undefined', withField('sessionId', undefined), SHARD],
  ['sessionId null', withField('sessionId', null), SHARD],
  ['sequence -1', withField('sequence', -1), SHARD],
  ['sequence 1.5', withField('sequence', 1.5), SHARD],
  ['sequence NaN', withField('sequence', Number.NaN), SHARD],
  ['sequence Infinity', withField('sequence', Infinity), SHARD],
  ['sequence 2**53', withField('sequence', 2 ** 53), SHARD],
  ['sequence a numeric string', withField('sequence', '5'), SHARD],
  ['sequence null', withField('sequence', null), SHARD],
  ['sequence undefined', withField('sequence', undefined), SHARD],
  ['resumeUrl http', withField('resumeUrl', 'http://gateway.example/path'), SHARD],
  ['resumeUrl https', withField('resumeUrl', 'https://gateway.example/path'), SHARD],
  ['resumeUrl ftp', withField('resumeUrl', 'ftp://gateway.example/path'), SHARD],
  ['resumeUrl javascript', withField('resumeUrl', 'javascript:alert(1)'), SHARD],
  ['resumeUrl empty', withField('resumeUrl', ''), SHARD],
  ['resumeUrl not a url', withField('resumeUrl', 'not a url'), SHARD],
  ['resumeUrl a number', withField('resumeUrl', 5), SHARD],
  ['resumeUrl null', withField('resumeUrl', null), SHARD],
  ['shard count differs', withField('shard', [3, 6]), SHARD],
  ['shard id differs', withField('shard', [4, 5]), SHARD],
  ['shard undefined against a sharded gateway', withField('shard', undefined), SHARD],
  ['shard set against an unsharded gateway', withField('shard', [0, 1]), undefined],
  ['shard has the wrong length', withField('shard', [3]), SHARD],
  ['shard is not an array', withField('shard', '3,5'), SHARD],
];

const ACCEPTED: Member[] = [
  ['the base valid state', VALID, SHARD],
  ['sequence 0', withField('sequence', 0), SHARD],
  ['the largest safe integer', withField('sequence', Number.MAX_SAFE_INTEGER), SHARD],
  ['resumeUrl absent', (() => { const { resumeUrl, ...rest } = VALID; void resumeUrl; return rest; })(), SHARD],
  ['resumeUrl undefined', withField('resumeUrl', undefined), SHARD],
  ['resumeUrl wss', withField('resumeUrl', 'wss://gateway.example'), SHARD],
  ['resumeUrl ws', withField('resumeUrl', 'ws://127.0.0.1:1234/x'), SHARD],
  ['resumeUrl upper-case scheme WS', withField('resumeUrl', 'WS://127.0.0.1:1234/x'), SHARD],
  ['shard undefined against an unsharded gateway', withField('shard', undefined), undefined],
];

describe('AC-2.1: the import validation, member by member', () => {
  it.each(REFUSED)('refuses: %s', (_label, state, shard) => {
    const reason = handoffStateRefusal(state, shard);
    expect(typeof reason).toBe('string');
    expect((reason as string).length).toBeGreaterThan(0);
  });

  it.each(ACCEPTED)('accepts: %s', (_label, state, shard) => {
    expect(handoffStateRefusal(state, shard)).toBeUndefined();
  });

  it('a refusal reason never contains the values it refused', () => {
    const state = withField('sessionId', '');
    const secretish = { ...state, resumeUrl: 'http://SECRET_HOST_MARKER/SECRET_PATH_MARKER', sessionId: 'SECRET_SESSION_MARKER', sequence: -1 };
    const reason = handoffStateRefusal(secretish, SHARD) as string;
    expect(typeof reason).toBe('string');
    expect(['SECRET_HOST_MARKER', 'SECRET_PATH_MARKER', 'SECRET_SESSION_MARKER'].some((m) => reason.includes(m))).toBe(false);
  });
});
