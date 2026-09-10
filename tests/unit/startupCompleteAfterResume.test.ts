import {
  describe, it, expect, vi,
} from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type Gateway from '../../src/clients/Gateway';

function stubGateway(id = 0): Gateway {
  return {
    id,
    resumable: true,
    connected: false,
    login: vi.fn(),
    close: vi.fn(),
  } as unknown as Gateway;
}

type Harness = {
  paracord: Paracord;
  processQueue: () => Promise<void>;
  forceStartupComplete: () => void;
  events: string[];
};

function makeHarness(): Harness {
  const paracord = new Paracord('harness.token.value', {
    gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
    shardStartupTimeout: 120,
  });
  const events: string[] = [];
  paracord.on('SHARD_STARTUP_COMPLETE', (e: unknown) => { events.push(`SHARD_STARTUP_COMPLETE:${(e as { shard: Gateway }).shard.id}`); });
  paracord.on('PARACORD_STARTUP_COMPLETE', () => { events.push('PARACORD_STARTUP_COMPLETE'); });

  const internals = paracord as unknown as {
    processGatewayQueue: () => Promise<void>;
    checkIfDoneStarting: (forced?: boolean) => void;
  };

  return {
    paracord,
    events,
    processQueue: internals.processGatewayQueue,
    forceStartupComplete: () => internals.checkIfDoneStarting.call(paracord, true),
  };
}

/** Drives A and B to the state where B has forced completion while A sits re-queued behind it. */
async function driveToLastShardForcedWhileFirstIsQueued(h: Harness): Promise<{ gatewayA: Gateway; gatewayB: Gateway }> {
  const { paracord, processQueue, forceStartupComplete } = h;
  const gatewayA = stubGateway(0);
  const gatewayB = stubGateway(1);

  paracord.gatewayLoginQueue.push(gatewayA, gatewayB);
  await processQueue();
  expect(paracord.startingGateway).toBe(gatewayA);

  paracord.handleEvent('READY', { user: { username: 'u', discriminator: '0' }, guilds: [] }, gatewayA);
  expect(paracord.startingGateway).toBeUndefined();

  paracord.emit('GATEWAY_CLOSE', { gateway: gatewayA, shouldReconnect: true, code: GATEWAY_CLOSE_CODES.ABNORMAL });
  expect(paracord.gatewayLoginQueue).toEqual([gatewayB, gatewayA]);

  await processQueue();
  expect(paracord.startingGateway).toBe(gatewayB);

  paracord.handleEvent('READY', { user: { username: 'u', discriminator: '0' }, guilds: [{}] }, gatewayB);
  forceStartupComplete();
  expect(paracord.startingGateway).toBeUndefined();
  expect(paracord.gatewayLoginQueue).toEqual([gatewayA]);

  return { gatewayA, gatewayB };
}

describe('Paracord: PARACORD_STARTUP_COMPLETE after the last shard resumes', () => {
  it('emits PARACORD_STARTUP_COMPLETE once, after the shard\'s own completion, when the final queued shard completes via RESUMED', async () => {
    const h = makeHarness();
    const { gatewayA, gatewayB } = await driveToLastShardForcedWhileFirstIsQueued(h);
    const { paracord, processQueue, events } = h;

    expect(events).toEqual([`SHARD_STARTUP_COMPLETE:${gatewayA.id}`, `SHARD_STARTUP_COMPLETE:${gatewayB.id}`]);

    await processQueue();
    expect(paracord.startingGateway).toBe(gatewayA);
    expect(paracord.gatewayLoginQueue).toHaveLength(0);

    paracord.handleEvent('RESUMED', {}, gatewayA);

    expect(events).toEqual([
      `SHARD_STARTUP_COMPLETE:${gatewayA.id}`,
      `SHARD_STARTUP_COMPLETE:${gatewayB.id}`,
      `SHARD_STARTUP_COMPLETE:${gatewayA.id}`,
      'PARACORD_STARTUP_COMPLETE',
    ]);
    expect(paracord.startingGateway).toBeUndefined();
    expect(paracord.connecting).toBe(false);
  });

  it('does not emit PARACORD_STARTUP_COMPLETE a second time when a non-starting shard resumes afterwards', async () => {
    const h = makeHarness();
    const { gatewayA, gatewayB } = await driveToLastShardForcedWhileFirstIsQueued(h);
    const { paracord, processQueue, events } = h;

    await processQueue();
    paracord.handleEvent('RESUMED', {}, gatewayA);
    expect(events.filter((e) => e === 'PARACORD_STARTUP_COMPLETE')).toHaveLength(1);

    paracord.handleEvent('RESUMED', {}, gatewayB);

    expect(events.filter((e) => e === 'PARACORD_STARTUP_COMPLETE')).toHaveLength(1);
    expect(events.at(-1)).toBe(`SHARD_STARTUP_COMPLETE:${gatewayB.id}`);
  });
});
