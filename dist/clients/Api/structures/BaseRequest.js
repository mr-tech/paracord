"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
class BaseRequest {
    method;
    url;
    bucketHashKey;
    topLevelResource;
    topLevelID;
    rateLimitKey;
    static formatRateLimitKey(tlr, tlrID, bucketHash) {
        return `${tlr}-${tlrID}-${bucketHash}`;
    }
    constructor(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey) {
        this.method = method;
        this.url = (0, utils_1.stripLeadingSlash)(url);
        this.topLevelResource = topLevelResource;
        this.topLevelID = topLevelID;
        this.bucketHashKey = bucketHashKey;
        this.rateLimitKey = bucketHash ? this.getRateLimitKey(bucketHash) : undefined;
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
