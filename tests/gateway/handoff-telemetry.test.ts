import { describe, it, expect } from 'vitest';
import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import type { DebugLine } from '../harness/directGateway';
import {
  createDirectGateway, deliver, loginDirect, requestHeartbeatD,
} from '../harness/directGateway';
import {
  SESSION_MARKER, TOKEN_MARKER, carriesAny, handoffLines,
} from '../harness/handoffTelemetry';
import { GATEWAY_CLOSE_CODES, LOG_LEVELS } from '../../src/constants';
import { waitForCondition } from '../harness/waitFor';
import type { SessionHandoffState } from '../../src/clients/Gateway/types';

const RESUME_MARKER = 'RESUME_MARKER';
const SECRETS = [SESSION_MARKER, RESUME_MARKER, TOKEN_MARKER];

async function setup() {
  const resumeHost = await LoopbackGatewayServer.start();
  const server = await LoopbackGatewayServer.start({
    ackHeartbeats: true,
    resumeGatewayUrl: `${resumeHost.url}/${RESUME_MARKER}`,
  });
  const direct = await loginDirect(server);
  return {
    server,
    resumeHost,
    ...direct,
    async end() {
      direct.gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
      await server.close();
      await resumeHost.close();
    },
  };
}

function armThrowOnHandoffLine(emitter: ReturnType<typeof createDirectGateway>['emitter']) {
  const state = { armed: true };
  emitter.on('DEBUG', (d: DebugLine) => {
    if (state.armed && d.data !== undefined && 'shardId' in d.data) throw new Error('consumer emitter threw');
  });
  return state;
}

describe('the exclusion instrument is calibrated before any zero counts (AC-1.7)', () => {
  it('reads true on a real message-half member, and on a planted member for each value in each half', async () => {
    const s = await setup();
    try {
      const ready = s.emitter.debug.find((d) => d.message.includes('Received Ready'))!;
      expect(carriesAny(ready, [SESSION_MARKER])).toBe(true);

      for (const marker of SECRETS) {
        const inMessage: DebugLine = { level: 4, message: `planted ${marker}`, data: { shardId: 0, shard: s.gateway } };
        const inData: DebugLine = { level: 4, message: 'planted', data: { shardId: 0, shard: s.gateway, field: marker } };
        expect(carriesAny(inMessage, [marker])).toBe(true);
        expect(carriesAny(inData, [marker])).toBe(true);
      }
      const clean: DebugLine = { level: 4, message: 'clean', data: { shardId: 0, shard: s.gateway } };
      expect(carriesAny(clean, SECRETS)).toBe(false);
    } finally {
      await s.end();
    }
  });
});

