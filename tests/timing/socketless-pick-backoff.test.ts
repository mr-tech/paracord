import {
  describe, it, expect, vi,
} from 'vitest';

import { startBotRig, sleep } from '../harness/botRig';

import type { DebugLine } from '../harness/directGateway';

describe('AC-3.7 (queue route), the time-defined limb: a gateway that fails every attempt backs off, and its siblings are not slowed', () => {
  it('over nine seconds the failing gateway is logged in at most five times, and its siblings are READY within seven', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rig = await startBotRig({}, {}, [0, 1, 2], {}, false);
    try {
      rig.bot.on('DEBUG', (d: DebugLine) => {
        if (d.message.startsWith('Resuming on url')) throw new Error('consumer emitter threw');
      });
      const failing = rig.bot.shards.get(1)!;
      let calls = 0;
      const real = failing.login.bind(failing);
      (failing as unknown as { login: () => unknown }).login = () => { calls += 1; return real(); };

      const start = Date.now();
      rig.bot.admitImportedSession(failing, {
        sessionId: 'BACKOFF_SESSION', sequence: 5, shard: [1, 3], resumeUrl: rig.server.url,
      });
      let siblingsReadyAfterMs = -1;
      const poll = setInterval(() => {
        if (siblingsReadyAfterMs < 0 && [0, 2].every((id) => rig.bot.shards.get(id)!.resumable)) siblingsReadyAfterMs = Date.now() - start;
      }, 50);

      await sleep(9000);
      clearInterval(poll);

      expect(calls).toBeGreaterThanOrEqual(3);
      expect(calls).toBeLessThanOrEqual(5);
      expect(siblingsReadyAfterMs).toBeGreaterThan(0);
      expect(siblingsReadyAfterMs).toBeLessThan(7000);
    } finally {
      vi.restoreAllMocks();
      await rig.end();
    }
  }, 30000);
});
