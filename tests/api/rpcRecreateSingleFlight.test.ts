import {
  describe, it, expect, vi,
} from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type Api from '../../src/clients/Api/Api';
import type { ApiOptions } from '../../src/clients/Api/types';

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

interface Counts { constructed: number; closed: number }

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
  it('single-flight: 8 concurrent calls into recreateRpcService produce exactly one construct and one close', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0 };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
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

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('authorizeRequestWithServer × rate-limit: recreates exactly once on a transport failure, and the successor authorises remotely on its next call (E-6)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    const counts: Counts = { constructed: 0, closed: 0 };
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
    const counts: Counts = { constructed: 0, closed: 0 };
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

  it('handleRequestRemote × request: recreates exactly once on a transport failure', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();
    const counts: Counts = { constructed: 0, closed: 0 };
    const api = await createInstrumentedApi(origin, counts);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
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

    api.end();
    await origin.close();
    await rpc.close();
  }, 15000);

  it('reattemptConnectInFuture × rate-limit: recreates exactly once when the initial connect fails', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });
    const counts: Counts = { constructed: 0, closed: 0 };
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
    const counts: Counts = { constructed: 0, closed: 0 };
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
