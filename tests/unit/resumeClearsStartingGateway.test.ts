import {
  describe, it, expect, vi,
} from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type Gateway from '../../src/clients/Gateway';

/**
 * A resumable gateway can be picked as `#startingGateway` from the login queue and
 * have the 120s shard-startup timer armed for it. A successful resume (`RESUMED`)
 * must clear that state and that timer regardless — this asserts the state
 * transition directly rather than by waiting out the timeout (real or fake): the
 * property under test is whether the timer is *cleared*, not when it fires, so
 * spying on `setTimeout`/`clearTimeout` proves the arm/clear relationship
 * deterministically. A stub gateway stands in for a live one (duck-typed, matching
 * the `tests/unit/failureCounter.test.ts` convention), and `processGatewayQueue` is
 * reached via a cast, the same state transition an interval tick reaches.
 */
function stubGateway(id = 0): Gateway {
  return {
    id,
    resumable: true,
    connected: false,
    login: vi.fn(),
    close: vi.fn(),
  } as unknown as Gateway;
}

describe('Paracord#handleEvent: a successful RESUME clears starting-shard state', () => {
  it('clears #startingGateway and the armed shard-startup timer when a gateway-requested reconnect resumes', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const gateway = stubGateway();

    // A gateway-requested reconnect (4992) on a resumable gateway, answered with
    // shouldReconnect: true.
    paracord.emit('GATEWAY_CLOSE', {
      gateway,
      shouldReconnect: true,
      code: GATEWAY_CLOSE_CODES.RECONNECT,
    });

    // One queue tick — what `#gatewayLoginInterval` does every second.
    await (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue();

    // The resumable gateway was picked as `#startingGateway` and its 120s timer armed.
    expect(paracord.startingGateway).toBe(gateway);
    expect(gateway.login).toHaveBeenCalledTimes(1);
    const armedCall = setTimeoutSpy.mock.calls.at(-1)!;
    expect(armedCall[1]).toBe(120_000);
    const armedTimer = setTimeoutSpy.mock.results.at(-1)!.value;

    // The resume succeeds.
    paracord.handleEvent('RESUMED', {}, gateway);

    // A successful resume must not leave the shard-startup timer armed, and must not
    // be treated as a startup that never completed.
    expect(paracord.startingGateway).toBeUndefined();
    expect(paracord.connecting).toBe(false);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(armedTimer);
  });
});
