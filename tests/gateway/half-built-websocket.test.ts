import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import zlib from 'zlib';

import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { startBotRig } from '../harness/botRig';
import { handoffLines } from '../harness/handoffTelemetry';
import { waitForCondition } from '../harness/waitFor';
import { LOG_LEVELS } from '../../src/constants';

import type { BotRig } from '../harness/botRig';
import type Gateway from '../../src/clients/Gateway/Gateway';
import type { SessionHandoffState } from '../../src/clients/Gateway/types';

afterEach(() => {
  vi.restoreAllMocks();
});

function shardOne(rig: BotRig): Gateway {
  const gw = rig.bot.shards.get(1);
  if (gw === undefined) throw new Error('shard 1 is not on the bot');
  return gw;
}

function stateFor(resumeHost: LoopbackGatewayServer): SessionHandoffState {
  return {
    sessionId: 'HALF_BUILT_SESSION', sequence: 9, shard: [1, 2], resumeUrl: `${resumeHost.url}/half-built`,
  };
}

describe('a Websocket whose construction fails leaves nothing behind', () => {
  it('a throw after the connection is opened leaves no connection open on the host once the bot ends', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const resumeHost = await LoopbackGatewayServer.start();
    const rig = await startBotRig({}, { compressShards: [1] }, [1], { shardCount: 2 }, false);
    const gw = shardOne(rig);
    const realCreateInflate = zlib.createInflate;
    let injected = 0;
    vi.spyOn(zlib, 'createInflate').mockImplementation(((...args: Parameters<typeof zlib.createInflate>) => {
      if (injected === 0) {
        injected += 1;
        throw new Error('injected: createInflate failed');
      }
      return realCreateInflate(...args);
    }) as typeof zlib.createInflate);
    try {
      expect(() => rig.bot.admitImportedSession(gw, stateFor(resumeHost))).not.toThrow();
      expect({
        injected,
        wsUndefined: gw.ws === undefined,
        queued: rig.bot.gatewayLoginQueue.includes(gw),
        fallbackWarnings: handoffLines(rig.debug).filter((l) => l.level === LOG_LEVELS.WARNING).length,
      }).toEqual({
        injected: 1, wsUndefined: true, queued: true, fallbackWarnings: 1,
      });

      await resumeHost.waitForResumes(1, 6000);
      expect(resumeHost.receivedResumes.map((r) => r.seq)).toEqual([9]);
      expect(resumeHost.openClientCount).toBeGreaterThanOrEqual(1);

      await rig.end();
      await waitForCondition(() => resumeHost.openClientCount === 0, 'no connection left open on the resume host', 3000);
    } finally {
      resumeHost.terminateClients();
      await rig.end();
      await resumeHost.close();
    }
  }, 20000);

  it('a throw from the ws constructor itself reaches the session as that same error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const resumeHost = await LoopbackGatewayServer.start();
    const rig = await startBotRig(
      {},
      { gatewayOptions: { wsUrl: `${resumeHost.url}#x`, wsParams: { v: '10', encoding: 'json' } } },
      [1],
      { shardCount: 2 },
      false,
    );
    const gw = shardOne(rig);
    try {
      const { resumeUrl, ...withoutResumeUrl } = stateFor(resumeHost);
      expect(resumeUrl).toBeDefined();
      expect(() => rig.bot.admitImportedSession(gw, withoutResumeUrl)).not.toThrow();
      expect(gw.ws).toBeUndefined();

      const logged = consoleError.mock.calls.map(([first]) => first as unknown);
      expect(logged.length).toBeGreaterThanOrEqual(2);
      expect(logged[0]).toBeInstanceOf(Error);
      expect(logged[1]).toBe(logged[0]);
      expect(logged.filter((e) => e instanceof TypeError)).toEqual([]);
    } finally {
      await rig.end();
      await resumeHost.close();
    }
  }, 20000);
});
