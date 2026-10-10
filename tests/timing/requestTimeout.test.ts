import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type { Method } from 'axios';
import type Api from '../../src/clients/Api/Api';
import type { RequestOptions } from '../../src/clients/Api/types';

const TIMEOUT_MS = 300;
const LARGER_DEFAULT_MS = 5000;
const RETRY_BACKOFF_MS = 1000;
const TIMER_SLACK_MS = 25;
const SETTLE_GUARD_MS = 10_000;
const RPC_UNAVAILABLE = 14;

const IDEMPOTENT: Method[] = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
const NON_IDEMPOTENT: Method[] = ['POST', 'PATCH'];
const METHODS: Method[] = [...IDEMPOTENT, ...NON_IDEMPOTENT];

type Route = 'no request service' | 'local: true' | 'fallback re-send';
type Source = 'client default only' | 'per request only' | 'both, per request overriding';

const ROUTES: Route[] = ['no request service', 'local: true', 'fallback re-send'];
const SOURCES: Source[] = ['client default only', 'per request only', 'both, per request overriding'];

interface Outcome {
  settled: boolean;
  error: { code?: unknown; response?: { status?: number; statusText?: string } } | undefined;
  elapsedMs: number;
}

interface Cell {
  method: Method;
  api: Api;
  origin: LoopbackApiOrigin;
  rpc: LoopbackRpcServer | undefined;
  requestOptions: RequestOptions;
}

function clientDefault(source: Source): RequestOptions {
  if (source === 'client default only') return { timeout: TIMEOUT_MS };
  if (source === 'both, per request overriding') return { timeout: LARGER_DEFAULT_MS };
  return {};
}

function perRequest(source: Source, method: Method): RequestOptions {
  const body = ['GET', 'HEAD', 'OPTIONS'].includes(method) ? {} : { data: { content: 'x' } };
  return source === 'client default only' ? body : { ...body, timeout: TIMEOUT_MS };
}

async function buildCell(route: Route, source: Source, method: Method): Promise<Cell> {
  const origin = await LoopbackApiOrigin.start();
  origin.setDefaultResponse({ status: 200, hold: true });

  let rpc: LoopbackRpcServer | undefined;
  const api = await createApiAgainstOrigin(origin, 'test-token', { requestOptions: clientDefault(source) });
  if (route !== 'no request service') {
    rpc = await LoopbackRpcServer.startRequestService('test-token', origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: route === 'fallback re-send' });
    if (route === 'fallback re-send') rpc.injectFault('request', { code: RPC_UNAVAILABLE });
  }

  const requestOptions: RequestOptions = { ...perRequest(source, method), ...(route === 'local: true' ? { local: true } : {}) };
  return {
    method, api, origin, rpc, requestOptions,
  };
}

async function drive(cell: Cell): Promise<Outcome> {
  const startedAt = Date.now();
  const request = cell.api.request(cell.method, '/channels/123/messages', cell.requestOptions).then(
    () => ({ settled: true, error: undefined, elapsedMs: Date.now() - startedAt }) as Outcome,
    (error) => ({ settled: true, error, elapsedMs: Date.now() - startedAt }) as Outcome,
  );
  const guard = new Promise<Outcome>((resolve) => {
    setTimeout(() => resolve({ settled: false, error: undefined, elapsedMs: Date.now() - startedAt }), SETTLE_GUARD_MS).unref();
  });
  return Promise.race([request, guard]);
}

const HUNG = Symbol('hung');

function orHung<T>(promise: Promise<T>): Promise<T | typeof HUNG> {
  const guard = new Promise<typeof HUNG>((resolve) => {
    setTimeout(() => resolve(HUNG), SETTLE_GUARD_MS).unref();
  });
  return Promise.race([promise, guard]);
}

async function teardown(cell: Cell): Promise<void> {
  cell.api.end();
  await cell.origin.close();
  cell.rpc?.forceClose();
}

async function runGroup(route: Route, source: Source): Promise<Array<{ cell: Cell; outcome: Outcome }>> {
  const cells: Cell[] = [];
  for (const method of METHODS) {
    cells.push(await buildCell(route, source, method));
  }
  const outcomes = await Promise.all(cells.map(drive));
  const results = cells.map((cell, i) => ({ cell, outcome: outcomes[i]! }));
  await Promise.all(cells.map(teardown));
  return results;
}

function statusTextOf(outcome: Outcome): string {
  return String(outcome.error?.response?.statusText);
}

