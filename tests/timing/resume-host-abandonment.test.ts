import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable, waitForCondition } from '../harness/waitFor';

describe('AC-1.10: resume-host abandonment after 3 consecutive 1006s', () => {
  let baseServer: LoopbackGatewayServer;
  let resumeServer: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await baseServer?.close();
    await resumeServer?.close();
  });

  it('abandons the resume host at k=3, resumable stays true, the 4th attempt RESUMEs on the base URL', async () => {
    resumeServer = await LoopbackGatewayServer.start({ mode: 'reject503' });
    baseServer = await LoopbackGatewayServer.start({ resumeGatewayUrl: resumeServer.url });
    bot = createTestBot(baseServer.url);

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);
    expect(gw.resumable).toBe(true);

    baseServer.dropLiveSocket();

    await waitForCondition(() => resumeServer.attempts.length >= 3, 'resume host tried 3 times', 15000);
    expect(gw.resumable).toBe(true);

    await waitForCondition(() => baseServer.attempts.length >= 2, 'base host retried (4th attempt)', 7000);
    expect(gw.resumable).toBe(true);

    const resumeAttemptsAtAbandonment = resumeServer.attempts.length;
    await new Promise((r) => { setTimeout(r, 500); });
    expect(resumeServer.attempts.length).toBe(resumeAttemptsAtAbandonment);
  });

  it('the base-host attempt sends RESUME (op 6) carrying the retained session_id, not a fresh IDENTIFY', async () => {
    resumeServer = await LoopbackGatewayServer.start({ mode: 'reject503' });
    baseServer = await LoopbackGatewayServer.start({ resumeGatewayUrl: resumeServer.url });
    bot = createTestBot(baseServer.url);

    let resumePayload: unknown;
    baseServer.on('resume', (d: unknown) => { resumePayload = d; });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    baseServer.dropLiveSocket();
    await waitForCondition(() => resumePayload !== undefined, 'base host received RESUME post-abandonment', 15000);

    expect(resumePayload).toMatchObject({ session_id: 'HARNESS_SESSION' });
  });

  it('a consumer close issued while queued does not count against the resume-host abandonment threshold', async () => {
    resumeServer = await LoopbackGatewayServer.start({ mode: 'reject503' });
    baseServer = await LoopbackGatewayServer.start({ resumeGatewayUrl: resumeServer.url });
    bot = createTestBot(baseServer.url);

    const closeEvents: unknown[] = [];
    bot.on('GATEWAY_CLOSE', (e: unknown) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    baseServer.dropLiveSocket();
    await waitForCondition(() => closeEvents.length >= 1, 'base host close processed', 8000);
    await waitForCondition(() => closeEvents.length >= 2, 'first resume-host close processed', 8000);

    gw.close(GATEWAY_CLOSE_CODES.ABNORMAL);

    await waitForCondition(() => resumeServer.attempts.length >= 4, 'resume host tried 4 times', 20000);
    await waitForCondition(() => baseServer.attempts.length >= 2, 'base host retried (abandonment)', 15000);

    expect(resumeServer.attempts.length).toBe(4);
  }, 45000);
});
