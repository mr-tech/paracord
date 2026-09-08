import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition } from '../harness/waitFor';

describe('AC-1.2 / AC-1.11 (CONNECTING member): close() during the handshake', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;
  let uncaught = 0;
  let unhandledRejections = 0;

  const onUncaught = () => { uncaught += 1; };
  const onUnhandledRejection = () => { unhandledRejections += 1; };

  afterEach(async () => {
    bot?.end();
    await server?.close();
    process.off('uncaughtException', onUncaught);
    process.off('unhandledRejection', onUnhandledRejection);
  });

  it('delivers the caller\'s code exactly once, immediately, and the process survives', async () => {
    process.on('uncaughtException', onUncaught);
    process.on('unhandledRejection', onUnhandledRejection);

    server = await LoopbackGatewayServer.start({ mode: 'hang' });
    bot = createTestBot(server.url);

    const closeEvents: GatewayCloseEvent[] = [];
    bot.on('GATEWAY_CLOSE', (e: GatewayCloseEvent) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    await waitForCondition(() => server.attempts.length >= 1, 'first CONNECTING attempt', 3000);

    const gw = bot.shards.get(0)!;
    gw.close(GATEWAY_CLOSE_CODES.NOT_AUTHENTICATED);

    await waitForCondition(() => closeEvents.length >= 1, 'GATEWAY_CLOSE delivered', 3000);

    expect(closeEvents).toHaveLength(1);
    expect(closeEvents[0]!.code).toBe(GATEWAY_CLOSE_CODES.NOT_AUTHENTICATED);
    expect(closeEvents[0]!.shouldReconnect).toBe(true);

    await new Promise((r) => { setTimeout(r, 200); });
    expect(closeEvents).toHaveLength(1);
    expect(uncaught).toBe(0);
    expect(unhandledRejections).toBe(0);
  });
});
