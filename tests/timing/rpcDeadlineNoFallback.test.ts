import {
  describe, it, expect,
} from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

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
    expect(origin.acceptCount).toBe(0);
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

    const early = await api.request('GET', '/channels/1');
    expect(early.status).toBe(200);
    expect(rpc.authorizeCalls).toBeGreaterThanOrEqual(1);

    const connected = await connectPromise;
    expect(connected).toBe(false);

    let errCode: unknown;
    let threw = false;
    const t0 = Date.now();
    try {
      await api.request('GET', '/channels/2');
    } catch (err: any) {
      threw = true;
      errCode = err.code;
    }
    const elapsed = Date.now() - t0;

    expect(threw).toBe(true);
    expect(errCode).toBeUndefined();
    expect(elapsed).toBeLessThan(1000);

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
    await rpc.waitForHello(2, 15000);

    api.end();
    await origin.close();
    rpc.release('update');
    rpc.forceClose();
  }, 20000);
});
