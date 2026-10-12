import {
  describe, it, expect, beforeAll, vi, afterEach,
} from 'vitest';

import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import {
  startBotRig, deliverToBot, op2Count, op6Count, sleep,
} from '../harness/botRig';
import { waitForCondition } from '../harness/waitFor';

import type { GatewayCloseCode } from '../../src/constants';
import type { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import type { BotRig } from '../harness/botRig';

const G = GATEWAY_CLOSE_CODES;
const NON_MEMBER = 50000;

const P_KEEP: number[] = [
  G.CLEAN, G.GOING_AWAY, G.ABNORMAL, G.UNKNOWN_ERROR, G.UNKNOWN_OPCODE, G.DECODE_ERROR,
  G.NOT_AUTHENTICATED, G.RATE_LIMITED, G.CONNECT_TIMEOUT, G.RECONNECT,
  G.SESSION_INVALIDATED_RESUMABLE, G.HEARTBEAT_TIMEOUT, G.USER_TERMINATE_RESUMABLE,
];
const P_CLEAR: number[] = [
  G.ALREADY_AUTHENTICATED, G.SESSION_NO_LONGER_VALID, G.INVALID_SEQ, G.SESSION_TIMEOUT,
  G.INTERNAL_TERMINATE_RECONNECT, G.SESSION_INVALIDATED, G.USER_TERMINATE_RECONNECT,
  G.UNKNOWN, NON_MEMBER,
];
const P_TERMINAL: number[] = [
  G.AUTHENTICATION_FAILED, G.INVALID_SHARD, G.SHARDING_REQUIRED, G.INVALID_VERSION,
  G.INVALID_INTENT, G.DISALLOWED_INTENT, G.USER_TERMINATE,
];

const NAME: Record<number, string> = { [NON_MEMBER]: 'NON_MEMBER' };
for (const [k, v] of Object.entries(G)) NAME[v as number] = k;

function classOf(code: number): 'P-keep' | 'P-clear' | 'P-terminal' {
  if (P_KEEP.includes(code)) return 'P-keep';
  if (P_CLEAR.includes(code)) return 'P-clear';
  if (P_TERMINAL.includes(code)) return 'P-terminal';
  throw new Error(`unpartitioned code ${code}`);
}

const ABSENCE_WINDOW_MS = 2600;
const REOPEN_BOUND_MS = 4500;

const ROUTES: Array<{
  name: string;
  serverOptions: { heartbeatIntervalMs?: number };
  drop: (server: LoopbackGatewayServer) => void;
  expectCode: number;
}> = [
  {
    name: '1006, the socket drops', serverOptions: {}, drop: (s) => s.dropLiveSocket(), expectCode: G.ABNORMAL,
  },
  {
    name: 'op 7, Discord asks to reconnect', serverOptions: {}, drop: (s) => s.sendReconnect(), expectCode: G.RECONNECT,
  },
  {
    name: 'op 9 d:true, Discord reports a resumable invalid session', serverOptions: {}, drop: (s) => s.sendInvalidSession(true), expectCode: G.SESSION_INVALIDATED_RESUMABLE,
  },
  {
    name: 'a server wire close, 4000', serverOptions: {}, drop: (s) => s.closeLiveSocket(4000), expectCode: 4000,
  },
];

const controls = { keep: false, clear: false, routes: {} as Record<string, boolean> };

async function observeUnpinnedReopen(rig: BotRig, kind: 'op6' | 'op2', trigger: () => void): Promise<boolean> {
  const count = kind === 'op6' ? op6Count : op2Count;
  const before = count(rig.server);
  trigger();
  try {
    await waitForCondition(() => count(rig.server) > before, `unpinned twin sends op ${kind === 'op6' ? 6 : 2}`, REOPEN_BOUND_MS);
    return true;
  } catch {
    return false;
  }
}

async function runControl(code: number, kind: 'op6' | 'op2'): Promise<boolean> {
  const rig = await startBotRig();
  try {
    return await observeUnpinnedReopen(rig, kind, () => rig.gateway.close(code as GatewayCloseCode));
  } finally {
    await rig.end();
  }
}

async function runRouteControl(route: typeof ROUTES[number]): Promise<boolean> {
  const rig = await startBotRig(route.serverOptions);
  try {
    return await observeUnpinnedReopen(rig, 'op6', () => route.drop(rig.server));
  } finally {
    await rig.end();
  }
}

describe('AC-1.3/1.4: a pinned gateway never reconnects itself, for every close code and every real route', () => {
  beforeAll(async () => {
    const [keep, clear, ...routes] = await Promise.all([
      runControl(G.CLEAN, 'op6'),
      runControl(G.SESSION_NO_LONGER_VALID, 'op2'),
      ...ROUTES.map((r) => runRouteControl(r)),
    ]);
    controls.keep = keep;
    controls.clear = clear;
    ROUTES.forEach((r, i) => { controls.routes[r.name] = routes[i]!; });
  }, 30000);

  it('controls: the unpinned twin of each class reconnects on the same path', () => {
    expect(controls.keep).toBe(true);
    expect(controls.clear).toBe(true);
    expect(controls.routes).toEqual(Object.fromEntries(ROUTES.map((r) => [r.name, true])));
  });

  describe.concurrent('all 29 close codes, delivered by gateway.close()', () => {
    async function cell(code: number): Promise<void> {
      expect(controls.keep && controls.clear).toBe(true);
      const rig = await startBotRig();
      try {
        const { gateway: gw, server, bot } = rig;
        gw.beginSessionHandoff();
        const resumableBefore = gw.resumable;
        const attemptsBefore = server.attempts.length;
        const op6Before = op6Count(server);
        const op2Before = op2Count(server);
        const closesBefore = rig.closes.length;

        expect(() => gw.close(code as GatewayCloseCode)).not.toThrow();
        await waitForCondition(() => rig.closes.length > closesBefore, 'GATEWAY_CLOSE delivered', 4000);
        await sleep(ABSENCE_WINDOW_MS);

        const cls = classOf(code);
        expect(rig.closes.length - closesBefore).toBe(1);
        expect(rig.closes[closesBefore]!.code).toBe(code);
        expect(rig.closes[closesBefore]!.shouldReconnect).toBe(false);
        expect(bot.gatewayLoginQueue.includes(gw)).toBe(false);
        expect(server.attempts.length - attemptsBefore).toBe(0);
        expect(op6Count(server) - op6Before).toBe(0);
        expect(op2Count(server) - op2Before).toBe(0);

        expect(gw.resumable).toBe(cls === 'P-clear' ? false : resumableBefore);
        expect(gw.heartbeatPinned).toBe(cls !== 'P-clear');

        const closeLine = rig.debug.find((d) => d.message.startsWith(`Websocket closed. Code: ${code}.`));
        expect(closeLine).toBeDefined();
        expect(closeLine!.message.includes('Not reconnecting')).toBe(true);
        expect(/\((Reconnecting|Terminating)/.test(closeLine!.message)).toBe(false);
      } finally {
        await rig.end();
      }
    }

    for (const code of [...P_KEEP, ...P_CLEAR, ...P_TERMINAL]) {
      it(`${NAME[code]} (${code}) — ${classOf(code)}`, () => cell(code), 20000);
    }
  });

  describe.concurrent('the R-1 sub-classes, each delivered by its real route', () => {
    for (const route of ROUTES) {
      it(`${route.name}`, async () => {
        expect(controls.routes[route.name]).toBe(true);
        const rig = await startBotRig(route.serverOptions);
        try {
          const { gateway: gw, server, bot } = rig;
          gw.beginSessionHandoff();
          const attemptsBefore = server.attempts.length;
          const op6Before = op6Count(server);
          const op2Before = op2Count(server);

          route.drop(server);
          await waitForCondition(() => rig.closes.length === 1, 'GATEWAY_CLOSE delivered', 4000);
          await sleep(ABSENCE_WINDOW_MS);

          expect(rig.closes[0]!.code).toBe(route.expectCode);
          expect(rig.closes[0]!.shouldReconnect).toBe(false);
          expect(bot.gatewayLoginQueue.includes(gw)).toBe(false);
          expect(server.attempts.length - attemptsBefore).toBe(0);
          expect(op6Count(server) - op6Before).toBe(0);
          expect(op2Count(server) - op2Before).toBe(0);
          expect(gw.resumable).toBe(true);
          expect(gw.heartbeatPinned).toBe(true);
        } finally {
          await rig.end();
        }
      }, 20000);
    }
  });
});

describe('a close log line says what happens next', () => {
  it('control: an unpinned P-keep close says it reconnects', async () => {
    const rig = await startBotRig();
    try {
      rig.gateway.close(G.CLEAN as GatewayCloseCode);
      await waitForCondition(() => rig.closes.length === 1, 'GATEWAY_CLOSE delivered', 4000);
      const line = rig.debug.find((d) => d.message.startsWith(`Websocket closed. Code: ${G.CLEAN}.`));
      expect(line!.message.includes('(Reconnecting.)')).toBe(true);
      expect(line!.message.includes('Not reconnecting')).toBe(false);
    } finally {
      await rig.end();
    }
  }, 20000);
});

describe('AC-1.3: a heartbeat timeout (4995) closes a pinned gateway without reconnecting it', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function heartbeatTimeoutCell(pinned: boolean): Promise<{ closes: number; code: number | undefined; reconnected: boolean; queued: boolean; }> {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const rig = await startBotRig({ heartbeatIntervalMs: 150, ackHeartbeats: false });
    try {
      if (pinned) rig.gateway.beginSessionHandoff();
      const op6Before = op6Count(rig.server);
      await waitForCondition(() => rig.closes.length >= 1, 'heartbeat timeout close', 8000).catch(() => undefined);
      if (pinned) await sleep(ABSENCE_WINDOW_MS);
      else await waitForCondition(() => op6Count(rig.server) > op6Before, 'unpinned twin resumes', REOPEN_BOUND_MS).catch(() => undefined);
      return {
        closes: rig.closes.length,
        code: rig.closes[0]?.code,
        reconnected: op6Count(rig.server) > op6Before,
        queued: rig.bot.gatewayLoginQueue.includes(rig.gateway),
      };
    } finally {
      await rig.end();
    }
  }

  it('control: the unpinned twin closes 4995 and resumes', async () => {
    const result = await heartbeatTimeoutCell(false);
    expect(result.code).toBe(G.HEARTBEAT_TIMEOUT);
    expect(result.reconnected).toBe(true);
  }, 25000);

  it('pinned: the close is 4995, shouldReconnect is false, no RESUME follows and the gateway is not queued', async () => {
    const result = await heartbeatTimeoutCell(true);
    expect(result.code).toBe(G.HEARTBEAT_TIMEOUT);
    expect(result.reconnected).toBe(false);
    expect(result.queued).toBe(false);
  }, 25000);
});

describe('AC-1.3: login() throws while pinned and opens no socket', () => {
  it('a pinned gateway whose socket dropped refuses a consumer login, and the server sees no upgrade', async () => {
    const rig = await startBotRig();
    try {
      const { gateway: gw, server } = rig;
      gw.beginSessionHandoff();
      server.dropLiveSocket();
      await waitForCondition(() => rig.closes.length === 1, 'GATEWAY_CLOSE delivered', 4000);
      const attempts = server.attempts.length;
      expect(() => gw.login()).toThrow();
      await sleep(300);
      expect(server.attempts.length).toBe(attempts);
      expect(gw.resumable).toBe(true);
      expect(gw.heartbeatPinned).toBe(true);
    } finally {
      await rig.end();
    }
  }, 20000);

  it('control: the same gateway unpinned logs in and the server sees the upgrade', async () => {
    const rig = await startBotRig();
    try {
      const { gateway: gw, server, bot } = rig;
      server.dropLiveSocket();
      await waitForCondition(() => rig.closes.length === 1, 'GATEWAY_CLOSE delivered', 4000);
      bot.gatewayLoginQueue.length = 0;
      const attempts = server.attempts.length;
      gw.login();
      await server.waitForAttempt(attempts + 1);
    } finally {
      await rig.end();
    }
  }, 20000);
});

describe('AC-1.5 (I-1): clearing the pin after a pinned close leaves a gateway that resumes from the live sequence', () => {
  async function pinnedThenDropped() {
    const rig = await startBotRig();
    const { gateway: gw, server, bot } = rig;
    const { sequence: pinned } = gw.beginSessionHandoff();
    const live = await deliverToBot(rig, 2);
    expect(live).toBe(pinned + 2);
    server.dropLiveSocket();
    await waitForCondition(() => rig.closes.length === 1, 'GATEWAY_CLOSE delivered', 4000);
    expect(bot.gatewayLoginQueue.includes(gw)).toBe(false);
    expect(gw.ws).toBeUndefined();
    return {
      rig, gw, server, bot, pinned, live,
    };
  }

  it('re-admitted by a direct login()', async () => {
    const {
      rig, gw, server, pinned, live,
    } = await pinnedThenDropped();
    try {
      gw.clearHeartbeatPin();
      expect(gw.heartbeatPinned).toBe(false);
      expect(gw.resumable).toBe(true);
      expect(gw.ws).toBeUndefined();

      const resumes = server.receivedResumes.length;
      gw.login();
      await server.waitForResumes(resumes + 1);
      const resume = server.receivedResumes[resumes]!;
      expect(resume.seq).toBe(live);
      expect(resume.seq).not.toBe(pinned);
      expect(resume.sessionId).toBe('HARNESS_SESSION');
    } finally {
      await rig.end();
    }
  }, 25000);

  it('re-admitted to the login queue and picked by it', async () => {
    const {
      rig, gw, server, bot, pinned, live,
    } = await pinnedThenDropped();
    try {
      gw.clearHeartbeatPin();
      const resumes = server.receivedResumes.length;
      bot.gatewayLoginQueue.push(gw);
      await server.waitForResumes(resumes + 1, 6000);
      const resume = server.receivedResumes[resumes]!;
      expect(resume.seq).toBe(live);
      expect(resume.seq).not.toBe(pinned);
    } finally {
      await rig.end();
    }
  }, 25000);

  it('clearing changes only the pin: the session survives and the queue is untouched', async () => {
    const {
      rig, gw, bot,
    } = await pinnedThenDropped();
    try {
      const queue = [...bot.gatewayLoginQueue];
      gw.clearHeartbeatPin();
      expect(gw.resumable).toBe(true);
      expect(bot.gatewayLoginQueue).toEqual(queue);
    } finally {
      await rig.end();
    }
  }, 25000);
});
