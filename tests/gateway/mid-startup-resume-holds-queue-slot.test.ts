import {
  describe, it, expect,
} from 'vitest';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition } from '../harness/waitFor';
import type Gateway from '../../src/clients/Gateway/Gateway';

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

describe('with a real second shard queued, a mid-startup RESUME', () => {
  it('holds the connect slot until the resumed shard\'s own guilds arrive', async () => {
    const startupTimeoutSeconds = 8;
    const server = await LoopbackGatewayServer.start({ readyGuilds: 3 });
    const bot = createTestBot(server.url, { shardStartupTimeout: startupTimeoutSeconds });
    const startupCompletes: unknown[] = [];
    const debugMessages: string[] = [];
    bot.on('SHARD_STARTUP_COMPLETE', (e: unknown) => { startupCompletes.push(e); });
    bot.on('DEBUG', (d: unknown) => { debugMessages.push(String((d as { message: unknown }).message)); });

    try {
      await bot.login({ identity: { intents: 1 }, shards: [0, 1], shardCount: 2 });
      const gw0 = bot.shards.get(0)!;
      const gw1 = bot.shards.get(1)!;
      const picks0: PickObservation[] = [];
      const picks1: PickObservation[] = [];
      observeLogin(bot, gw0, picks0);
      observeLogin(bot, gw1, picks1);

      await waitForCondition(() => gw0.resumable, 'shard 0 READY handled', 10000);
      expect(bot.startingGateway).toBe(gw0);
      expect(debugMessages.some((m) => m.includes('Waiting on 3 guilds'))).toBe(true);
      expect(startupCompletes).toHaveLength(0);

      const attemptsAfterFirstConnect = server.attempts.length;
      const resumesBefore = server.receivedOps.filter((op) => op === 6).length;

      server.dropLiveSocket();
      await waitForCondition(
        () => server.receivedOps.filter((op) => op === 6).length > resumesBefore,
        'shard 0 sends RESUME (op 6) after the drop',
        10000,
      );

      await new Promise((r) => { setTimeout(r, 1800); });

      const held = {
        startingIsShard0: bot.startingGateway === gw0,
        shardStartupCompletes: startupCompletes.length,
        shard1LoginCalls: picks1.length,
        attemptsSinceFirstConnect: server.attempts.length - attemptsAfterFirstConnect,
      };

      expect(held.startingIsShard0).toBe(true);
      expect(held.shardStartupCompletes).toBe(0);
      expect(held.shard1LoginCalls).toBe(0);
      expect(held.attemptsSinceFirstConnect).toBe(1);
      expect(gw1.connected).toBe(false);

      for (let i = 0; i < 3; i += 1) {
        server.sendDispatch('GUILD_CREATE', { id: String(i + 1) });
      }

      await waitForCondition(() => startupCompletes.length === 1, 'shard 0 completes once its own guilds arrive', 10000);
      expect(bot.startingGateway).toBeUndefined();

      await waitForCondition(() => picks1.length === 1, 'shard 1 logs in only after shard 0 released the slot', 10000);
      expect(picks0.length).toBeGreaterThan(0);
    } finally {
      bot.end();
      await server.close();
    }
  }, 40000);
});
