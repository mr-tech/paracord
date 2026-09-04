import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable } from '../harness/waitFor';

// The plan's own value (F-4), restated here rather than imported from
// `Session.ts`'s private `CHUNK_STATE_TTL_MILLISECONDS` — AC-1.9's expectations-
// independence form, applied to this criterion's own fixture too.
const TTL_MS = 60 * 1000;

function chunkPayload(nonce: string, chunkIndex: number, chunkCount: number) {
  return {
    guild_id: '1', members: [], chunk_index: chunkIndex, chunk_count: chunkCount, nonce,
  };
}

/**
 * AC-1.12. The TTL is a pure predicate over elapsed time since the *last* chunk,
 * evaluated at read (time-seam rule) — `vi.setSystemTime` moves the clock with no
 * socket I/O awaited during the read itself, per the criterion's own stated instrument
 * (c); real `setTimeout`s elsewhere (the harness, `waitForResumable`) are untouched by
 * it, since this never calls `vi.useFakeTimers()`.
 */
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
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 0, 3)); // 1 of 3 — stream stops here
    await new Promise((r) => { setTimeout(r, 200); });
    expect(gw.isFetchingMembers).toBe(true);

    // Just under the TTL: not yet swept.
    vi.setSystemTime(Date.now() + TTL_MS - 2000);
    expect(gw.isFetchingMembers).toBe(true);

    // Past the TTL: the next read sweeps it, with nothing else awaited in between.
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

    // 30s since chunk 0 — well under the TTL.
    vi.setSystemTime(Date.now() + 30 * 1000);
    expect(gw.isFetchingMembers).toBe(true);
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 1, 3));
    await new Promise((r) => { setTimeout(r, 200); });

    // A further 30s — 60s total since the stream *started*, past the TTL measured from
    // chunk 0, but only 30s since chunk 1, its true last-seen time. The predicate that
    // matters is "since the last chunk", not "since the stream began".
    vi.setSystemTime(Date.now() + 30 * 1000);
    expect(gw.isFetchingMembers).toBe(true);

    // Completion, not the TTL, ends this stream.
    server.sendDispatch('GUILD_MEMBERS_CHUNK', chunkPayload('n', 2, 3));
    await new Promise((r) => { setTimeout(r, 200); });
    expect(gw.isFetchingMembers).toBe(false);
  });
});
