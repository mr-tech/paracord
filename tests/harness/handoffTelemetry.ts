import type { DebugLine } from './directGateway';

export const SESSION_MARKER = 'HARNESS_SESSION';
export const TOKEN_MARKER = 'harness.token.value';

export function isHandoffLine(line: DebugLine): boolean {
  return line.data !== undefined && 'shardId' in line.data;
}

export function handoffLines(lines: DebugLine[]): DebugLine[] {
  return lines.filter(isHandoffLine);
}

export function carriesAny(line: DebugLine, markers: string[]): boolean {
  const { shard: injectedGatewayReference, ...ownData } = line.data ?? {};
  void injectedGatewayReference;
  const text = `${line.message}\n${JSON.stringify(ownData)}`;
  return markers.some((m) => text.includes(m));
}
