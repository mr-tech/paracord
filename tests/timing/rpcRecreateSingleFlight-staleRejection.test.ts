import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import LoopbackApiOrigin from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { createInstrumentedApi, type Counts } from '../harness/instrumentedApi';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent, ApiOptions } from '../../src/clients/Api/types';

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

    rpc.withhold('hello');
    const added = api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true })
      .then((v) => `resolved:${v}`, (e: { code?: unknown }) => `rejected:${e?.code}`);

    await new Promise((r) => { setTimeout(r, 8000); });
    rpc.injectFault('authorize', { code: grpcStatus.UNAVAILABLE });
    void api.request('GET', '/channels/123/messages').then(() => 'ok', (e: { code?: unknown; message?: unknown }) => `err:${e?.code ?? e?.message}`);

    expect(await added).toBe('resolved:false');
    const t2 = Date.now();
    const r2 = await api.request('GET', '/channels/123/messages').then(() => 'ok', (e: { code?: unknown; message?: unknown }) => `err:${e?.code ?? e?.message}`);
    const r2ms = Date.now() - t2;

    expect(r2).toBe('ok');
    expect(r2ms).toBeGreaterThan(1000);
    const latchWarnings = events.filter((e) => e.level === LOG_LEVELS.WARNING
      && typeof e.message === 'string' && /client is connecting to rpc server/i.test(e.message));
    expect(latchWarnings).toHaveLength(0);

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 30000);
});
