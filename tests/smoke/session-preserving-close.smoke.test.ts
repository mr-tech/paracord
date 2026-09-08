import { describe, it, expect, afterEach } from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';

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

expect(P_KEEP).toHaveLength(13);

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
