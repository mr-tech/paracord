import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable } from '../harness/waitFor';

describe('AC-1.1 (incident): the reconnect loop backs off instead of spinning', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('the close of a live, READY\'d session reconnects at the next tick, not milliseconds later', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);
    expect(gw.resumable).toBe(true);

    server.setMode('reject503');
    const closedAt = Date.now();
    server.dropLiveSocket();

    await server.waitForAttempt(2, 5000);
    const gapMs = server.attempts[1]! - closedAt;

    expect(gapMs).toBeGreaterThan(0);
    expect(gapMs).toBeLessThan(2000);
  });

  it('the loop climbs the schedule once failures happen before READY, rather than retrying at a fixed rate', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    server.setMode('reject503');
    server.dropLiveSocket();

    await server.waitForAttempt(5, 15000);
    const gaps = server.attempts.slice(2, 5).map((t, i) => t - server.attempts[i + 1]!);

    gaps.forEach((gap, i) => {
      const n = i + 1;
      const sSeconds = Math.min(60, 2 ** (n - 1));
      expect(gap).toBeGreaterThanOrEqual(0.8 * sSeconds * 1000);
      expect(gap).toBeLessThanOrEqual(1.2 * sSeconds * 1000 + 1000);
    });

    expect(gaps[2]).toBeGreaterThan(1.2 * 1 * 1000 + 1000);
  });
});
