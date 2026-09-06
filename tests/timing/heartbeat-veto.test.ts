import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

/**
 * AC-1.5, stated over both `heartbeatTimeoutSeconds` configurations. `isFetchingMembers`
 * is pinned true throughout by a `requestGuildMembers` call this harness never answers
 * with a chunk — the request's own nonce stays in the state map, exactly the condition
 * both cases need.
 */
describe('AC-1.5: the isFetchingMembers veto cap, both heartbeatTimeoutSeconds configurations', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it('(i) heartbeatTimeoutSeconds unset: HEARTBEAT_TIMEOUT fires on the 4th consecutive unacknowledged heartbeat, not before', async () => {
    // Above the heartbeat scheduler's own jitter ceiling (5000ms subtracted from the
    // interval on every reschedule) so the gap to the second heartbeat — the first one
    // that can find itself unacknowledged — is never less than intervalMs - 5000ms.
    // Below that floor, a large jitter draw can collapse two heartbeats back to back
    // regardless of how large the base interval is, racing this test's own
    // requestGuildMembers call (made right after resumable) against a premature,
    // un-vetoed close.
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
    // The 4th unacknowledged send is the close itself, not a 5th send — the harness
    // never acks, so every heartbeat this session ever sends is counted here.
    expect(server.heartbeatsReceived).toBe(4);

    // Settle and confirm no further heartbeat follows the close.
    await new Promise((r) => { setTimeout(r, 300); });
    expect(server.heartbeatsReceived).toBe(4);
  }, 45000);

  it('(ii) heartbeatTimeoutSeconds set: the close fires at that bound even while isFetchingMembers is true — the veto does not extend it', async () => {
    // Above the jitter ceiling for the same reason as case (i): otherwise this test's
    // own requestGuildMembers call can lose the race to an early, un-vetoed close.
    const intervalMs = 7000;
    const ackWaitSeconds = 1;
    server = await LoopbackGatewayServer.start({ heartbeatIntervalMs: intervalMs });
    // `createTestBot`'s `overrides` replaces `gatewayOptions` wholesale, so
    // `heartbeatTimeoutSeconds` (a `GatewayOptions` field) is set by constructing directly.
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
    // checkForAck's own bound: intervalTime + ackWaitTime after the first send, not
    // extended by however many veto cycles happened in between (isFetchingMembers is
    // true the whole time and never gates this timer). Generous slack for scheduling
    // jitter on this machine, not for the mechanism under test.
    const bound = intervalMs + ackWaitSeconds * 1000;
    expect(closedAt - firstHeartbeatAt).toBeLessThanOrEqual(bound + 2000);
  }, 45000);
});
