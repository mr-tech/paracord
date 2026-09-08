import { describe, it, expect, afterEach } from 'vitest';
import zlib from 'zlib';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createTestBot } from '../harness/testBot';
import { waitForCondition, waitForResumable } from '../harness/waitFor';

const FLUSH_MARKER = Buffer.from([0x00, 0x00, 0xff, 0xff]);

function validCompressed(): Buffer {
  return zlib.deflateSync(Buffer.from(JSON.stringify({
    op: 0, t: 'X', s: 1, d: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 },
  })));
}

const CORRUPT_FRAMES: [string, () => Buffer][] = [
  ['bytes that are not a zlib stream at all', () => Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd])],
  ['a header zlib itself never issues', () => Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x00, 0xff, 0xff])],
  ['a valid header followed by an invalid block', () => Buffer.concat([Buffer.from([0x78, 0x9c]), Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])])],
  ['a truncated stream, flush-terminated before enough bytes to decompress anything', () => {
    const full = validCompressed();
    const truncated = full.subarray(0, Math.max(4, Math.floor(full.length / 3)));
    return Buffer.concat([truncated, FLUSH_MARKER]);
  }],
];

describe('AC-1.7: every malformed compressed frame — the process survives, the gateway emits GATEWAY_CLOSE', () => {
  let server: LoopbackGatewayServer;
  let bot: Paracord;
  let uncaught = 0;
  let unhandled = 0;
  const onUncaught = () => { uncaught += 1; };
  const onUnhandled = () => { unhandled += 1; };

  afterEach(async () => {
    bot?.end();
    await server?.close();
    process.off('uncaughtException', onUncaught);
    process.off('unhandledRejection', onUnhandled);
  });

  it.each(CORRUPT_FRAMES)('%s', async (_name, makeFrame) => {
    process.on('uncaughtException', onUncaught);
    process.on('unhandledRejection', onUnhandled);

    server = await LoopbackGatewayServer.start();
    bot = createTestBot(server.url);

    const closeEvents: { code: number }[] = [];
    bot.on('GATEWAY_CLOSE', (e: { code: number }) => { closeEvents.push(e); });

    await bot.login({ identity: { intents: 1, compress: true }, shards: [0], shardCount: 1 });
    const gw = bot.shards.get(0)!;
    await waitForResumable(gw);

    server.sendRawBinary(makeFrame());

    await waitForCondition(() => closeEvents.length >= 1, 'GATEWAY_CLOSE observed', 5000);

    expect(closeEvents[0]!.code).toBe(GATEWAY_CLOSE_CODES.UNKNOWN);
    expect(uncaught).toBe(0);
    expect(unhandled).toBe(0);
  }, 10000);
});
