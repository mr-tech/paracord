import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

const G = GATEWAY_CLOSE_CODES;
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

    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3));
    await waitForCondition(() => gw.isFetchingMembers === true, 'chunk state still pending after 1 of 3', 3000);

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

    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 2, 3));
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 2, 3));
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3));
    await new Promise((r) => { setTimeout(r, 300); });
    expect(gw.isFetchingMembers).toBe(true);

    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 1, 3));
    await waitForCondition(() => gw.isFetchingMembers === false, 'completed once every index seen', 3000);
  }, 15000);
});
