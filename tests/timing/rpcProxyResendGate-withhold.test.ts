import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import {
  PROXY_OPTIONS, proxyReceipts, clientReceipts, requestOutcome,
} from '../harness/partyAttribution';

/**
 * Plan 001 WP-7 step 5, AC-7.6 (D-49) — the deadline member of the resend gate's trigger
 * class, driven the way production reaches it: the proxy forwards, then withholds its
 * reply (`LoopbackRpcServer#forwardThenWithhold`), and the client's own 10 s RPC deadline
 * (code 4) is what fails the call. The other three members and every control are
 * `tests/api/rpcProxyResendGate.test.ts`, where code 4 is also driven as an injected
 * status at no wall-clock cost.
 *
 * Time-based: each cell waits out the real deadline and asserts on the elapsed time, so
 * it lives in `tests/timing/` and runs only under `npm run test:timing`.
 */

const OK_RESPONSE = { status: 200, body: { ok: true } };

describe('AC-7.6 — forward-then-withhold (code 4, the client\'s own deadline)', () => {
  it.each([
    ['POST', false],
    ['GET', true],
  ])('%s resends locally from the client iff the method is idempotent', async (method, shouldResend) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
    rpc.forwardThenWithhold('request');

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const t0 = Date.now();
    const outcome = await requestOutcome(api, method);
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeGreaterThanOrEqual(10_000 - 1000);
    expect(elapsed).toBeLessThan(10_000 + 5000);
    expect(proxyReceipts(origin)).toBe(1);
    if (shouldResend) {
      expect(outcome).toEqual({ resolved: true, status: 200 });
      expect(clientReceipts(origin)).toBe(1);
    } else {
      expect(outcome).toEqual({ resolved: false, code: grpcStatus.DEADLINE_EXCEEDED });
      expect(clientReceipts(origin)).toBe(0);
    }

    api.end();
    await origin.close();
    rpc.forceClose(); // a withheld stream does not resolve close() (WP6-F4's precedent)
  }, 20000);
});
