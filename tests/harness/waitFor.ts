import type Gateway from '../../src/clients/Gateway/Gateway';

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

export function waitForResumable(gw: Gateway, timeoutMs = 5000): Promise<void> {
  return waitForCondition(() => gw.resumable, `gateway ${gw.id} resumable`, timeoutMs);
}
