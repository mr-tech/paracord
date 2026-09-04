import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable, waitForCondition } from '../harness/waitFor';

/**
 * WP-1 step 2 (critique F-19). Three consecutive ABNORMAL (1006) failures against the
 * resume host abandon it — the session survives (`resumable` stays true throughout)
 * and the fourth attempt targets the base URL, sending RESUME rather than IDENTIFY.
 */
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

    // Drop the live (base) connection — the first reconnect targets the resume host
    // (resume_gateway_url from READY), which is permanently 503/1006.
    baseServer.dropLiveSocket();

    // 3 consecutive 1006s against the resume host; resumable holds throughout.
    await waitForCondition(() => resumeServer.attempts.length >= 3, 'resume host tried 3 times', 15000);
    expect(gw.resumable).toBe(true);

    // The 4th attempt abandons the resume host and targets the base URL.
    await waitForCondition(() => baseServer.attempts.length >= 2, 'base host retried (4th attempt)', 7000);
    expect(gw.resumable).toBe(true);

    // No further attempts land on the resume host once it is abandoned.
    const resumeAttemptsAtAbandonment = resumeServer.attempts.length;
    await new Promise((r) => { setTimeout(r, 500); });
    expect(resumeServer.attempts.length).toBe(resumeAttemptsAtAbandonment);
  });

  it('the base-host attempt sends RESUME (op 6) carrying the retained session_id, not a fresh IDENTIFY', async () => {
    resumeServer = await LoopbackGatewayServer.start({ mode: 'reject503' });
    baseServer = await LoopbackGatewayServer.start({ resumeGatewayUrl: resumeServer.url });
    bot = createTestBot(baseServer.url);

    // The base host only ever sees IDENTIFY (the first-ever connection) until the
    // resume host is abandoned — this is that post-abandonment RESUME's payload.
    let resumePayload: unknown;
    baseServer.on('resume', (d: unknown) => { resumePayload = d; });

    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    baseServer.dropLiveSocket();
    await waitForCondition(() => resumePayload !== undefined, 'base host received RESUME post-abandonment', 15000);

    expect(resumePayload).toMatchObject({ session_id: 'HARNESS_SESSION' });
  });
});
