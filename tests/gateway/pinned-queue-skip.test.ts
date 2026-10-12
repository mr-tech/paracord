import { describe, it, expect } from 'vitest';
import { GATEWAY_CLOSE_CODES, LOG_LEVELS } from '../../src/constants';
import { startBotRig, op2Count, op6Count, sleep } from '../harness/botRig';
import type { BotRig } from '../harness/botRig';
import { waitForCondition } from '../harness/waitFor';
import type Gateway from '../../src/clients/Gateway/Gateway';

const ABSENCE_WINDOW_MS = 2600;

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

function errorLines(rig: BotRig): number {
  return rig.debug.filter((d) => d.level <= LOG_LEVELS.ERROR).length;
}

async function pinDropAndRequeue(rig: BotRig): Promise<void> {
  const { gateway: gw, server, bot } = rig;
  gw.beginSessionHandoff();
  server.dropLiveSocket();
  await waitForCondition(() => rig.closes.length === 1, 'GATEWAY_CLOSE delivered', 4000);
  expect(bot.gatewayLoginQueue.includes(gw)).toBe(false);
  expect(gw.ws).toBeUndefined();
  bot.gatewayLoginQueue.push(gw);
}

describe('AC-1.3: the queue never picks a pinned gateway, on each of its four pick routes', () => {
  describe('routes (1) and (3): the resumable find and the eligible find, no allowConnection', () => {
    it('control: an unpinned, socketless, queued gateway is picked and sends RESUME', async () => {
      const rig = await startBotRig();
      try {
        const before = op6Count(rig.server);
        rig.server.dropLiveSocket();
        await waitForCondition(() => op6Count(rig.server) > before, 'the unpinned twin is picked and resumes', 4500);
      } finally {
        await rig.end();
      }
    }, 20000);

    it('a pinned gateway alone in the queue is not picked: no login, no ERROR, no op 6 or op 2, same queue slot', async () => {
      const rig = await startBotRig();
      try {
        const logins = countLogins(rig.gateway);
        const op6Before = op6Count(rig.server);
        const op2Before = op2Count(rig.server);
        const errorsBefore = errorLines(rig);
        await pinDropAndRequeue(rig);

        await sleep(ABSENCE_WINDOW_MS);

        expect(logins.calls).toBe(0);
        expect(errorLines(rig) - errorsBefore).toBe(0);
        expect(op6Count(rig.server) - op6Before).toBe(0);
        expect(op2Count(rig.server) - op2Before).toBe(0);
        expect(rig.bot.gatewayLoginQueue).toEqual([rig.gateway]);
      } finally {
        await rig.end();
      }
    }, 20000);

    it('a pinned gateway ahead of an unpinned one keeps its place while the unpinned one is picked past it', async () => {
      const rig = await startBotRig({}, {}, [0, 1]);
      try {
        const gw = rig.bot.shards.get(0)!;
        const sibling = rig.bot.shards.get(1)!;
        await waitForCondition(() => sibling.resumable, 'sibling READY handled', 10000);
        const logins = countLogins(gw);
        gw.beginSessionHandoff();
        gw.close(GATEWAY_CLOSE_CODES.USER_TERMINATE_RESUMABLE);
        await waitForCondition(() => rig.closes.length === 1, 'the pinned close delivered', 4000);
        expect(rig.bot.gatewayLoginQueue.includes(gw)).toBe(false);
        rig.bot.gatewayLoginQueue.push(gw);

        const op6Before = op6Count(rig.server);
        sibling.close(GATEWAY_CLOSE_CODES.USER_TERMINATE_RESUMABLE);
        await waitForCondition(() => op6Count(rig.server) > op6Before, 'the unpinned sibling is picked and resumes', 4500);
        await sleep(300);

        expect(op6Count(rig.server) - op6Before).toBe(1);
        expect(logins.calls).toBe(0);
        expect(rig.bot.gatewayLoginQueue).toEqual([gw]);
      } finally {
        await rig.end();
      }
    }, 25000);
  });

  describe('route (2): the allowConnection loop', () => {
    it('is consulted for the unpinned gateway (control), and never with the pinned one', async () => {
      const consulted: Gateway[] = [];
      const rig = await startBotRig({}, {}, [0], {
        allowConnection: (gw) => { consulted.push(gw); return true; },
      });
      try {
        expect(consulted).toContain(rig.gateway);
        const consultedBefore = consulted.length;
        const logins = countLogins(rig.gateway);
        const op6Before = op6Count(rig.server);
        const errorsBefore = errorLines(rig);
        await pinDropAndRequeue(rig);

        await sleep(ABSENCE_WINDOW_MS);

        expect(consulted.length - consultedBefore).toBe(0);
        expect(logins.calls).toBe(0);
        expect(errorLines(rig) - errorsBefore).toBe(0);
        expect(op6Count(rig.server) - op6Before).toBe(0);
        expect(rig.bot.gatewayLoginQueue).toEqual([rig.gateway]);
      } finally {
        await rig.end();
      }
    }, 20000);
  });

  describe('route (2) with a pinned gateway that holds an OPEN socket', () => {
    it('is not offered to allowConnection and keeps its queue slot', async () => {
      const offered: Gateway[] = [];
      const rig = await startBotRig({}, {}, [0], {
        allowConnection: (gw) => { offered.push(gw); return true; },
      });
      try {
        const { gateway: gw, bot } = rig;
        await waitForCondition(() => bot.startingGateway === undefined, 'startup released', 8000);
        const offeredBefore = offered.length;
        gw.beginSessionHandoff();
        bot.gatewayLoginQueue.push(gw);
        expect(gw.connected).toBe(true);

        await sleep(ABSENCE_WINDOW_MS);

        expect(bot.gatewayLoginQueue).toEqual([gw]);
        expect(offered.length).toBe(offeredBefore);
      } finally {
        await rig.end();
      }
    }, 20000);
  });

  describe('route (0): the retained starting gateway, still queued', () => {
    async function startingAndQueued(pin: boolean) {
      const rig = await startBotRig({ readyGuilds: 2 }, { shardStartupTimeout: 30 });
      const { gateway: gw, server, bot } = rig;
      const logins = countLogins(gw);
      let observed: { starting: boolean; queued: boolean } | undefined;
      bot.on('GATEWAY_CLOSE', () => {
        if (observed) return;
        observed = { starting: bot.startingGateway === gw, queued: bot.gatewayLoginQueue.includes(gw) };
        if (pin) gw.beginSessionHandoff();
      });
      const op6Before = op6Count(server);
      const errorsBefore = errorLines(rig);
      server.dropLiveSocket();
      await waitForCondition(() => observed !== undefined, 'the close listener ran', 4000);
      return {
        rig, gw, logins, op6Before, errorsBefore, observed: observed!,
      };
    }

    it('control: unpinned, the starting gateway is picked on the next tick and sends RESUME', async () => {
      const {
        rig, op6Before, observed,
      } = await startingAndQueued(false);
      try {
        expect(observed).toEqual({ starting: true, queued: true });
        await waitForCondition(() => op6Count(rig.server) > op6Before, 'the unpinned starting gateway resumes', 4500);
      } finally {
        await rig.end();
      }
    }, 20000);

    it('pinned while OPEN (a consumer login outside the queue, then the pin), it keeps its queue slot', async () => {
      const rig = await startBotRig({ readyGuilds: 3 }, {}, [0], {}, false);
      try {
        const gw = rig.gateway;
        await waitForCondition(() => rig.bot.startingGateway === gw && gw.resumable, 'mid-identify', 8000);
        const logins = countLogins(gw);
        rig.bot.once('GATEWAY_CLOSE', () => { gw.login(); });
        gw.close(GATEWAY_CLOSE_CODES.USER_TERMINATE_RESUMABLE);
        await waitForCondition(() => gw.connected, 'the consumer login opened', 3000);
        const loginsBeforePin = logins.calls;
        expect(rig.bot.gatewayLoginQueue.indexOf(gw)).toBe(0);
        expect(rig.bot.startingGateway).toBe(gw);
        gw.beginSessionHandoff();

        await sleep(ABSENCE_WINDOW_MS);

        expect(rig.bot.gatewayLoginQueue.indexOf(gw)).toBe(0);
        expect(logins.calls).toBe(loginsBeforePin);
        expect(gw.heartbeatPinned).toBe(true);
      } finally {
        await rig.end();
      }
    }, 20000);

    it('pinned inside the close listener, it is not picked: no login, no ERROR, no op 6, same queue slot', async () => {
      const {
        rig, gw, logins, op6Before, errorsBefore, observed,
      } = await startingAndQueued(true);
      try {
        expect(observed).toEqual({ starting: true, queued: true });
        expect(gw.heartbeatPinned).toBe(true);

        await sleep(ABSENCE_WINDOW_MS);

        expect(logins.calls).toBe(0);
        expect(errorLines(rig) - errorsBefore).toBe(0);
        expect(op6Count(rig.server) - op6Before).toBe(0);
        expect(rig.bot.gatewayLoginQueue).toEqual([gw]);
      } finally {
        await rig.end();
      }
    }, 20000);
  });
});
