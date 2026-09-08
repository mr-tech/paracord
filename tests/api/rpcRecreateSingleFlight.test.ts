import {
  describe, it, expect, vi,
} from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import LoopbackApiOrigin from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { createInstrumentedApi, type Counts } from '../harness/instrumentedApi';

import type { ApiDebugEvent, ApiOptions } from '../../src/clients/Api/types';

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
    counts.constructed = 0;
    counts.closed = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await Promise.all(Array.from({ length: 8 }, () => (api as any).recreateRpcService() as Promise<boolean>));
    expect(results.every((r) => r === true)).toBe(true);

    expect(counts.constructed).toBe(1);
    expect(counts.closed).toBe(1);
    expect(api.hasRateLimitService).toBe(true);
    expect(api.hasRequestService).toBe(false);
    expect(api.rpcRequestService).toBeUndefined();

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
    expect(rpc.helloCalls).toBe(2);

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
    expect(origin.acceptCount).toBe(1);

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
    expect(rpc.authorizeCalls).toBeGreaterThanOrEqual(1);

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
    await rpc.waitForHello(2, 5000);

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

  it('handleRequestRemote × request, a non-idempotent method: still recreates on a transport failure even though the client does not resend it (WP7-F10, D-49)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    counts.constructed = 0;
    counts.closed = 0;

    rpc.injectFault('request', { code: grpcStatus.UNAVAILABLE });
    const outcome = await api.request('POST', '/channels/1', { data: { content: 'hi' } }).then(
      () => 'resolved',
      (e: { code?: unknown }) => `rejected:${e?.code}`,
    );

    expect(outcome).toBe(`rejected:${grpcStatus.UNAVAILABLE}`);
    expect(origin.acceptCount).toBe(0);

    expect(counts.constructed).toBe(1);
    expect(counts.closed).toBe(1);

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
    await rpc.waitForHello(2, 5000);

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

describe('AC-6.1 — the identity check in checkRpcServiceConnection is the sole deciding factor (WP6-F9)', () => {
  it('a stale success from a superseded service does not clear the reconnect latch armed by its successor', async () => {
    vi.resetModules();
    const helloDeferreds: ReturnType<typeof createDeferred<void>>[] = [];
    vi.doMock('../../src/rpc', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/rpc')>();
      return {
        ...actual,
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
      .then((v) => `resolved:${v}`, (e: { code?: unknown }) => `rejected:${e?.code}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recreated = (api as any).recreateRpcService() as Promise<boolean>;
    expect(helloDeferreds).toHaveLength(2);

    helloDeferreds[1].reject(Object.assign(new Error('down'), { code: grpcStatus.UNAVAILABLE }));
    await recreated;

    const successLogs = () => events.filter((e) => typeof e.message === 'string'
      && /successfully established connection to rpc server/i.test(e.message));
    expect(successLogs()).toHaveLength(0);

    helloDeferreds[0].resolve();
    await added;

    expect(successLogs()).toHaveLength(0);

    api.end();
  }, 10000);
});
