"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEligible = exports.recordClose = exports.markReady = void 0;
const backoffSchedule_1 = __importDefault(require("../Gateway/structures/backoffSchedule"));
const state = new WeakMap();
function stateFor(key) {
    let s = state.get(key);
    if (!s) {
        s = { n: 0, notBefore: 0, reachedReady: false };
        state.set(key, s);
    }
    return s;
}
function markReady(key) {
    const s = stateFor(key);
    s.n = 0;
    s.reachedReady = true;
}
exports.markReady = markReady;
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
function isEligible(key, now) {
    return now >= stateFor(key).notBefore;
}
exports.isEligible = isEligible;
