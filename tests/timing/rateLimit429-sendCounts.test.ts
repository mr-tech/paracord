import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { SHAPES, type Shape } from '../harness/rateLimit429Shapes';

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