describe('AC-1.7: the pin, clear and refusal lines', () => {
  it('begin emits exactly one INFO line carrying the shard and the pinned sequence, and none of the three secrets', async () => {
    const s = await setup();
    try {
      const live = await deliver(s.server, s.emitter, 2);
      const before = handoffLines(s.emitter.debug).length;
      s.gateway.beginSessionHandoff();
      const lines = handoffLines(s.emitter.debug).slice(before);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.level).toBe(LOG_LEVELS.INFO);
      expect(s.gateway.id).not.toBe(0);
      expect(lines[0]!.data.shardId).toBe(s.gateway.id);
      expect(lines[0]!.data.sequence).toBe(live);
      expect(lines[0]!.message.includes(String(s.gateway.id))).toBe(true);
      expect(carriesAny(lines[0]!, SECRETS)).toBe(false);
    } finally {
      await s.end();
    }
  });

  it('an effective clear emits exactly one INFO line carrying the shard, the pinned sequence and the live sequence', async () => {
    const s = await setup();
    try {
      s.gateway.beginSessionHandoff();
      const pinned = s.server.lastSentSeq;
      const live = await deliver(s.server, s.emitter, 2);
      expect(live).not.toBe(pinned);
      const before = handoffLines(s.emitter.debug).length;
      s.gateway.clearHeartbeatPin();
      const lines = handoffLines(s.emitter.debug).slice(before);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.level).toBe(LOG_LEVELS.INFO);
      expect(lines[0]!.data.shardId).toBe(s.gateway.id);
      expect(lines[0]!.data.sequence).toBe(pinned);
      expect(lines[0]!.data.liveSequence).toBe(live);
      expect(carriesAny(lines[0]!, SECRETS)).toBe(false);
    } finally {
      await s.end();
    }
  });

  it('clear on an unpinned gateway is a no-op that emits no line', async () => {
    const s = await setup();
    try {
      const before = handoffLines(s.emitter.debug).length;
      expect(() => s.gateway.clearHeartbeatPin()).not.toThrow();
      expect(handoffLines(s.emitter.debug)).toHaveLength(before);
      expect(s.gateway.heartbeatPinned).toBe(false);
      expect(await requestHeartbeatD(s.server)).toBe(s.server.lastSentSeq);
    } finally {
      await s.end();
    }
  });

  it('clear on a session-less gateway is a no-op that emits no line', async () => {
    const server = await LoopbackGatewayServer.start();
    const { gateway, emitter } = createDirectGateway(server.url);
    try {
      expect(() => gateway.clearHeartbeatPin()).not.toThrow();
      expect(handoffLines(emitter.debug)).toHaveLength(0);
    } finally {
      await server.close();
    }
  });

  it('each refusal (a second begin, a non-resumable begin, a login while pinned) emits one WARNING line with the shard and a reason, and no secret', async () => {
    const s = await setup();
    const bare = await LoopbackGatewayServer.start();
    const fresh = createDirectGateway(bare.url);
    try {
      s.gateway.beginSessionHandoff();
      const refusals: DebugLine[] = [];
      const attempts: Array<[() => void, ReturnType<typeof createDirectGateway>['emitter']]> = [
        [() => s.gateway.beginSessionHandoff(), s.emitter],
        [() => s.gateway.login(), s.emitter],
        [() => fresh.gateway.beginSessionHandoff(), fresh.emitter],
      ];
      for (const [attempt, emitter] of attempts) {
        const before = handoffLines(emitter.debug).length;
        expect(attempt).toThrow();
        const lines = handoffLines(emitter.debug).slice(before);
        expect(lines).toHaveLength(1);
        refusals.push(lines[0]!);
      }
      for (const line of refusals) {
        expect(line.level).toBe(LOG_LEVELS.WARNING);
        expect(line.data.shardId).toBe(3);
        expect(typeof line.data.reason).toBe('string');
        expect(carriesAny(line, SECRETS)).toBe(false);
      }
    } finally {
      await bare.close();
      await s.end();
    }
  });
});

describe('AC-1.8: a consumer emitter that throws leaves the pin as it was and the call throws', () => {
  it('beginSessionHandoff, at its INFO line: no pin is set, the next heartbeat is live, and a retry succeeds', async () => {
    const s = await setup();
    try {
      await deliver(s.server, s.emitter, 2);
      const armed = armThrowOnHandoffLine(s.emitter);
      expect(() => s.gateway.beginSessionHandoff()).toThrow('consumer emitter threw');
      expect(s.gateway.heartbeatPinned).toBe(false);
      await deliver(s.server, s.emitter, 1);
      expect(await requestHeartbeatD(s.server)).toBe(s.server.lastSentSeq);

      armed.armed = false;
      expect(s.gateway.beginSessionHandoff().sequence).toBe(s.server.lastSentSeq);
    } finally {
      await s.end();
    }
  });

  it('beginSessionHandoff, at its refusal line (a second begin): the pin stays at S', async () => {
    const s = await setup();
    try {
      const { sequence: pinned } = s.gateway.beginSessionHandoff();
      await deliver(s.server, s.emitter, 2);
      armThrowOnHandoffLine(s.emitter);
      expect(() => s.gateway.beginSessionHandoff()).toThrow('consumer emitter threw');
      expect(s.gateway.heartbeatPinned).toBe(true);
      expect(await requestHeartbeatD(s.server)).toBe(pinned);
    } finally {
      await s.end();
    }
  });

  it('clearHeartbeatPin, at its INFO line: the pin stays at S', async () => {
    const s = await setup();
    try {
      const { sequence: pinned } = s.gateway.beginSessionHandoff();
      await deliver(s.server, s.emitter, 2);
      const armed = armThrowOnHandoffLine(s.emitter);
      expect(() => s.gateway.clearHeartbeatPin()).toThrow('consumer emitter threw');
      expect(s.gateway.heartbeatPinned).toBe(true);
      expect(await requestHeartbeatD(s.server)).toBe(pinned);

      armed.armed = false;
      s.gateway.clearHeartbeatPin();
      expect(s.gateway.heartbeatPinned).toBe(false);
    } finally {
      await s.end();
    }
  });

  it('login while pinned, at its refusal line: it throws and opens no connection', async () => {
    const s = await setup();
    try {
      s.gateway.beginSessionHandoff();
      const connections = s.server.connectionCount;
      const attempts = s.server.attempts.length;
      armThrowOnHandoffLine(s.emitter);
      expect(() => s.gateway.login()).toThrow('consumer emitter threw');
      expect(s.server.connectionCount).toBe(connections);
      expect(s.server.attempts).toHaveLength(attempts);
      expect(s.gateway.heartbeatPinned).toBe(true);
    } finally {
      await s.end();
    }
  });
});

