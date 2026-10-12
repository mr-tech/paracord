import { describe, it, expect } from 'vitest';
import { startBotRig, sleep } from '../harness/botRig';
import { LOG_LEVELS } from '../../src/constants';
import { waitForCondition } from '../harness/waitFor';
import type Gateway from '../../src/clients/Gateway/Gateway';

interface Call { id: number; heldSocket: boolean }

type Subject = 'none' | 'other' | 'consulted' | 'pinned';

async function run(admit: Subject) {
  const calls: Call[] = [];
  let release: (v: boolean) => void = () => undefined;
  const gate = new Promise<boolean>((r) => { release = r; });
  let gated = false;
  const gatedId = admit === 'consulted' || admit === 'pinned' ? 1 : 0;
  const allowConnection = (gw: Gateway): boolean | Promise<boolean> => {
    calls.push({ id: gw.id, heldSocket: gw.ws !== undefined });
    if (gw.id === gatedId && !gated) {
      gated = true;
      return gate;
    }
    return gw.id === 1;
  };
  const shards = [0, 1, 2];
  const rig = await startBotRig({}, {}, shards, { allowConnection }, false);
  try {
    const admitted = rig.bot.shards.get(1)!;
    const bystander = rig.bot.shards.get(2)!;
    await waitForCondition(() => calls.some((c) => c.id === gatedId), 'the queue awaits allowConnection', 5000);
    const logins = { calls: 0 };
    const realLogin = admitted.login.bind(admitted);
    (admitted as unknown as { login: () => unknown }).login = () => {
      logins.calls += 1;
      return realLogin();
    };
    if (admit === 'pinned') {
      admitted.importSession({ sessionId: 'RACE_SESSION', sequence: 5, shard: [1, 3] });
      admitted.beginSessionHandoff();
    } else if (admit !== 'none') {
      rig.bot.admitImportedSession(admitted, { sessionId: 'RACE_SESSION', sequence: 5, shard: [1, 3] });
    }
    release(admit === 'consulted' || admit === 'pinned');
    await waitForCondition(() => calls.length >= (admit === 'consulted' || admit === 'pinned' ? 3 : 4), 'the queue resumes and consults the rest', 6000);
    await sleep(1200);
    return {
      logins: logins.calls,
      errors: rig.debug.filter((d) => d.level <= LOG_LEVELS.ERROR).length,
      allowedShards: rig.debug
        .filter((d) => d.message === 'Shard is allowed to connect.')
        .map((d) => (d.data.shard as Gateway).id),
      queued: shards.filter((id) => rig.bot.gatewayLoginQueue.includes(rig.bot.shards.get(id)!)),
      bystanderQueued: rig.bot.gatewayLoginQueue.includes(bystander),
      calls,
    };
  } finally {
    await rig.end();
  }
}

describe('a gateway admitted while the queue awaits allowConnection leaves the rest of the queue intact', () => {
  it('control: with no admission the bystander stays queued and is consulted', async () => {
    const r = await run('none');
    expect(r.bystanderQueued).toBe(true);
    expect(r.calls.some((c) => c.id === 2)).toBe(true);
  }, 20000);

  it('admission of another shard: the bystander stays queued and allowConnection is never called with a gateway that holds a socket', async () => {
    const r = await run('other');
    expect(r.bystanderQueued).toBe(true);
    expect(r.queued).toEqual([0, 2]);
    expect(r.calls.filter((c) => c.heldSocket)).toEqual([]);
  }, 20000);

  it('admission of the very gateway being consulted, whose answer is then yes: it is not picked, and the bystander stays queued', async () => {
    const r = await run('consulted');
    expect(r.bystanderQueued).toBe(true);
    expect(r.queued).toEqual([0, 2]);
    expect(r.allowedShards).not.toContain(1);
  }, 20000);

  it('a gateway pinned while it is the one being consulted is not picked: no login, no ERROR, and it keeps its place', async () => {
    const r = await run('pinned');
    expect(r.queued).toEqual([0, 1, 2]);
    expect(r.allowedShards).not.toContain(1);
    expect(r.logins).toBe(0);
    expect(r.errors).toBe(0);
  }, 20000);
});
