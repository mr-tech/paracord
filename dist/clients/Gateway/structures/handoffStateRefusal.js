"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isWebSocketUrl(value) {
    if (typeof value !== 'string' || value !== value.trim() || value.includes('?') || value.includes('#'))
        return false;
    try {
        const { protocol } = new URL(value);
        return protocol === 'ws:' || protocol === 'wss:';
    }
    catch {
        return false;
    }
}
function isSameShard(candidate, shard) {
    if (candidate === undefined || shard === undefined)
        return candidate === shard;
    return Array.isArray(candidate)
        && candidate.length === 2
        && candidate[0] === shard[0]
        && candidate[1] === shard[1];
}
function handoffStateRefusal(state, shard) {
    if (typeof state !== 'object' || state === null)
        return 'The state is not an object';
    const { sessionId, sequence, resumeUrl, shard: stateShard, } = state;
    if (typeof sessionId !== 'string' || sessionId.length === 0)
        return 'The sessionId is not a non-empty string';
    if (!Number.isSafeInteger(sequence) || sequence < 0)
        return 'The sequence is not a non-negative safe integer';
    if (resumeUrl !== undefined && !isWebSocketUrl(resumeUrl))
        return 'The resumeUrl is not a ws: or wss: URL';
    if (!isSameShard(stateShard, shard))
        return 'The shard is not this gateway\'s shard';
    return undefined;
}
exports.default = handoffStateRefusal;
