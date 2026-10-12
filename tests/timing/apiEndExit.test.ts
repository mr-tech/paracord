import {
  describe, it, expect, beforeAll,
} from 'vitest';
import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import { status as grpcStatus } from '@grpc/grpc-js';

import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import { LOG_LEVELS } from '../../src/constants';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { createInstrumentedApi } from '../harness/instrumentedApi';

import type { Counts } from '../harness/instrumentedApi';

const ROOT = path.resolve(__dirname, '..', '..');
const CHILD = path.join(ROOT, 'tests', 'fixtures', 'apiEndChild.cjs');
const EXIT_BOUND_MS = 5000;
const RECONNECT_CAP_WINDOW_MS = 11_500;
const QUEUE_POLL_WINDOW_MS = 2500;
const LONG_DELAY_HELLO = 6;
const TIMER_ARMED_SETTLE_MS = 300;
const LONG_DELAY_WAIT_MS = 20_000;

type Kind = 'rateLimit' | 'request';
type State = 'none' | 'none, one request sent' | 'reconnect timer at a long delay' | 'connected' | 'latched-connecting' | 'reconnect attempt in flight' | 'recreate in flight' | 'hello in flight' | 'connected, call open';

const SERVICE_STATES: State[] = ['connected', 'latched-connecting', 'reconnect attempt in flight', 'recreate in flight', 'hello in flight', 'connected, call open'];
const KINDS: Kind[] = ['rateLimit', 'request'];

