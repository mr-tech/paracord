import { describe, it, expect } from 'vitest';

import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createDirectGateway, deliver, loginDirect } from '../harness/directGateway';
import { waitForCondition } from '../harness/waitFor';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';

import type { LoopbackGatewayServerOptions } from '../harness/loopbackGatewayServer';
import type { SessionHandoffState } from '../../src/clients/Gateway/types';

async function startAll() {
  const servers: LoopbackGatewayServer[] = [];
  return {
    async start(opts: LoopbackGatewayServerOptions = {}) {
      const server = await LoopbackGatewayServer.start(opts);
      servers.push(server);
      return server;
    },
    async closeAll() {
      await Promise.all(servers.map((s) => s.close()));
    },
  };
}

async function exported(resumeHost: LoopbackGatewayServer, tools: Awaited<ReturnType<typeof startAll>>) {
  const origin = await tools.start({ ackHeartbeats: true, resumeGatewayUrl: `${resumeHost.url}/RESUME_MARKER` });
  const gw1 = await loginDirect(origin);
  const sequence = await deliver(origin, gw1.emitter, 3);
  const state = gw1.gateway.beginSessionHandoff();
  expect(state.sequence).toBe(sequence);
  return {
    origin, gw1, state, sequence,
  };
}

describe('AC-2.2: an exported session round-trips into a fresh gateway for the same shard', () => {
  it('gateway 2 resumes on the resume host with exactly the exported session id and sequence, and never touches the base host', async () => {
    const tools = await startAll();
    try {
      const resumeHost = await tools.start();
      const base = await tools.start();
      const { origin, state, sequence } = await exported(resumeHost, tools);
      const originAttempts = origin.attempts.length;

      const gw2 = createDirectGateway(base.url);
      gw2.gateway.importSession(state);
      expect(gw2.gateway.resumable).toBe(true);
      gw2.gateway.login();
      await resumeHost.waitForResumes(1);

      expect(resumeHost.receivedResumes[0]).toEqual({ sessionId: 'HARNESS_SESSION', seq: sequence, conn: 1 });
      expect(base.attempts).toHaveLength(0);
      expect(origin.attempts).toHaveLength(originAttempts);
      await waitForCondition(() => gw2.emitter.handledCount('RESUMED') === 1, 'RESUMED handled', 5000);
    } finally {
      await tools.closeAll();
    }
  });

  it('with resumeUrl absent, it resumes on the base wsUrl', async () => {
    const tools = await startAll();
    try {
      const resumeHost = await tools.start();
      const base = await tools.start();
      const { state, sequence } = await exported(resumeHost, tools);
      const { resumeUrl, ...withoutResumeUrl } = state;
      expect(resumeUrl).toBeDefined();

      const gw2 = createDirectGateway(base.url);
      gw2.gateway.importSession(withoutResumeUrl);
      gw2.gateway.login();
      await base.waitForResumes(1);

      expect(base.receivedResumes[0]).toEqual({ sessionId: 'HARNESS_SESSION', seq: sequence, conn: 1 });
      expect(resumeHost.attempts).toHaveLength(0);
    } finally {
      await tools.closeAll();
    }
  });

  it('with the server answering INVALID_SESSION, gateway 2 closes 4993 and is no longer resumable', async () => {
    const tools = await startAll();
    try {
      const resumeHost = await tools.start({ resumeResponse: 'invalidSession' });
      const base = await tools.start();
      const { state } = await exported(resumeHost, tools);

      const gw2 = createDirectGateway(base.url);
      gw2.gateway.importSession(state);
      gw2.gateway.login();
      await waitForCondition(() => gw2.emitter.closes.length === 1, 'GATEWAY_CLOSE delivered', 5000);

      expect(gw2.emitter.closes[0]!.code).toBe(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
      expect(gw2.gateway.resumable).toBe(false);
    } finally {
      await tools.closeAll();
    }
  });

  it('accepts the state as JSON that crossed a process boundary', async () => {
    const tools = await startAll();
    try {
      const resumeHost = await tools.start();
      const base = await tools.start();
      const { state, sequence } = await exported(resumeHost, tools);

      const gw2 = createDirectGateway(base.url);
      gw2.gateway.importSession(JSON.parse(JSON.stringify(state)) as SessionHandoffState);
      gw2.gateway.login();
      await resumeHost.waitForResumes(1);
      expect(resumeHost.receivedResumes[0]!.seq).toBe(sequence);
    } finally {
      await tools.closeAll();
    }
  });
});

describe('AC-2.1: a refused import leaves the gateway session-less, and a later login never reaches the refused host', () => {
  const VALID = { sessionId: 'IMPORTED_SESSION', sequence: 7, shard: [3, 5] as [number, number] };

  async function refusedThenLogin(mutate: (badHost: LoopbackGatewayServer) => Partial<SessionHandoffState> & Record<string, unknown>) {
    const tools = await startAll();
    try {
      const badHost = await tools.start();
      const base = await tools.start();
      const { gateway } = createDirectGateway(base.url);
      const state = { ...VALID, ...mutate(badHost) } as unknown as SessionHandoffState;

      expect(() => gateway.importSession(state)).toThrow();
      expect(gateway.resumable).toBe(false);
      expect(gateway.ws).toBeUndefined();

      gateway.login();
      await waitForCondition(() => base.receivedOps.includes(2), 'the base host receives an identify', 5000);
      expect(base.receivedOps.includes(6)).toBe(false);
      expect(badHost.attempts).toHaveLength(0);
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
    } finally {
      await tools.closeAll();
    }
  }

  const SCHEMES: Array<[string, (host: LoopbackGatewayServer) => string]> = [
    ['http: (the ws client opens it)', (h) => `http://127.0.0.1:${h.port}/x`],
    ['https:', (h) => `https://127.0.0.1:${h.port}/x`],
    ['ftp:', (h) => `ftp://127.0.0.1:${h.port}/x`],
    ['an empty string', () => ''],
    ['not a url', () => 'not a url'],
    ['a query', (h) => `ws://127.0.0.1:${h.port}/x?y=1`],
    ['a fragment', (h) => `ws://127.0.0.1:${h.port}/x#y`],
    ['a trailing space', (h) => `ws://127.0.0.1:${h.port}/x `],
  ];

  it.each(SCHEMES)('resumeUrl %s', async (_label, build) => {
    await refusedThenLogin((host) => ({ resumeUrl: build(host) }));
  });

  it('sessionId empty', async () => {
    await refusedThenLogin(() => ({ sessionId: '' }));
  });

  it('sequence -1', async () => {
    await refusedThenLogin(() => ({ sequence: -1 }));
  });

  it('shard that names another shard', async () => {
    await refusedThenLogin(() => ({ shard: [4, 5] as [number, number] }));
  });

  it('a gateway that already holds a session keeps it intact', async () => {
    const tools = await startAll();
    try {
      const server = await tools.start();
      const { gateway } = await loginDirect(server);
      expect(() => gateway.importSession({ ...VALID })).toThrow();
      expect(gateway.resumable).toBe(true);
      expect(gateway.beginSessionHandoff().sessionId).toBe('HARNESS_SESSION');
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
    } finally {
      await tools.closeAll();
    }
  });

  describe('accepted members (the control for every refusal above)', () => {
    const ACCEPTED: Array<[string, Record<string, unknown>]> = [
      ['sequence 0', { sequence: 0 }],
      ['resumeUrl absent', {}],
      ['resumeUrl wss:', { resumeUrl: 'wss://gateway.example' }],
      ['resumeUrl upper-case WS:', { resumeUrl: 'WS://127.0.0.1:1/x' }],
    ];

    it.each(ACCEPTED)('%s', async (_label, extra) => {
      const server = await LoopbackGatewayServer.start();
      try {
        const { gateway } = createDirectGateway(server.url);
        expect(() => gateway.importSession({ ...VALID, ...extra } as unknown as SessionHandoffState)).not.toThrow();
        expect(gateway.resumable).toBe(true);
      } finally {
        await server.close();
      }
    });

    it('shard undefined against an unsharded gateway', async () => {
      const server = await LoopbackGatewayServer.start();
      try {
        const { gateway } = createDirectGateway(server.url, { shard: undefined });
        expect(gateway.shard).toBeUndefined();
        expect(() => gateway.importSession({ sessionId: 'IMPORTED_SESSION', sequence: 7, shard: undefined })).not.toThrow();
        expect(gateway.resumable).toBe(true);
      } finally {
        await server.close();
      }
    });
  });
});
