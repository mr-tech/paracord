import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';

import LoopbackApiOrigin from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { createInstrumentedApi } from '../harness/instrumentedApi';
import { PARTY_HEADER, PROXY_OPTIONS, clientReceipts } from '../harness/partyAttribution';
import ApiRequest from '../../src/clients/Api/structures/ApiRequest';

import type { Counts } from '../harness/instrumentedApi';
import type Api from '../../src/clients/Api/Api';

const ENDED = /client has ended/i;
const SETTLE_GUARD_MS = 4000;
const PROMPT_SETTLE_MS = 3000;
const OK_RESPONSE = { status: 200, body: { ok: true } };

type Kind = 'none' | 'request' | 'rateLimit';

interface Rig {
  origin: LoopbackApiOrigin;
  rpc: LoopbackRpcServer | undefined;
  api: Api;
  counts: Counts;
  stop: () => Promise<void>;
}

async function rig(kind: Kind, allowFallback = true): Promise<Rig> {
  const origin = await LoopbackApiOrigin.start();
  origin.setDefaultResponse(OK_RESPONSE);
  let rpc: LoopbackRpcServer | undefined;
  if (kind === 'request') rpc = await LoopbackRpcServer.startRequestService('test-token', origin, PROXY_OPTIONS);
  if (kind === 'rateLimit') rpc = await LoopbackRpcServer.start();
  const counts: Counts = { constructed: 0, closed: 0, services: [] };
  const api = await createInstrumentedApi(origin, counts);
  if (rpc && kind === 'request') await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback });
  if (rpc && kind === 'rateLimit') await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback });
  return {
    origin,
    rpc,
    api,
    counts,
    stop: async () => {
      await origin.close();
      rpc?.forceClose();
    },
  };
}

function spyOnCalls(service: unknown, method: 'request' | 'authorize'): () => number {
  const target = service as Record<string, (...args: unknown[]) => unknown>;
  const original = target[method]!.bind(target);
  let calls = 0;
  target[method] = (...args: unknown[]) => { calls += 1; return original(...args); };
  return () => calls;
}

const HUNG = Symbol('hung');

async function outcomeOf(promise: Promise<unknown>): Promise<Error | 'resolved' | typeof HUNG> {
  const guard = new Promise<typeof HUNG>((resolve) => { setTimeout(() => resolve(HUNG), SETTLE_GUARD_MS).unref(); });
  return Promise.race([promise.then(() => 'resolved' as const, (err: Error) => err), guard]);
}

function expectEnded(outcome: unknown): void {
  expect(outcome).toBeInstanceOf(Error);
  expect((outcome as Error).message).toMatch(ENDED);
}

function settle(ms = 150): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

