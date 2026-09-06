import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable } from '../harness/waitFor';

/**
 * WP-1 step 2 (H2 + incident), socket-coarse form (b) of AC-1.1. Reproduces the same
 * 503-after-READY scenario the WP-0 smoke test (`// escaped:
 * agent-output/user-files/_TODO.txt`) proved was an unbounded tight loop at unfixed
 * HEAD — retired now that it is fixed, superseded by this regression test. The
 * arithmetic form (a) of the schedule itself is `tests/unit/backoffSchedule.test.ts`
 * and `tests/unit/failureCounter.test.ts`; this file is the coarse socket check that
 * the real close/reconnect path actually uses them.
 *
 * escaped: agent-output/user-files/_TODO.txt, owner report 2026-09-03
 *
 * WP-7 step 10 (D-52, AC-7.10): the two cells below, commented out at step 7 (D-50),
 * are restored — his own words, ordering the pole attacked first and the cut read on
 * both sides of it: "1, but attack the pole first, then profile before and after
 * restoring the cut to see if the cut changes anything." D-50's guard-not-verification
 * reading stands as record; these cells regain their place as the suite's own
 * instrument for AC-1.1 (b) rather than as a record of a prior verdict.
 */
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

    // Failure-counter table, "after READY/RESUMED" row: n stays 0, the next attempt is
    // the next queue tick — a bounded, ~1 s wait, never the 0 ms median A-1 measured.
    server.setMode('reject503');
    const closedAt = Date.now();
    server.dropLiveSocket();

    await server.waitForAttempt(2, 5000);
    const gapMs = server.attempts[1]! - closedAt;

    expect(gapMs).toBeGreaterThan(0);
    expect(gapMs).toBeLessThan(2000); // the tick floor, not a scaled wait
  });

  it('the loop climbs the schedule once failures happen before READY, rather than retrying at a fixed rate', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    server.setMode('reject503');
    server.dropLiveSocket();

    // attempts[0] is the initial (successful) connection; the close it takes is the
    // "after READY" row (immediate retry, attempts[1] — not schedule-governed, see the
    // case above). attempts[1] is the *first* attempt to fail before READY, so the
    // schedule governs from there: gap (1 -> 2) is d_1 (n=1), gap (2 -> 3) is d_2 (n=2),
    // gap (3 -> 4) is d_3 (n=3). AC-1.1's own bound, including the tick floor: gap_n in
    // [0.8*s_n, 1.2*s_n + 1000ms] with s_n = min(60, 2^(n-1)) seconds — checked against
    // each gap's own bound rather than compared pairwise, since adjacent n's quantized
    // ranges can overlap (e.g. d_1's ceiling+tick and d_2's floor).
    await server.waitForAttempt(5, 15000);
    const gaps = server.attempts.slice(2, 5).map((t, i) => t - server.attempts[i + 1]!);

    gaps.forEach((gap, i) => {
      const n = i + 1;
      const sSeconds = Math.min(60, 2 ** (n - 1));
      expect(gap).toBeGreaterThanOrEqual(0.8 * sSeconds * 1000);
      expect(gap).toBeLessThanOrEqual(1.2 * sSeconds * 1000 + 1000);
    });

    // The schedule is climbing, not flat: n=3's floor clears n=1's bound entirely.
    expect(gaps[2]).toBeGreaterThan(1.2 * 1 * 1000 + 1000);
  });
});
