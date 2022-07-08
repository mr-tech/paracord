"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRequest_1 = __importDefault(require("./BaseRequest"));
/**
 * A request that will be made to Discord's REST API.
 * @extends BaseRequest
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class Request extends BaseRequest_1.default {
    /** Data to send in the body of the request.  */
    data;
    /** Additional headers to send with the request. */
    headers;
    /** Function to generate form that will be used in place of data. Overwrites `data` and `headers`. */
    createForm;
    /** If queued, will be the response when this request is sent. */
    response;
    /** If queued when using the rate limit rpc service, a timestamp of when the request will first be available to try again. */
    waitUntil;
    /** Set to true not try request on a bucket 429 rate limit. */
    returnOnRateLimit;
    /** Set to true to not retry the request on a global rate limit. */
    returnOnGlobalRateLimit;
    /** The number of times to attempt to execute a rate limited request before returning with a local 429 response. Overrides either of the "returnOn" options. */
    retriesLeft;
    running;
    /**
     * Creates a new request object.
     *
     * @param method HTTP method of the request.
     * @param url Discord REST endpoint target of the request. (e.g. channels/123)
     * @param options Optional parameters for this request.
     */
    constructor(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey, options = {}) {
        super(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey);
        const { data, headers, createForm, returnOnRateLimit, returnOnGlobalRateLimit, maxRateLimitRetry, } = options;
        this.createForm = createForm;
        this.data = data;
        this.headers = headers;
        this.returnOnRateLimit = returnOnRateLimit ?? false;
        this.returnOnGlobalRateLimit = returnOnGlobalRateLimit ?? false;
        this.retriesLeft = maxRateLimitRetry;
        this.running = false;
    }
    /** Data relevant to sending this request via axios. */
    get config() {
        let data;
        let headers;
        if (this.createForm) {
            ({ data, headers } = this.createForm());
        }
        else {
            ({ data, headers } = this);
        }
        return {
            method: this.method,
            url: this.url,
            data,
            headers,
            validateStatus: null, // Tells axios not to throw errors when non-200 response codes are encountered.
        };
    }
    /** Assigns a stricter value to `waitUntil`.
     * Strictness is defined by the value that decreases the chance of getting rate limited.
     * @param waitUntil A timestamp of when the request will first be available to try again when queued due to rate limits.
     */
    assignIfStricterWait(waitUntil) {
        if (this.waitUntil === undefined || this.waitUntil < waitUntil) {
            this.waitUntil = waitUntil;
        }
    }
}
exports.default = Request;
