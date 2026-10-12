import { describe, it, expect } from 'vitest';
import { startBotRig, sleep } from '../harness/botRig';
import type { BotRig } from '../harness/botRig';
import { waitForCondition } from '../harness/waitFor';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type Gateway from '../../src/clients/Gateway/Gateway';

const TEN_TICKS_MS = 10500;
const EIGHT_TICKS_MS = 8500;

function alreadyInitializedErrors(rig: BotRig): number {
  return rig.debug.filter((d) => d.message.includes('Client is already initialized')).length;
}

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

describe('AC-3.5: the queue never logs in a gateway whose Session holds a Websocket, and releases the starting slot', () => {
  it('CONNECTING: a queued gateway whose handshake is in flight is not logged in again and raises no error over eight ticks', async () => {
    const rig = await startBotRig({ mode: 'hang' }, {}, [0], {}, false);
    try {
      const { gateway: gw, bot } = rig;
      gw.login();
      const logins = countLogins(gw);
      expect(bot.gatewayLoginQueue.includes(gw)).toBe(true);
      expect(gw.ws?.readyState).toBe(0);

      await sleep(EIGHT_TICKS_MS);

      expect(alreadyInitializedErrors(rig)).toBe(0);
      expect(logins.calls).toBe(0);
      expect(bot.gatewayLoginQueue.includes(gw)).toBe(false);
    } finally {
      await rig.end();
    }
  }, 30000);

  it('OPEN: a post-READY gateway pushed back into the queue ahead of an eligible one releases the slot, so the eligible one is started', async () => {
    const rig = await startBotRig({}, {}, [0, 1], {}, false);
    try {
      const { bot } = rig;
      const open = bot.shards.get(0)!;
      const eligible = bot.shards.get(1)!;
      await waitForCondition(() => open.resumable && eligible.resumable, 'both shards READY', 12000);
      await waitForCondition(() => bot.startingGateway === undefined, 'startup released', 8000);

      const eligibleLogins = countLogins(eligible);
      const openLogins = countLogins(open);
      bot.gatewayLoginQueue.unshift(open);
      expect(open.connected).toBe(true);
      eligible.close(GATEWAY_CLOSE_CODES.USER_TERMINATE_RESUMABLE);

      await waitForCondition(() => eligibleLogins.calls >= 1, 'the eligible gateway is started past the OPEN one', TEN_TICKS_MS);

      expect(openLogins.calls).toBe(0);
      expect(bot.gatewayLoginQueue.includes(open)).toBe(false);
      expect(alreadyInitializedErrors(rig)).toBe(0);
      expect(bot.startingGateway === open).toBe(false);
    } finally {
      await rig.end();
    }
  }, 40000);

  it('CLOSING: a gateway whose socket is mid-close is not logged in again and raises no error (this separates "holds a Websocket" from a readyState test)', async () => {
    const rig = await startBotRig({}, {}, [0], {});
    try {
      const { gateway: gw, bot, server } = rig;
      await waitForCondition(() => bot.startingGateway === undefined, 'startup released', 8000);
      server.holdClosing();
      await waitForCondition(() => gw.ws?.readyState === 2, 'the socket is CLOSING', 4000);
      const logins = countLogins(gw);

      bot.gatewayLoginQueue.push(gw);
      await sleep(2600);

      expect(gw.ws?.readyState).toBe(2);
      expect(logins.calls).toBe(0);
      expect(alreadyInitializedErrors(rig)).toBe(0);
      expect(bot.gatewayLoginQueue.includes(gw)).toBe(false);
      expect(bot.startingGateway === gw).toBe(false);
    } finally {
      await rig.end();
    }
  }, 30000);

  it('negative direction: a queued gateway that holds no socket is still picked and logged in', async () => {
    const rig = await startBotRig();
    try {
      const { gateway: gw, server } = rig;
      const logins = countLogins(gw);
      const resumes = server.receivedResumes.length;
      server.dropLiveSocket();
      await server.waitForResumes(resumes + 1, 6000);
      expect(logins.calls).toBeGreaterThanOrEqual(1);
    } finally {
      await rig.end();
    }
  }, 20000);
});
