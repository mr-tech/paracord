import {
  describe, it, expect, afterEach,
} from 'vitest';
import { EventEmitter } from 'events';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent } from '../../src/clients/Api/types';

/**
 * AC-2.1's OTHER half — the cells the criterion itself calls "the fix's discriminating
 * cells, both arms" (plan revision 35): the ones where `updateRpcCache` rejects, the
 * recreate branch is taken, `recreateRpcService()` FAILS, and step 1's handler is what
 * keeps the process alive.
 *
 * `rpcServiceLoss.test.ts` drives 32 cells against a server that is alive throughout, so
 * `recreateRpcService()` always succeeds and `if (!success) throw err` is never reached.
 * qa-P001-2's Phase 2 mutation sweep measured the consequence: neutering that throw
 * (mutant M10) leaves the whole suite green (finding QA-1). This cell is what makes it
 * red.
 *
 * Construction: fault `update` AND `hello` with the same transport-set code, server still
 * listening. `update` rejects -> in-set -> `recreateRpcService()` -> `addRateLimitService`
 * -> `checkRpcServiceConnection` -> `hello()` rejects -> returns false -> `throw err` ->
 * step 1's `.catch` logs exactly one ERROR line and the process survives.
 *
 * Arm-independent by construction (`updateRpcCache` never reads `#allowFallback`), so both
 * arms are driven and asserted rather than one being assumed — silence on an arm is not a
 * statement (critique F-60).
 */

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
  // The service's own opening `hello()` must SUCCEED, or `#connectingToRpcService`
  // latches at setup and `updateRpcCache` is skipped entirely — the cell would then
  // measure nothing. Faults are injected only after the connection is established.
  await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback });
  rpc.injectFault('update', { code });
  rpc.injectFault('hello', { code }); // so the recreate the in-set code triggers fails

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
    for (const code of [grpcStatus.UNAVAILABLE, grpcStatus.CANCELLED]) {
      it(`allowFallback=${allowFallback}, update and hello both fault ${code} — one handler line, process survives`, async () => {
        const { unhandledCount, handlerLineCount, updateCalls } = await driveRecreateFailureCell(code, allowFallback);

        expect(updateCalls).toBeGreaterThanOrEqual(1); // positive completion: the fault actually fired
        expect(unhandledCount).toBe(0); // the property: the throw past a failed recreate is caught
        expect(handlerLineCount).toBe(1); // step 1's handler, exactly once
      }, 15000);
    }
  }
});
