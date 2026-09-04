"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAll = exports.isEligible = exports.recordClose = exports.markReady = void 0;
const backoffSchedule_1 = __importDefault(require("../Gateway/structures/backoffSchedule"));
let state = new WeakMap();
function stateFor(key) {
    let s = state.get(key);
    if (!s) {
        s = { n: 0, notBefore: 0, reachedReady: false };
        state.set(key, s);
    }
    return s;
}
/**
 * READY or RESUMED fired for `key` — the failure counter table's phase becomes
 * "after" for the next close this key sees.
 * @internal
 */
function markReady(key) {
    const s = stateFor(key);
    s.n = 0;
    s.reachedReady = true;
}
exports.markReady = markReady;
/**
 * Records a close for `key` per the failure-counter table (F-26): "after" phase
 * (READY/RESUMED reached since the last close) resets n to 0 and sets the next
 * not-before to `closedAt` regardless of origin; "before" phase leaves n (and the
 * existing not-before) for `consumer` origin, or increments n and sets
 * `notBefore = closedAt + computeBackoffMs(n)` for `transport`/`discord` origin.
 * @internal
 */
function recordClose(key, origin, closedAt) {
    const s = stateFor(key);
    if (s.reachedReady) {
        s.n = 0;
        s.notBefore = closedAt;
        s.reachedReady = false;
        return;
    }
    if (origin === 'consumer') {
        return;
    }
    s.n += 1;
    s.notBefore = closedAt + (0, backoffSchedule_1.default)(s.n);
}
exports.recordClose = recordClose;
/** Whether `key`'s not-before has passed as of `now`. @internal */
function isEligible(key, now) {
    return now >= stateFor(key).notBefore;
}
exports.isEligible = isEligible;
/** Test-only: clears every key's state. @internal */
function resetAll() {
    state = new WeakMap();
}
exports.resetAll = resetAll;
