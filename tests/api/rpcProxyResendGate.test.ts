import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import {
  PARTY_HEADER, PROXY_OPTIONS, proxyReceipts, clientReceipts, requestOutcome,
} from '../harness/partyAttribution';

const OK_RESPONSE = { status: 200, body: { ok: true } };

describe('AC-7.6 — forward-then-fail (codes 14/4/1/13), allowFallback: true', () => {
  it.each([
    ['POST', false, grpcStatus.UNAVAILABLE],
    ['post', false, grpcStatus.UNAVAILABLE],
    ['PATCH', false, grpcStatus.UNAVAILABLE],
    ['GET', true, grpcStatus.UNAVAILABLE],
    ['get', true, grpcStatus.UNAVAILABLE],
    ['PUT', true, grpcStatus.UNAVAILABLE],
    ['POST', false, grpcStatus.CANCELLED],
    ['get', true, grpcStatus.CANCELLED],
    ['post', false, grpcStatus.INTERNAL],
    ['GET', true, grpcStatus.INTERNAL],
    ['PATCH', false, grpcStatus.DEADLINE_EXCEEDED],
    ['put', true, grpcStatus.DEADLINE_EXCEEDED],
  ])('%s / idempotent=%s / code %i resends locally from the client iff the method is idempotent', async (method, shouldResend, code) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
    rpc.forwardThenFail('request', { code });

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const outcome = await requestOutcome(api, method);

    expect(proxyReceipts(origin)).toBe(1);
    expect(origin.receivedHeaders[0]![PARTY_HEADER]).toBe('proxy');
    if (shouldResend) {
      expect(outcome).toEqual({ resolved: true, status: 200 });
      expect(clientReceipts(origin)).toBe(1);
      expect(origin.receivedHeaders[1]![PARTY_HEADER]).not.toBe('proxy');
    } else {
      expect(outcome).toEqual({ resolved: false, code });
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
    rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const outcome = await requestOutcome(api, 'POST');

    expect(outcome).toEqual({ resolved: true, status: 200 });
    expect(clientReceipts(origin)).toBe(1);
    expect(proxyReceipts(origin)).toBe(0);

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
