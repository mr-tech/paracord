import type GatewayIdentify from './GatewayIdentify';

function isWebSocketUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value !== value.trim() || value.includes('?') || value.includes('#')) return false;

  try {
    const { protocol } = new URL(value);
    return protocol === 'ws:' || protocol === 'wss:';
  } catch {
    return false;
  }
}

function isSameShard(candidate: unknown, shard: GatewayIdentify['shard']): boolean {
  if (candidate === undefined || shard === undefined) return candidate === shard;

  return Array.isArray(candidate)
    && candidate.length === 2
    && candidate[0] === shard[0]
    && candidate[1] === shard[1];
}

export default function handoffStateRefusal(state: unknown, shard: GatewayIdentify['shard']): string | undefined {
  if (typeof state !== 'object' || state === null) return 'The state is not an object';

  const {
    sessionId, sequence, resumeUrl, shard: stateShard,
  } = state as Record<string, unknown>;

  if (typeof sessionId !== 'string' || sessionId.length === 0) return 'The sessionId is not a non-empty string';
  if (!Number.isSafeInteger(sequence) || (sequence as number) < 0) return 'The sequence is not a non-negative safe integer';
  if (resumeUrl !== undefined && !isWebSocketUrl(resumeUrl)) return 'The resumeUrl is not a ws: or wss: URL with no query, no fragment and no surrounding whitespace';
  if (!isSameShard(stateShard, shard)) return 'The shard is not this gateway\'s shard';

  return undefined;
}
