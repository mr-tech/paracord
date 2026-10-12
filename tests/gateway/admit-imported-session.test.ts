import { describe, it, expect } from 'vitest';

import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { startBotRig, sleep } from '../harness/botRig';
import { createDirectGateway } from '../harness/directGateway';
import {
  SESSION_MARKER, TOKEN_MARKER, carriesAny, handoffLines,
} from '../harness/handoffTelemetry';
import { waitForCondition } from '../harness/waitFor';
import { GATEWAY_CLOSE_CODES, LOG_LEVELS } from '../../src/constants';

import type { DebugLine } from '../harness/directGateway';
import type { BotRig } from '../harness/botRig';
import type { LoopbackGatewayServerOptions } from '../harness/loopbackGatewayServer';
import type Gateway from '../../src/clients/Gateway/Gateway';
import type { SessionHandoffState } from '../../src/clients/Gateway/types';
import type { ParacordStartupEvent } from '../../src/clients/Paracord/types';

const ADMITTED_SESSION = 'ADMITTED_SESSION';
const RESUME_MARKER = 'RESUME_MARKER';
const SECRETS = [ADMITTED_SESSION, RESUME_MARKER, TOKEN_MARKER, SESSION_MARKER];

interface Rig extends BotRig {
  resumeHost: LoopbackGatewayServer;
  gw: Gateway;
  state: SessionHandoffState;
  startups: ParacordStartupEvent[];
  endAll(): Promise<void>;
}

async function admissionRig(
  options: { resumeHost?: LoopbackGatewayServerOptions; server?: LoopbackGatewayServerOptions } = {},
): Promise<Rig> {
  const resumeHost = await LoopbackGatewayServer.start(options.resumeHost ?? {});
  const rig = await startBotRig(options.server ?? {}, {}, [1], { shardCount: 2 }, false);
  const startups: ParacordStartupEvent[] = [];
  rig.bot.on('SHARD_STARTUP_COMPLETE', (e: ParacordStartupEvent) => { startups.push(e); });
  const gw = rig.bot.shards.get(1)!;
  return {
    ...rig,
    resumeHost,
    gw,
    startups,
    state: {
      sessionId: ADMITTED_SESSION, sequence: 5, shard: [1, 2], resumeUrl: `${resumeHost.url}/${RESUME_MARKER}`,
    },
    async endAll() {
      await rig.end();
      await resumeHost.close();
    },
  };
}

describe('admitImportedSession: the admitted gateway resumes outside the starting slot', () => {
  it('AC-3.1/3.4: with a sibling mid-identify it sends RESUME on its own HELLO, and the sibling\'s startup bookkeeping is untouched', async () => {
    const resumeHost = await LoopbackGatewayServer.start();
    const rig = await startBotRig({ readyGuilds: 3 }, {}, [0, 1], {}, false);
    const startups: ParacordStartupEvent[] = [];
    rig.bot.on('SHARD_STARTUP_COMPLETE', (e: ParacordStartupEvent) => { startups.push(e); });
    try {
      const sibling = rig.bot.shards.get(0)!;
      const admitted = rig.bot.shards.get(1)!;
      await waitForCondition(() => rig.bot.startingGateway === sibling && sibling.resumable, 'the sibling is mid-identify', 8000);
      expect(rig.bot.gatewayLoginQueue.includes(admitted)).toBe(true);

      const state: SessionHandoffState = {
        sessionId: ADMITTED_SESSION, sequence: 5, shard: [1, 2], resumeUrl: resumeHost.url,
      };
      rig.bot.admitImportedSession(admitted, state);
      await resumeHost.waitForResumes(1, 4000);

      expect(resumeHost.receivedResumes[0]).toEqual({ sessionId: ADMITTED_SESSION, seq: 5, conn: 1 });
      expect(rig.bot.gatewayLoginQueue.includes(admitted)).toBe(false);
      expect(rig.bot.startingGateway).toBe(sibling);
      expect(startups.filter((e) => e.shard === sibling)).toHaveLength(0);

      await waitForCondition(() => startups.some((e) => e.shard === admitted), 'the admitted gateway completes startup', 4000);
      const completed = startups.find((e) => e.shard === admitted)!;
      expect(completed.resumed).toBe(true);
      expect(rig.bot.startingGateway).toBe(sibling);

      rig.server.sendDispatch('GUILD_CREATE', { id: '1' });
      rig.server.sendDispatch('GUILD_CREATE', { id: '2' });
      await sleep(300);
      expect(startups.filter((e) => e.shard === sibling)).toHaveLength(0);
      rig.server.sendDispatch('GUILD_CREATE', { id: '3' });
      await waitForCondition(() => startups.some((e) => e.shard === sibling), 'the sibling completes on its own third guild', 4000);
      expect(startups.filter((e) => e.shard === sibling)).toHaveLength(1);
      expect(startups.find((e) => e.shard === sibling)!.resumed).toBeUndefined();
    } finally {
      await rig.end();
      await resumeHost.close();
    }
  }, 30000);

  it('AC-3.6: a plain admission leaves the gateway with a socket, out of the queue, with one INFO line and no WARNING in the line class', async () => {
    const r = await admissionRig();
    try {
      r.bot.admitImportedSession(r.gw, r.state);
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(false);
      expect(r.gw.ws).toBeDefined();
      await r.resumeHost.waitForResumes(1);
      await waitForCondition(() => r.startups.some((e) => e.shard === r.gw), 'RESUMED handled', 4000);

      const lines = handoffLines(r.debug);
      expect(lines.filter((l) => l.level === LOG_LEVELS.INFO)).toHaveLength(1);
      expect(lines.filter((l) => l.level === LOG_LEVELS.WARNING)).toHaveLength(0);
      expect(lines[0]!.data.shardId).toBe(1);
      expect(lines[0]!.data.sequence).toBe(5);
      expect(lines.some((l) => carriesAny(l, SECRETS))).toBe(false);
    } finally {
      await r.endAll();
    }
  }, 20000);
});

