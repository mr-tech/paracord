import {
  describe, it, expect, afterEach,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import BaseRequest from '../../src/clients/Api/structures/BaseRequest';
import ApiStatic from '../../src/clients/Api/Api';

import type Api from '../../src/clients/Api/Api';

// escaped: agent-output/research/uncommitted-429-fix-intent-2026-09-03.md §5.2

describe('a global 429 with no bucket header updates the RPC server\'s global state (AC-9.4, AC-9.9)', () => {
  let origin: LoopbackApiOrigin | undefined;
  let rpc: LoopbackRpcServer | undefined;
  let api: Api | undefined;

  afterEach(async () => {
    api?.end();
    await origin?.close();
    await rpc?.close();
    origin = undefined;
    rpc = undefined;
    api = undefined;
  });

  it('server-side isRateLimited reports globally limited after the client relays a bucket-less global 429', async () => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([{
      status: 429,
      headers: { 'content-type': 'application/json', 'x-ratelimit-global': 'true' },
      body: { retry_after: 5, global: true, message: 'global rate limited' },
    }]);
    rpc = await LoopbackRpcServer.start();

    api = await createApiAgainstOrigin(origin);
    await api.addRateLimitService({ port: rpc.port, host: '127.0.0.1', allowFallback: false });

    await api.request('GET', '/channels/123', {
      local: false, returnOnRateLimit: true, returnOnGlobalRateLimit: true,
    }).catch(() => undefined);

    await rpc.waitForAuthorize(1);
    await new Promise((resolve) => { setTimeout(resolve, 200); });

    const [tlr, tlrID, bucketHashKey] = ApiStatic.extractBucketHashKey('GET', '/channels/123');
    const probe = new BaseRequest('GET', '/channels/123', tlr, tlrID, undefined, bucketHashKey);
    const state = rpc.rateLimitCache.isRateLimited(probe);

    expect(state.global).toBe(true);
    expect(state.waitFor).toBeGreaterThan(0);
  }, 10000);
});
