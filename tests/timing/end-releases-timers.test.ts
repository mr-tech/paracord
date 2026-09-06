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

// One runner-owned `Timeout` expires early in a vitest worker's life (measured,
// `verification/001/timer-census-probe.result.json`), so a baseline read at the very
// start of a worker's first test can be one high; settling first makes the two reads —
// before `login()`, after `end()` — comparable regardless of run order.
function settle(ms = 300): Promise<void> {
  return new Promise((r) => { setTimeout(r, ms); });
}

/**
 * AC-1.6. The instrument is the criterion's own words: the `Timeout`/`Immediate` count
 * read before `login()` and after `end()` is equal. Both reads sit outside the span
 * they bound — the baseline is taken before any gateway exists, the final read after
 * `end()` has had time to settle — so a timer armed during startup and never released is
 * inside the measured window rather than invisible to it.
 *
 * WP-7 step 10 (D-52, AC-7.10): all four cells below, commented out at step 7 (D-50),
 * are restored — see `tests/gateway/reconnect-backoff.test.ts`'s header for the
 * owner's own words ordering the restoration and the D-52 register row; not restated
 * per file.
 */
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

    // Put the gateway into a genuine backoff wait so there is something to release.
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

  // A gateway re-armed for a fresh startup attempt overwrites `#shardTimeout` without
  // releasing the handle it held from the previous attempt — reachable on a single
  // gateway with enough retries, independent of shard count: each rejected reconnect
  // still re-enters `processGatewayQueue`'s login branch and arms a fresh timer.
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

    // The harness holds one live socket at a time; dropping it abruptly closes
    // whichever shard is currently connected with an abnormal, resumable, reconnecting
    // close, and every retry after this point is refused at the handshake — each retry
    // arms this shard's startup timers afresh before the next queue tick re-evaluates
    // whether it is still eligible to keep them.
    //
    // Bound for the wait below, derived rather than guessed (AC-1.10's own cell states
    // the same form): reaching attempt 6 needs 4 more attempts against the dropped
    // shard beyond the 2 already observed, each gated by that attempt's own backoff —
    // sum of 1.2*s_n for n = 1..4 (1.2*(1+2+4+8) = 18s) plus one 1 Hz queue tick per
    // attempt (4s) = 22s worst case. `waitForAttempt`'s own budget is set well above
    // that rather than at it — this bound is for a *lone* gateway's own schedule, and
    // two gateways sharing one 1 Hz queue can, at the worst interleaving, cost more
    // than their sum of individual queue-tick waits.
    server.setMode('reject503');
    server.dropLiveSocket();
    await server.waitForAttempt(6, 40000);

    bot.end();
    await settle();
    const after = countActiveTimers();

    expect(after).toBe(before);
  }, 60000);
});
