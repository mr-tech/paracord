import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { SHAPES, type Shape } from '../harness/rateLimit429Shapes';

/**
 * WP-9b step 1 — AC-9.1 (send counts over a real 4.5 s window), over the 429 shape class
 * × the request path {local, RPC} (D-20). The shapes themselves are
 * `tests/harness/rateLimit429Shapes.ts`, shared with AC-9.2's cells in `tests/api/`.
 *
 * Time-based: each cell waits out a real 4.5 s window and counts the sends that landed
 * inside it, so it lives in `tests/timing/` and runs only under `npm run test:timing`.
 */

const PATHS: Array<'local' | 'rpc'> = ['local', 'rpc'];

async function drive(shape: Shape, path: 'local' | 'rpc') {
  const origin = await LoopbackApiOrigin.start();
  origin.setScript([shape.response]);
  const rpc = path === 'rpc' ? await LoopbackRpcServer.start() : undefined;

  const api = await createApiAgainstOrigin(origin);
  if (rpc) {
    await api.addRateLimitService({ port: rpc.port, host: '127.0.0.1', allowFallback: false });
  }

  const windowStart = Date.now();
  const requestPromise = api.request('GET', '/channels/999', {
    local: path === 'local',
    returnOnRateLimit: false,
    returnOnGlobalRateLimit: false,
  }).catch(() => undefined);

  await origin.waitForAccept(1);
  await new Promise((resolve) => {
    setTimeout(resolve, 4500 - (Date.now() - windowStart));
  });

  const sends = origin.acceptCount;
  const authorizeCalls = rpc?.authorizeCalls ?? 0;

  api.end();
  await origin.close();
  await rpc?.close();
  // Let the in-flight request settle rather than leaking a hanging promise into the
  // next test — it is expected to still be queued/parked at teardown for every shape
  // but the control (whose reset-after does eventually let it resolve or 429-throw).
  void requestPromise;

  return { sends, authorizeCalls };
}

describe('Api 429 handling: send counts over the class {shape} x {path} (AC-9.1)', () => {
  for (const shape of SHAPES) {
    for (const path of PATHS) {
      const label = typeof shape.expectedSends === 'number'
        ? `${shape.expectedSends} time(s)`
        : `${shape.expectedSends.min}-${shape.expectedSends.max} times`;
      it(`${shape.label} on the ${path} path sends ${label} in 4.5s`, async () => {
        const { sends, authorizeCalls } = await drive(shape, path);

        if (typeof shape.expectedSends === 'number') {
          expect(sends).toBe(shape.expectedSends);
        } else {
          expect(sends).toBeGreaterThanOrEqual(shape.expectedSends.min);
          expect(sends).toBeLessThanOrEqual(shape.expectedSends.max);
        }

        // AC-9.1's own path-membership predicate: authorize >= accept >= 1 on RPC,
        // authorize = 0 on local. A member that fails this predicate has left its path.
        if (path === 'rpc') {
          expect(authorizeCalls).toBeGreaterThanOrEqual(sends);
          expect(authorizeCalls).toBeGreaterThanOrEqual(1);
        } else {
          expect(authorizeCalls).toBe(0);
        }
      }, 10000);
    }
  }
});
