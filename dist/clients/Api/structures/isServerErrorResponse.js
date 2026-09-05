"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Whether an HTTP status is in the 5xx class the library's own retry policy admits.
 * Membership alone decides entry to the retry branch; the method-idempotency predicate
 * (`isIdempotentMethod`) decides the attempt count once inside — kept as two functions
 * so each is the sole carrier of its half of the decision in its own fixtures, and so
 * the full 500..599 domain is exercisable as a pure, socket-free unit test.
 *
 * Not exported through `structures/index.ts` or the package entry, so a change here
 * does not move `api-report/paracord.api.md` — the same shape as
 * `isRpcTransportFailure.ts`.
 */
function isServerErrorResponse(status) {
    return status >= 500 && status <= 599;
}
exports.default = isServerErrorResponse;
