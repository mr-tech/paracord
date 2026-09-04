import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

// `process.getActiveResourcesInfo()` (Node >=17.3) is missing from this project's
// pinned `@types/node@20.4.8`; the runtime API exists on the Node this suite runs on.
function countActiveTimers(): number {
  const info = (process as unknown as { getActiveResourcesInfo(): string[] }).getActiveResourcesInfo();
  return info.filter((r) => r === 'Timeout' || r === 'Immediate').length;
}

/**
 * WP-1 step 3 (L1). `Paracord.end()` releases every timer or not-before state it or
 * its gateways own — the backoff schedule reads a `WeakMap` on the existing 1 s queue
 * interval rather than arming a timer per gateway, so once that interval itself is
 * cleared there is nothing left running to distinguish (time-seam rule).
 */
describe('AC-1.6: end() releases every timer', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('no further connect attempt occurs, and the process holds no Timeout/Immediate this session armed', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    // Put the gateway into a genuine backoff wait so there is something to release.
    server.setMode('reject503');
    server.dropLiveSocket();
    await server.waitForAttempt(2, 5000);

    const before = countActiveTimers();
    bot.end();
    const after = countActiveTimers();

    // At minimum the 1 Hz login-queue interval is released; nothing this test armed
    // remains (the backoff itself owns no timer — a WeakMap read on that interval).
    expect(after).toBeLessThan(before);

    const attemptsAtEnd = server.attempts.length;
    await new Promise((r) => { setTimeout(r, 3000); });
    expect(server.attempts.length).toBe(attemptsAtEnd);
  });

  it('a shard mid-startup (shardTimeout, unavailableGuildsInterval armed) has both cleared', async () => {
    server = await LoopbackGatewayServer.start({ mode: 'hang' });
    bot = createTestBot(server.url, {
      unavailableGuildTolerance: 0,
      unavailableGuildWait: 30,
      shardStartupTimeout: 30,
    });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    await waitForCondition(() => server.attempts.length >= 1, 'startup attempt made', 3000);

    const before = countActiveTimers();
    bot.end();
    const after = countActiveTimers();

    expect(after).toBeLessThan(before);
  });
});
