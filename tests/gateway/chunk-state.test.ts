import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

const G = GATEWAY_CLOSE_CODES;
// Mirrors `close-matrix.test.ts`'s own P-keep list — the plan's own partition, not
// re-derived from a different source here.
const P_KEEP: number[] = [
  G.CLEAN, G.GOING_AWAY, G.ABNORMAL, G.UNKNOWN_ERROR, G.UNKNOWN_OPCODE, G.DECODE_ERROR,
  G.NOT_AUTHENTICATED, G.RATE_LIMITED, G.CONNECT_TIMEOUT, G.RECONNECT,
  G.SESSION_INVALIDATED_RESUMABLE, G.HEARTBEAT_TIMEOUT, G.USER_TERMINATE_RESUMABLE,
];

function chunkPayload(nonce: string, chunkIndex: number, chunkCount: number) {
  return {
    guild_id: '1', members: [], chunk_index: chunkIndex, chunk_count: chunkCount, nonce,
  };
}

/**
 * AC-1.4. Two independent properties: (a) any close in P-keep clears chunk-request
 * state while a stream is in flight (H5(a)) — every P-keep code, not one representative;
 * (b) completion is judged by the set of indexes seen, not a count of deliveries, so a
 * duplicate or out-of-order replay does not complete early and does not stall (H5(b)).
 */
describe('AC-1.4: member-chunk state under a P-keep close, and under duplicate/out-of-order replay', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it.each(P_KEEP)('(a) close code %d clears isFetchingMembers, chunk stream in flight', async (code) => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    const closeEvents: { code: number }[] = [];
    bot.on('GATEWAY_CLOSE', (e: { code: number }) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    gw.requestGuildMembers({
      guild_id: '1', query: '', limit: 0, nonce: 'n',
    });
    expect(gw.isFetchingMembers).toBe(true);

    // One of three chunks delivered — the stream is genuinely still in flight, not
    // merely never started.
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3));
    await waitForCondition(() => gw.isFetchingMembers === true, 'chunk state still pending after 1 of 3', 3000);

    // ABNORMAL (1006) is never legal on an actual close frame — `ws` validates outgoing
    // codes the same way client and server side, so it is reproduced the way it
    // actually occurs on the wire: a dropped connection, not a sent frame.
    if (code === G.ABNORMAL) {
      server.dropLiveSocket();
    } else {
      server.closeLiveSocket(code);
    }
    await waitForCondition(() => closeEvents.length >= 1, 'close observed', 5000);

    expect(gw.isFetchingMembers).toBe(false);
  }, 15000);

  it('(b) a duplicate/out-of-order chunk replay completes exactly when every index has been seen, not before and not late', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    gw.requestGuildMembers({
      guild_id: '1', query: '', limit: 0, nonce: 'n',
    });
    expect(gw.isFetchingMembers).toBe(true);

    // Out-of-order: index 2 before index 0. Duplicate: index 2 sent twice. A count of
    // deliveries would reach 3 here and wrongly complete; the set has only {0, 2}. No
    // event exists on this harness bot to confirm delivery (dispatch types other than
    // `GATEWAY_CLOSE`/`GATEWAY_OPEN`/`DEBUG` are not re-emitted by `Paracord`'s default
    // `handleEvent`), so this settles on real elapsed time the way `close-matrix.test.ts`
    // already does to catch a second delivery — a loopback round-trip plus in-process
    // handling is on the order of single-digit ms, not the hundreds this waits.
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 2, 3));
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 2, 3));
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3));
    await new Promise((r) => { setTimeout(r, 300); });
    expect(gw.isFetchingMembers).toBe(true);

    // The one genuinely missing index arrives — completion.
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 1, 3));
    await waitForCondition(() => gw.isFetchingMembers === false, 'completed once every index seen', 3000);
  }, 15000);
});
