import { describe, it, expect } from 'vitest';

import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type { ScriptedResponse } from '../harness/loopbackApiOrigin';

const CHANNEL_BUCKET_EXHAUSTED: ScriptedResponse = {
  status: 200,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-global': 'false',
    'x-ratelimit-bucket': 'channel-bucket',
    'x-ratelimit-limit': '1',
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset-after': '3600',
  },
  body: { id: '111' },
};

const PLAIN_OK: ScriptedResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: { ok: true },
};

describe('Api bucket hashes are scoped to the top-level resource', () => {
  for (const local of [true, false]) {
    const path = local ? 'local' : 'rpc';

    it(`on the ${path} path: first GET /guilds/{id} requests are not held by a GET /channels/{id} bucket`, async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([CHANNEL_BUCKET_EXHAUSTED, PLAIN_OK]);
      const rpc = local ? undefined : await LoopbackRpcServer.start();

      const api = await createApiAgainstOrigin(origin);
      if (rpc !== undefined) {
        await api.addRateLimitService({ port: rpc.port, host: '127.0.0.1', allowFallback: false });
      }

      await api.request('GET', '/channels/111', { local });
      if (rpc !== undefined) await rpc.waitForUpdate(1);

      void api.request('GET', '/guilds/222', { local }).catch(() => undefined);
      void api.request('GET', '/guilds/222', { local }).catch(() => undefined);
      await origin.waitForAccept(3, 3000);
      expect(origin.acceptCount).toBe(3);

      api.end();
      await origin.close();
      if (rpc !== undefined) await rpc.close();
    }, 10000);
  }
});
