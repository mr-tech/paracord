import {
  describe, it, expect, afterEach,
} from 'vitest';
import { EventEmitter } from 'events';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent } from '../../src/clients/Api/types';

const unhandledListeners: Array<(err: unknown) => void> = [];
afterEach(() => {
  unhandledListeners.splice(0).forEach((fn) => process.off('unhandledRejection', fn));
});

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };

async function driveRecreateFailureCell(code: number, allowFallback: boolean) {
  const origin = await LoopbackApiOrigin.start();
  origin.setScript([OK_RESPONSE]);
  const rpc = await LoopbackRpcServer.start();

  const events: ApiDebugEvent[] = [];
  const emitter = new EventEmitter();
  emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

  const unhandled: unknown[] = [];
  const onUnhandled = (err: unknown) => unhandled.push(err);
  process.on('unhandledRejection', onUnhandled);
  unhandledListeners.push(onUnhandled);

  const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
  await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback });
  rpc.injectFault('update', { code });
  rpc.injectFault('hello', { code });

  await api.request('GET', '/channels/1');
  await rpc.waitForUpdate(1);
  await new Promise((resolve) => { setTimeout(resolve, 400); });

  const errorEvents = events.filter((e) => e.level === LOG_LEVELS.ERROR);
  const handlerLines = errorEvents.filter((e) => typeof e.message === 'string'
    && /the rpc rate limit cache update did not succeed/i.test(e.message));
  const updateCalls = rpc.updateCalls;

  api.end();
  await origin.close();
  await rpc.close();
  process.off('unhandledRejection', onUnhandled);

  return { unhandledCount: unhandled.length, handlerLineCount: handlerLines.length, updateCalls };
}

describe('AC-2.1 — updateRpcCache rejects AND the recreate fails (the discriminating cells)', () => {
  for (const allowFallback of [true, false]) {
    for (const code of [
      grpcStatus.UNAVAILABLE, grpcStatus.DEADLINE_EXCEEDED, grpcStatus.CANCELLED, grpcStatus.INTERNAL,
    ]) {
      it(`allowFallback=${allowFallback}, update and hello both fault ${code} — one handler line, process survives`, async () => {
        const { unhandledCount, handlerLineCount, updateCalls } = await driveRecreateFailureCell(code, allowFallback);

        expect(updateCalls).toBeGreaterThanOrEqual(1);
        expect(unhandledCount).toBe(0);
        expect(handlerLineCount).toBe(1);
      }, 15000);
    }
  }
});
