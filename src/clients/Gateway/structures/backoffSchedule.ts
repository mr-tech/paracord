const BASE_MILLISECONDS = 1000;
const CAP_MILLISECONDS = 60 * 1000;
const JITTER_RATIO = 0.2;

/**
 * The reconnect backoff schedule: attempt n maps to a wait in milliseconds, doubling
 * from a 1 s base, capped at 60 s, with ±20% jitter, asserted here as arithmetic with no
 * timer, real or fake, involved. n = 0 is 0 (the failure counter's own reading: no
 * failure yet, or reset by READY/RESUMED).
 * @internal
 */
export default function computeBackoffMs(n: number): number {
  if (n <= 0) return 0;

  const uncapped = BASE_MILLISECONDS * 2 ** (n - 1);
  const base = Math.min(CAP_MILLISECONDS, uncapped);
  const jitter = 1 + (Math.random() * 2 - 1) * JITTER_RATIO;

  return base * jitter;
}
