import {
  describe, it, expect, vi,
} from 'vitest';
import Paracord from '../../src/clients/Paracord/Paracord';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';
import type Gateway from '../../src/clients/Gateway';

/**
 * fix-paracord-resume-startup-timeout. `b36d1be` routed every gateway-requested
 * reconnect (including a resumable one) through the 1s login queue, so a resumable
 * gateway can now become `#startingGateway` and have the 120s shard-startup timer
 * armed for it — something that could not happen before that commit (research
 * shard-13-16-message-stall-2026-09-07.md, §Defect A). The pre-existing guard on
 * `case 'RESUMED'` in `handleEvent` (`if (!this.isStartingGateway(gateway))`) then
 * skips `completeShardStartup` for exactly this case, so the timer that should have
 * been cancelled by a successful resume never is, and fires 120s later.
 *
 * No real or virtual clock advance is needed to prove or disprove this: the defect
 * is that the timer is never *cleared*, not that it fires early or late. Spying on
 * `setTimeout`/`clearTimeout` proves the arm/clear relationship directly and
 * deterministically — a stub gateway stands in for a live one (duck-typed, matching
 * the `tests/unit/failureCounter.test.ts` convention), and `processGatewayQueue` is
 * `private` (soft), reached the same way any interval tick reaches it.
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

describe('fix-paracord-resume-startup-timeout: a successful RESUME clears starting-shard state', () => {
  it('clears #startingGateway and the armed shard-startup timer when a gateway-requested reconnect resumes', async () => {
    const paracord = new Paracord('harness.token.value', {
      gatewayOptions: { wsUrl: 'ws://example.invalid', wsParams: { v: '10', encoding: 'json' } },
      shardStartupTimeout: 120,
    });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const gateway = stubGateway();

    // The exact trigger (research §Defect A): a gateway-requested reconnect (4992)
    // on a resumable gateway, answered with shouldReconnect: true.
    paracord.emit('GATEWAY_CLOSE', {
      gateway,
      shouldReconnect: true,
      code: GATEWAY_CLOSE_CODES.RECONNECT,
    });

    // One queue tick — what `#gatewayLoginInterval` does every second.
    await (paracord as unknown as { processGatewayQueue: () => Promise<void> }).processGatewayQueue();

    // Instrument: confirms the mechanism research names, before asserting the fix —
    // the resumable gateway was picked as `#startingGateway` and its 120s timer armed.
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
