import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type { ApiOptions } from '../../src/clients/Api/types';

/**
 * Plan 001 WP-7 step 5, AC-7.6 (D-49): `Api#handleRequestRemote`'s catch re-sends a
 * request locally, after an RPC transport failure, only where `isIdempotentMethod`
 * holds — the fallback gate's method conjunct, reusing WP-5's predicate verbatim. A
 * non-idempotent body the client has handed to the proxy is never re-sent by the
 * client; the recreate still runs either way (WP-6's lifecycle, AC-6.1's count
 * unchanged) and the transport error is rethrown to the caller when the method is
 * gated out.
 *
 * Origin-level, per qa's WP7-F2 remedy: the proxy's own `Api` is tagged with a
 * distinguishing request header (`x-wp7-party: proxy`, `Api.createWrappedRequestMethod`
 * spreads `requestOptions.headers` into every outgoing request), so the origin's
 * `receivedHeaders` attribute each receipt to proxy or client directly — never by
 * subtraction, which qa demonstrated gives a false positive under a non-2xx origin or a
 * waited-out 429 (neither exercised here; both are outside this gate's scope).
 *
 * Uses `LoopbackRpcServer#forwardThenFail`/`forwardThenWithhold` (step 6): the real
 * production handler runs to completion — a genuine forward reaches the loopback origin,
 * counted like any other request — before the client is answered with the trigger code
 * or left to its own deadline. The proxy's `apiClient` is pointed at the loopback origin
 * via `startRequestService`'s `origin` parameter (qa WP7-F4's arm M2) so no cell here can
 * reach Discord's real API by construction.
 *
 * Representative members, not the full 14-spelling x 4-code x 2-arm matrix qa's Phase 1
 * probe already drove exhaustively against the unfixed tree (`wp7-ac76-fixed-tree-ee277b5.json`)
 * — qa's Phase 2 audits that matrix's adequacy. Every conjunct of the compound predicate
 * is the sole decider in at least one fixture below, per qa's Coverage Obligations table.
 */

const OK_RESPONSE = { status: 200, body: { ok: true } };
const PARTY_HEADER = 'x-wp7-party';
const PROXY_OPTIONS: ApiOptions = { requestOptions: { headers: { [PARTY_HEADER]: 'proxy' } } };

function proxyReceipts(origin: LoopbackApiOrigin): number {
  return origin.receivedHeaders.filter((h) => h[PARTY_HEADER] === 'proxy').length;
}

function clientReceipts(origin: LoopbackApiOrigin): number {
  return origin.receivedHeaders.filter((h) => h[PARTY_HEADER] !== 'proxy').length;
}

async function requestOutcome(
  api: Awaited<ReturnType<typeof createApiAgainstOrigin>>,
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ resolved: boolean; status?: number; code?: unknown }> {
  return api.request(method as never, '/channels/1/messages', { data: { content: 'hi' } }).then(
    (res) => ({ resolved: true, status: res.status }),
    (err: { code?: unknown }) => ({ resolved: false, code: err.code }),
  );
}

describe('AC-7.6 — forward-then-fail (codes 14/1/13), allowFallback: true', () => {
  it.each([
    ['POST', false],
    ['post', false],
    ['PATCH', false],
    ['GET', true],
    ['get', true],
    ['PUT', true],
  ])('%s resends locally from the client iff the method is idempotent', async (method, shouldResend) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
    rpc.forwardThenFail('request', { code: grpcStatus.UNAVAILABLE });

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const outcome = await requestOutcome(api, method);

    expect(proxyReceipts(origin)).toBe(1); // the proxy's own forward always happens exactly once
    if (shouldResend) {
      expect(outcome).toEqual({ resolved: true, status: 200 });
      expect(clientReceipts(origin)).toBe(1);
    } else {
      expect(outcome).toEqual({ resolved: false, code: grpcStatus.UNAVAILABLE });
      expect(clientReceipts(origin)).toBe(0);
    }

    api.end();
    await origin.close();
    rpc.clearForwardThenFail('request');
    rpc.forceClose();
  }, 15000);
});

describe('AC-7.6 — forward-then-fail, allowFallback: false (unaffected baseline)', () => {
  it.each(['POST', 'GET'])('%s rethrows without recreating or resending, regardless of method', async (method) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
    rpc.forwardThenFail('request', { code: grpcStatus.CANCELLED });

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    const outcome = await requestOutcome(api, method);

    expect(outcome).toEqual({ resolved: false, code: grpcStatus.CANCELLED });
    expect(clientReceipts(origin)).toBe(0);
    expect(proxyReceipts(origin)).toBe(1);

    api.end();
    await origin.close();
    rpc.clearForwardThenFail('request');
    rpc.forceClose();
  }, 15000);
});

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

describe('AC-7.6 — controls (WP7-F2\'s non-member population)', () => {
  it('C-A: an out-of-set code (2, UNKNOWN) is rethrown even for an idempotent method — isRpcTransportFailure alone decides', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
    rpc.forwardThenFail('request', { code: grpcStatus.UNKNOWN });

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const outcome = await requestOutcome(api, 'GET');

    expect(outcome).toEqual({ resolved: false, code: grpcStatus.UNKNOWN });
    expect(clientReceipts(origin)).toBe(0);

    api.end();
    await origin.close();
    rpc.clearForwardThenFail('request');
    rpc.forceClose();
  }, 15000);

  it('C-B: the latched branch (never handed to the proxy) still falls back for every method, unchanged by the gate (D-43)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
    rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE }); // the initial connect fails transport-wise, arming the latch

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const outcome = await requestOutcome(api, 'POST');

    expect(outcome).toEqual({ resolved: true, status: 200 }); // falls back locally, unaffected by the new method gate
    expect(clientReceipts(origin)).toBe(1);
    expect(proxyReceipts(origin)).toBe(0); // never forwarded — outside the gate's population

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 15000);

  it('C-C: a clean proxied call makes no client contribution', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const outcome = await requestOutcome(api, 'POST');

    expect(outcome).toEqual({ resolved: true, status: 200 });
    expect(proxyReceipts(origin)).toBe(1);
    expect(clientReceipts(origin)).toBe(0);

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 15000);
});
