import { describe, it, expect, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent } from '../../src/clients/Api/types';

const NON_OK_CODES = Object.entries(grpcStatus)
  .filter(([k, v]) => typeof v === 'number' && k !== 'OK')
  .map(([name, code]) => ({ name, code: code as number }));

const TRANSPORT_SET = new Set([grpcStatus.UNAVAILABLE, grpcStatus.DEADLINE_EXCEEDED, grpcStatus.CANCELLED, grpcStatus.INTERNAL]);

const unhandledListeners: Array<(err: unknown) => void> = [];
afterEach(() => {
  unhandledListeners.splice(0).forEach((fn) => process.off('unhandledRejection', fn));
});

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };

function waitForDebugEvent(events: ApiDebugEvent[], emitter: EventEmitter, predicate: (e: ApiDebugEvent) => boolean, timeoutMs = 5000): Promise<void> {
  if (events.some(predicate)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off('DEBUG', check);
      reject(new Error(`waitForDebugEvent timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const check = (e: ApiDebugEvent) => {
      if (predicate(e)) {
        clearTimeout(timer);
        emitter.off('DEBUG', check);
        resolve();
      }
    };
    emitter.on('DEBUG', check);
  });
}

const isErrorEvent = (e: ApiDebugEvent) => e.level === LOG_LEVELS.ERROR;
const isUnexpectedErrorEvent = (e: ApiDebugEvent) => e.level === LOG_LEVELS.ERROR
  && typeof e.message === 'string' && /unexpected error/i.test(e.message);

async function driveUpdateCell(code: number, allowFallback: boolean) {
  const origin = await LoopbackApiOrigin.start();
  origin.setScript([OK_RESPONSE]);
  const rpc = await LoopbackRpcServer.start();
  rpc.injectFault('update', { code });

  const events: ApiDebugEvent[] = [];
  const emitter = new EventEmitter();
  emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

  const unhandled: unknown[] = [];
  const onUnhandled = (err: unknown) => unhandled.push(err);
  process.on('unhandledRejection', onUnhandled);
  unhandledListeners.push(onUnhandled);

  const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
  await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback });

  await api.request('GET', '/channels/1');
  await rpc.waitForUpdate(1);
  if (TRANSPORT_SET.has(code)) {
    await new Promise((resolve) => { setTimeout(resolve, 50); });
  } else {
    await waitForDebugEvent(events, emitter, isErrorEvent);
  }

  const errorEvents = events.filter(isErrorEvent);
  const updateCalls = rpc.updateCalls;

  api.end();
  await origin.close();
  await rpc.close();
  process.off('unhandledRejection', onUnhandled);

  return { unhandledCount: unhandled.length, errorCount: errorEvents.length, errorMessages: errorEvents.map((e) => e.message), updateCalls };
}

describe('Api RPC cache-update resilience (AC-2.1, H1) — 16 codes x 2 arms', () => {
  it('the class census is 16 non-OK codes (same census as isRpcTransportFailure.test.ts)', () => {
    expect(NON_OK_CODES).toHaveLength(16);
  });

  for (const allowFallback of [true, false]) {
    for (const { name, code } of NON_OK_CODES) {
      const inSet = TRANSPORT_SET.has(code);
      it(`allowFallback=${allowFallback}, update faults ${name} (${code}) — ${inSet ? 'recreate succeeds, no rejection' : 'one ERROR line, process survives'}`, async () => {
        const { unhandledCount, errorCount, errorMessages, updateCalls } = await driveUpdateCell(code, allowFallback);

        expect(updateCalls).toBeGreaterThanOrEqual(1);

        expect(unhandledCount).toBe(0);

        if (inSet) {
          expect(errorCount).toBe(0);
        } else {
          expect(errorCount).toBe(1);
          expect(errorMessages[0]).toMatch(/the rpc rate limit cache update did not succeed/i);
        }
      }, 10000);
    }
  }

  it('both arms agree cell-for-cell (arm-independence, critique F-60)', async () => {
    const code = grpcStatus.RESOURCE_EXHAUSTED;
    const trueArm = await driveUpdateCell(code, true);
    const falseArm = await driveUpdateCell(code, false);
    expect(trueArm.errorCount).toBe(falseArm.errorCount);
    expect(trueArm.unhandledCount).toBe(falseArm.unhandledCount);
  }, 10000);
});

async function driveAuthorizeCell(code: number, allowFallback: boolean) {
  const origin = await LoopbackApiOrigin.start();
  origin.setScript([OK_RESPONSE]);
  const rpc = await LoopbackRpcServer.start();
  rpc.injectFault('authorize', { code });

  const api = await createApiAgainstOrigin(origin);
  await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback });

  let status: number | undefined;
  let errCode: unknown;
  try {
    const res = await api.request('GET', '/channels/1');
    status = res.status;
  } catch (err: any) {
    errCode = err.code;
  }

  const accepted = origin.acceptCount;

  api.end();
  await origin.close();
  await rpc.close();

  return { status, errCode, accepted };
}

describe('Api RPC request fallback (AC-2.2) — 16 codes x 2 arms', () => {
  for (const { name, code } of NON_OK_CODES) {
    const inSet = TRANSPORT_SET.has(code);

    it(`allowFallback=true, authorize faults ${name} (${code}) — ${inSet ? 'falls back locally' : 'rejects with the ServiceError'}`, async () => {
      const { status, errCode, accepted } = await driveAuthorizeCell(code, true);
      if (inSet) {
        expect(accepted).toBe(1);
        expect(status).toBe(200);
        expect(errCode).toBeUndefined();
      } else {
        expect(accepted).toBe(0);
        expect(errCode).toBe(code);
      }
    }, 10000);

    it(`allowFallback=false, authorize faults ${name} (${code}) — always rejects, never sends locally (E-1)`, async () => {
      const { errCode, accepted } = await driveAuthorizeCell(code, false);
      expect(accepted).toBe(0);
      expect(errCode).toBe(code);
    }, 10000);
  }
});

async function driveRequestFallbackCell(code: number, allowFallback: boolean) {
  const origin = await LoopbackApiOrigin.start();
  origin.setScript([OK_RESPONSE]);
  const rpc = await LoopbackRpcServer.startRequestService();
  rpc.injectFault('request', { code });

  const api = await createApiAgainstOrigin(origin);
  await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback });

  let status: number | undefined;
  let errCode: unknown;
  try {
    const res = await api.request('GET', '/channels/1');
    status = res.status;
  } catch (err: any) {
    errCode = err.code;
  }

  const accepted = origin.acceptCount;

  api.end();
  await origin.close();
  await rpc.close();

  return { status, errCode, accepted };
}

describe('Api RPC request-SERVICE fallback (AC-2.2, handleRequestRemote) — 16 codes x 2 arms', () => {
  for (const { name, code } of NON_OK_CODES) {
    const inSet = TRANSPORT_SET.has(code);

    it(`allowFallback=true, request faults ${name} (${code}) — ${inSet ? 'falls back locally' : 'rejects with the ServiceError'}`, async () => {
      const { status, errCode, accepted } = await driveRequestFallbackCell(code, true);
      if (inSet) {
        expect(accepted).toBe(1);
        expect(status).toBe(200);
        expect(errCode).toBeUndefined();
      } else {
        expect(accepted).toBe(0);
        expect(errCode).toBe(code);
      }
    }, 10000);

    it(`allowFallback=false, request faults ${name} (${code}) — always rejects, never sends locally (E-1)`, async () => {
      const { errCode, accepted } = await driveRequestFallbackCell(code, false);
      expect(accepted).toBe(0);
      expect(errCode).toBe(code);
    }, 10000);
  }
});

describe('checkRpcServiceConnection widened predicate (step 2, the hello site)', () => {
  it('a transport-set hello() rejection is treated as lost-connection: no "unexpected error" line, request falls back', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    rpc.injectFault('hello', { code: grpcStatus.DEADLINE_EXCEEDED });

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const res = await api.request('GET', '/channels/1');
    expect(res.status).toBe(200);

    const unexpectedErrorLines = events.filter(isUnexpectedErrorEvent);
    expect(unexpectedErrorLines).toHaveLength(0);

    api.end();
    await origin.close();
    await rpc.close();
  }, 10000);

  it('a non-transport-set hello() rejection logs "unexpected error" (WP2-F3\'s residue, correctly attributed)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();
    rpc.injectFault('hello', { code: grpcStatus.UNKNOWN });

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });
    await waitForDebugEvent(events, emitter, isUnexpectedErrorEvent, 2000);

    const unexpectedErrorLines = events.filter(isUnexpectedErrorEvent);
    expect(unexpectedErrorLines).toHaveLength(1);

    api.end();
    await origin.close();
    await rpc.close();
  }, 10000);
});

describe('a real stopped-mid-session server (step 3\'s recording obligation)', () => {
  it('graceful stop before the call (regression guard — pre-existing UNAVAILABLE(14) behaviour, unchanged by the widening)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on('unhandledRejection', onUnhandled);
    unhandledListeners.push(onUnhandled);

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    await api.request('GET', '/channels/1');
    await rpc.waitForUpdate(1);
    await rpc.close();

    await api.request('GET', '/channels/2');
    await waitForDebugEvent(events, emitter, isErrorEvent, 2000);

    expect(unhandled).toHaveLength(0);
    const fallbackEvents = events.filter(isErrorEvent);
    expect(fallbackEvents).toHaveLength(1);
    expect(TRANSPORT_SET.has((fallbackEvents[0].data as { code?: number })?.code as number)).toBe(true);

    api.end();
    await origin.close();
    process.off('unhandledRejection', onUnhandled);
  }, 10000);

  it('force-killed (abrupt, no graceful drain): the rejection code lands in the transport set and the process survives', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([OK_RESPONSE, OK_RESPONSE]);
    const rpc = await LoopbackRpcServer.start();

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on('unhandledRejection', onUnhandled);
    unhandledListeners.push(onUnhandled);

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    await api.request('GET', '/channels/1');
    await rpc.waitForUpdate(1);
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    rpc.forceClose();

    await api.request('GET', '/channels/2');
    await waitForDebugEvent(events, emitter, isErrorEvent, 2000);

    expect(unhandled).toHaveLength(0);
    const fallbackEvents = events.filter(isErrorEvent);
    expect(fallbackEvents).toHaveLength(1);
    expect(TRANSPORT_SET.has((fallbackEvents[0].data as { code?: number })?.code as number)).toBe(true);

    api.end();
    await origin.close();
    process.off('unhandledRejection', onUnhandled);
  }, 10000);
});
