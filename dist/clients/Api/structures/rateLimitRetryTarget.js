"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const backoffSchedule_1 = __importDefault(require("../../Gateway/structures/backoffSchedule"));
/**
 * WP-9b step 6 (D-17), AC-9.8 — the information-free 429 backoff, as pure arithmetic
 * separated from the timer that consumes it (time-seam rule, form (a); architecture
 * `001-test-harness-architecture-findings.md` F-3). `resetTimestamp` and `waitUntil`
 * are the server-directed target and the request's own prior stricter wait; when their
 * max (`directed`) is still in the future, the response told us something real — the
 * wait honours it and the request's information-free counter resets to 0. When
 * `directed` is at or before `now`, the response was information-free (no body
 * `retry_after`, no `retry-after` header, no `x-ratelimit-reset-after` — the shape
 * that reaches this function with `resetTimestamp` at 0 or already elapsed), and the
 * wait grows on `computeBackoffMs` — the D-8 schedule WP-1 built (`b36d1be`), reused
 * rather than reimplemented: one schedule function serves both packages.
 *
 * The counter is state of the *request*, supplied and returned by the caller — this
 * function holds none of its own, so it composes with re-queue exactly as designed
 * (WP-9 step 6: "the counter ... survives re-queue; it is not cache or global state").
 */
function computeRateLimitRetryTarget(now, resetTimestamp, waitUntil, informationFreeRetryCount) {
    const directed = Math.max(Number.isFinite(resetTimestamp) ? resetTimestamp : 0, waitUntil ?? 0);
    if (directed > now) {
        return { target: directed, nextInformationFreeRetryCount: 0 };
    }
    const nextInformationFreeRetryCount = informationFreeRetryCount + 1;
    return {
        target: now + (0, backoffSchedule_1.default)(nextInformationFreeRetryCount),
        nextInformationFreeRetryCount,
    };
}
exports.default = computeRateLimitRetryTarget;
