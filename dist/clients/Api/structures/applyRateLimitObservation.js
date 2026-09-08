"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function applyRateLimitObservation(cache, headers, bucketHashKey, computeRateLimitKey) {
    if (headers.hasState) {
        cache.update(computeRateLimitKey(headers.bucketHash), bucketHashKey, headers);
    }
    cache.updateGlobal(headers);
}
exports.default = applyRateLimitObservation;
