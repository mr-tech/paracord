import type { Gateway, Heartbeat } from '../../dist/index';

declare const gateway: Gateway;

export const heartbeat: Heartbeat | undefined = gateway.heartbeat;

export const recentTimestamp: number | undefined = gateway.heartbeat?.recentTimestamp;

export const sendHeartbeat: (() => void) | undefined = gateway.heartbeat?.sendHeartbeat;
