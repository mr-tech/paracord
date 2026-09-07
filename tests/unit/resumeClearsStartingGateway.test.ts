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

describe('Paracord#handleEvent: RESUMED and starting-shard state', () => {
  it('clears #startingGateway and the armed shard-startup timer when a gateway-requested reconnect resumes', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const gateway = stubGateway();

    paracord.emit('GATEWAY_CLOSE', {
      gateway,
      shouldReconnect: true,
      code: GATEWAY_CLOSE_CODES.RECONNECT,
    });

    await (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue();

    expect(paracord.startingGateway).toBe(gateway);
    expect(gateway.login).toHaveBeenCalledTimes(1);
    const armedCall = setTimeoutSpy.mock.calls.at(-1)!;
    expect(armedCall[1]).toBe(120_000);
    const armedTimer = setTimeoutSpy.mock.results.at(-1)!.value;

    paracord.handleEvent('RESUMED', {}, gateway);

    expect(paracord.startingGateway).toBeUndefined();
    expect(paracord.connecting).toBe(false);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(armedTimer);
  });

  it('does not complete shard startup, release #startingGateway, or stop counting outstanding guilds when RESUMED arrives before the initial GUILD_CREATEs do', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });
    const shardStartupCompletions: unknown[] = [];
    paracord.on('SHARD_STARTUP_COMPLETE', (e: unknown) => { shardStartupCompletions.push(e); });

    const gatewayA = stubGateway(0);
    const gatewayB = stubGateway(1);
    const processQueue = (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue;

    paracord.gatewayLoginQueue.push(gatewayA);
    await processQueue();

    paracord.handleEvent('READY', { user: { username: 'u', discriminator: '0' }, guilds: [{}, {}, {}] }, gatewayA);

    paracord.emit('GATEWAY_CLOSE', { gateway: gatewayA, shouldReconnect: true, code: GATEWAY_CLOSE_CODES.ABNORMAL });

    paracord.gatewayLoginQueue.push(gatewayB);
    await processQueue();

    expect(paracord.startingGateway).toBe(gatewayA);

    paracord.handleEvent('RESUMED', {}, gatewayA);

    expect(shardStartupCompletions).toHaveLength(0);
    expect(paracord.startingGateway).toBe(gatewayA);

    await processQueue();
    expect(gatewayB.login).not.toHaveBeenCalled();

    for (let i = 0; i < 3; i += 1) {
      expect(paracord.startingGateway).toBe(gatewayA);
      paracord.handleEvent('GUILD_CREATE', {}, gatewayA);
    }
    await new Promise((r) => { setImmediate(r); });

    expect(shardStartupCompletions).toHaveLength(1);
    expect(paracord.startingGateway).toBeUndefined();
  });

  it('completes shard startup for a RESUMED gateway that does not hold the connect slot, while another shard is still ingesting its guilds', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });
    const completions: { shard: Gateway }[] = [];
    paracord.on('SHARD_STARTUP_COMPLETE', (e: unknown) => { completions.push(e as { shard: Gateway }); });

    const gatewayA = stubGateway(0);
    const gatewayB = stubGateway(1);
    const processQueue = (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue;

    paracord.gatewayLoginQueue.push(gatewayA);
    await processQueue();
    paracord.handleEvent('READY', { user: { username: 'u', discriminator: '0' }, guilds: [{}, {}, {}] }, gatewayA);
    expect(paracord.startingGateway).toBe(gatewayA);

    paracord.handleEvent('RESUMED', {}, gatewayB);

    expect(completions.map((c) => c.shard)).toEqual([gatewayB]);
    expect(paracord.startingGateway).toBe(gatewayA);

    for (let i = 0; i < 3; i += 1) {
      paracord.handleEvent('GUILD_CREATE', {}, gatewayA);
    }
    await new Promise((r) => { setImmediate(r); });

    expect(completions.map((c) => c.shard)).toEqual([gatewayB, gatewayA]);
    expect(paracord.startingGateway).toBeUndefined();
  });

  it('holds the connect slot and the startup timer when RESUMED arrives with exactly one guild outstanding', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });
    const completions: { shard: Gateway }[] = [];
    paracord.on('SHARD_STARTUP_COMPLETE', (e: unknown) => { completions.push(e as { shard: Gateway }); });

    const gatewayA = stubGateway(0);
    const processQueue = (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue;

    paracord.gatewayLoginQueue.push(gatewayA);
    await processQueue();
    paracord.handleEvent('READY', { user: { username: 'u', discriminator: '0' }, guilds: [{}] }, gatewayA);
    expect(paracord.startingGateway).toBe(gatewayA);

    paracord.handleEvent('RESUMED', {}, gatewayA);

    expect(completions).toHaveLength(0);
    expect(paracord.startingGateway).toBe(gatewayA);

    paracord.handleEvent('GUILD_CREATE', {}, gatewayA);
    await new Promise((r) => { setImmediate(r); });

    expect(completions.map((c) => c.shard)).toEqual([gatewayA]);
    expect(paracord.startingGateway).toBeUndefined();
  });

  it('does not hold a resumed gateway open on a previous shard\'s outstanding guild count', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });
    const completions: { shard: Gateway }[] = [];
    paracord.on('SHARD_STARTUP_COMPLETE', (e: unknown) => { completions.push(e as { shard: Gateway }); });

    const gatewayA = stubGateway(0);
    const gatewayB = stubGateway(1);
    const processQueue = (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue;

    paracord.gatewayLoginQueue.push(gatewayA);
    await processQueue();
    paracord.handleEvent('READY', { user: { username: 'u', discriminator: '0' }, guilds: [{}, {}, {}] }, gatewayA);
    expect(paracord.startingGateway).toBe(gatewayA);

    (gatewayA as unknown as { resumable: boolean }).resumable = false;
    paracord.emit('GATEWAY_CLOSE', {
      gateway: gatewayA,
      shouldReconnect: true,
      code: GATEWAY_CLOSE_CODES.SESSION_NO_LONGER_VALID,
    });
    expect(paracord.startingGateway).toBeUndefined();

    paracord.gatewayLoginQueue.push(gatewayB);
    await processQueue();
    expect(paracord.startingGateway).toBe(gatewayB);

    paracord.handleEvent('RESUMED', {}, gatewayB);

    expect(completions.map((c) => c.shard)).toEqual([gatewayB]);
    expect(paracord.startingGateway).toBeUndefined();
  });
});
