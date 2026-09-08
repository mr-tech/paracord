import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable } from '../harness/waitFor';

const TTL_MS = 60 * 1000;

function chunkPayload(nonce: string, chunkIndex: number, chunkCount: number) {
  return {
    guild_id: '1', members: [], chunk_index: chunkIndex, chunk_count: chunkCount, nonce,
  };
}

describe('AC-1.12: the per-nonce chunk TTL, positive and negative', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    vi.useRealTimers();
    bot?.end();
    await server?.close();
  });

  it('a stream that stops after k of n chunks is swept within TTL + one read, not before', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    gw.requestGuildMembers({
      guild_id: '1', query: '', limit: 0, nonce: 'n',
    });
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3));
    await new Promise((r) => { setTimeout(r, 200); });
    expect(gw.isFetchingMembers).toBe(true);

    vi.setSystemTime(Date.now() + TTL_MS - 2000);
    expect(gw.isFetchingMembers).toBe(true);

    vi.setSystemTime(Date.now() + 3000);
    expect(gw.isFetchingMembers).toBe(false);
  });

  it('consecutive chunks under the TTL apart never truncate the stream, even once more than TTL has elapsed since it started', async () => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    gw.requestGuildMembers({
      guild_id: '1', query: '', limit: 0, nonce: 'n',
    });
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3));
    await new Promise((r) => { setTimeout(r, 200); });

    vi.setSystemTime(Date.now() + 30 * 1000);
    expect(gw.isFetchingMembers).toBe(true);
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 1, 3));
    await new Promise((r) => { setTimeout(r, 200); });

    vi.setSystemTime(Date.now() + 30 * 1000);
    expect(gw.isFetchingMembers).toBe(true);

    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 2, 3));
    await new Promise((r) => { setTimeout(r, 200); });
    expect(gw.isFetchingMembers).toBe(false);
  });
});
