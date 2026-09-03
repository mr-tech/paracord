import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';

/**
 * WP-0 smoke test — AC-0.4(b). Reproduces H3 (A-1.4) against unfixed HEAD: at the
 * moment `gateway.close(USER_TERMINATE)` is called mid-loop, the socket it targets is
 * CONNECTING, so the close code never reaches `Gateway.handleCloseCode` — it is applied
 * to a `Websocket` instance the loop has already discarded (A-1.4's own mechanism
 * account) — and the attempt rate does not drop. The loop's own natural close/reconnect
 * cycle keeps emitting `GATEWAY_CLOSE` throughout regardless (that is the loop itself,
 * H2); what AC-0.4(b) asserts is that none of those events ever carries the
 * `USER_TERMINATE` code the call made.
 */
describe('AC-0.4(b): close() during the reconnect loop is inert (H3)', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('does not stop the loop and its close code never reaches handleCloseCode', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    const ready = new Promise<void>((resolve) => { server.once('ready', () => resolve()); });
    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    await ready;
    await new Promise((r) => { setTimeout(r, 300); });

    const gw = bot.shards.get(0)!;
    const observedCodes: number[] = [];
    bot.on('GATEWAY_CLOSE', (e: GatewayCloseEvent) => { observedCodes.push(e.code); });

    server.setMode('reject503');
    server.dropLiveSocket();
    await new Promise((r) => { setTimeout(r, 1500); }); // let the loop reach steady state

    const before = server.attempts.length;
    gw.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);

    await new Promise((r) => { setTimeout(r, 1500); });
    const after = server.attempts.length;

    // AC-0.4(b): attempt rate does not drop, and the USER_TERMINATE code never reaches handleCloseCode.
    expect(after).toBeGreaterThan(before);
    expect(observedCodes).not.toContain(GATEWAY_CLOSE_CODES.USER_TERMINATE);
  });
});