describe('AC-5.3 — every request made after end() rejects with the ended error and sends nothing', () => {
  it('no service: Api#request', async () => {
    const { api, origin, stop } = await rig('none');
    api.end();
    const outcome = await outcomeOf(api.request('GET', '/channels/1/messages'));
    await settle();
    const receipts = origin.requestReceipts.length;
    await stop();

    expectEnded(outcome);
    expect(receipts).toBe(0);
  });

  it('request service, proxied path: Api#request, and the service is never asked', async () => {
    const {
      api, origin, rpc, counts, stop,
    } = await rig('request');
    const serviceRequests = spyOnCalls(counts.services[0], 'request');
    api.end();
    const outcome = await outcomeOf(api.request('GET', '/channels/1/messages'));
    await settle();
    const result = { receipts: origin.requestReceipts.length, rpcRequests: rpc!.requestCalls, serviceRequests: serviceRequests() };
    await stop();

    expectEnded(outcome);
    expect(result).toEqual({ receipts: 0, rpcRequests: 0, serviceRequests: 0 });
  });

  it('request service, local: true: Api#request', async () => {
    const {
      api, origin, rpc, stop,
    } = await rig('request');
    api.end();
    const outcome = await outcomeOf(api.request('GET', '/channels/1/messages', { local: true }));
    await settle();
    const result = { receipts: origin.requestReceipts.length, rpcRequests: rpc!.requestCalls };
    await stop();

    expectEnded(outcome);
    expect(result).toEqual({ receipts: 0, rpcRequests: 0 });
  });

  it('rate-limit service: Api#request', async () => {
    const {
      api, origin, rpc, stop,
    } = await rig('rateLimit');
    api.end();
    const outcome = await outcomeOf(api.request('GET', '/channels/1/messages'));
    await settle();
    const result = { receipts: origin.requestReceipts.length, authorizeArrivals: rpc!.authorizeArrivals };
    await stop();

    expectEnded(outcome);
    expect(result).toEqual({ receipts: 0, authorizeArrivals: 0 });
  });

  it('a direct call of the public Api#sendRequest', async () => {
    const { api, origin, stop } = await rig('none');
    api.end();
    const apiRequest = new ApiRequest('GET', '/channels/1/messages', 'channels', '1', undefined, 'GET-channels');
    const outcome = await outcomeOf(api.sendRequest(apiRequest));
    await settle();
    const receipts = origin.requestReceipts.length;
    await stop();

    expectEnded(outcome);
    expect(receipts).toBe(0);
  });

  it('a direct call of the public Api#sendRequest with a rate-limit service: the service is never asked', async () => {
    const {
      api, origin, counts, stop,
    } = await rig('rateLimit');
    const authorizations = spyOnCalls(counts.services[0], 'authorize');
    api.end();
    const apiRequest = new ApiRequest('GET', '/channels/1/messages', 'channels', '1', undefined, 'GET-channels');
    const outcome = await outcomeOf(api.sendRequest(apiRequest));
    await settle();
    const result = { receipts: origin.requestReceipts.length, authorizations: authorizations() };
    await stop();

    expectEnded(outcome);
    expect(result).toEqual({ receipts: 0, authorizations: 0 });
  });

  it.each(['request', 'rateLimit'] as const)('adding a %s service after end() creates no client', async (kind) => {
    const {
      api, counts, rpc, stop,
    } = await rig('none');
    const constructedBefore = counts.constructed;
    api.end();
    const attempt = kind === 'request'
      ? () => api.addRequestService({ host: '127.0.0.1', port: rpc?.port ?? 1 })
      : () => api.addRateLimitService({ host: '127.0.0.1', port: rpc?.port ?? 1 });
    const outcome = await outcomeOf(Promise.resolve().then(attempt));
    const constructedAfter = counts.constructed;
    await stop();

    expectEnded(outcome);
    expect(constructedAfter).toBe(constructedBefore);
  });
});

describe('AC-5.4 — requests waiting in the queue, and continuations that would re-enter it, are rejected', () => {
  it('a request waiting on a bucket wait is rejected at end()', async () => {
    const { api, origin, stop } = await rig('none');
    origin.setScript([
      {
        status: 200,
        headers: {
          'x-ratelimit-bucket': 'ac54-standing', 'x-ratelimit-limit': '1', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '30',
        },
        body: {},
      },
    ]);
    await api.request('GET', '/channels/9/messages');
    const queued = api.request('GET', '/channels/9/messages');
    await settle();
    api.end();
    const outcome = await outcomeOf(queued);
    const receipts = origin.requestReceipts.length;
    await stop();

    expectEnded(outcome);
    expect(receipts).toBe(1);
  });

  it('an idempotent request sleeping in the server-error backoff is rejected, not re-queued', async () => {
    const { api, origin, stop } = await rig('none');
    origin.setScript([{ status: 500, body: { message: 'boom' } }]);
    const pending = api.request('GET', '/channels/10/messages');
    await origin.waitForAccept(1);
    api.end();
    const outcome = await outcomeOf(pending);
    const receipts = origin.requestReceipts.length;
    await stop();

    expectEnded(outcome);
    expect(receipts).toBe(1);
  });
});

