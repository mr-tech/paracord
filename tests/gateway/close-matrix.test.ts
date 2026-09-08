import { describe, it, expect } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type { GatewayCloseCode } from '../../src/constants';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition } from '../harness/waitFor';

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

describe.concurrent('AC-1.2/1.3/1.11: close-code x socket-state matrix', () => {
  async function cell(code: number, state: State): Promise<void> {
    let server: LoopbackGatewayServer | undefined;
    let bot: Paracord | undefined;
    let uncaught = 0;
    let unhandled = 0;
    const onUncaught = () => { uncaught += 1; };
    const onUnhandled = () => { unhandled += 1; };

    try {
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
        await waitForCondition(() => server!.attempts.length >= 1, 'handshake in flight', 5000);
      } else {
        server.setMode('accept');
        await waitForCondition(() => gw.resumable, 'READY handled', 5000);
        server.setMode('reject503');
        const before = events.length;
        server.dropLiveSocket();
        await waitForCondition(() => events.length > before, 'natural close observed', 5000);
        await waitForCondition(() => server!.attempts.length >= 2, 'requeued and retrying', 5000);
        await new Promise((r) => { setTimeout(r, 150); });
      }

      const resumableBefore = gw.resumable;
      const attemptsBefore = server.attempts.length;
      const eventsBefore = events.length;

      expect(() => gw.close(code as GatewayCloseCode)).not.toThrow();

      let delivered: GatewayCloseEvent | null = null;
      try {
        await waitForCondition(() => events.length > eventsBefore, 'GATEWAY_CLOSE delivered', 4000);
        delivered = events[eventsBefore]!;
      } catch {
      }

      await new Promise((r) => { setTimeout(r, 400); });

      const cls = classOf(code);

      expect(events.length - eventsBefore).toBe(1);
      expect(delivered?.code).toBe(code);

      expect(delivered?.shouldReconnect).toBe(cls !== 'P-terminal');

      const wantResumable = cls === 'P-clear' ? false : resumableBefore;
      expect(gw.resumable).toBe(wantResumable);

      expect(uncaught).toBe(0);
      expect(unhandled).toBe(0);

      if (cls === 'P-terminal') {
        expect(server.attempts.length - attemptsBefore).toBe(0);
      }
    } finally {
      bot?.end();
      await server?.close();
      process.off('uncaughtException', onUncaught);
      process.off('unhandledRejection', onUnhandled);
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
