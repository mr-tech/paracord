import { describe, it, expect } from 'vitest';

import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { startBotRig } from '../harness/botRig';
import { waitForCondition } from '../harness/waitFor';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';

describe('AC-3.1 (startup-timer limb): an admission does not release the sibling\'s startup timer', () => {
  it('the sibling still times out (4991) after another gateway was admitted and resumed', async () => {
    const resumeHost = await LoopbackGatewayServer.start();
    const rig = await startBotRig({ readyGuilds: 3 }, { shardStartupTimeout: 3 }, [0, 1], {}, false);
    try {
      const sibling = rig.bot.shards.get(0)!;
      const admitted = rig.bot.shards.get(1)!;
      await waitForCondition(() => rig.bot.startingGateway === sibling && sibling.resumable, 'the sibling is mid-identify', 8000);

      rig.bot.admitImportedSession(admitted, {
        sessionId: 'ADMITTED_SESSION', sequence: 5, shard: [1, 2], resumeUrl: resumeHost.url,
      });
      await resumeHost.waitForResumes(1, 4000);
      expect(rig.bot.startingGateway).toBe(sibling);

      await waitForCondition(
        () => rig.closes.some((c) => c.gateway === sibling && c.code === GATEWAY_CLOSE_CODES.INTERNAL_TERMINATE_RECONNECT),
        'the sibling is closed 4991 by its own startup timer',
        8000,
      );
      expect(rig.closes.filter((c) => c.gateway === admitted)).toHaveLength(0);
    } finally {
      await rig.end();
      await resumeHost.close();
    }
  }, 30000);
});
