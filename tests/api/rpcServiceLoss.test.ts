import { describe, it, expect, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { status as grpcStatus } from '@grpc/grpc-js';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { LOG_LEVELS } from '../../src/constants';

import type { ApiDebugEvent } from '../../src/clients/Api/types';

/**
 * Plan 001 WP-2 (H1: unhandled RPC-cache rejection and the LOST_CONNECTION widening).
 *
 * Two properties, over the full class qa-P001-2's Phase 1 probes (`468154c`) settled:
 * 16 non-OK `@grpc/grpc-js` status codes x 2 `allowFallback` arms.
 *
 * - AC-2.1 (`describe` "cache-update resilience"): a rejection from `updateRpcCache`
 *   (the `update` RPC, fired after every response) never crashes the process. qa's
 *   partition (WP2-F2): with the server alive and only `update` faulted, the 4
 *   transport-set codes {14, 4, 1, 13} take the recreate branch — `hello()` succeeds
 *   against the same live server, so nothing throws and 0 cells are non-discriminating
 *   by construction; the other 12 throw straight to the new handler — exactly one ERROR
 *   line, no unhandled rejection. Arm-independent (`updateRpcCache` never reads
 *   `#allowFallback`) — both arms are driven and asserted equal, not skipped, because
 *   silence on an arm is not a statement (critique F-60).
 * - AC-2.2 (`describe` "request fallback"): `allowFallback: true` falls back to the
 *   local path for the 4 transport-set codes and rejects for the other 12;
 *   `allowFallback: false` rejects for all 16 — the unchanged guard (E-1's register
 *   entry: WP-2 replaces the comparison inside `&& this.#allowFallback`, never the
 *   guard itself).
 *
 * Every cell is one fresh `Api` and one fresh `LoopbackRpcServer` (qa's mitigation for
 * the sticky `#connectingToRpcService` flag and the recreate branch's own
 * `hello()` round trip — "A mechanism the plan does not name"), and asserts a positive
 * completion count (`rpc.updateCalls`/`origin.acceptCount`) before reading the
 * rejection/fallback outcome, so a cell that never ran isn't read as one that ran clean.
 */

const NON_OK_CODES = Object.entries(grpcStatus)
  .filter(([k, v]) => typeof v === 'number' && k !== 'OK')
  .map(([name, code]) => ({ name, code: code as number }));

const TRANSPORT_SET = new Set([grpcStatus.UNAVAILABLE, grpcStatus.DEADLINE_EXCEEDED, grpcStatus.CANCELLED, grpcStatus.INTERNAL]);

const unhandledListeners: Array<(err: unknown) => void> = [];
afterEach(() => {
  unhandledListeners.splice(0).forEach((fn) => process.off('unhandledRejection', fn));
});

const OK_RESPONSE = { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } };

/**
 * Resolves once `events` holds an entry matching `predicate` — the condition this
 * suite's cells can observe via the `Api` instance's own `'DEBUG'` stream
 * (`tests/README.md`: no fixed sleep for a condition the harness can observe). Checks
 * the already-captured array first so an event that fired before this call was made is
 * not missed (code review CR-31(a)).
 */
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
    // Absence assertion (the recreate succeeds, nothing is ever logged) — cannot be
    // waited on by event, so a bounded window is the correct shape here (code review
    // CR-31(a)). Sized well above qa-P001-2's own measured settle time for this exact
    // path (p90 2.29ms, max 3.98ms across 96 cells, `wp2-settle-window.check.js`).
    await new Promise((resolve) => { setTimeout(resolve, 50); });
  } else {
    // The condition the harness can observe: step 1's handler emits an ERROR event.
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

        expect(updateCalls).toBeGreaterThanOrEqual(1); // positive completion: the fault actually fired

        expect(unhandledCount).toBe(0); // the property itself: never an unhandled rejection, any code, either arm

        if (inSet) {
          expect(errorCount).toBe(0); // regression cell — recreate's hello() succeeds against the still-alive server
        } else {
          expect(errorCount).toBe(1); // the fix's own line, exactly once
          expect(errorMessages[0]).toMatch(/the rpc rate limit cache update did not succeed/i);
        }
      }, 10000);
    }
  }

  it('both arms agree cell-for-cell (arm-independence, critique F-60)', async () => {
    const code = grpcStatus.RESOURCE_EXHAUSTED; // an arbitrary non-set member
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

  const accepted = origin.acceptCount; // 1 iff the request reached Discord (fell back locally); 0 iff it rejected first

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

/**
 * qa-P001-2 Phase 2, finding QA-2: `handleRequestRemote`'s `&& this.#allowFallback`
 * conjunct (the guard on the request-SERVICE path, `addRequestService` — distinct from
 * the rate-limit service every other cell in this file drives) had no cell reaching it at
 * all; mutant M7 (dropping that conjunct) survived the whole suite. Mirrors
 * `driveAuthorizeCell` exactly, against `LoopbackRpcServer.startRequestService()` instead.
 */
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

  const accepted = origin.acceptCount; // 1 iff the request reached Discord (fell back locally); 0 iff it rejected first

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
    rpc.injectFault('hello', { code: grpcStatus.DEADLINE_EXCEEDED }); // in the widened set, not the old literal 14

    const events: ApiDebugEvent[] = [];
    const emitter = new EventEmitter();
    emitter.on('DEBUG', (e: ApiDebugEvent) => events.push(e));

    const api = await createApiAgainstOrigin(origin, 'test-token', { emitter });
    await api.addRateLimitService({ host: '127.0.0.1', port: rpc.port, allowFallback: true });

    const res = await api.request('GET', '/channels/1');
    expect(res.status).toBe(200); // hello() never connected, so authorize/request never reach the RPC path -> local

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
    // `addRateLimitService` awaits `checkRpcServiceConnection`, whose catch logs the
    // "unexpected error" line synchronously before returning — by the time this resolves
    // the event is already in `events`, so there is nothing to sleep for at all.
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
  // qa-P001-2's Phase 2 (QA-3): both titles below used to promise a code neither body
  // asserted. A real "before the call" stop (graceful or abrupt) only ever produces
  // UNAVAILABLE(14) — a code the OLD literal `=== 14` comparison already handled, so this
  // shape is a regression guard, not evidence of the widened predicate (qa's own
  // measurement: NO-MOVEMENT, green at the parent tree too). The mid-flight kill below
  // does discriminate (DEFECT-RED at the parent). Both now capture and assert the code,
  // via the ERROR-level DEBUG event `authorizeRequestWithServer` emits on this fallback
  // path (qa's own guidance: assert only set-membership, never a specific code — two
  // independent instruments disagree on the exact shape-to-code mapping).
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
    await rpc.close(); // tryShutdown — graceful

    // `authorizeRequestWithServer`'s catch logs its ERROR line synchronously before
    // `sendRequest` falls through to the local send, so the event is already in
    // `events` by the time `request()` resolves — nothing left to sleep for.
    await api.request('GET', '/channels/2'); // authorize now hits the stopped server
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
    // waitForUpdate resolves once the server has COUNTED the call, not once the client
    // has received its reply — request 1's own fire-and-forget update round trip can
    // still be in flight. A graceful close (above) drains it; an abrupt one would not,
    // and could kill it mid-flight, producing a second, unrelated ERROR event from step
    // 1's own handler rather than the single one this test means to isolate.
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    rpc.forceClose(); // abrupt — no graceful drain (qa probe P-2's "killed before call" shape)

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
