import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import { startBotRig, sleep } from '../harness/botRig';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import type { BotRig } from '../harness/botRig';
import type { DebugLine } from '../harness/directGateway';
import { waitForCondition } from '../harness/waitFor';
import { isEligible } from '../../src/clients/Paracord/failureCounter';
import type Gateway from '../../src/clients/Gateway/Gateway';

afterEach(() => {
  vi.restoreAllMocks();
});

function countLogins(gw: Gateway): { calls: number } {
  const counter = { calls: 0 };
  const real = gw.login.bind(gw);
  // eslint-disable-next-line no-param-reassign
  (gw as unknown as { login: () => unknown }).login = () => {
    counter.calls += 1;
    return real();
  };
  return counter;
}

async function threeShards(failResume: boolean): Promise<{ rig: BotRig; admitted: Gateway; logins: { calls: number } }> {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const rig = await startBotRig({}, {}, [0, 1, 2], {}, false);
  if (failResume) {
    rig.bot.on('DEBUG', (d: DebugLine) => {
      if (d.message.startsWith('Resuming on url')) throw new Error('consumer emitter threw');
    });
  }
  const admitted = rig.bot.shards.get(1)!;
  const logins = countLogins(admitted);
  rig.bot.admitImportedSession(admitted, {
    sessionId: 'STALL_SESSION', sequence: 5, shard: [1, 3], resumeUrl: rig.server.url,
  });
  return { rig, admitted, logins };
}

describe('AC-3.7 (queue route): a pick whose login() opens no Websocket releases the starting slot and re-queues the gateway with a backoff', () => {
  it('control: an admission whose login succeeds leaves the other shards free to start', async () => {
    const { rig } = await threeShards(false);
    try {
      await waitForCondition(
        () => [0, 2].every((id) => rig.bot.shards.get(id)!.resumable),
        'shards 0 and 2 reach READY',
        8000,
      );
      expect(rig.debug.filter((d) => d.message.includes('opened no connection'))).toEqual([]);
    } finally {
      await rig.end();
    }
  }, 20000);

  it('a gateway whose every login fails does not hold the starting slot: its siblings reach READY, and it waits its backoff in the queue', async () => {
    const { rig, admitted, logins } = await threeShards(true);
    try {
      expect(logins.calls).toBe(1);
      expect(admitted.ws).toBeUndefined();
      await waitForCondition(() => logins.calls >= 2, 'the queue picks the admitted gateway', 5000);

      expect(rig.bot.startingGateway === admitted).toBe(false);
      expect(rig.bot.gatewayLoginQueue.includes(admitted)).toBe(true);
      expect(isEligible(admitted, Date.now())).toBe(false);

      await waitForCondition(
        () => [0, 2].every((id) => rig.bot.shards.get(id)!.resumable),
        'shards 0 and 2 reach READY while shard 1 keeps failing',
        8000,
      );
      expect(admitted.ws).toBeUndefined();
      const flagged = rig.debug.filter((d) => d.message.includes('opened no connection'));
      expect(flagged.length).toBeGreaterThanOrEqual(1);
      expect(flagged.every((d) => ((d.data.shard as Gateway | undefined)?.id ?? d.data.shardId) === 1)).toBe(true);
    } finally {
      await rig.end();
    }
  }, 30000);

  it('a fresh shard whose first login fails arms no startup bookkeeping that outlives the pick', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const resumeHost = await LoopbackGatewayServer.start();
    const rig = await startBotRig(
      {},
      {
        gatewayOptions: { wsUrl: `${resumeHost.url}#x`, wsParams: { v: '10', encoding: 'json' } },
        unavailableGuildTolerance: 0,
        unavailableGuildWait: 1,
        shardStartupTimeout: 30,
      },
      [0],
      {},
      false,
    );
    try {
      const logins = countLogins(rig.gateway);
      await waitForCondition(() => logins.calls >= 1, 'the queue picks the shard', 4000);
      await sleep(2600);

      expect(rig.gateway.ws).toBeUndefined();
      expect(rig.bot.startingGateway === rig.gateway).toBe(false);
      expect(rig.debug.filter((d) => d.message.startsWith('Unavailable guilds check expected shard'))).toEqual([]);
    } finally {
      await rig.end();
      await resumeHost.close();
    }
  }, 20000);
});
