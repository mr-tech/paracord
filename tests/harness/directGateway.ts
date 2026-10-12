import { EventEmitter } from 'events';

import Gateway from '../../src/clients/Gateway/Gateway';

import { waitForCondition } from './waitFor';

import type { LoopbackGatewayServer } from './loopbackGatewayServer';

export interface DebugLine {
  level: number;
  message: string;
  data: Record<string, unknown>;
}

export const HARNESS_TOKEN = 'harness.token.value';

export class RecordingEmitter extends EventEmitter {
  readonly handled: string[] = [];

  readonly debug: DebugLine[] = [];

  readonly closes: Array<{ code: number; shouldReconnect: boolean }> = [];

  constructor() {
    super();
    this.on('DEBUG', (d: DebugLine) => { this.debug.push(d); });
    this.on('GATEWAY_CLOSE', (e: { code: number; shouldReconnect: boolean }) => {
      this.closes.push({ code: e.code, shouldReconnect: e.shouldReconnect });
    });
  }

  handleEvent = (type: string): void => {
    this.handled.push(type);
  };

  handledCount(type: string): number {
    return this.handled.filter((t) => t === type).length;
  }
}

export interface DirectGateway {
  gateway: Gateway;
  emitter: RecordingEmitter;
}

export function createDirectGateway(
  wsUrl: string,
  options: { shard?: [number, number] | undefined; compress?: boolean } = {},
): DirectGateway {
  const emitter = new RecordingEmitter();
  const gateway = new Gateway(HARNESS_TOKEN, {
    identity: { intents: 1, shard: 'shard' in options ? options.shard : [3, 5], compress: options.compress },
    emitter: emitter as unknown as ConstructorParameters<typeof Gateway>[1]['emitter'],
    wsUrl,
    wsParams: { v: '10', encoding: 'json' },
  });
  return { gateway, emitter };
}

export async function loginDirect(server: LoopbackGatewayServer): Promise<DirectGateway> {
  const direct = createDirectGateway(server.url);
  direct.gateway.login();
  await waitForCondition(() => direct.gateway.resumable, 'READY handled', 5000);
  return direct;
}

export async function deliver(server: LoopbackGatewayServer, emitter: RecordingEmitter, n: number): Promise<number> {
  const before = emitter.handledCount('TEST_EVENT');
  for (let i = 0; i < n; i += 1) server.sendDispatch('TEST_EVENT', {});
  await waitForCondition(() => emitter.handledCount('TEST_EVENT') >= before + n, `${n} dispatches handled`, 5000);
  return server.lastSentSeq;
}

export async function requestHeartbeatD(server: LoopbackGatewayServer): Promise<number | null> {
  const n = server.receivedHeartbeats.length;
  server.requestHeartbeat();
  await server.waitForHeartbeats(n + 1);
  return server.receivedHeartbeats[n]!.d;
}
