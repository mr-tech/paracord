import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable, waitForCondition } from '../harness/waitFor';

describe('AC-1.2/1.3/1.6: close() with a wire-illegal code on an OPEN socket', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('does not throw, delivers exactly once with the caller\'s code, and end() still works after', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    const closeEvents: GatewayCloseEvent[] = [];
    bot.on('GATEWAY_CLOSE', (e: GatewayCloseEvent) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    expect(() => gw.close(GATEWAY_CLOSE_CODES.ABNORMAL)).not.toThrow();

    await waitForCondition(() => closeEvents.length >= 1, 'GATEWAY_CLOSE delivered', 3000);
    expect(closeEvents).toHaveLength(1);
    expect(closeEvents[0]!.code).toBe(GATEWAY_CLOSE_CODES.ABNORMAL);
    expect(closeEvents[0]!.shouldReconnect).toBe(true);
    expect(gw.resumable).toBe(true);

    expect(() => bot.end()).not.toThrow();
    await new Promise((r) => { setTimeout(r, 100); });
  });
});
