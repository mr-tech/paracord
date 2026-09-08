import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

function countActiveTimers(): number {
  const info = (process as unknown as { getActiveResourcesInfo(): string[] }).getActiveResourcesInfo();
  return info.filter((r) => r === 'Timeout' || r === 'Immediate').length;
}

function settle(ms = 300): Promise<void> {
  return new Promise((r) => { setTimeout(r, ms); });
}

describe('AC-1.6: end() releases every timer', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });
  it('no further connect attempt occurs, and no timer armed since login() survives end()', async () => {
    await settle();
    const before = countActiveTimers();

    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    server.setMode('reject503');
    server.dropLiveSocket();
    await server.waitForAttempt(2, 5000);

    bot.end();
    await settle();
    const after = countActiveTimers();

    expect(after).toBe(before);

    const attemptsAtEnd = server.attempts.length;
    await new Promise((r) => { setTimeout(r, 3000); });
    expect(server.attempts.length).toBe(attemptsAtEnd);
  }, 20000);

  it('a shard mid-startup (shardTimeout, unavailableGuildsInterval armed) has both cleared', async () => {
    await settle();
    const before = countActiveTimers();

    server = await LoopbackGatewayServer.start({ mode: 'hang' });
    bot = createTestBot(server.url, {
      unavailableGuildTolerance: 0,
      unavailableGuildWait: 30,
      shardStartupTimeout: 30,
    });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    await waitForCondition(() => server.attempts.length >= 1, 'startup attempt made', 3000);

    bot.end();
    await settle();
    const after = countActiveTimers();

    expect(after).toBe(before);
  }, 20000);

  it('a single shard cycling through repeated rejected reconnects leaves nothing armed', async () => {
    await settle();
    const before = countActiveTimers();

    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url, {
      unavailableGuildTolerance: 50,
      unavailableGuildWait: 30,
      shardStartupTimeout: 120,
    });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    server.setMode('reject503');
    server.dropLiveSocket();
    await server.waitForAttempt(6, 30000);

    bot.end();
    await settle();
    const after = countActiveTimers();

    expect(after).toBe(before);
  }, 50000);

  it('a second shard queued behind one still cycling through backoff leaves nothing armed', async () => {
    await settle();
    const before = countActiveTimers();

    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url, {
      unavailableGuildTolerance: 50,
      unavailableGuildWait: 30,
      shardStartupTimeout: 120,
    });

    await bot.login({ identity: { intents: 1 }, shards: [0, 1], shardCount: 2 });
    await waitForCondition(() => server.attempts.length >= 2, 'both shards connected', 8000);

    //
    server.setMode('reject503');
    server.dropLiveSocket();
    await server.waitForAttempt(6, 40000);

    bot.end();
    await settle();
    const after = countActiveTimers();

    expect(after).toBe(before);
  }, 60000);
});
