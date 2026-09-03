import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';

/**
 * WP-0 smoke test — AC-0.4(a). Reproduces the 503 reconnect loop (A-1.1) against
 * unfixed HEAD: once a gateway has completed READY, a host that starts answering
 * every upgrade with 503 is retried in an unbounded tight loop with no backoff.
 *
 * escaped: agent-output/user-files/_TODO.txt, owner report 2026-09-03
 */
describe('AC-0.4(a): 503-after-READY reconnect loop', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('retries in an unbounded tight loop once resumable, with no backoff', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    const ready = new Promise<void>((resolve) => { server.once('ready', () => resolve()); });
    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    await ready;
    // The server's 'ready' fires on send; give the client a moment to receive and process it.
    await new Promise((r) => { setTimeout(r, 300); });

    const gw = bot.shards.get(0)!;
    // Assumption 4: the loop requires resumable === true — assert this before the failure window opens.
    expect(gw.resumable).toBe(true);

    // Flip the host to 503 and abnormally drop the live session, mirroring A-1's harness.
    server.setMode('reject503');
    server.dropLiveSocket();

    // Warm-up, then measure the steady-state attempt rate over a short window.
    await new Promise((r) => { setTimeout(r, 1500); });
    const windowStart = Date.now();
    await new Promise((r) => { setTimeout(r, 1000); });
    const rate = server.attemptsSince(windowStart) / ((Date.now() - windowStart) / 1000);

    // AC-0.4(a): count of `Websocket error` occasions per second >= 100 (A-1 measured 2,326-2,371/s).
    expect(rate).toBeGreaterThanOrEqual(100);
  });
});
