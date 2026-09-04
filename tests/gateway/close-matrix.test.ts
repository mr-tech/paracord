import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type { GatewayCloseCode } from '../../src/constants';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition } from '../harness/waitFor';

/**
 * AC-1.2 (every (code, state) in `GATEWAY_CLOSE_CODES` union {one non-member} times the
 * socket-state domain S delivers the caller's code exactly once), AC-1.3 (`resumable`
 * after the close follows the close-code partition) and AC-1.11 (the process survives
 * every member). The partition classes are the plan's own "close-code partition"
 * table, transcribed here rather than read back out of the library.
 *
 * The non-member representative is a code outside both ranges a real close frame can
 * legally carry (1000-1014 minus 1004/1005/1006, and 3000-4999) — 4321 is inside the
 * second range and would not exercise the wire-illegal-code path at all.
 */

const G = GATEWAY_CLOSE_CODES;
const NON_MEMBER = 50000;

const P_KEEP: number[] = [
  G.CLEAN, G.GOING_AWAY, G.ABNORMAL, G.UNKNOWN_ERROR, G.UNKNOWN_OPCODE, G.DECODE_ERROR,
  G.NOT_AUTHENTICATED, G.RATE_LIMITED, G.CONNECT_TIMEOUT, G.RECONNECT,
  G.SESSION_INVALIDATED_RESUMABLE, G.HEARTBEAT_TIMEOUT, G.USER_TERMINATE_RESUMABLE,
];
const P_CLEAR: number[] = [
  G.ALREADY_AUTHENTICATED, G.SESSION_NO_LONGER_VALID, G.INVALID_SEQ, G.SESSION_TIMEOUT,
  G.INTERNAL_TERMINATE_RECONNECT, G.SESSION_INVALIDATED, G.USER_TERMINATE_RECONNECT,
  G.UNKNOWN, NON_MEMBER,
];
const P_TERMINAL: number[] = [
  G.AUTHENTICATION_FAILED, G.INVALID_SHARD, G.SHARDING_REQUIRED, G.INVALID_VERSION,
  G.INVALID_INTENT, G.DISALLOWED_INTENT, G.USER_TERMINATE,
];

const NAME: Record<number, string> = { [NON_MEMBER]: 'NON_MEMBER' };
for (const [k, v] of Object.entries(G)) NAME[v as number] = k;

function classOf(code: number): 'P-keep' | 'P-clear' | 'P-terminal' {
  if (P_KEEP.includes(code)) return 'P-keep';
  if (P_CLEAR.includes(code)) return 'P-clear';
  if (P_TERMINAL.includes(code)) return 'P-terminal';
  throw new Error(`unpartitioned code ${code}`);
}

const STATES = ['CONNECTING', 'OPEN', 'QUEUED'] as const;
type State = typeof STATES[number];

describe('AC-1.2/1.3/1.11: close-code x socket-state matrix', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;
  let uncaught = 0;
  let unhandled = 0;
  const onUncaught = () => { uncaught += 1; };
  const onUnhandled = () => { unhandled += 1; };

  afterEach(async () => {
    bot?.end();
    await server?.close();
    process.off('uncaughtException', onUncaught);
    process.off('unhandledRejection', onUnhandled);
  });

  async function cell(code: number, state: State): Promise<void> {
    process.on('uncaughtException', onUncaught);
    process.on('unhandledRejection', onUnhandled);

    server = await LoopbackGatewayServer.start({ mode: state === 'OPEN' ? 'accept' : 'hang' });
    bot = createTestBot(server.url);
    const events: GatewayCloseEvent[] = [];
    bot.on('GATEWAY_CLOSE', (e: GatewayCloseEvent) => { events.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;

    if (state === 'OPEN') {
      await waitForCondition(() => gw.resumable, 'READY handled', 5000);
    } else if (state === 'CONNECTING') {
      await waitForCondition(() => server.attempts.length >= 1, 'handshake in flight', 5000);
    } else {
      // QUEUED: reach READY, then drop the socket with the host answering 503, so the
      // gateway returns to the login queue with no socket rather than reconnecting.
      server.setMode('accept');
      await waitForCondition(() => gw.resumable, 'READY handled', 5000);
      server.setMode('reject503');
      const before = events.length;
      server.dropLiveSocket();
      await waitForCondition(() => events.length > before, 'natural close observed', 5000);
      await waitForCondition(() => server.attempts.length >= 2, 'requeued and retrying', 5000);
      await new Promise((r) => { setTimeout(r, 150); });
    }

    const resumableBefore = gw.resumable;
    const attemptsBefore = server.attempts.length;
    const eventsBefore = events.length;

    // The non-member representative (and any code a plain-JS caller might pass) is
    // outside `GatewayCloseCode`'s enum by design — the cast stands in for that caller.
    expect(() => gw.close(code as GatewayCloseCode)).not.toThrow();

    let delivered: GatewayCloseEvent | null = null;
    try {
      await waitForCondition(() => events.length > eventsBefore, 'GATEWAY_CLOSE delivered', 4000);
      delivered = events[eventsBefore]!;
    } catch {
      // recorded as no delivery below
    }

    await new Promise((r) => { setTimeout(r, 400); }); // settle: catch a second delivery

    const cls = classOf(code);

    // D1: exactly one delivery, carrying the caller's code.
    expect(events.length - eventsBefore).toBe(1);
    expect(delivered?.code).toBe(code);

    // D2: shouldReconnect false for P-terminal, true otherwise.
    expect(delivered?.shouldReconnect).toBe(cls !== 'P-terminal');

    // D3: resumable unchanged for P-keep/P-terminal, false for P-clear.
    const wantResumable = cls === 'P-clear' ? false : resumableBefore;
    expect(gw.resumable).toBe(wantResumable);

    // D4: the process survives (checked in afterEach via the counters below).
    expect(uncaught).toBe(0);
    expect(unhandled).toBe(0);

    // D5: a P-terminal close produces no further connect attempt.
    if (cls === 'P-terminal') {
      expect(server.attempts.length - attemptsBefore).toBe(0);
    }
  }

  for (const state of STATES) {
    describe(state, () => {
      for (const code of [...P_KEEP, ...P_CLEAR, ...P_TERMINAL]) {
        it(`${NAME[code]} (${code}) — ${classOf(code)}`, () => cell(code, state), 12000);
      }
    });
  }
});
