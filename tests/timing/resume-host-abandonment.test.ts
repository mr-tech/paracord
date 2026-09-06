import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForResumable, waitForCondition } from '../harness/waitFor';

/**
 * WP-1 step 2 (critique F-19). Three consecutive ABNORMAL (1006) failures against the
 * resume host abandon it — the session survives (`resumable` stays true throughout)
 * and the fourth attempt targets the base URL, sending RESUME rather than IDENTIFY.
 *
 * WP-7 step 10 (D-52, AC-7.10): all three cells below, commented out at step 7 (D-50),
 * are restored — see `tests/gateway/reconnect-backoff.test.ts`'s header for the
 * owner's own words ordering the restoration and the D-52 register row; not restated
 * per file.
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
    // One real resume-host failure processed (close 2 overall) before the consumer
    // close below. Waiting on the close event itself, not merely on the server having
    // recorded the upgrade, is what guarantees the gateway has actually returned to the
    // queue with no socket assigned by the time the consumer close below is issued —
    // the next real attempt cannot begin until a fresh backoff wait elapses.
    await waitForCondition(() => closeEvents.length >= 2, 'first resume-host close processed', 8000);

    // Issued from outside the library while the gateway sits in the queue with no
    // socket — no connection attempt against the resume host is in flight for this
    // call to describe. A close not attributable to the resume host also breaks its
    // own consecutive streak, by design, so this costs the real streak one more attempt
    // to rebuild rather than leaving it untouched — the fixed count below is a real
    // attempt count, not the criterion's bare k=3.
    gw.close(GATEWAY_CLOSE_CODES.ABNORMAL);

    await waitForCondition(() => resumeServer.attempts.length >= 4, 'resume host tried 4 times', 20000);
    await waitForCondition(() => baseServer.attempts.length >= 2, 'base host retried (abandonment)', 15000);

    // A stale flag would let the consumer close above count as a resume-host failure
    // too, reaching the abandonment threshold after only 2 real attempts. Correctly
    // attributed, it counts as neither a resume-host failure nor as continuing one — it
    // breaks the 1-long streak built so far, so a fresh streak of 3 has to be rebuilt
    // from there: 1 real attempt before the consumer close, 3 more after.
    expect(resumeServer.attempts.length).toBe(4);
  }, 45000);
});
