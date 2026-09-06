import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin, type ScriptedResponse } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import BaseRequest from '../../src/clients/Api/structures/BaseRequest';
import ApiStatic from '../../src/clients/Api/Api';

import type Api from '../../src/clients/Api/Api';

/**
 * WP-9b step 1 — AC-9.2 (client-side recovery), over the 429 shape class × the request
 * path {local, RPC} (D-20). Header/body values for the shared-scope, global and
 * Cloudflare shapes are the research's own
 * (`research/uncommitted-429-fix-intent-2026-09-03.md` §F2) — `retry-after: 2` for the
 * shared shape, `retry_after: 5.2` for the global shape, `retry-after: 620` for the
 * Cloudflare shape (shortened here to a value still outside the 4.5 s window it once
 * shared with AC-9.1's own cells).
 *
 * AC-9.1 (send counts over a real 4.5s window) had its own cells here; removed — a
 * real-time-window test, not a pure state read against the clock. `Shape`'s
 * `expectedSends` field is unused now and stays on the type, matching every shape's own
 * data rather than being split out for one removed consumer.
 */

const CONTROL: ScriptedResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-global': 'false',
    'x-ratelimit-bucket': 'control-bucket',
    'x-ratelimit-limit': '5',
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset-after': '1.5',
  },
  body: { message: 'You are being rate limited.' },
};

const SHARED: ScriptedResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-scope': 'shared',
    'retry-after': '2.2',
  },
  // No body retry_after — matching the research's exact shape (`54f02df` §F2): shared-scope
  // 429s omit bucket headers and are identified by the header alone, so this also exercises
  // extractRetryAfter's fall-through to the header (CR-4's own concern).
  body: { global: false, message: 'The resource is being rate limited.' },
};

const GLOBAL: ScriptedResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-global': 'true',
  },
  body: { retry_after: 5.2, global: true, message: 'You are being globally rate limited.' },
};

const CLOUDFLARE: ScriptedResponse = {
  status: 429,
  headers: { 'content-type': 'text/html', 'retry-after': '10' },
  body: '<html><body>error code: 1015</body></html>',
  raw: true,
};

/** No body retry_after, no retry-after header, no x-ratelimit-reset-after (D-17). */
const INFORMATION_FREE: ScriptedResponse = {
  status: 429,
  headers: { 'content-type': 'application/json' },
  body: { message: 'You are being rate limited.' },
};

interface Shape {
  label: string;
  response: ScriptedResponse;
  /** Expected network sends over the 4.5s window (research's instrument), each path. */
  expectedSends: number | { min: number; max: number };
}

const SHAPES: Shape[] = [
  { label: 'control (bucket 429, full headers)', response: CONTROL, expectedSends: 3 },
  { label: 'shared-scope 429 (x-ratelimit-scope: shared)', response: SHARED, expectedSends: 2 },
  { label: 'global 429 (body retry_after, no bucket headers)', response: GLOBAL, expectedSends: 1 },
  { label: 'Cloudflare ban (HTML body, retry-after header)', response: CLOUDFLARE, expectedSends: 1 },
  {
    label: 'information-free 429 (D-17 growth schedule)',
    response: INFORMATION_FREE,
    // AC-9.1: "attempts at 0, >= 1s and >= 3s under the schedule" - up to 3 in the window.
    expectedSends: { min: 2, max: 3 },
  },
];

describe('Api 429 handling: recovery (AC-9.2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // RPC path: RpcServer#rateLimitCache is public, so isRateLimited — AC-9.2's own
  // stated instrument — is read directly on the server's cache, which is what the RPC
  // path's client relayed into via Api#updateRpcCache.
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
      // Bounded real-clock window for the fire-and-forget RPC relay
      // (Api#updateRpcCache) to land before reading server state — same rationale as
      // globalRateLimitSibling.test.ts.
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

  // Local path: the client's RateLimitCache is a true private field (#rateLimitCache),
  // unreachable from outside Api even by casting. Recovery is read behaviourally
  // instead — a second request issued after the +1h jump sends promptly rather than
  // staying held, which is what "waitFor: 0" means from the request queue's side.
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
