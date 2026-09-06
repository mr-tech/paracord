import {
  describe, it, expect, vi,
} from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import LoopbackApiOrigin from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { LOG_LEVELS } from '../../src/constants';

import type Api from '../../src/clients/Api/Api';
import type { ApiDebugEvent, ApiOptions } from '../../src/clients/Api/types';

/**
 * Plan 001 WP-6 step 1, AC-6.1: `recreateRpcService` becomes single-flight (concurrent
 * callers share one in-flight recreation) and closes the previous client before replacing
 * it — over the five reachable (site, kind) pairs the mutual-exclusion guard on
 * `add*Service` leaves (WP6-F1): `reattemptConnectInFuture` under either kind,
 * `authorizeRequestWithServer`/`updateRpcCache` under the rate-limit kind only,
 * `handleRequestRemote` under the request kind only.
 *
 * Two separate properties, two separate constructions, because driving them together is
 * unreliable: concurrency and site-reachability.
 *
 * - **Concurrency** (`recreateRpcService` coalesces N ≥ 8 simultaneous callers into one
 *   recreation) is driven by calling the private method directly, N times in one
 *   `Promise.all`. This is deliberate, not the shortcut WP6-F1 warns against: eight
 *   independent real RPC calls failing over a real loopback socket do not arrive within
 *   the same synchronous tick — measured (`rpcCacheUpdateRecreateFailure`-style bursts
 *   here first): 2–3 separate recreations, not 1, purely from network scheduling, which
 *   would misreport the *method's* own single-flight gate as broken. A direct call
 *   removes that noise; it is the caller-agnostic mechanism itself under test here, and
 *   its correctness does not depend on which site invokes it.
 * - **Site-reachability** (each of the five pairs genuinely reaches `recreateRpcService`,
 *   with the right kind) is driven through each site's own real trigger, one concurrent
 *   call at a time — exactly what WP6-F1 asks for, and what a direct call cannot show.
 *
 * Every cell drives the real production client against a real loopback `RpcServer` — not
 * a bare stub — so the counts below also stand for AC-6.1's real-channel requirement
 * (E-6): `createRateLimitService`/`createRequestService` are wrapped, not replaced, via
 * `vi.doMock('../../src/rpc', ...)`, so `hello`/`authorize`/`update`/`request` all make a
 * genuine round trip to the harness server and only `close()` is intercepted to count.
 *
 * WP6-F2's required cell — the service kind asserted after a recreate, not just the
 * construct/close counts — is folded into every cell below rather than run once on its
 * own: `api.hasRateLimitService`/`hasRequestService` are read afterwards, which is
 * exactly the window a `recreateRpcService` that clears the field before assigning its
 * replacement could have flipped.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Counts { constructed: number; closed: number; services: any[] }

async function createInstrumentedApi(origin: LoopbackApiOrigin, counts: Counts, options: ApiOptions = {}): Promise<Api> {
  vi.resetModules();
  vi.doMock('../../src/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/constants')>();
    return { ...actual, DISCORD_API_URL: `${origin.url}/api` };
  });
  vi.doMock('../../src/rpc', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/rpc')>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countClose = (create: (opts: any) => any) => (opts: any) => {
      const service = create(opts);
      counts.constructed += 1;
      counts.services.push(service);
      const originalClose = service.close.bind(service);
      service.close = () => {
        counts.closed += 1;
        originalClose();
      };
      return service;
    };
    return {
      ...actual,
      createRateLimitService: countClose(actual.createRateLimitService),
      createRequestService: countClose(actual.createRequestService),
    };
  });

  const { default: ApiCtor } = await import('../../src/clients/Api/Api');
  return new ApiCtor('test-token', options);
}

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };

describe('AC-6.1 — recreateRpcService is single-flight and closes the predecessor exactly once', () => {
  it('single-flight: 8 concurrent calls into recreateRpcService produce exactly one construct and one close, and the predecessor is actually closed (WP6-F11)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    const predecessor = counts.services[0];
    counts.constructed = 0; // the initial connect's own construct is not what this cell measures
    counts.closed = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await Promise.all(Array.from({ length: 8 }, () => (api as any).recreateRpcService() as Promise<boolean>));
    expect(results.every((r) => r === true)).toBe(true);

    expect(counts.constructed).toBe(1);
    expect(counts.closed).toBe(1);
    expect(api.hasRateLimitService).toBe(true); // WP6-F2: never flipped kind
    expect(api.hasRequestService).toBe(false);
    expect(api.rpcRequestService).toBeUndefined();

    // WP6-F11: AC-6.1's counters only see that `close()` was called, not that it closed
    // anything — a `close()` that closes nothing satisfies them just the same. The
    // predecessor's channel must actually be dead: calling it now must fail, the same
    // shape RP-2's positive control measured for a client closing its own channel.
    const predecessorOutcome = await predecessor.hello().then(
      () => 'resolved',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => String(e?.details ?? e?.message),
    );
    expect(predecessorOutcome).toMatch(/channel has been shut down/i);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('recreateRpcService recreates independently on each subsequent call — a second reconnect is not silently absorbed by the first (WP6-F8)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    counts.constructed = 0;
    counts.closed = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = await ((api as any).recreateRpcService() as Promise<boolean>);
    await rpc.waitForHello(2, 5000);
    expect(first).toBe(true);
    expect(rpc.helloCalls).toBe(2); // the initial connect's hello, plus this recreate's

    // WP6-F8: if `#recreateInFlight` is never cleared, this second call returns the
    // FIRST recreation's cached promise and no new `hello` ever reaches the server — a
    // shard that loses its RPC server twice reconnects once and then never again,
    // silently, while every request still completes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const second = await ((api as any).recreateRpcService() as Promise<boolean>);
    await rpc.waitForHello(3, 5000);
    expect(second).toBe(true);
    expect(rpc.helloCalls).toBe(3);

    expect(counts.constructed).toBe(2);
    expect(counts.closed).toBe(2);
    expect(api.hasRateLimitService).toBe(true);
    expect(api.hasRequestService).toBe(false);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('authorizeRequestWithServer × rate-limit: recreates exactly once on a transport failure, and the successor authorises remotely on its next call (E-6)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    counts.constructed = 0;
    counts.closed = 0;

    rpc.injectFault('authorize', { code: grpcStatus.UNAVAILABLE });
    const res = await api.request('GET', '/channels/1');
    expect(res.status).toBe(200);
    expect(origin.acceptCount).toBe(1); // fell back locally

    expect(counts.constructed).toBe(1);
    expect(counts.closed).toBe(1);
    expect(api.hasRateLimitService).toBe(true);
    expect(api.hasRequestService).toBe(false);

    rpc.clearFault('authorize');
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on('unhandledRejection', onUnhandled);

    const successor = await api.request('GET', '/channels/2');
    expect(successor.status).toBe(200);
    expect(rpc.authorizeCalls).toBeGreaterThanOrEqual(1); // reached the server for real — E-6

    expect(unhandled).toHaveLength(0);
    process.off('unhandledRejection', onUnhandled);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('updateRpcCache × rate-limit: recreates exactly once on a transport failure', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    counts.constructed = 0;
    counts.closed = 0;

    rpc.injectFault('update', { code: grpcStatus.UNAVAILABLE });
    await api.request('GET', '/channels/1');
    await rpc.waitForUpdate(1);
    await rpc.waitForHello(2, 5000); // the recreate's own hello has reached the server

    expect(counts.constructed).toBe(1);
    expect(counts.closed).toBe(1);
    expect(api.hasRateLimitService).toBe(true);
    expect(api.hasRequestService).toBe(false);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('handleRequestRemote × request: recreates exactly once on a transport failure, and the predecessor is actually closed (WP6-F11)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    const predecessor = counts.services[0];
    counts.constructed = 0;
    counts.closed = 0;

    rpc.injectFault('request', { code: grpcStatus.UNAVAILABLE });
    const res = await api.request('GET', '/channels/1');
    expect(res.status).toBe(200);
    expect(origin.acceptCount).toBe(1);

    expect(counts.constructed).toBe(1);
    expect(counts.closed).toBe(1);
    expect(api.hasRequestService).toBe(true);
    expect(api.hasRateLimitService).toBe(false);

    // WP6-F11: the request-service twin of the rate-limit assertion above — its own
    // `close()` mutant (M22) is a separate production file from the rate-limit kind's
    // (M21) and is not caught by that one cell.
    const predecessorOutcome = await predecessor.hello().then(
      () => 'resolved',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => String(e?.details ?? e?.message),
    );
    expect(predecessorOutcome).toMatch(/channel has been shut down/i);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('reattemptConnectInFuture × rate-limit: recreates exactly once when the initial connect fails', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);

    const connected = await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    expect(connected).toBe(false);
    expect(counts.constructed).toBe(1);

    rpc.clearFault('hello');
    await rpc.waitForHello(2, 5000); // the timer's own recreate (reattemptConnectInFuture(1))

    expect(counts.constructed).toBe(2);
    expect(counts.closed).toBe(1);
    expect(api.hasRateLimitService).toBe(true);
    expect(api.hasRequestService).toBe(false);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('reattemptConnectInFuture × request: recreates exactly once when the initial connect fails', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();
    rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);

    const connected = await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    expect(connected).toBe(false);
    expect(counts.constructed).toBe(1);

    rpc.clearFault('hello');
    await rpc.waitForHello(2, 5000);

    expect(counts.constructed).toBe(2);
    expect(counts.closed).toBe(1);
    expect(api.hasRequestService).toBe(true);
    expect(api.hasRateLimitService).toBe(false);

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);
});

function createDeferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/**
 * `checkRpcServiceConnection`'s identity check (`isCurrentService`) exists because a
 * service superseded by a recreate may still have a `hello()` call outstanding, and that
 * call's eventual settlement — success or failure — must not be read as the *current*
 * service's own outcome. WP6-F1's five reachable (site, kind) pairs above never build
 * this race, so nothing there exercises the guard at all.
 */
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

  it('a stale success from a superseded service does not clear the reconnect latch armed by its successor', async () => {
    vi.resetModules();
    const helloDeferreds: ReturnType<typeof createDeferred<void>>[] = [];
    vi.doMock('../../src/rpc', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/rpc')>();
      return {
        ...actual,
        // A fully-controlled stand-in, not a wrapped real factory: the guard under test
        // is the identity check's own logic in `checkRpcServiceConnection`, not any
        // transport property, and only a controlled `hello()` can deterministically
        // place a real success *after* a recreate has already replaced its service —
        // `LoopbackRpcServer`'s `withhold` holds a call open forever (it has no way to
        // answer one after the fact), so it can only ever produce a stale *failure*
        // (the cell above), never a stale *success*.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createRateLimitService: (opts: any) => {
          const deferred = createDeferred<void>();
          helloDeferreds.push(deferred);
          return {
            target: `${opts.host}:${opts.port}`,
            allowFallback: opts.allowFallback ?? false,
            hello: () => deferred.promise,
            authorize: () => Promise.reject(Object.assign(new Error('unused in this cell'), { code: grpcStatus.UNAVAILABLE })),
            update: () => Promise.reject(Object.assign(new Error('unused in this cell'), { code: grpcStatus.UNAVAILABLE })),
            close: () => {},
          };
        },
      };
    });
    const { default: ApiCtor } = await import('../../src/clients/Api/Api');
    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));
    const api = new ApiCtor('test-token', { emitter } as ApiOptions);

    const added = api.addRateLimitService({ host: '127.0.0.1', port: '1', allowFallback: true })
      .then((v) => `resolved:${v}`, (e: { code?: unknown }) => `rejected:${e?.code}`); // S1's hello (helloDeferreds[0]) is now pending

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recreated = (api as any).recreateRpcService() as Promise<boolean>; // synchronous: S2 created, S1 closed, before either hello settles
    expect(helloDeferreds).toHaveLength(2);

    helloDeferreds[1].reject(Object.assign(new Error('down'), { code: grpcStatus.UNAVAILABLE })); // S2's own hello fails — arms the latch
    await recreated;

    const successLogs = () => events.filter((e) => typeof e.message === 'string'
      && /successfully established connection to rpc server/i.test(e.message));
    expect(successLogs()).toHaveLength(0); // sanity: nothing has succeeded yet

    // WP6-F9 (M9): S1 is no longer current when its stale hello finally answers. Without
    // the identity guard on the try arm, this unconditionally logs success and clears
    // the latch S2's failure just armed — silently re-opening the fallback window S2's
    // own reconnect ladder exists to close.
    helloDeferreds[0].resolve();
    await added;

    expect(successLogs()).toHaveLength(0);

    api.end();
  }, 10000);
});