describe('AC-5.5 — a call in flight at end() settles and is never re-sent', () => {
  describe.each([true, false])('allowFallback: %s', (allowFallback) => {
    it('a proxied request withheld by the server settles promptly, with no local send and no new client', async () => {
      const {
        api, origin, rpc, counts, stop,
      } = await rig('request', allowFallback);
      rpc!.withhold('request');
      const pending = api.request('GET', '/channels/11/messages');
      await rpc!.waitForRequest(1);
      const constructedAtEnd = counts.constructed;
      const startedAt = Date.now();
      api.end();
      const outcome = await outcomeOf(pending);
      const settledInMs = Date.now() - startedAt;
      await settle();
      const result = { receipts: origin.requestReceipts.length, newClients: counts.constructed - constructedAtEnd };
      await stop();

      expectEnded(outcome);
      expect(settledInMs).toBeLessThan(PROMPT_SETTLE_MS);
      expect(result).toEqual({ receipts: 0, newClients: 0 });
    });

    it('a proxied request the server forwarded and then withheld settles promptly, with no send from this client', async () => {
      const {
        api, origin, rpc, counts, stop,
      } = await rig('request', allowFallback);
      rpc!.forwardThenWithhold('request');
      const pending = api.request('GET', '/channels/12/messages');
      await origin.waitForAccept(1);
      const constructedAtEnd = counts.constructed;
      const startedAt = Date.now();
      api.end();
      const outcome = await outcomeOf(pending);
      const settledInMs = Date.now() - startedAt;
      await settle();
      const result = {
        clientReceipts: clientReceipts(origin),
        proxyForwards: origin.receivedHeaders.filter((h) => h[PARTY_HEADER] === 'proxy').length,
        newClients: counts.constructed - constructedAtEnd,
      };
      await stop();

      expectEnded(outcome);
      expect(settledInMs).toBeLessThan(PROMPT_SETTLE_MS);
      expect(result).toEqual({ clientReceipts: 0, proxyForwards: 1, newClients: 0 });
    });

    it('an authorize withheld by the rate-limit server settles promptly, with no local send and no new client', async () => {
      const {
        api, origin, rpc, counts, stop,
      } = await rig('rateLimit', allowFallback);
      rpc!.withhold('authorize');
      const pending = api.request('GET', '/channels/13/messages');
      await rpc!.waitForAuthorizeArrival(1);
      const constructedAtEnd = counts.constructed;
      const startedAt = Date.now();
      api.end();
      const outcome = await outcomeOf(pending);
      const settledInMs = Date.now() - startedAt;
      await settle();
      const result = { receipts: origin.requestReceipts.length, newClients: counts.constructed - constructedAtEnd };
      await stop();

      expectEnded(outcome);
      expect(settledInMs).toBeLessThan(PROMPT_SETTLE_MS);
      expect(result).toEqual({ receipts: 0, newClients: 0 });
    });
  });

  it.each(['request', 'rateLimit'] as const)('%s service: a transport failure whose recreate is still in flight at end() is not re-sent locally', async (kind) => {
    const {
      api, origin, rpc, counts, stop,
    } = await rig(kind, true);
    rpc!.injectFault(kind === 'request' ? 'request' : 'authorize', { code: grpcStatus.UNAVAILABLE });
    rpc!.withhold('hello');
    const pending = api.request('GET', '/channels/14/messages');
    await rpc!.waitForHello(2);
    const constructedAtEnd = counts.constructed;
    api.end();
    const outcome = await outcomeOf(pending);
    await settle();
    const result = { receipts: origin.requestReceipts.length, newClients: counts.constructed - constructedAtEnd };
    await stop();

    expectEnded(outcome);
    expect(result).toEqual({ receipts: 0, newClients: 0 });
  });
});

describe('AC-5.2 — a rate-limit update cancelled by end() is not reported as a failure', () => {
  it('no ERROR event is emitted when end() cancels an update in flight', async () => {
    const {
      api, origin, rpc, stop,
    } = await rig('rateLimit');
    const errors: unknown[] = [];
    api.on('ERROR', (event) => { errors.push(event); });
    rpc!.withhold('update');
    await api.request('GET', '/channels/15/messages');
    await rpc!.waitForUpdate(1);
    api.end();
    await settle(300);
    const receipts = origin.requestReceipts.length;
    await stop();

    expect(receipts).toBe(1);
    expect(errors).toEqual([]);
  });
});

describe('AC-5.6 — a second end() throws nothing and changes nothing', () => {
  it('with a connected service, the service is closed once', async () => {
    const { api, counts, stop } = await rig('request');
    api.end();
    const afterFirst = { ...counts, services: counts.services.length };
    const second = () => api.end();
    const closedAfterSecond = (() => { second(); return counts.closed; })();
    await stop();

    expect(afterFirst.closed).toBe(1);
    expect(closedAfterSecond).toBe(1);
    expect(counts.constructed).toBe(afterFirst.constructed);
  });

  it('with no service', async () => {
    const { api, stop } = await rig('none');
    api.end();
    expect(() => api.end()).not.toThrow();
    await stop();
  });
});
