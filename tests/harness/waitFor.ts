import type Gateway from '../../src/clients/Gateway/Gateway';

/**
 * Polls `predicate` on a short interval until it returns true or `timeoutMs` elapses.
 * The named-condition wait every test in this chain uses in place of a fixed sleep
 * (WP-1 step 0, architect F-5).
 */
export function waitForCondition(
  predicate: () => boolean,
  description: string,
  timeoutMs = 5000,
  pollIntervalMs = 5,
): Promise<void> {
  if (predicate()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`waitForCondition timed out after ${timeoutMs}ms: ${description}`));
        return;
      }
      setTimeout(tick, pollIntervalMs);
    };
    tick();
  });
}

/**
 * Waits on the gateway's own `resumable` becoming true — the client having actually
 * processed READY — rather than the server having merely sent it.
 */
export function waitForResumable(gw: Gateway, timeoutMs = 5000): Promise<void> {
  return waitForCondition(() => gw.resumable, `gateway ${gw.id} resumable`, timeoutMs);
}