describe('AC-2.3: the import lines', () => {
  async function importRig() {
    const s = await setup();
    await deliver(s.server, s.emitter, 2);
    const state = s.gateway.beginSessionHandoff();
    const base = await LoopbackGatewayServer.start();
    const gw2 = createDirectGateway(base.url);
    return {
      s, state, base, gw2,
      async end() {
        await base.close();
        await s.end();
      },
    };
  }

  it('a successful import emits exactly one INFO line with the shard and the sequence, and none of the three secrets', async () => {
    const r = await importRig();
    try {
      r.gw2.gateway.importSession(r.state);
      const lines = handoffLines(r.gw2.emitter.debug);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.level).toBe(LOG_LEVELS.INFO);
      expect(lines[0]!.data.shardId).toBe(r.gw2.gateway.id);
      expect(lines[0]!.data.sequence).toBe(r.state.sequence);
      expect(carriesAny(lines[0]!, SECRETS)).toBe(false);
    } finally {
      await r.end();
    }
  });

  it('the instrument is scoped to the new line class: the import-then-login flow also emits a pre-existing line that carries the resume URL', async () => {
    const r = await importRig();
    try {
      r.gw2.gateway.importSession(r.state);
      r.gw2.gateway.login();
      await waitForCondition(() => r.gw2.emitter.debug.some((d) => d.message.startsWith('Resuming on url')), 'the login line', 5000);

      const wholeFlow = r.gw2.emitter.debug.filter((d) => carriesAny(d, [RESUME_MARKER]));
      expect(wholeFlow.length).toBeGreaterThanOrEqual(1);
      expect(wholeFlow.every((d) => !handoffLines(r.gw2.emitter.debug).includes(d))).toBe(true);
      expect(handoffLines(r.gw2.emitter.debug).some((d) => carriesAny(d, SECRETS))).toBe(false);
      r.gw2.gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
    } finally {
      await r.end();
    }
  });

  it('a refused import emits exactly one WARNING line with the shard and a reason, and none of the three secrets', async () => {
    const r = await importRig();
    try {
      const refused = { ...r.state, sequence: -1 };
      expect(() => r.gw2.gateway.importSession(refused)).toThrow();
      const lines = handoffLines(r.gw2.emitter.debug);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.level).toBe(LOG_LEVELS.WARNING);
      expect(lines[0]!.data.shardId).toBe(r.gw2.gateway.id);
      expect(typeof lines[0]!.data.reason).toBe('string');
      expect(carriesAny(lines[0]!, SECRETS)).toBe(false);
    } finally {
      await r.end();
    }
  });
});

describe('AC-1.8: importSession leaves the gateway session-less when the consumer emitter throws, at every site it reaches', () => {
  async function importRig() {
    const s = await setup();
    const state = s.gateway.beginSessionHandoff();
    const base = await LoopbackGatewayServer.start();
    const gw2 = createDirectGateway(base.url);
    return {
      s, state, base, gw2,
      async end() {
        await base.close();
        await s.end();
      },
    };
  }

  const SITES: Array<[string, (d: DebugLine) => boolean, (state: SessionHandoffState) => SessionHandoffState]> = [
    ['the Session constructor DEBUG line', (d) => d.message.includes('Session object created'), (state) => state],
    ['the import INFO line', (d) => d.data !== undefined && 'shardId' in d.data && d.level === LOG_LEVELS.INFO, (state) => state],
    ['the refusal line', (d) => d.data !== undefined && 'shardId' in d.data && d.level === LOG_LEVELS.WARNING, (state) => ({ ...state, sequence: -1 })],
  ];

  it.each(SITES)('at %s: the call throws, nothing is installed, and a retry succeeds', async (_label, matches, shape) => {
    const r = await importRig();
    try {
      let armed = true;
      r.gw2.emitter.on('DEBUG', (d: DebugLine) => {
        if (armed && matches(d)) throw new Error('consumer emitter threw');
      });

      expect(() => r.gw2.gateway.importSession(shape(r.state))).toThrow('consumer emitter threw');
      expect(r.gw2.gateway.resumable).toBe(false);
      expect(r.gw2.gateway.ws).toBeUndefined();

      armed = false;
      r.gw2.gateway.importSession(r.state);
      expect(r.gw2.gateway.resumable).toBe(true);
    } finally {
      await r.end();
    }
  });
});
