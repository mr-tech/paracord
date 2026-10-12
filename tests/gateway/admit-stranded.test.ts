import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { startBotRig } from '../harness/botRig';
import type { BotRig } from '../harness/botRig';
import type { DebugLine } from '../harness/directGateway';
import { TOKEN_MARKER, carriesAny, handoffLines } from '../harness/handoffTelemetry';
import { waitForCondition } from '../harness/waitFor';
import { LOG_LEVELS } from '../../src/constants';
import type Gateway from '../../src/clients/Gateway/Gateway';
import type { SessionHandoffState } from '../../src/clients/Gateway/types';

const ADMITTED_SESSION = 'ADMITTED_SESSION';
const RESUME_MARKER = 'RESUME_MARKER';

interface Rig extends BotRig {
  resumeHost: LoopbackGatewayServer;
  gw: Gateway;
  logins: { calls: number };
  endAll(): Promise<void>;
}

async function rigWith(botOptions: Parameters<typeof startBotRig>[1] = {}): Promise<Rig> {
  const resumeHost = await LoopbackGatewayServer.start();
  const rig = await startBotRig({}, botOptions, [1], { shardCount: 2 }, false);
  const gw = rig.bot.shards.get(1)!;
  const logins = { calls: 0 };
  const real = gw.login.bind(gw);
  (gw as unknown as { login: () => unknown }).login = () => {
    logins.calls += 1;
    return real();
  };
  return {
    ...rig,
    resumeHost,
    gw,
    logins,
    async endAll() {
      await rig.end();
      await resumeHost.close();
    },
  };
}

function stateFor(resumeHost: LoopbackGatewayServer, resumeUrl = `${resumeHost.url}/${RESUME_MARKER}`): SessionHandoffState {
  return {
    sessionId: ADMITTED_SESSION, sequence: 5, shard: [1, 2], resumeUrl,
  };
}

function expectOneFallbackWarning(r: Rig): void {
  const warnings = handoffLines(r.debug).filter((l) => l.level === LOG_LEVELS.WARNING);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]!.data.shardId).toBe(1);
  expect(handoffLines(r.debug).some((l) => carriesAny(l, [ADMITTED_SESSION, RESUME_MARKER, TOKEN_MARKER]))).toBe(false);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AC-3.7: after admission returns, the gateway holds a Websocket or is in the login queue', () => {
  it('control: an admission whose login succeeds holds a Websocket, is not queued, and logs no fallback WARNING', async () => {
    const r = await rigWith();
    try {
      r.bot.admitImportedSession(r.gw, stateFor(r.resumeHost));
      expect(r.gw.ws).toBeDefined();
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(false);
      expect(handoffLines(r.debug).filter((l) => l.level === LOG_LEVELS.WARNING)).toHaveLength(0);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('the realistic member: a resumeUrl with a fragment makes the ws constructor throw, and the gateway is queued with one WARNING and logged in again by the queue', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await rigWith();
    try {
      expect(() => r.bot.admitImportedSession(r.gw, stateFor(r.resumeHost, `${r.resumeHost.url}/${RESUME_MARKER}#x`))).not.toThrow();

      expect(consoleError).toHaveBeenCalled();
      expect(r.gw.ws).toBeUndefined();
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(true);
      expect(r.gw.resumable).toBe(true);
      expectOneFallbackWarning(r);

      expect(r.logins.calls).toBe(1);
      await waitForCondition(() => r.logins.calls >= 2, 'the queue logs the gateway in again', 6000);
      expect(r.resumeHost.attempts).toHaveLength(0);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('the emitter member: an emitter that throws once on the "Resuming on url" line leaves the gateway queued, and the queue then resumes it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await rigWith();
    try {
      let thrown = false;
      r.bot.on('DEBUG', (d: DebugLine) => {
        if (!thrown && d.message.startsWith('Resuming on url')) {
          thrown = true;
          throw new Error('consumer emitter threw');
        }
      });

      expect(() => r.bot.admitImportedSession(r.gw, stateFor(r.resumeHost))).not.toThrow();

      expect(thrown).toBe(true);
      expect(consoleError).toHaveBeenCalled();
      expect(r.gw.ws).toBeUndefined();
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(true);
      expectOneFallbackWarning(r);

      await r.resumeHost.waitForResumes(1, 6000);
      expect(r.resumeHost.receivedResumes[0]).toEqual({ sessionId: ADMITTED_SESSION, seq: 5, conn: 1 });
      expect(r.logins.calls).toBe(2);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('the compress member: an emitter that throws once on the "Compressing websocket connection." line leaves the gateway queued, and the queue logs it in again', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await rigWith({ compressShards: [1] });
    try {
      let thrown = false;
      r.bot.on('DEBUG', (d: DebugLine) => {
        if (!thrown && d.message.startsWith('Compressing websocket connection')) {
          thrown = true;
          throw new Error('consumer emitter threw');
        }
      });

      expect(() => r.bot.admitImportedSession(r.gw, stateFor(r.resumeHost))).not.toThrow();

      expect(thrown).toBe(true);
      expect(consoleError).toHaveBeenCalled();
      expect(r.gw.ws).toBeUndefined();
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(true);
      expectOneFallbackWarning(r);
      await waitForCondition(() => r.logins.calls >= 2, 'the queue logs the gateway in again', 6000);
    } finally {
      await r.endAll();
    }
  }, 20000);
});
