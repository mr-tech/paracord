import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

describe('AC-1.5: the isFetchingMembers veto cap, both heartbeatTimeoutSeconds configurations', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('(i) heartbeatTimeoutSeconds unset: HEARTBEAT_TIMEOUT fires on the 4th consecutive unacknowledged heartbeat, not before', async () => {
    const intervalMs = 7000;
    server = await LoopbackGatewayServer.start({ heartbeatIntervalMs: intervalMs });
    bot = createTestBot(server.url);

    const closeEvents: { code: number }[] = [];
    bot.on('GATEWAY_CLOSE', (e: { code: number }) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    gw.requestGuildMembers({ guild_id: '1', query: '', limit: 0 });
    expect(gw.isFetchingMembers).toBe(true);

    await waitForCondition(() => closeEvents.length >= 1, 'HEARTBEAT_TIMEOUT close observed', 35000);

    expect(closeEvents[0]!.code).toBe(GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
    expect(server.heartbeatsReceived).toBe(4);

    await new Promise((r) => { setTimeout(r, 300); });
    expect(server.heartbeatsReceived).toBe(4);
  }, 45000);

  it('(ii) heartbeatTimeoutSeconds set: the close fires at that bound even while isFetchingMembers is true — the veto does not extend it', async () => {
    const intervalMs = 7000;
    const ackWaitSeconds = 1;
    server = await LoopbackGatewayServer.start({ heartbeatIntervalMs: intervalMs });
    bot = new Paracord('harness.token.value', {
      gatewayOptions: {
        wsUrl: server.url,
        wsParams: { v: '10', encoding: 'json' },
        heartbeatTimeoutSeconds: ackWaitSeconds,
      },
    });

    const closeEvents: { code: number }[] = [];
    bot.on('GATEWAY_CLOSE', (e: { code: number }) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    gw.requestGuildMembers({ guild_id: '1', query: '', limit: 0 });
    expect(gw.isFetchingMembers).toBe(true);

    await waitForCondition(() => server.heartbeatsReceived >= 1, 'first heartbeat sent', 8000);
    const firstHeartbeatAt = Date.now();

    await waitForCondition(() => closeEvents.length >= 1, 'HEARTBEAT_TIMEOUT close observed', 20000);
    const closedAt = Date.now();

    expect(closeEvents[0]!.code).toBe(GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
    const bound = intervalMs + ackWaitSeconds * 1000;
    expect(closedAt - firstHeartbeatAt).toBeLessThanOrEqual(bound + 2000);
  }, 45000);
});
