import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import { SHAPES } from '../harness/rateLimit429Shapes';
import BaseRequest from '../../src/clients/Api/structures/BaseRequest';
import ApiStatic from '../../src/clients/Api/Api';

import type Api from '../../src/clients/Api/Api';

describe('Api 429 handling: recovery (AC-9.2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  for (const shape of SHAPES) {
    it(`${shape.label} on the rpc path: server-side isRateLimited recovers to waitFor 0, including at +1h`, async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([shape.response]);
      const rpc = await LoopbackRpcServer.start();

      const api = await createApiAgainstOrigin(origin);
      await api.addRateLimitService({ port: rpc.port, host: '127.0.0.1', allowFallback: false });

      void api.request('GET', '/channels/999', {
        local: false, returnOnRateLimit: true, returnOnGlobalRateLimit: true,
      }).catch(() => undefined);

      await rpc.waitForAuthorize(1);
      await origin.waitForAccept(1);
      await new Promise((resolve) => { setTimeout(resolve, 200); });

      const [tlr, tlrID, bucketHashKey] = ApiStatic.extractBucketHashKey('GET', '/channels/999');
      const bucketHash = shape.response.headers?.['x-ratelimit-bucket'];
      const probe = new BaseRequest('GET', '/channels/999', tlr, tlrID, bucketHash, bucketHashKey);

      const immediately = rpc.rateLimitCache.isRateLimited(probe);
      expect(Number.isFinite(immediately.waitFor)).toBe(true);

      vi.setSystemTime(Date.now() + 60 * 60 * 1000);
      const afterOneHour = rpc.rateLimitCache.isRateLimited(probe);
      expect(afterOneHour.waitFor).toBe(0);

      api.end();
      await origin.close();
      await rpc.close();
    }, 10000);
  }

  for (const shape of SHAPES) {
    it(`${shape.label} on the local path: a request issued after +1h sends promptly (queue no longer holds it)`, async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([shape.response, { status: 200, body: { ok: true }, headers: { 'content-type': 'application/json' } }]);

      const api = await createApiAgainstOrigin(origin);

      void api.request('GET', '/channels/999', {
        local: true, returnOnRateLimit: true, returnOnGlobalRateLimit: true,
      }).catch(() => undefined);
      await origin.waitForAccept(1);

      vi.setSystemTime(Date.now() + 60 * 60 * 1000);

      const before = origin.acceptCount;
      void api.request('GET', '/channels/999', { local: true }).catch(() => undefined);
      await origin.waitForAccept(before + 1, 3000);
      expect(origin.acceptCount).toBe(before + 1);

      api.end();
      await origin.close();
    }, 10000);
  }
});
