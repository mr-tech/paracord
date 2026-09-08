import {
  describe, it, expect,
} from 'vitest';
import { EventEmitter } from 'events';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent } from '../../src/clients/Api/types';

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };
const DEADLINE_MS = 10_000;
const TICK_MS = 1_000;

function isErrorEvent(e: ApiDebugEvent) { return e.level === LOG_LEVELS.ERROR; }
function isWarningEvent(e: ApiDebugEvent) { return e.level === LOG_LEVELS.WARNING; }
function isDebugEvent(e: ApiDebugEvent) { return e.level === LOG_LEVELS.DEBUG; }

function waitForDebugEvent(events: ApiDebugEvent[], emitter: EventEmitter, predicate: (e: ApiDebugEvent) => boolean, timeoutMs: number): Promise<void> {
  if (events.some(predicate)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off('DEBUG', check);
      reject(new Error(`waitForDebugEvent timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const check = (e: ApiDebugEvent) => {
      if (predicate(e)) {
        clearTimeout(timer);
        emitter.off('DEBUG', check);
        resolve();
      }
    };
    emitter.on('DEBUG', check);
  });
}

function waitForDebugEventCount(events: ApiDebugEvent[], emitter: EventEmitter, predicate: (e: ApiDebugEvent) => boolean, n: number, timeoutMs: number): Promise<void> {
  if (events.filter(predicate).length >= n) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off('DEBUG', check);
      reject(new Error(`waitForDebugEventCount timed out after ${timeoutMs}ms waiting for match ${n} (have ${events.filter(predicate).length})`));
    }, timeoutMs);
    const check = () => {
      if (events.filter(predicate).length >= n) {
        clearTimeout(timer);
        emitter.off('DEBUG', check);
        resolve();
      }
    };
    emitter.on('DEBUG', check);
  });
}

describe('AC-6.2 + AC-6.3 — deadline sites, allowFallback: true', () => {
  it('authorize hangs under maxConcurrency: 1 — both requests settle within their own deadlines instead of queueing forever', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter, maxConcurrency: 1 });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    rpc.withhold('authorize');

    const t0 = Date.now();
    const [resA, resB] = await Promise.all([
      api.request('GET', '/channels/1'),
      api.request('GET', '/channels/2'),
    ]);
    const elapsed = Date.now() - t0;

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(origin.acceptCount).toBe(2);

    const bound = DEADLINE_MS + TICK_MS + DEADLINE_MS + TICK_MS;
    expect(elapsed).toBeGreaterThanOrEqual(bound - 1500);
    expect(elapsed).toBeLessThan(bound + 8000);

    const errorEvents = events.filter((e) => isErrorEvent(e)
      && typeof e.message === 'string' && /authorization request did not succeed/i.test(e.message));
    expect(errorEvents).toHaveLength(2);

    api.end();
    await origin.close();
    rpc.release('authorize');
    rpc.forceClose();
  }, 30000);

  it('request-service request hangs — the REST request completes via the local fallback re-send within its deadline', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    rpc.withhold('request');

    const t0 = Date.now();
    const res = await api.request('GET', '/channels/1');
    const elapsed = Date.now() - t0;

    expect(res.status).toBe(200);
    expect(origin.acceptCount).toBe(1);
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 1000);
    expect(elapsed).toBeLessThan(DEADLINE_MS + 5000);

    const errorEvents = events.filter((e) => isErrorEvent(e)
      && typeof e.message === 'string' && /the rpc request did not succeed/i.test(e.message));
    expect(errorEvents).toHaveLength(1);

    api.end();
    await origin.close();
    rpc.release('request');
    rpc.forceClose();
  }, 20000);

  it('initial hello hangs — the connect promise settles within its deadline instead of pending forever, and the next request falls back locally (SL-2)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    rpc.withhold('hello');

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });

    const t0 = Date.now();
    const connected = await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    const elapsed = Date.now() - t0;

    expect(connected).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 1000);
    expect(elapsed).toBeLessThan(DEADLINE_MS + 5000);

    const warnings = events.filter(isWarningEvent).map((e) => e.message as string);
    expect(warnings.some((m) => /failed to connect to rpc server/i.test(m))).toBe(true);

    const res = await api.request('GET', '/channels/1');
    expect(res.status).toBe(200);
    expect(origin.acceptCount).toBe(1);
    expect(rpc.authorizeCalls).toBe(0);

    const fallbackWarnings = events.filter(isWarningEvent).map((e) => e.message as string);
    expect(fallbackWarnings.some((m) => /fallback is allowed/i.test(m))).toBe(true);

    api.end();
    await origin.close();
    rpc.release('hello');
    rpc.forceClose();
  }, 20000);

  it('initial hello hangs (request service) — the connect promise settles within its deadline instead of pending forever (WP6-F10)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();
    rpc.withhold('hello');

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });

    const t0 = Date.now();
    const connected = await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    const elapsed = Date.now() - t0;

    expect(connected).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 1000);
    expect(elapsed).toBeLessThan(DEADLINE_MS + 5000);

    const warnings = events.filter(isWarningEvent).map((e) => e.message as string);
    expect(warnings.some((m) => /failed to connect to rpc server/i.test(m))).toBe(true);

    api.end();
    await origin.close();
    rpc.release('hello');
    rpc.forceClose();
  }, 20000);

  it('update hangs (per-method) — the connection recreates within the deadline and the fix\'s ERROR line never fires (SL-1 substitute)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    rpc.withhold('update');

    const isSuccessLine = (e: ApiDebugEvent) => isDebugEvent(e)
      && /successfully established connection to rpc server/i.test(e.message as string);

    const t0 = Date.now();
    await api.request('GET', '/channels/1');
    await rpc.waitForUpdate(1);
    await waitForDebugEventCount(events, emitter, isSuccessLine, 2, 15000);
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 1000);
    expect(elapsed).toBeLessThan(DEADLINE_MS + 5000);

    const cacheErrorEvents = events.filter((e) => isErrorEvent(e)
      && /the rpc rate limit cache update did not succeed/i.test(e.message as string));
    expect(cacheErrorEvents).toHaveLength(0);

    expect(events.filter(isSuccessLine).length).toBeGreaterThanOrEqual(2);

    api.end();
    await origin.close();
    rpc.release('update');
    rpc.forceClose();
  }, 20000);

  it('update hangs and the whole server is down — the chained recreate settles within ~20s and the fix\'s ERROR line fires exactly once', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    rpc.withhold('update');
    rpc.withhold('hello');

    const t0 = Date.now();
    await api.request('GET', '/channels/1');
    await rpc.waitForUpdate(1);
    await waitForDebugEvent(events, emitter, (e) => isErrorEvent(e)
      && /the rpc rate limit cache update did not succeed/i.test(e.message as string), 25000);
    const elapsed = Date.now() - t0;

    const bound = DEADLINE_MS + DEADLINE_MS + TICK_MS;
    expect(elapsed).toBeGreaterThanOrEqual(bound - 1500);
    expect(elapsed).toBeLessThan(bound + 5000);

    const cacheErrorEvents = events.filter((e) => isErrorEvent(e)
      && /the rpc rate limit cache update did not succeed/i.test(e.message as string));
    expect(cacheErrorEvents).toHaveLength(1);

    api.end();
    await origin.close();
    rpc.release('update');
    rpc.release('hello');
    rpc.forceClose();
  }, 30000);

  it('authorize hangs and the whole server is down — the chained recreate settles within ~20s and the request completes locally (SP-6)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const api = await createApiAgainstOrigin(origin);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    rpc.withhold('authorize');
    rpc.withhold('hello');

    const t0 = Date.now();
    const res = await api.request('GET', '/channels/1');
    const elapsed = Date.now() - t0;

    expect(res.status).toBe(200);
    expect(origin.acceptCount).toBe(1);

    const bound = DEADLINE_MS + DEADLINE_MS + TICK_MS;
    expect(elapsed).toBeGreaterThanOrEqual(bound - 1500);
    expect(elapsed).toBeLessThan(bound + 5000);

    api.end();
    await origin.close();
    rpc.release('authorize');
    rpc.release('hello');
    rpc.forceClose();
  }, 30000);
});
