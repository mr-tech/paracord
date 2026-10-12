import {
  describe, it, expect, vi, afterEach,
} from 'vitest';

import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createDirectGateway, deliver, loginDirect } from '../harness/directGateway';
import { waitForCondition } from '../harness/waitFor';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';

import type { LoopbackGatewayServerOptions } from '../harness/loopbackGatewayServer';
import type { GatewayCloseCode } from '../../src/constants';

async function setup(opts: LoopbackGatewayServerOptions = {}) {
  const server = await LoopbackGatewayServer.start({ ackHeartbeats: true, ...opts });
  const direct = await loginDirect(server);
  return { server, ...direct };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AC-1.1: every heartbeat send carries the pinned sequence', () => {
  it('path A, scheduled heartbeats: d tracks the live sequence before the pin, equals S during it, tracks live again after clear', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { server, gateway, emitter } = await setup({ heartbeatIntervalMs: 200 });
    try {
      const live = await deliver(server, emitter, 3);
      await waitForCondition(() => server.receivedHeartbeats.some((h) => h.d === live), 'a beat carrying the live sequence', 5000);

      const { sequence: pinned } = gateway.beginSessionHandoff();
      expect(pinned).toBe(live);

      const mark = server.receivedHeartbeats.length;
      const advanced = await deliver(server, emitter, 3);
      expect(advanced).toBe(pinned + 3);
      const afterAdvance = server.receivedHeartbeats.length;
      await server.waitForHeartbeats(afterAdvance + 2);
      expect(server.receivedHeartbeats.slice(mark).every((h) => h.d === pinned)).toBe(true);

      gateway.clearHeartbeatPin();
      await waitForCondition(
        () => server.receivedHeartbeats.slice(afterAdvance).some((h) => h.d === advanced),
        'a beat carrying the live sequence after clear',
        5000,
      );
      const firstLive = server.receivedHeartbeats.findIndex((h, i) => i >= afterAdvance && h.d === advanced);
      await server.waitForHeartbeats(firstLive + 3);
      expect(server.receivedHeartbeats.slice(firstLive).every((h) => h.d === advanced)).toBe(true);
    } finally {
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
      await server.close();
    }
  });

  it('path B, the reply to a server-sent op 1: d tracks the live sequence before the pin, equals S during it, tracks live again after clear', async () => {
    const { server, gateway, emitter } = await setup();
    try {
      const request = async () => {
        const n = server.receivedHeartbeats.length;
        server.requestHeartbeat();
        await server.waitForHeartbeats(n + 1);
        return server.receivedHeartbeats[n]!.d;
      };

      const live = await deliver(server, emitter, 3);
      expect(await request()).toBe(live);

      const { sequence: pinned } = gateway.beginSessionHandoff();
      const advanced = await deliver(server, emitter, 3);
      expect(advanced).toBe(pinned + 3);
      expect(await request()).toBe(pinned);
      expect(await request()).toBe(pinned);

      gateway.clearHeartbeatPin();
      expect(await request()).toBe(advanced);
    } finally {
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
      await server.close();
    }
  });
});

describe('AC-1.2: the pin equals the export', () => {
  it('returns the session, the shard and the resume URL the harness issued, with the last sequence it sent', async () => {
    const resumeHost = await LoopbackGatewayServer.start();
    const resumeUrl = `${resumeHost.url}/RESUME_MARKER`;
    const server = await LoopbackGatewayServer.start({ ackHeartbeats: true, resumeGatewayUrl: resumeUrl });
    const { gateway, emitter } = await loginDirect(server);
    try {
      const live = await deliver(server, emitter, 3);
      const state = gateway.beginSessionHandoff();
      expect(state).toEqual({
        sessionId: 'HARNESS_SESSION', sequence: live, shard: [3, 5], resumeUrl,
      });
      expect(state.sequence).toBe(server.lastSentSeq);
      expect(gateway.heartbeatPinned).toBe(true);
    } finally {
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
      await server.close();
      await resumeHost.close();
    }
  });

  describe('a gateway that is not resumable refuses to begin, and sets no pin', () => {
    it('(i) never logged in: no Session', async () => {
      const server = await LoopbackGatewayServer.start();
      const { gateway } = createDirectGateway(server.url);
      try {
        expect(() => gateway.beginSessionHandoff()).toThrow();
        expect(gateway.heartbeatPinned).toBe(false);
      } finally {
        await server.close();
      }
    });

    it('(ii) a Session with no session id yet: logged in against a server that never completes the handshake', async () => {
      const server = await LoopbackGatewayServer.start({ mode: 'hang' });
      const { gateway } = createDirectGateway(server.url);
      try {
        gateway.login();
        await waitForCondition(() => server.attempts.length >= 1, 'handshake in flight', 5000);
        expect(gateway.resumable).toBe(false);
        expect(() => gateway.beginSessionHandoff()).toThrow();
        expect(gateway.heartbeatPinned).toBe(false);
      } finally {
        gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
        await server.close();
      }
    });

    it('(iii) after a clearing close (4993)', async () => {
      const server = await LoopbackGatewayServer.start();
      const { gateway, emitter } = await loginDirect(server);
      try {
        gateway.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED as GatewayCloseCode);
        await waitForCondition(() => emitter.closes.length === 1, 'close observed', 5000);
        expect(gateway.resumable).toBe(false);
        expect(() => gateway.beginSessionHandoff()).toThrow();
        expect(gateway.heartbeatPinned).toBe(false);
      } finally {
        await server.close();
      }
    });

    it('control: a resumable gateway on the same server begins and is pinned', async () => {
      const server = await LoopbackGatewayServer.start();
      const { gateway } = await loginDirect(server);
      try {
        expect(() => gateway.beginSessionHandoff()).not.toThrow();
        expect(gateway.heartbeatPinned).toBe(true);
      } finally {
        gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
        await server.close();
      }
    });
  });

  it('a second begin throws and leaves the pin at S after dispatches advanced the live sequence', async () => {
    const { server, gateway, emitter } = await setup();
    try {
      const { sequence: pinned } = gateway.beginSessionHandoff();
      await deliver(server, emitter, 2);
      expect(() => gateway.beginSessionHandoff()).toThrow();
      expect(gateway.heartbeatPinned).toBe(true);

      const n = server.receivedHeartbeats.length;
      server.requestHeartbeat();
      await server.waitForHeartbeats(n + 1);
      expect(server.receivedHeartbeats[n]!.d).toBe(pinned);
    } finally {
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
      await server.close();
    }
  });
});