describe('AC-3.2: a refused admission leaves the queue and the session as they were', () => {
  it('a gateway that is not this client\'s, even with the same shard id, is refused by identity', async () => {
    const r = await admissionRig();
    const foreign = createDirectGateway(r.server.url, { shard: [1, 2] });
    try {
      const queue = [...r.bot.gatewayLoginQueue];
      expect(r.gw.id).toBe(foreign.gateway.id);

      expect(() => r.bot.admitImportedSession(foreign.gateway, r.state)).toThrow();

      expect(r.bot.gatewayLoginQueue).toEqual(queue);
      expect(r.gw.resumable).toBe(false);
      expect(foreign.gateway.resumable).toBe(false);
      expect(foreign.gateway.ws).toBeUndefined();
      expect(r.resumeHost.attempts).toHaveLength(0);

      const lines = handoffLines(r.debug);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.level).toBe(LOG_LEVELS.WARNING);
      expect(lines[0]!.data.shardId).toBe(1);
      expect(typeof lines[0]!.data.reason).toBe('string');
      expect(carriesAny(lines[0]!, SECRETS)).toBe(false);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('an invalid state is refused and the gateway stays queued and session-less', async () => {
    const r = await admissionRig();
    try {
      const queue = [...r.bot.gatewayLoginQueue];
      expect(() => r.bot.admitImportedSession(r.gw, { ...r.state, sequence: -1 })).toThrow();
      expect(r.bot.gatewayLoginQueue).toEqual(queue);
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(true);
      expect(r.gw.resumable).toBe(false);
      expect(r.gw.ws).toBeUndefined();
      expect(r.resumeHost.attempts).toHaveLength(0);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('a gateway that already holds a session is refused and keeps it', async () => {
    const r = await admissionRig();
    try {
      await waitForCondition(() => r.gw.resumable, 'the queue starts and READY is handled', 8000);
      const attempts = r.server.attempts.length;
      expect(() => r.bot.admitImportedSession(r.gw, r.state)).toThrow();
      expect(r.gw.resumable).toBe(true);
      expect(r.resumeHost.attempts).toHaveLength(0);
      expect(r.server.attempts).toHaveLength(attempts);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('a gateway the consumer already took out of the queue is admitted without removing another queued gateway', async () => {
    const resumeHost = await LoopbackGatewayServer.start();
    const rig = await startBotRig({}, {}, [1, 2], { shardCount: 3 }, false);
    try {
      const own = rig.bot.shards.get(1)!;
      const other = rig.bot.shards.get(2)!;
      expect(rig.bot.gatewayLoginQueue).toEqual([own, other]);
      rig.bot.gatewayLoginQueue.splice(rig.bot.gatewayLoginQueue.indexOf(own), 1);

      rig.bot.admitImportedSession(own, {
        sessionId: ADMITTED_SESSION, sequence: 5, shard: [1, 3], resumeUrl: resumeHost.url,
      });

      expect(rig.bot.gatewayLoginQueue).toEqual([other]);
      expect(own.resumable).toBe(true);
    } finally {
      await rig.end();
      await resumeHost.close();
    }
  }, 20000);

  it('control: a gateway of this client that is queued and session-less is admitted', async () => {
    const r = await admissionRig();
    try {
      expect(() => r.bot.admitImportedSession(r.gw, r.state)).not.toThrow();
      expect(r.gw.resumable).toBe(true);
    } finally {
      await r.endAll();
    }
  }, 20000);
});

describe('AC-3.3: a refused resume re-enters the queue by the normal close path', () => {
  it('closes 4993, is upserted exactly once with no synchronous re-login, and identifies through the queue', async () => {
    const r = await admissionRig({ resumeHost: { resumeResponse: 'invalidSession' } });
    try {
      const debugBefore = r.debug.length;
      r.bot.admitImportedSession(r.gw, r.state);
      await waitForCondition(() => r.closes.length === 1, 'GATEWAY_CLOSE delivered', 5000);

      expect(r.closes[0]!.code).toBe(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(true);
      expect(r.debug.slice(debugBefore).filter((d) => d.message.startsWith('Upserting shard 1 '))).toHaveLength(1);
      expect(r.resumeHost.attempts).toHaveLength(1);
      expect(r.server.attempts).toHaveLength(0);
      expect(r.gw.resumable).toBe(false);

      await waitForCondition(() => r.server.receivedOps.includes(2), 'the queue identifies the gateway', 10000);
      expect(r.resumeHost.attempts).toHaveLength(1);
    } finally {
      await r.endAll();
    }
  }, 30000);
});

describe('AC-1.8: a consumer emitter that throws during admission leaves the queue and the session as they were', () => {
  const SITES: Array<[string, (d: DebugLine) => boolean, (r: Rig) => () => void]> = [
    ['the Session constructor DEBUG line', (d) => d.message.includes('Session object created'), (r) => () => r.bot.admitImportedSession(r.gw, r.state)],
    ['the import INFO line', (d) => d.data !== undefined && 'shardId' in d.data && d.level === LOG_LEVELS.INFO, (r) => () => r.bot.admitImportedSession(r.gw, r.state)],
    ['the import refusal line', (d) => d.data !== undefined && 'shardId' in d.data && d.level === LOG_LEVELS.WARNING, (r) => () => r.bot.admitImportedSession(r.gw, { ...r.state, sequence: -1 })],
  ];

  it.each(SITES)('at %s: the call throws, the gateway stays queued at its slot and session-less, and a retry is admitted', async (_label, matches, call) => {
    const r = await admissionRig();
    try {
      const queue = [...r.bot.gatewayLoginQueue];
      let armed = true;
      r.bot.on('DEBUG', (d: DebugLine) => { if (armed && matches(d)) throw new Error('consumer emitter threw'); });

      expect(call(r)).toThrow('consumer emitter threw');
      expect(r.bot.gatewayLoginQueue).toEqual(queue);
      expect(r.gw.resumable).toBe(false);
      expect(r.gw.ws).toBeUndefined();
      expect(r.resumeHost.attempts).toHaveLength(0);

      armed = false;
      r.bot.admitImportedSession(r.gw, r.state);
      expect(r.gw.resumable).toBe(true);
      expect(r.bot.gatewayLoginQueue.includes(r.gw)).toBe(false);
    } finally {
      await r.endAll();
    }
  }, 20000);

  it('at the not-this-client refusal line: the call throws and nothing changes', async () => {
    const r = await admissionRig();
    const foreign = createDirectGateway(r.server.url, { shard: [1, 2] });
    try {
      const queue = [...r.bot.gatewayLoginQueue];
      r.bot.on('DEBUG', (d: DebugLine) => { if (d.data !== undefined && 'shardId' in d.data) throw new Error('consumer emitter threw'); });
      expect(() => r.bot.admitImportedSession(foreign.gateway, r.state)).toThrow('consumer emitter threw');
      expect(r.bot.gatewayLoginQueue).toEqual(queue);
      expect(foreign.gateway.resumable).toBe(false);
    } finally {
      await r.endAll();
    }
  }, 20000);
});
