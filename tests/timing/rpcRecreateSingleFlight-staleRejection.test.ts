import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import LoopbackApiOrigin from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { createInstrumentedApi, type Counts } from '../harness/instrumentedApi';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent, ApiOptions } from '../../src/clients/Api/types';

/**
 * Plan 001 WP-6 step 1, AC-6.1 — `checkRpcServiceConnection`'s identity check
 * (`isCurrentService`) exists because a service superseded by a recreate may still have
 * a `hello()` call outstanding, and that call's eventual settlement must not be read as
 * the *current* service's own outcome. This is the stale-*failure* half (WP6-F9's M6/M8):
 * the stale-*success* half is `tests/api/rpcRecreateSingleFlight.test.ts`, fully mocked.
 *
 * Time-based: the stale rejection arrives on S1's own real 10 s deadline, and the
 * discriminating assertion is the second request's elapsed time, so this lives in
 * `tests/timing/` and runs only under `npm run test:timing`.
 */

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };

describe('AC-6.1 — the identity check in checkRpcServiceConnection is the sole deciding factor (WP6-F9)', () => {
  it('a stale rejection from a superseded service does not arm a spurious reconnect latch for its successor', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));
    const api = await createInstrumentedApi(origin, counts, { emitter } as ApiOptions);

    // S1's initial hello is withheld: it will fail by its own 10s deadline, by which
    // time an independently-forced recreate will already have replaced S1 with S2.
    rpc.withhold('hello');
    const added = api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true })
      .then((v) => `resolved:${v}`, (e: { code?: unknown }) => `rejected:${e?.code}`);

    await new Promise((r) => { setTimeout(r, 8000); });
    // An immediate transport failure on authorize forces the recreate at ~8s, well
    // before S1's own hello deadline fires at ~10s.
    rpc.injectFault('authorize', { code: grpcStatus.UNAVAILABLE });
    // Not awaited or asserted — this call's only role is to force the recreate;
    // `rpc.forceClose()` below ends it in flight either way.
    void api.request('GET', '/channels/123/messages').then(() => 'ok', (e: { code?: unknown; message?: unknown }) => `err:${e?.code ?? e?.message}`);

    // The second request means nothing until S1's stale rejection has landed. `added` —
    // the promise addRateLimitService returns — settles exactly then, with `false`, so
    // awaiting and asserting it states the precondition directly rather than through a
    // sleep sized to outlast it.
    expect(await added).toBe('resolved:false');
    const t2 = Date.now();
    const r2 = await api.request('GET', '/channels/123/messages').then(() => 'ok', (e: { code?: unknown; message?: unknown }) => `err:${e?.code ?? e?.message}`);
    const r2ms = Date.now() - t2;

    // WP6-F9 (M6, M8): without the identity guard, S1's late rejection is read as the
    // CURRENT service's own failure, wrongly arming the "connecting" latch. That makes
    // this second request settle near-instantly via the local-fallback WARNING path
    // instead of actually reaching S2 over the network (shipped: ~6s; under either
    // mutant: ~15-25ms), and it logs the latch warning at all.
    expect(r2).toBe('ok');
    expect(r2ms).toBeGreaterThan(1000);
    const latchWarnings = events.filter((e) => e.level === LOG_LEVELS.WARNING
      && typeof e.message === 'string' && /client is connecting to rpc server/i.test(e.message));
    expect(latchWarnings).toHaveLength(0);

    api.end();
    await origin.close();
    rpc.forceClose(); // WP6-F4: a withheld stream does not resolve close()
  }, 30000);
});
