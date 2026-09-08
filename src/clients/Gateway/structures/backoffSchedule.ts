const BASE_MILLISECONDS = 1000;
const CAP_MILLISECONDS = 60 * 1000;
const JITTER_RATIO = 0.2;

export default function computeBackoffMs(n: number): number {
  if (n <= 0) return 0;

  const uncapped = BASE_MILLISECONDS * 2 ** (n - 1);
  const base = Math.min(CAP_MILLISECONDS, uncapped);
  const jitter = 1 + (Math.random() * 2 - 1) * JITTER_RATIO;

  return base * jitter;
}
