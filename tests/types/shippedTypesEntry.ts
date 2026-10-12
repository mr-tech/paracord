import type { Gateway, Heartbeat, SessionHandoffState } from '../../dist/index';

declare const gateway: Gateway;

export const heartbeat: Heartbeat | undefined = gateway.heartbeat;

export const recentTimestamp: number | undefined = gateway.heartbeat?.recentTimestamp;

export const sendHeartbeat: (() => void) | undefined = gateway.heartbeat?.sendHeartbeat;

export const heartbeatPinned: boolean = gateway.heartbeatPinned;

export const handoffState: SessionHandoffState = gateway.beginSessionHandoff();

export const handoffSessionId: string = handoffState.sessionId;

export const handoffSequence: number = handoffState.sequence;

export const handoffShard: [number, number] | undefined = handoffState.shard;

export const handoffResumeUrl: string | undefined = handoffState.resumeUrl;

export const clearHeartbeatPin: () => void = () => gateway.clearHeartbeatPin();

export const importSession: (state: SessionHandoffState) => void = (state) => gateway.importSession(state);