function settle(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

const HUNG = Symbol('hung');

function orHung<T>(promise: Promise<T>): Promise<T | typeof HUNG> {
  const guard = new Promise<typeof HUNG>((resolve) => { setTimeout(() => resolve(HUNG), 4000).unref(); });
  return Promise.race([promise, guard]);
}

function lastModified(file: string): number {
  return fs.statSync(file).mtimeMs;
}

beforeAll(() => {
  const built = path.join(ROOT, 'dist', 'clients', 'Api', 'Api.js');
  const source = path.join(ROOT, 'src', 'clients', 'Api', 'Api.ts');
  if (lastModified(built) < lastModified(source)) {
    throw new Error('dist/ is older than src/clients/Api/Api.ts: run `npm run build` before the child-process cells, which load dist/');
  }
});

interface ChildResult {
  exitMs: number | undefined;
  exitCode: number | null;
  faults: string[];
}

async function startServer(kind: Kind, origin: LoopbackApiOrigin): Promise<LoopbackRpcServer> {
  return kind === 'request' ? LoopbackRpcServer.startRequestService('test-token', origin) : LoopbackRpcServer.start();
}

async function runChild(kind: Kind, state: State, origin: LoopbackApiOrigin, rpc: LoopbackRpcServer | undefined): Promise<ChildResult> {
  const port = rpc?.port ?? 1;
  const childState = state === 'none, one request sent' ? 'none' : state.replace(/ /g, '-');
  const child = fork(CHILD, [kind, state === 'connected, call open' ? 'call-open' : childState, String(port), origin.url], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  const faults: string[] = [];
  const messages: Array<{ event: string; kind?: string; detail?: string }> = [];
  const waiters: Array<() => void> = [];
  child.on('message', (message: { event: string; kind?: string; detail?: string }) => {
    if (message.event === 'fault') faults.push(`${message.kind}: ${message.detail}`);
    messages.push(message);
    waiters.splice(0).forEach((wake) => wake());
  });
  const exited = new Promise<{ code: number | null; at: number }>((resolve) => {
    child.on('exit', (code) => resolve({ code, at: Date.now() }));
  });
  const waitFor = async (event: string) => {
    while (!messages.some((m) => m.event === event)) {
      await new Promise<void>((resolve) => { waiters.push(resolve); });
    }
  };

  await waitFor('ready');

  if (state === 'none, one request sent') {
    child.send('trigger');
    await origin.waitForAccept(1);
  } else if (state === 'reconnect timer at a long delay' && rpc) {
    await rpc.waitForHello(LONG_DELAY_HELLO, LONG_DELAY_WAIT_MS);
    await settle(TIMER_ARMED_SETTLE_MS);
  } else if (state === 'reconnect attempt in flight' && rpc) {
    rpc.clearFault('hello');
    rpc.withhold('hello');
    await rpc.waitForHello(2);
  } else if (state === 'recreate in flight' && rpc) {
    rpc.injectFault(kind === 'request' ? 'request' : 'authorize', { code: grpcStatus.UNAVAILABLE });
    rpc.withhold('hello');
    child.send('trigger');
    await rpc.waitForHello(2);
  } else if (state === 'connected, call open' && rpc) {
    rpc.withhold(kind === 'request' ? 'request' : 'authorize');
    child.send('trigger');
    await (kind === 'request' ? rpc.waitForRequest(1) : rpc.waitForAuthorizeArrival(1));
  } else if (state === 'hello in flight' && rpc) {
    await rpc.waitForHello(1);
  }

  child.send('end');
  await waitFor('ended');
  const endedAt = Date.now();

  const outcome = await Promise.race([
    exited,
    settle(EXIT_BOUND_MS).then(() => undefined),
  ]);
  if (outcome === undefined) {
    child.kill('SIGKILL');
    const { code } = await exited;
    return { exitMs: undefined, exitCode: code, faults };
  }
  return { exitMs: outcome.at - endedAt, exitCode: outcome.code, faults };
}

describe('AC-5.1 — a process that calls end() exits on its own within 5 s, in every rpc state', () => {
  async function exitCell(kind: Kind, state: State): Promise<{ result: ChildResult; receipts: number }> {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse({ status: 200, body: {} });
    let rpc: LoopbackRpcServer | undefined;
    if (state !== 'none') {
      rpc = await startServer(kind, origin);
      if (state === 'hello in flight') rpc.withhold('hello');
      if (state === 'latched-connecting') await rpc.close();
      if (state === 'reconnect attempt in flight' || state === 'reconnect timer at a long delay') rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });
    }
    const result = await runChild(kind, state, origin, rpc);
    const receipts = origin.requestReceipts.length;
    await origin.close();
    if (rpc && state !== 'latched-connecting') rpc.forceClose();
    return { result, receipts };
  }

  it('control: a child with no service sends one request and it lands at the parent\'s origin, then the child exits', async () => {
    const { result, receipts } = await exitCell('request', 'none, one request sent');

    expect(receipts).toBe(1);
    expect(result.exitMs).toBeDefined();
    expect(result.exitMs).toBeLessThan(EXIT_BOUND_MS);
    expect(result.exitCode).toBe(0);
    expect(result.faults).toEqual([]);
  }, 30_000);

  it('no service: exits (the control that the child can exit at all)', async () => {
    const { result, receipts } = await exitCell('request', 'none');

    expect(result.exitMs).toBeDefined();
    expect(result.exitMs).toBeLessThan(EXIT_BOUND_MS);
    expect(result.exitCode).toBe(0);
    expect(result.faults).toEqual([]);
    expect(receipts).toBe(0);
  }, 30_000);

  it('request service, latched with the reconnect timer at a 6 s delay: exits within the bound, not at the timer', async () => {
    const { result, receipts } = await exitCell('request', 'reconnect timer at a long delay');

    expect(result.exitMs).toBeDefined();
    expect(result.exitMs).toBeLessThan(EXIT_BOUND_MS);
    expect(result.exitCode).toBe(0);
    expect(result.faults).toEqual([]);
    expect(receipts).toBe(0);
  }, 45_000);

  describe.each(KINDS)('service kind: %s', (kind) => {
    it.each(SERVICE_STATES)('%s: exits within the bound, with no fault and no request to the origin', async (state) => {
      const { result, receipts } = await exitCell(kind, state);

      expect(result.exitMs).toBeDefined();
      expect(result.exitMs).toBeLessThan(EXIT_BOUND_MS);
      expect(result.exitCode).toBe(0);
      expect(result.faults).toEqual([]);
      expect(receipts).toBe(0);
    }, 30_000);
  });
});

