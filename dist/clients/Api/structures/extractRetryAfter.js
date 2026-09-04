"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seconds to wait before retrying a rate limited request. Discord puts this in the response body,
 * but 429s that carry no bucket state fall back to the standard `retry-after` header: Cloudflare
 * bans answer with html and no `x-ratelimit-*` at all, and `x-ratelimit-scope: shared` responses
 * (which webhook routes hit routinely) omit the bucket headers.
 */
function extractRetryAfter(response) {
    const bodyValue = response.data?.retry_after;
    if (bodyValue !== null && bodyValue !== undefined) {
        const fromBody = Number(bodyValue);
        if (Number.isFinite(fromBody))
            return fromBody;
    }
    const headerValue = response.headers?.['retry-after'];
    if (headerValue !== null && headerValue !== undefined) {
        const fromHeader = Number(headerValue);
        if (Number.isFinite(fromHeader))
            return fromHeader;
    }
    return undefined;
}
exports.default = extractRetryAfter;
