import {
  describe, it, expect,
} from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

/**
 * Plan 001 WP-6 step 2, AC-6.6 (`allowFallback: false` — added at revision 47, qa WP6-F3):
 * the arm where today's hang is worst. A hung rate-limit server leaves these consumers
 * stuck forever with no fallback available at all; after WP-6 the same call fails within
 * its deadline instead. The rejection's shape is asserted **as it is today** at every site
 * (D-43 — this criterion covers arrival only and does not give the code-less rejection a
 * code): `authorize`/`request` rethrow the `ServiceError` (`code` 4, the same shape a real
 * connection loss already produces); the `hello`-initial latch throws a code-less `Error`
 * once it is set; `update` is unaffected by the option and needs no cell (`updateRpcCache`
 * reads only the transport predicate, never `#allowFallback`).
 *
 * The `hello`-initial cell drives two requests, not one, because the option only changes
 * behaviour for a request made *after* the connect attempt has settled and the latch has
 * set — a request issued while `#connectingToRpcService` is still false goes straight to a
 * live `authorize()` call regardless of the option, since that guard is never consulted
 * (F-76(a)'s corrected reading; verified against `authorizeRequestWithServer`'s and
 * `checkRpcServiceConnection`'s own source before this fixture was written).
 */

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };
const DEADLINE_MS = 10_000;

describe('AC-6.6 — deadline sites, allowFallback: false', () => {
  it('authorize hangs — the REST call rejects within the deadline with the same ServiceError shape a real connection loss produces', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const api = await createApiAgainstOrigin(origin);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });
    rpc.withhold('authorize');

    const t0 = Date.now();
    let errCode: unknown;
    try {
      await api.request('GET', '/channels/1');
    } catch (err: any) {
      errCode = err.code;
    }
    const elapsed = Date.now() - t0;

    expect(errCode).toBe(grpcStatus.DEADLINE_EXCEEDED);
    expect(origin.acceptCount).toBe(0); // no local send on this arm
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 1000);
    expect(elapsed).toBeLessThan(DEADLINE_MS + 5000);

    api.end();
    await origin.close();
    rpc.release('authorize');
    rpc.forceClose();
  }, 20000);

  it('request-service request hangs — the REST call rejects within the deadline with the same ServiceError shape', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService();

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });
    rpc.withhold('request');

    const t0 = Date.now();
    let errCode: unknown;
    try {
      await api.request('GET', '/channels/1');
    } catch (err: any) {
      errCode = err.code;
    }
    const elapsed = Date.now() - t0;

    expect(errCode).toBe(grpcStatus.DEADLINE_EXCEEDED);
    expect(origin.acceptCount).toBe(0);
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 1000);
    expect(elapsed).toBeLessThan(DEADLINE_MS + 5000);

    api.end();
    await origin.close();
    rpc.release('request');
    rpc.forceClose();
  }, 20000);

  it('initial hello hangs — a request issued before the deadline still authorises directly, and every later request rejects immediately once the latch sets (D-43)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    rpc.withhold('hello');

    const api = await createApiAgainstOrigin(origin);
    const connectPromise = api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    // Issued while #connectingToRpcService is still false — nothing has failed yet, so
    // this goes straight to a live authorize() call on the channel hello() is still
    // probing. Unaffected by allowFallback: that guard is never reached.
    const early = await api.request('GET', '/channels/1');
    expect(early.status).toBe(200);
    expect(rpc.authorizeCalls).toBeGreaterThanOrEqual(1);

    const connected = await connectPromise;
    expect(connected).toBe(false); // AC-6.6: resolves false at ~10s regardless of the option

    let errCode: unknown;
    let threw = false;
    const t0 = Date.now();
    try {
      await api.request('GET', '/channels/2'); // every later request, while the latch holds
    } catch (err: any) {
      threw = true;
      errCode = err.code;
    }
    const elapsed = Date.now() - t0;

    expect(threw).toBe(true);
    expect(errCode).toBeUndefined(); // D-43: the code-less rejection's shape stays as it is
    expect(elapsed).toBeLessThan(1000); // immediate — no RPC round trip, no wait

    api.end();
    await origin.close();
    rpc.release('hello');
    rpc.forceClose();
  }, 20000);

  it('update hangs — unaffected by the option, unchanged from the allowFallback: true arm', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const api = await createApiAgainstOrigin(origin);
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });
    rpc.withhold('update');

    await api.request('GET', '/channels/1');
    await rpc.waitForUpdate(1);
    await rpc.waitForHello(2, 15000); // the recreate proceeds regardless of the option

    api.end();
    await origin.close();
    rpc.release('update');
    rpc.forceClose();
  }, 20000);
});
