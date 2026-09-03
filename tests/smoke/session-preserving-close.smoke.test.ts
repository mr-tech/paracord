import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';

/**
 * WP-0 smoke test — AC-0.4(d). For every close code in WP-1's P-keep class (plan
 * "The close-code partition"), a close after READY leaves `gateway.resumable`
 * unchanged (true) at unfixed HEAD. This member holds today and is the regression
 * guard AC-1.3 keeps at WP-1.
 *
 * ABNORMAL (1006) is never sent as an explicit close frame — `ws` synthesises it from
 * an abrupt socket drop (A-1 §A-1.3) — so that member drops the live socket instead of
 * calling `close(code)`.
 */
const P_KEEP: Array<[string, number]> = [
  ['CLEAN', GATEWAY_CLOSE_CODES.CLEAN],
  ['GOING_AWAY', GATEWAY_CLOSE_CODES.GOING_AWAY],
  ['ABNORMAL', GATEWAY_CLOSE_CODES.ABNORMAL],
  ['UNKNOWN_ERROR', GATEWAY_CLOSE_CODES.UNKNOWN_ERROR],
  ['UNKNOWN_OPCODE', GATEWAY_CLOSE_CODES.UNKNOWN_OPCODE],
  ['DECODE_ERROR', GATEWAY_CLOSE_CODES.DECODE_ERROR],
  ['NOT_AUTHENTICATED', GATEWAY_CLOSE_CODES.NOT_AUTHENTICATED],
  ['RATE_LIMITED', GATEWAY_CLOSE_CODES.RATE_LIMITED],
  ['CONNECT_TIMEOUT', GATEWAY_CLOSE_CODES.CONNECT_TIMEOUT],
  ['RECONNECT', GATEWAY_CLOSE_CODES.RECONNECT],
  ['SESSION_INVALIDATED_RESUMABLE', GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE],
  ['HEARTBEAT_TIMEOUT', GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT],
  ['USER_TERMINATE_RESUMABLE', GATEWAY_CLOSE_CODES.USER_TERMINATE_RESUMABLE],
];

expect(P_KEEP).toHaveLength(13); // the plan's P-keep count — a slipped member fails the file at load, not silently.

describe('AC-0.4(d): session-preserving close (P-keep, 13 codes)', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;

  afterEach(async () => {
    bot?.end();
    await server?.close();
  });

  it.each(P_KEEP)('%s (%d) leaves resumable unchanged', async (_name, code) => {
    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    const ready = new Promise<void>((resolve) => { server.once('ready', () => resolve()); });
    await bot.login({ identity: { intents: 1 }, shards: [0], shardCount: 1 });
    await ready;
    await new Promise((r) => { setTimeout(r, 300); });

    const gw = bot.shards.get(0)!;
    expect(gw.resumable).toBe(true);

    if (code === GATEWAY_CLOSE_CODES.ABNORMAL) {
      server.dropLiveSocket();
    } else {
      server.closeLiveSocket(code);
    }
    await new Promise((r) => { setTimeout(r, 500); });

    expect(gw.resumable).toBe(true);
  });
});
