import {
  describe, it, expect, afterEach,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';
import BaseRequest from '../../src/clients/Api/structures/BaseRequest';
// Static import: extractBucketHashKey is pure string manipulation with no dependency on
// the mocked DISCORD_API_URL constant, so the statically-loaded class is safe to use
// here even though `api` itself comes from createApiAgainstOrigin's dynamic import.
import ApiStatic from '../../src/clients/Api/Api';

import type Api from '../../src/clients/Api/Api';

// escaped: agent-output/research/uncommitted-429-fix-intent-2026-09-03.md §5.2

/**
 * WP-9b step 3 / AC-9.4, AC-9.9 (architect F-6, code review F-3). Production's path
 * (D-20): a global 429 with no bucket header must update the RPC rate-limit server's
 * global state, not only its local-cache mirror. `addService.ts#update` nested
 * `updateGlobal` inside `if (bucketHash !== undefined)`, so this exact shape was
 * silently discarded on the shared-budget path while the local path (`Api.ts`) applied
 * it correctly — same observation, two answers, decided by transport.
 */
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

    // Drive the request on the RPC path so the client relays the response upstream via
    // Api#updateRpcCache -> addService.ts#update. The client itself returns to the
    // caller once it has queued/thrown on the 429; wait for the server to actually see
    // the relayed update rather than racing it.
    await api.request('GET', '/channels/123', {
      local: false, returnOnRateLimit: true, returnOnGlobalRateLimit: true,
    }).catch(() => undefined);

    await rpc.waitForAuthorize(1);
    // The relay to the RPC server (Api#updateRpcCache) is fire-and-forget from the
    // client's perspective; give it a bounded real-clock window to land before reading
    // server state (time-seam rule, form (b) — a named wait is not available for a
    // send this test does not control the far side of, so this is the one place a
    // short bound stands in, sized well above the loopback round trip).
    await new Promise((resolve) => { setTimeout(resolve, 200); });

    const [tlr, tlrID, bucketHashKey] = ApiStatic.extractBucketHashKey('GET', '/channels/123');
    const probe = new BaseRequest('GET', '/channels/123', tlr, tlrID, undefined, bucketHashKey);
    const state = rpc.rateLimitCache.isRateLimited(probe);

    expect(state.global).toBe(true);
    expect(state.waitFor).toBeGreaterThan(0);
  }, 10000);
});
