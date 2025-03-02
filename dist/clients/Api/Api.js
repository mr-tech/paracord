"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const axios_1 = __importDefault(require("axios"));
const events_1 = require("events");
const constants_1 = require("../../constants");
const rpc_1 = require("../../rpc");
const utils_1 = require("../../utils");
const structures_1 = require("./structures");
const MAX_SERVER_ERROR_RETRIES = 3;
function validateStatusDefault(status) {
    return status >= 200 && status <= 299;
}
function isRateLimitResponse(response) {
    return response.status === 429;
}
function isServerErrorResponse(response) {
    return response.status >= 500 && response.status <= 599;
}
/** A client used to interact with Discord's REST API and navigate its rate limits. */
class Api {
    /** When using Rpc, the service through which to pass requests to the server. */
    rpcRequestService;
    /** Key:Value mapping this client's events to user's preferred emitted value. */
    events;
    /** Contains rate limit state information. For use when not using rpc; or in fallback. */
    #rateLimitCache;
    /** Rate limited requests queue. For use when not using rpc; or in fallback, */
    #requestQueue;
    /** When using Rpc, the service through which to get authorization to make requests. */
    #rpcRateLimitService;
    /** Whether or not this client should handle requests locally for as long as it cannot connect to the rpc server. */
    #allowFallback;
    #emitter;
    #makeRequest;
    #rpcServiceOptions;
    #connectingToRpcService;
    #defaultRequestOptions;
    /** Number of requests that can be running simultaneously. */
    #maxConcurrency;
    /** Number of requests sent that have not received a response. */
    #inFlight = 0;
    static isApiDebugEvent(event) {
        function hasSource(evt = event) {
            return !!(event && typeof event === 'object' && 'source' in event);
        }
        return hasSource(event) && event.source === constants_1.LOG_SOURCES.API;
    }
    static allowQueue(request, globalRateLimited) {
        const { returnOnRateLimit, returnOnGlobalRateLimit } = request;
        if (globalRateLimited && returnOnGlobalRateLimit)
            return false;
        if (!globalRateLimited && returnOnRateLimit)
            return false;
        if (request.retriesLeft !== undefined && --request.retriesLeft <= 0)
            return false;
        return true;
    }
    /**
     * Throws errors and warnings if the parameters passed to the constructor aren't sufficient.
     * @param token Discord bot token.
     */
    static validateParams(token) {
        if (token === undefined) {
            throw Error('client requires a bot token');
        }
    }
    /** Creates an isolated axios instance for use by this REST handler. */
    static createWrappedRequestMethod(rateLimitCache, token, requestOptions) {
        const instance = axios_1.default.create({
            ...(requestOptions ?? {}),
            baseURL: `${constants_1.DISCORD_API_URL}/v${requestOptions?.version ?? constants_1.DISCORD_API_DEFAULT_VERSION}`,
            headers: {
                Authorization: token,
                'User-Agent': `DiscordBot (${constants_1.PARACORD_URL}, ${constants_1.PARACORD_VERSION_NUMBER})`,
                'Content-Type': 'application/json',
                'X-RateLimit-Precision': 'millisecond',
                'Accept-Encoding': 'gzip,deflate',
                ...(requestOptions?.headers ?? {}),
            },
        });
        instance.interceptors.response.use((response) => response, (error) => ({
            status: 500, headers: {}, data: { message: error.message },
        }));
        /** `axios.request()` decorated with rate limit handling. */
        return rateLimitCache.wrapRequest(instance.request);
    }
    /**
     * Takes the method and url "minor parameters" to create a key used in navigating rate limits. Condenses common paths.
     * @param method HTTP method of the request.
     * @param rateLimitMinorParameters Request method and parameters in the url following the major parameter.
     * @returns A key used internally to find related buckets.
     */
    static extractBucketHashKey(method, url) {
        const [topLevelResource, topLevelID, ...rateLimitMinorParameters] = (0, utils_1.stripLeadingSlash)(url).split('?')[0].split('/');
        const key = [(0, utils_1.shortMethod)(method)];
        for (const param of rateLimitMinorParameters) {
            switch (param) {
                case 'channels':
                    key.push('c');
                    break;
                case 'audit-log':
                    key.push('au');
                    break;
                case 'members':
                    key.push('m');
                    break;
                case 'guilds':
                    key.push('g');
                    break;
                case 'messages':
                    key.push('s');
                    break;
                case 'roles':
                    key.push('r');
                    break;
                case 'webhooks':
                    key.push('w');
                    break;
                case 'archived':
                    key.push('ar');
                    break;
                case 'threads':
                    key.push('t');
                    break;
                case 'private':
                    key.push('pr');
                    break;
                case 'public':
                    key.push('pu');
                    break;
                case 'active':
                    key.push('ac');
                    break;
                case 'reactions':
                    key.push('re');
                    break;
                case 'thread-members':
                    key.push('tm');
                    break;
                default:
                    if (!/^[0-9]/.test(param.charAt(0))) {
                        key.push(param);
                    }
            }
        }
        return [topLevelResource, topLevelID, key.join('-')];
    }
    /**
     * Creates a new Api client.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
    constructor(token, options = {}) {
        Api.validateParams(token);
        const requestQueue = new structures_1.RequestQueue(this);
        this.#requestQueue = requestQueue;
        const { emitter, maxConcurrency, requestOptions = {}, } = options;
        this.#defaultRequestOptions = requestOptions;
        this.#emitter = emitter;
        this.rpcRequestService;
        this.#rpcRateLimitService;
        this.#allowFallback = false;
        this.#connectingToRpcService = false;
        this.#maxConcurrency = maxConcurrency;
        if (requestOptions.globalRateLimitMax) {
            this.log('DEBUG', 'GENERAL', `Global rate limit set to ${requestOptions.globalRateLimitMax}.`);
        }
        if (requestOptions.globalRateLimitResetPadding) {
            this.log('DEBUG', 'GENERAL', `Global rate limit padding set to ${requestOptions.globalRateLimitResetPadding}ms.`);
        }
        this.#rateLimitCache = new structures_1.RateLimitCache(requestOptions.globalRateLimitMax ?? constants_1.API_GLOBAL_RATE_LIMIT, requestOptions.globalRateLimitResetPadding ?? constants_1.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS, this);
        const botToken = (0, utils_1.coerceTokenToBotLike)(token);
        this.#makeRequest = Api.createWrappedRequestMethod(this.#rateLimitCache, botToken, requestOptions);
    }
    get hasRateLimitService() {
        return this.#rpcRateLimitService !== undefined;
    }
    get hasRequestService() {
        return this.rpcRequestService !== undefined;
    }
    get queue() {
        return this.#requestQueue;
    }
    get maxExceeded() {
        return !!this.#maxConcurrency && this.#inFlight > this.#maxConcurrency;
    }
    end() {
        this.#requestQueue.end();
        this.#rateLimitCache.end();
    }
    log(level, code, message, data) {
        const event = {
            source: constants_1.LOG_SOURCES.API,
            level: constants_1.LOG_LEVELS[level],
            message,
            code: constants_1.API_DEBUG_CODES[code],
            data,
        };
        this.emit('DEBUG', event);
    }
    /**
     * Emits all events if `this.events` is undefined; otherwise will emit those defined as keys in `this.events` as the paired value.
     * @param type Type of event. (e.g. "DEBUG" or "CHANNEL_CREATE")
     * @param data Data to send with the event.
     */
    emit = (type, data) => {
        if (this.#emitter !== undefined) {
            this.#emitter.emit(type, data);
        }
    };
    on = (name, listener) => {
        if (!this.#emitter) {
            this.#emitter = new events_1.EventEmitter();
        }
        const code = constants_1.API_DEBUG_CODES[name];
        this.#emitter.on('DEBUG', (event) => {
            if (Api.isApiDebugEvent(event) && event.code === code) {
                listener(event);
            }
        });
    };
    /*
     ********************************
     ********* RPC SERVICE **********
     ********************************
     */
    /**
     * Adds the service that has a server make requests to Discord on behalf of the client.
     * @param serviceOptions
     * @returns `true` is connection was successful.
     */
    addRequestService = (serviceOptions = {}) => {
        if (this.hasRateLimitService
            || this.hasRequestService) {
            throw Error('An rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRequestService = (0, rpc_1.createRequestService)(serviceOptions);
        this.#allowFallback = this.rpcRequestService.allowFallback;
        if (this.#rpcServiceOptions === undefined) {
            {
                const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
                this.log('INFO', 'GENERAL', message);
            }
            if (!this.#allowFallback) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', 'GENERAL', message);
            }
        }
        this.#rpcServiceOptions = serviceOptions;
        return this.checkRpcServiceConnection(this.rpcRequestService);
    };
    /**
     * Adds the service that first checks with a server before making a request to Discord.
     * @param serviceOptions
     * @returns `true` is connection was successful.
     */
    addRateLimitService = (serviceOptions = {}) => {
        if (this.hasRateLimitService || this.hasRequestService) {
            throw Error('A rpc service has already been defined for this client. Only one may be added.');
        }
        this.#rpcRateLimitService = (0, rpc_1.createRateLimitService)(serviceOptions);
        this.#allowFallback = serviceOptions.allowFallback !== false;
        if (this.#rpcServiceOptions === undefined) {
            {
                const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.#rpcRateLimitService.target}`;
                this.log('INFO', 'GENERAL', message);
            }
            if (!this.#allowFallback) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', 'GENERAL', message);
            }
        }
        this.#rpcServiceOptions = serviceOptions;
        return this.checkRpcServiceConnection(this.#rpcRateLimitService);
    };
    /**
     * @returns `true` is connection was successful.
     */
    checkRpcServiceConnection = async (service) => {
        try {
            await service.hello();
            this.#connectingToRpcService = false;
            this.log('DEBUG', 'GENERAL', 'Successfully established connection to Rpc server.');
            return true;
        }
        catch (err) {
            if (!this.#connectingToRpcService) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION) {
                    this.#connectingToRpcService = true;
                    this.reattemptConnectInFuture(1);
                }
                else {
                    this.log('ERROR', 'ERROR', 'Received unexpected error when connecting to Rpc service.', err);
                }
            }
        }
        return false;
    };
    // TODO: reach out to grpc maintainers to find out why the current state goes bad after this error
    recreateRpcService() {
        if (this.hasRateLimitService) {
            this.#rpcRateLimitService = undefined;
            return this.addRateLimitService(this.#rpcServiceOptions);
        }
        this.rpcRequestService = undefined;
        return this.addRequestService(this.#rpcServiceOptions);
    }
    reattemptConnectInFuture(delay) {
        this.log('WARNING', 'GENERAL', `Failed to connect to Rpc server. Trying again in ${delay} seconds.`);
        setTimeout(() => {
            this.recreateRpcService()
                .then((success) => {
                if (!success) {
                    const newDelay = delay + 1 < 10 ? delay + 1 : 10;
                    this.reattemptConnectInFuture(newDelay);
                }
            })
                .catch((err) => { throw err; });
        }, delay * 1e3);
    }
    /*
     ********************************
     *********** REQUEST ************
     ********************************
     */
    /**
     * Makes a request to Discord, handling any rate limits and returning when a non-429 response is received.
     * @param method HTTP method of the request.
     * @param url Discord endpoint url. (e.g. "/channels/abc123")
     * @param options Optional parameters for a Discord REST request.
     * @returns Response to the request made.
     */
    request = async (method, url, options = {}) => {
        const merged = { ...this.#defaultRequestOptions, ...options };
        const { local, validateStatus = validateStatusDefault } = merged;
        const [topLevelResource, topLevelID, bucketHashKey] = Api.extractBucketHashKey(method, url);
        const bucketHash = this.#rateLimitCache.getBucket(bucketHashKey);
        const request = new structures_1.ApiRequest(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey, merged);
        let response;
        if (this.rpcRequestService === undefined || local) {
            response = await this.sendRequest(request);
        }
        else {
            response = await this.handleRequestRemote(this.rpcRequestService, request);
        }
        if (validateStatus && !validateStatus(response.status)) {
            throw createError(new Error(response.statusText), request.config, response.status, request, response);
        }
        return response;
    };
    /**
     * Sends the request to the rpc server for handling.
     * @param request ApiRequest being made.
     */
    async handleRequestRemote(rpcRequestService, request) {
        if (this.#connectingToRpcService) {
            if (this.#allowFallback) {
                const message = 'Client is connecting to RPC server. Falling back to handling request locally.';
                this.log('WARNING', 'GENERAL', message);
                return this.sendRequest(request);
            }
            throw Error('Client is connecting to RPC server. Unable to make request.');
        }
        try {
            return await rpcRequestService.request(request);
        }
        catch (err) {
            if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && this.#allowFallback) {
                await this.recreateRpcService();
                const message = 'Could not reach RPC server. Falling back to handling request locally.';
                this.log('ERROR', 'ERROR', message, err);
                return this.sendRequest(request);
            }
            throw err;
        }
    }
    async sendRequest(request, fromQueue) {
        ++this.#inFlight;
        let reason;
        try {
            if (!this.maxExceeded) {
                let rateLimitState;
                if (this.hasRateLimitService) {
                    rateLimitState = await this.authorizeRequestWithServer(request);
                }
                if (rateLimitState === undefined) {
                    rateLimitState = this.#rateLimitCache.isRateLimited(request);
                }
                const { waitFor, global } = rateLimitState;
                if (waitFor === 0) {
                    request.startTime = new Date().getTime();
                    ++request.attempts;
                    this.log('DEBUG', 'REQUEST_SENT', 'Request sent.', { request });
                    const response = await this.#makeRequest(request);
                    this.log('DEBUG', 'RESPONSE_RECEIVED', 'Response received.', { request, response });
                    request.completeTime = new Date().getTime();
                    const rateLimitHeaders = structures_1.RateLimitHeaders.extractRateLimitFromHeaders(response.headers, isRateLimitResponse(response) ? response.data.retry_after : undefined);
                    this.updateRateLimitCache(request, rateLimitHeaders);
                    if (isRateLimitResponse(response)) {
                        return this.handleRateLimitResponse(request, response, rateLimitHeaders, !!fromQueue);
                    }
                    if (isServerErrorResponse(response)) {
                        return this.handleServerErrorResponse(request, response, !!fromQueue);
                    }
                    return response;
                }
                request.assignIfStricter(new Date().getTime() + waitFor);
                if (!Api.allowQueue(request, global ?? false)) {
                    const customResponse = {
                        status: 429,
                        statusText: 'Too Many Requests',
                        retry_after: waitFor,
                        data: { ...rateLimitState },
                        headers: {
                            _paracord: true,
                            'x-ratelimit-global': global ?? false,
                        },
                    };
                    throw createError(new Error(customResponse.statusText), request.config, customResponse.status, request, customResponse);
                } // request can be queued
                reason = 'rate limited';
            }
            else {
                // max exceeded || waitFor > 0
                reason = 'max concurrency exceed';
            }
            if (!fromQueue) {
                return this.queueRequest(request, reason);
            } // request came from queue
            return reason;
        }
        finally {
            --this.#inFlight;
        }
    }
    /**
     * Gets authorization from the server to make the request.
     * @param request ApiRequest being made.
     */
    async authorizeRequestWithServer(request) {
        if (this.#connectingToRpcService) {
            if (this.#allowFallback) {
                const message = 'Client is connecting to RPC server. Fallback is allowed. Allowing request to be made.';
                this.log('WARNING', 'GENERAL', message);
                return undefined;
            }
            throw Error('Client is connecting to RPC server. Unable to authorize request.');
        }
        try {
            const authorizationMessage = await this.#rpcRateLimitService.authorize(request);
            const { waitFor, global } = authorizationMessage;
            if (waitFor === 0) {
                return { waitFor };
            }
            return { waitFor, global };
        }
        catch (err) {
            if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && this.#allowFallback) {
                await this.recreateRpcService();
                const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
                this.log('ERROR', 'ERROR', message, err);
                return undefined;
            }
            throw err;
        }
    }
    /**
     * Updates the rate limit state and queues the request.
     * @param headers Response headers.
     * @param request Request being sent.
     */
    handleRateLimitResponse(request, response, headers, fromQueue) {
        const { resetTimestamp } = headers;
        const { waitUntil } = request;
        const oldestTimestamp = Math.max(resetTimestamp ?? (waitUntil ?? 0));
        if (oldestTimestamp > 0) {
            request.assignIfStricter(oldestTimestamp);
        }
        let message;
        if (headers.global) {
            message = `Request global rate limited: ${request.method} ${request.url}`;
        }
        else {
            message = `Request rate limited: ${request.method} ${request.url}`;
        }
        this.log('DEBUG', 'RATE_LIMITED', message, { request, headers, queued: fromQueue });
        if (Api.allowQueue(request, headers.global ?? false)) {
            return fromQueue ? 'rate limited' : this.queueRequest(request, 'rate limited');
        }
        throw createError(new Error(response.statusText), request.config, response.status, request, response);
    }
    async handleServerErrorResponse(request, headers, fromQueue) {
        if (request.attempts >= MAX_SERVER_ERROR_RETRIES) {
            throw createError(new Error(headers.statusText), request.config, headers.status, request, headers);
        }
        this.log('DEBUG', 'SERVER_ERROR', `Received server error: ${request.method} ${request.url}`, { request, headers, queued: fromQueue });
        await new Promise((resolve) => { setTimeout(resolve, constants_1.SECOND_IN_MILLISECONDS); });
        return fromQueue ? 'server error' : this.queueRequest(request, 'server error');
    }
    /**
     * Puts the Api Request onto the queue to be executed when the rate limit has reset.
     * @param request The Api Request to queue.
     * @returns Resolves as the response to the request.
     */
    queueRequest(request, reason) {
        const message = 'Queuing request.';
        this.log('DEBUG', 'REQUEST_QUEUED', message, { request, reason });
        return new Promise((resolve, reject) => {
            try {
                const queuedRequest = new structures_1.QueuedRequest(request, resolve, reject);
                this.#requestQueue.push(queuedRequest);
            }
            catch (err) {
                reject(err);
            }
        });
    }
    /**
     * Updates the local rate limit cache and sends an update to the server if there is one.
     * @param request The request made.
     * @param rateLimitHeaders Headers from the response.
     */
    updateRateLimitCache(request, rateLimitHeaders) {
        const { bucketHash } = rateLimitHeaders;
        if (bucketHash) {
            const rateLimitKey = request.getRateLimitKey(bucketHash);
            const { bucketHashKey } = request;
            this.#rateLimitCache.update(rateLimitKey, bucketHashKey, rateLimitHeaders);
        }
        this.#rateLimitCache.updateGlobal(rateLimitHeaders);
        void this.updateRpcCache(request, rateLimitHeaders);
    }
    async updateRpcCache(request, rateLimitHeaders) {
        if (this.#rpcRateLimitService !== undefined && !this.#connectingToRpcService) {
            try {
                const [global, bucketHash, limit, remaining, resetAfter, retryAfter] = rateLimitHeaders.rpcArgs;
                await this.#rpcRateLimitService.update(request, global, bucketHash, limit, remaining, resetAfter, retryAfter);
            }
            catch (err) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION) {
                    const success = await this.recreateRpcService();
                    if (!success)
                        throw err;
                }
                else {
                    throw err;
                }
            }
        }
    }
}
exports.default = Api;
function createError(error, config, code, request, response) {
    error.config = config;
    if (code) {
        error.code = code;
    }
    error.request = request;
    error.response = response;
    error.isApiError = true;
    error.toJSON = function toJSON() {
        return {
            message: this.message,
            name: this.name,
            stack: this.stack,
            config: this.config,
            code: this.code,
            status: this.response && this.response.status ? this.response.status : null,
            data: this.response.data,
        };
    };
    return error;
}