describe('AC-2.1 — an origin that does not answer ends the attempt as a transport failure at the effective timeout', () => {
  it('entry condition: a per-request timeout reaches axios on the live path (POST, hold, no request service)', async () => {
    const cell = await buildCell('no request service', 'per request only', 'POST');
    const outcome = await drive(cell);
    const { origin } = cell;
    const receipts = origin.requestReceipts.length;
    await teardown(cell);

    expect(outcome.settled).toBe(true);
    expect(outcome.error?.response?.status).toBe(500);
    expect(statusTextOf(outcome)).toContain(`timeout of ${TIMEOUT_MS}ms exceeded`);
    expect(outcome.elapsedMs).toBeGreaterThanOrEqual(TIMEOUT_MS - TIMER_SLACK_MS);
    expect(receipts).toBe(1);
  }, 30_000);

  describe.each(ROUTES)('route: %s', (route) => {
    describe.each(SOURCES)('timeout from: %s', (source) => {
      let results: Array<{ cell: Cell; outcome: Outcome }>;

      it('runs the seven methods against an origin that holds every request', async () => {
        results = await runGroup(route, source);
        expect(results).toHaveLength(METHODS.length);
      }, 60_000);

      it.each(IDEMPOTENT)('%s: fails at the effective timeout and is retried under the WP-5 budget (3 attempts)', (method) => {
        const { cell, outcome } = results.find((r) => r.cell.method === method)!;
        const arrivals = cell.origin.requestCount;

        expect(outcome.settled).toBe(true);
        expect(outcome.error?.response?.status).toBe(500);
        expect(statusTextOf(outcome)).toContain(`timeout of ${TIMEOUT_MS}ms exceeded`);
        expect(arrivals).toHaveLength(3);
        expect(arrivals[1]! - arrivals[0]!).toBeGreaterThanOrEqual(TIMEOUT_MS + RETRY_BACKOFF_MS - TIMER_SLACK_MS);
        expect(arrivals[2]! - arrivals[1]!).toBeGreaterThanOrEqual(TIMEOUT_MS + RETRY_BACKOFF_MS - TIMER_SLACK_MS);
      });

      it.each(NON_IDEMPOTENT)('%s: the caller gets the failure on the first attempt', (method) => {
        const { cell, outcome } = results.find((r) => r.cell.method === method)!;

        expect(outcome.settled).toBe(true);
        if (route === 'fallback re-send') {
          expect(outcome.error?.code).toBe(RPC_UNAVAILABLE);
          expect(cell.origin.requestReceipts).toHaveLength(0);
        } else {
          expect(outcome.error?.response?.status).toBe(500);
          expect(statusTextOf(outcome)).toContain(`timeout of ${TIMEOUT_MS}ms exceeded`);
          expect(outcome.elapsedMs).toBeGreaterThanOrEqual(TIMEOUT_MS - TIMER_SLACK_MS);
          expect(outcome.elapsedMs).toBeLessThan(TIMEOUT_MS + RETRY_BACKOFF_MS);
          expect(cell.origin.requestReceipts).toHaveLength(1);
        }
      });
    });
  });
});

describe('AC-2.2 — time spent queued for a rate limit is not counted toward the timeout', () => {
  const BUCKET_WAIT_SECONDS = 1.5;

  function exhaustedBucket() {
    return {
      status: 200,
      headers: {
        'x-ratelimit-bucket': 'ac22-bucket',
        'x-ratelimit-limit': '1',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset-after': String(BUCKET_WAIT_SECONDS),
      },
      body: {},
    };
  }

  it('a request held behind a bucket wait longer than its timeout is still sent, and succeeds', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([exhaustedBucket(), { status: 200, body: { ok: true } }]);
    const api = await createApiAgainstOrigin(origin);

    await api.request('GET', '/channels/22/messages');
    const startedAt = Date.now();
    const second = await orHung(api.request('GET', '/channels/22/messages', { timeout: TIMEOUT_MS }));
    const waitedMs = Date.now() - startedAt;
    const receipts = origin.requestReceipts.length;

    api.end();
    await origin.close();

    expect(second).not.toBe(HUNG);
    expect((second as { status: number }).status).toBe(200);
    expect(waitedMs).toBeGreaterThan(TIMEOUT_MS);
    expect(receipts).toBe(2);
  }, 30_000);

  it('the timeout runs from the send: queued for the bucket wait, then held by the origin, the caller fails after the wait plus the timeout', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([exhaustedBucket(), { status: 200, hold: true }]);
    const api = await createApiAgainstOrigin(origin);

    await api.request('POST', '/channels/23/messages', { data: { content: 'first' } });
    const startedAt = Date.now();
    const second = await orHung(api.request('POST', '/channels/23/messages', { data: { content: 'second' }, timeout: TIMEOUT_MS }).then(
      () => undefined,
      (error: { response?: { status?: number } }) => error,
    ));
    const elapsedMs = Date.now() - startedAt;
    const receipts = origin.requestReceipts.length;

    api.end();
    await origin.close();

    expect(second).not.toBe(HUNG);
    expect((second as { response?: { status?: number } } | undefined)?.response?.status).toBe(500);
    expect(elapsedMs).toBeGreaterThanOrEqual(BUCKET_WAIT_SECONDS * 1000 + TIMEOUT_MS - TIMER_SLACK_MS);
    expect(receipts).toBe(2);
  }, 30_000);
});
