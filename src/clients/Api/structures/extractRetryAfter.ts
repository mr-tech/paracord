import type { RateLimitedResponse } from '../types';

export default function extractRetryAfter(response: RateLimitedResponse): undefined | number {
  const bodyValue = response.data?.retry_after;
  if (bodyValue !== null && bodyValue !== undefined) {
    const fromBody = Number(bodyValue);
    if (Number.isFinite(fromBody)) return fromBody;
  }

  const headerValue = response.headers?.['retry-after'];
  if (headerValue !== null && headerValue !== undefined) {
    const fromHeader = Number(headerValue);
    if (Number.isFinite(fromHeader)) return fromHeader;
  }

  return undefined;
}