describe('AC-5.2 — nothing that settles after end() schedules a reconnect or creates a client', () => {
  interface Watch {
    unhandled: unknown[];
    reschedules: number;
    stop: () => void;
  }

  function watchProcess(): Watch {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    return { unhandled, reschedules: 0, stop: () => { process.off('unhandledRejection', onUnhandled); } };
  }

  it('a latched client with a reconnect timer pending: helloCalls stays flat for longer than the 10 s cap', async () => {
    const origin = await LoopbackApiOrigin.start();
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);
    rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    const watch = watchProcess();
    let rescheduleEvents = 0;
    api.on('GENERAL', (event) => {
      if (event.level === LOG_LEVELS.WARNING) rescheduleEvents += 1;
    });

    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    const helloAtEnd = rpc.helloCalls;
    const constructedAtEnd = counts.constructed;
    const reschedulesBeforeEnd = rescheduleEvents;
    api.end();
    await settle(RECONNECT_CAP_WINDOW_MS);
    watch.stop();
    const result = {
      helloGrowth: rpc.helloCalls - helloAtEnd,
      constructedGrowth: counts.constructed - constructedAtEnd,
      reschedulesAfterEnd: rescheduleEvents - reschedulesBeforeEnd,
      unhandled: watch.unhandled.length,
    };
    await origin.close();
    rpc.forceClose();

    expect(result).toEqual({
      helloGrowth: 0, constructedGrowth: 0, reschedulesAfterEnd: 0, unhandled: 0,
    });
  }, 40_000);

  it('a recreate whose hello settles after end() does not reschedule or create a client', async () => {
    const origin = await LoopbackApiOrigin.start();
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);
    const counts: Counts = { constructed: 0, closed: 0, services: [] };
    const api = await createInstrumentedApi(origin, counts);
    const watch = watchProcess();

    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    rpc.injectFault('request', { code: grpcStatus.UNAVAILABLE });
    rpc.withhold('hello');
    const pending = api.request('GET', '/channels/1/messages').catch(() => undefined);
    await rpc.waitForHello(2);
    const helloAtEnd = rpc.helloCalls;
    const constructedAtEnd = counts.constructed;
    api.end();
    rpc.release('hello');
    await pending;
    await settle(RECONNECT_CAP_WINDOW_MS);
    watch.stop();
    const result = {
      helloGrowth: rpc.helloCalls - helloAtEnd,
      constructedGrowth: counts.constructed - constructedAtEnd,
      unhandled: watch.unhandled.length,
      receipts: origin.requestReceipts.length,
    };
    await origin.close();
    rpc.forceClose();

    expect(result).toEqual({
      helloGrowth: 0, constructedGrowth: 0, unhandled: 0, receipts: 0,
    });
  }, 40_000);
});

describe('AC-5.4 — a request waiting in the queue at end() is rejected and never sent', () => {
  const BUCKET_WAIT_SECONDS = 1.5;

  function exhaustedBucket(label: string) {
    return {
      status: 200,
      headers: {
        'x-ratelimit-bucket': label,
        'x-ratelimit-limit': '1',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset-after': String(BUCKET_WAIT_SECONDS),
      },
      body: {},
    };
  }

  it('queued behind a bucket wait: rejected with the ended error, and the origin sees no second request past the queue poll', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([exhaustedBucket('ac54-a'), { status: 200, body: {} }]);
    const api = await createApiAgainstOrigin(origin);

    await api.request('GET', '/channels/54/messages');
    const queued = api.request('GET', '/channels/54/messages').then(() => undefined, (err: Error) => err);
    await settle(100);
    api.end();
    const rejected = await orHung(queued);
    await settle(BUCKET_WAIT_SECONDS * 1000 + QUEUE_POLL_WINDOW_MS);
    const receipts = origin.requestReceipts.length;
    await origin.close();

    expect(rejected).toBeInstanceOf(Error);
    expect((rejected as Error).message).toMatch(/client has ended/i);
    expect(receipts).toBe(1);
  }, 30_000);

  it('a queued item in flight whose response asks for a requeue: rejected when it would re-enter the queue, never re-sent', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([
      exhaustedBucket('ac54-b'),
      {
        status: 429,
        delayMs: 1200,
        headers: {
          'x-ratelimit-bucket': 'ac54-b', 'x-ratelimit-limit': '1', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '1.5',
        },
        body: { message: 'rate limited', retry_after: 1.5, global: false },
      },
    ]);
    const api = await createApiAgainstOrigin(origin);

    await api.request('GET', '/channels/55/messages');
    const queued = api.request('GET', '/channels/55/messages').then(() => undefined, (err: Error) => err);
    await origin.waitForAccept(2, 8000);
    api.end();
    const rejected = await orHung(queued);
    await settle(BUCKET_WAIT_SECONDS * 1000 + QUEUE_POLL_WINDOW_MS);
    const receipts = origin.requestReceipts.length;
    await origin.close();

    expect(rejected).toBeInstanceOf(Error);
    expect((rejected as Error).message).toMatch(/client has ended/i);
    expect(receipts).toBe(2);
  }, 40_000);
});
