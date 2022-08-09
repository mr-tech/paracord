"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
/** Basic information in a request to Discord. */
class BaseRequest {
    /** HTTP method of the request. */
    method;
    /** Discord REST endpoint target of the request. (e.g. channels/123) */
    url;
    /** Key generated from the method and minor parameters of a request used internally to get shared buckets. */
    bucketHashKey;
    /** "Major Parameter" used to differentiate rate limit states. */
    topLevelResource;
    /** "Major Parameter" ID used to differentiate rate limit states. */
    topLevelID;
    /** Key for this specific requests rate limit state in the rate limit cache. (TLR + TLR ID + Bucket Hash) */
    rateLimitKey;
    static formatRateLimitKey(tlr, tlrID, bucketHash) {
        return `${tlr}-${tlrID}-${bucketHash}`;
    }
    /**
     * Creates a new base request object with its associated rate limit identifiers.
     *
     * @param method HTTP method of the request.
     * @param url Discord REST endpoint target of the request. (e.g. channels/123)
     */
    constructor(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey) {
        this.method = method;
        this.url = (0, utils_1.stripLeadingSlash)(url);
        this.topLevelResource = topLevelResource;
        this.topLevelID = topLevelID;
        this.bucketHashKey = bucketHashKey;
        this.rateLimitKey = bucketHash && BaseRequest.formatRateLimitKey(this.topLevelResource, this.topLevelID, bucketHash);
    }
    get logKey() {
        return `${this.topLevelResource}-${this.bucketHashKey}`;
    }
    getRateLimitKey(bucketHash) {
        if (this.rateLimitKey)
            return this.rateLimitKey;
        if (bucketHash) {
            this.rateLimitKey = BaseRequest.formatRateLimitKey(this.topLevelResource, this.topLevelID, bucketHash);
            return this.rateLimitKey;
        }
        return undefined;
    }
}
exports.default = BaseRequest;
