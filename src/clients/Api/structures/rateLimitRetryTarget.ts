import computeBackoffMs from '../../Gateway/structures/backoffSchedule';

export interface RateLimitRetryTarget {
  target: number;
  nextInformationFreeRetryCount: number;
}

export default function computeRateLimitRetryTarget(
  now: number,
  resetTimestamp: number,
  waitUntil: number | undefined,
  informationFreeRetryCount: number,
): RateLimitRetryTarget {
  const directed = Math.max(
    Number.isFinite(resetTimestamp) ? resetTimestamp : 0,
    waitUntil ?? 0,
  );

  if (directed > now) {
    return { target: directed, nextInformationFreeRetryCount: 0 };
  }

  const nextInformationFreeRetryCount = informationFreeRetryCount + 1;
  return {
    target: now + computeBackoffMs(nextInformationFreeRetryCount),
    nextInformationFreeRetryCount,
  };
}
