"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Whether an HTTP method is one the library's own 5xx/transport retry may resend
 * without risking a duplicate write: GET, HEAD, OPTIONS, PUT, DELETE keep the retry's 3
 * attempts; every other method axios's `Method` type admits (POST, PATCH, PURGE, LINK,
 * UNLINK) gets 1 — surfaced on the first attempt instead.
 *
 * The method conjunct of the compound retry predicate, alongside
 * `isServerErrorResponse`'s status conjunct. Case-insensitive: `BaseRequest#method`
 * carries the spelling the caller passed in, not a normalised one. Not exported
 * through `structures/index.ts` or the package entry, so a change here does not move
 * `api-report/paracord.api.md` — the same shape as `isRpcTransportFailure.ts`.
 */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
function isIdempotentMethod(method) {
    return IDEMPOTENT_METHODS.has(method.toUpperCase());
}
exports.default = isIdempotentMethod;
