import {
  describe, it, expect,
} from 'vitest';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition } from '../harness/waitFor';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type Gateway from '../../src/clients/Gateway/Gateway';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';

interface PickObservation {
  connected: boolean;
  resumable: boolean;
  startingIsSelf: boolean;
}

function observeLogin(bot: { startingGateway: Gateway | undefined }, gw: Gateway, sink: PickObservation[]): void {
  const real = gw.login.bind(gw);
  // eslint-disable-next-line no-param-reassign
  (gw as unknown as { login: () => unknown }).login = () => {
    sink.push({
      connected: gw.connected,
      resumable: gw.resumable,
      startingIsSelf: bot.startingGateway === gw,
    });
    return real();
  };
}

describe('a real Gateway resuming after a gateway-requested reconnect (4992)', () => {
  it('releases the shard-startup timer and is never closed with 4991', async () => {
    const startupTimeoutSeconds = 2;
    const server = await LoopbackGatewayServer.start({});
    const bot = createTestBot(server.url, { shardStartupTimeout: startupTimeoutSeconds });
    const closes: GatewayCloseEvent[] = [];
    bot.on('GATEWAY_CLOSE', (e: GatewayCloseEvent) => { closes.push(e); });

    try {
      await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
      const gw = bot.shards.get(0)!;
      const picks: PickObservation[] = [];
      observeLogin(bot, gw, picks);

      await waitForCondition(() => gw.resumable, 'shard 0 READY handled', 8000);
      await waitForCondition(() => bot.startingGateway === undefined, 'initial startup released (0 guilds)', 8000);

      const closesBefore = closes.length;
      const picksBefore = picks.length;
      const resumesBefore = server.receivedOps.filter((op) => op === 6).length;
      server.closeLiveSocket(GATEWAY_CLOSE_CODES.RECONNECT);
      await waitForCondition(() => closes.length > closesBefore, 'the 4992 close is delivered', 8000);
      expect(closes[closesBefore]!.code).toBe(GATEWAY_CLOSE_CODES.RECONNECT);
      expect(closes[closesBefore]!.shouldReconnect).toBe(true);

      await waitForCondition(
        () => picks.length > picksBefore,
        'the resumable gateway is re-picked from the login queue and re-logged in',
        8000,
      );

      const pick = picks[picks.length - 1]!;
      expect(pick.startingIsSelf).toBe(true);
      expect(pick.resumable).toBe(true);
      expect(pick.connected).toBe(false);

      await waitForCondition(
        () => server.receivedOps.filter((op) => op === 6).length > resumesBefore,
        'shard 0 sends RESUME (op 6) on the reconnect',
        8000,
      );
      const resumeSentAt = Date.now();

      await waitForCondition(
        () => bot.startingGateway === undefined,
        'starting-shard state released on RESUMED',
        startupTimeoutSeconds * 1000 + 4000,
      );
      const releasedAfterMs = Date.now() - resumeSentAt;

      await new Promise((r) => { setTimeout(r, startupTimeoutSeconds * 1000 + 1500); });

      const terminates = closes.filter((c) => c.code === GATEWAY_CLOSE_CODES.INTERNAL_TERMINATE_RECONNECT);

      expect(terminates).toHaveLength(0);
      expect(releasedAfterMs).toBeLessThan(startupTimeoutSeconds * 1000);
      expect(bot.startingGateway).toBeUndefined();
      expect(gw.resumable).toBe(true);
    } finally {
      bot.end();
      await server.close();
    }
  }, 30000);
});
