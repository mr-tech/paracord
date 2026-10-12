import { LoopbackGatewayServer } from './loopbackGatewayServer';
import type { LoopbackGatewayServerOptions } from './loopbackGatewayServer';
import { createTestBot } from './testBot';
import { waitForCondition } from './waitFor';
import type Paracord from '../../src/clients/Paracord/Paracord';
import type Gateway from '../../src/clients/Gateway/Gateway';
import type { ParacordLoginOptions, ParacordOptions } from '../../src/clients/Paracord/types';
import type { GatewayCloseEvent } from '../../src/clients/Gateway/types';
import type { DebugLine } from './directGateway';

export interface BotRig {
  server: LoopbackGatewayServer;
  bot: Paracord;
  closes: GatewayCloseEvent[];
  handled: string[];
  debug: DebugLine[];
  gateway: Gateway;
  end(): Promise<void>;
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });

export function op6Count(server: LoopbackGatewayServer): number {
  return server.receivedOps.filter((op) => op === 6).length;
}

export function op2Count(server: LoopbackGatewayServer): number {
  return server.receivedOps.filter((op) => op === 2).length;
}

export async function startBotRig(
  serverOpts: LoopbackGatewayServerOptions = {},
  botOpts: Partial<ParacordOptions> = {},
  shards: number[] = [0],
  loginOptions: Partial<ParacordLoginOptions> = {},
  waitForReady = true,
): Promise<BotRig> {
  const server = await LoopbackGatewayServer.start(serverOpts);
  const bot = createTestBot(server.url, botOpts);
  const closes: GatewayCloseEvent[] = [];
  const handled: string[] = [];
  const debug: DebugLine[] = [];
  bot.on('GATEWAY_CLOSE', (e: GatewayCloseEvent) => { closes.push(e); });
  bot.on('DEBUG', (d: DebugLine) => { debug.push(d); });
  const originalHandleEvent = bot.handleEvent.bind(bot);
  bot.handleEvent = (type, data, gateway) => {
    handled.push(type);
    originalHandleEvent(type, data, gateway);
  };

  await bot.login({
    identity: { intents: 1 }, shards, shardCount: shards.length, ...loginOptions,
  });
  const gateway = bot.shards.get(shards[0]!)!;
  if (waitForReady) await waitForCondition(() => gateway.resumable, 'READY handled', 10000);

  return {
    server,
    bot,
    closes,
    handled,
    debug,
    gateway,
    async end() {
      bot.end();
      await server.close();
    },
  };
}

export async function deliverToBot(rig: BotRig, n: number): Promise<number> {
  const before = rig.handled.filter((t) => t === 'TEST_EVENT').length;
  for (let i = 0; i < n; i += 1) rig.server.sendDispatch('TEST_EVENT', {});
  await waitForCondition(
    () => rig.handled.filter((t) => t === 'TEST_EVENT').length >= before + n,
    `${n} dispatches handled`,
    5000,
  );
  return rig.server.lastSentSeq;
}
