"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const rpc_1 = require("../../rpc");
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const structures_1 = require("./structures");
function isRateLimitResponse(response) {
    return response.status === 429;
}
class Api {
    rpcRequestService;
    events;
    #rateLimitCache;
    #requestQueue;
    #requestQueueProcessInterval;
    #rpcRateLimitService;
    #allowFallback;
    #emitter;
    #makeRequest;
    #rpcServiceOptions;
    #connectingToRpcService;
    #requestOptions;
    static shouldQueueRequest(request, globalRateLimited) {
        const { returnOnRateLimit, returnOnGlobalRateLimit } = request;
        if (request.retriesLeft !== undefined) {
            if (--request.retriesLeft <= 0)
                return false;
        }
        else {
            if (returnOnRateLimit && !globalRateLimited)
                return false;
            if (returnOnGlobalRateLimit && globalRateLimited)
                return false;
        }
        return true;
    }
    static validateParams(token) {
        if (token === undefined) {
            throw Error('client requires a bot token');
        }
    }
    static createWrappedRequestMethod(rateLimitCache, token, requestOptions) {
        const instance = axios_1.default.create({
            baseURL: `${constants_1.DISCORD_API_URL}/v${requestOptions?.version ?? constants_1.DISCORD_API_DEFAULT_VERSION}`,
            headers: {
                Authorization: token,
                'User-Agent': `DiscordBot (${constants_1.PARACORD_URL}, ${constants_1.PARACORD_VERSION_NUMBER})`,
                'Content-Type': 'application/json',
                'X-RateLimit-Precision': 'millisecond',
                'Accept-Encoding': 'gzip,deflate',
            },
            ...(requestOptions ?? {}),
        });
        instance.interceptors.response.use((response) => response, (error) => ({
            status: 500, headers: {}, data: { message: error.message },
        }));
        return rateLimitCache.wrapRequest(instance.request);
    }
    static extractBucketHashKey(method, url) {
        const [topLevelResource, topLevelID, ...rateLimitMinorParameters] = (0, utils_1.stripLeadingSlash)(url).split('/');
        const key = [];
        if (method === 'GET')
            key.push('g');
        else if (method === 'PUT')
            key.push('u');
        else if (method === 'POST')
            key.push('o');
        else if (method === 'PATCH')
            key.push('a');
        else if (method === 'DELETE')
            key.push('d');
        for (const param of rateLimitMinorParameters) {
            switch (param) {
                case 'channels':
                    key.push('c');
                    break;
                case 'audit-log':
                    key.push('a');
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
                default:
                    key.push(param);
            }
        }
        return [topLevelResource, topLevelID, key.join('-')];
    }
    constructor(token, options = {}) {
        Api.validateParams(token);
        this.#rateLimitCache = new structures_1.RateLimitCache(true, options.requestOptions?.globalRateLimitMax ?? constants_1.API_GLOBAL_RATE_LIMIT, options.requestOptions?.globalRateLimitResetPadding ?? constants_1.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS, this);
        this.#requestQueue = new structures_1.RequestQueue(this);
        this.#requestQueueProcessInterval;
        const { emitter, events, requestOptions } = options;
        this.#requestOptions = requestOptions ?? {};
        this.#emitter = emitter;
        this.events = events;
        this.rpcRequestService;
        this.#rpcRateLimitService;
        this.#allowFallback = false;
        this.#connectingToRpcService = false;
        const botToken = (0, utils_1.coerceTokenToBotLike)(token);
        this.#makeRequest = Api.createWrappedRequestMethod(this.#rateLimitCache, botToken, requestOptions);
    }
    get hasRateLimitService() {
        return this.#rpcRateLimitService !== undefined;
    }
    get hasRequestService() {
        return this.rpcRequestService !== undefined;
    }
    log = (level, message, data) => {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.API,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    };
    emit = (type, data) => {
        if (this.#emitter !== undefined) {
            this.#emitter.emit(type, data);
        }
    };
    addRequestService = (serviceOptions = {}) => {
        if (this.hasRateLimitService
            || this.hasRequestService) {
            throw Error('An rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRequestService = new rpc_1.RequestService(serviceOptions);
        this.#allowFallback = this.rpcRequestService.allowFallback;
        if (this.#rpcServiceOptions === undefined) {
            {
                const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
                this.log('INFO', message);
            }
            if (!this.#allowFallback) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', message);
            }
        }
        this.#rpcServiceOptions = serviceOptions;
        return this.checkRpcServiceConnection(this.rpcRequestService);
    };
    addRateLimitService = (serviceOptions = {}) => {
        if (this.hasRateLimitService || this.hasRequestService) {
            throw Error('A rpc service has already been defined for this client. Only one may be added.');
        }
        this.#rpcRateLimitService = new rpc_1.RateLimitService(serviceOptions);
        this.#allowFallback = serviceOptions.allowFallback !== false;
        if (this.#rpcServiceOptions === undefined) {
            {
                const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.#rpcRateLimitService.target}`;
                this.log('INFO', message);
            }
            if (!this.#allowFallback) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', message);
            }
        }
        this.#rpcServiceOptions = serviceOptions;
        return this.checkRpcServiceConnection(this.#rpcRateLimitService);
    };
    checkRpcServiceConnection = async (service) => {
        try {
            await service.hello();
            this.#connectingToRpcService = false;
            this.log('DEBUG', 'Successfully established connection to Rpc server.');
            return true;
        }
        catch (err) {
            if (!this.#connectingToRpcService) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION) {
                    this.#connectingToRpcService = true;
                    this.reattemptConnectInFuture(1);
                }
                else {
                    this.log('ERROR', 'Received unexpected error when connecting to Rpc service.', err);
                }
            }
        }
        return false;
    };
    async recreateRpcService() {
        if (this.hasRateLimitService) {
            this.#rpcRateLimitService = undefined;
            return this.addRateLimitService(this.#rpcServiceOptions);
        }
        this.rpcRequestService = undefined;
        return this.addRequestService(this.#rpcServiceOptions);
    }
    reattemptConnectInFuture(delay) {
        this.log('WARNING', `Failed to connect to Rpc server. Trying again in ${delay} seconds.`);
        setTimeout(async () => {
            const success = await this.recreateRpcService();
            if (!success) {
                const newDelay = delay + 1 < 10 ? delay + 1 : 10;
                this.reattemptConnectInFuture(newDelay);
            }
        }, delay * 1e3);
    }
    startQueue = (interval = 100) => {
        if (this.#requestQueueProcessInterval === undefined) {
            this.log('INFO', 'Starting request queue.');
            this.#requestQueueProcessInterval = this.#requestQueue.startQueue(interval);
        }
        else {
            throw Error('request queue already started');
        }
    };
    stopQueue = () => {
        if (this.#requestQueueProcessInterval !== undefined) {
            this.log('INFO', 'Stopping request queue.');
            clearInterval(this.#requestQueueProcessInterval);
            this.#requestQueueProcessInterval = undefined;
        }
    };
    request = async (method, url, options = this.#requestOptions) => {
        const { local = this.#requestOptions.local, validateStatus = this.#requestOptions.validateStatus } = options;
        const [topLevelResource, topLevelID, bucketHashKey] = Api.extractBucketHashKey(method, url);
        const bucketHash = this.#rateLimitCache.getBucket(bucketHashKey);
        const request = new structures_1.ApiRequest(method, url, topLevelResource, topLevelID, bucketHash, bucketHashKey, options);
        let response;
        if (this.rpcRequestService === undefined || local) {
            response = await this.handleRequestLocal(request);
        }
        else {
            response = await this.handleRequestRemote(this.rpcRequestService, request);
        }
        if (validateStatus && !validateStatus(response.status)) {
            throw createError(new Error(response.statusText), request.config, response.status, request, response);
        }
        return response;
    };
    async handleRequestLocal(request) {
        if (this.#requestQueueProcessInterval === undefined) {
            throw Error('Making a local request without starting the request queue. Call `startQueue()` on this client so that rate limits may be handled.');
        }
        const { response, ...rateLimitState } = await this.sendRequest(request);
        if (response !== undefined) {
            return this.handleResponse(request, response);
        }
        const customResponse = {
            status: 429,
            statusText: 'Too Many Requests',
            retry_after: rateLimitState.waitFor,
            data: { ...rateLimitState },
            headers: {
                _paracord: true,
                'x-ratelimit-global': rateLimitState.global ?? false,
            },
        };
        return customResponse;
    }
    async handleRequestRemote(rpcRequestService, request) {
        this.log('DEBUG', 'Sending request over Rpc to server.', request);
        if (this.#connectingToRpcService) {
            if (this.#allowFallback) {
                const message = 'Client is connecting to RPC server. Falling back to handling request locally.';
                this.log('WARNING', message);
                return this.handleRequestLocal(request);
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
                this.log('ERROR', message);
                return this.handleRequestLocal(request);
            }
            throw err;
        }
    }
    sendRequest = async (request, fromQueue) => {
        try {
            request.running = true;
            let rateLimitState;
            if (this.hasRateLimitService) {
                rateLimitState = await this.authorizeRequestWithServer(request);
            }
            if (rateLimitState === undefined) {
                rateLimitState = this.#rateLimitCache.isRateLimited(request);
            }
            const { waitFor, global } = rateLimitState;
            if (waitFor === 0) {
                const message = 'Sending request.';
                this.log('DEBUG', message, request);
                return { response: await this.#makeRequest(request), waitFor: 0 };
            }
            request.running = false;
            if (!Api.shouldQueueRequest(request, global ?? false)) {
                return rateLimitState;
            }
            request.assignIfStricterWait(new Date().getTime() + waitFor);
            if (!fromQueue) {
                const message = 'Enqueuing request.';
                this.log('DEBUG', message, request);
                return { response: await this.enqueueRequest(request), waitFor: 0 };
            }
            const message = 'Requeuing request.';
            this.log('DEBUG', message, request);
            return { waitFor: -1 };
        }
        finally {
            request.running = false;
        }
    };
    async authorizeRequestWithServer(request) {
        if (this.#connectingToRpcService) {
            if (this.#allowFallback) {
                const message = 'Client is connecting to RPC server. Fallback is allowed. Allowing request to be made.';
                this.log('WARNING', message);
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
                this.recreateRpcService();
                const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
                this.log('ERROR', message);
                return undefined;
            }
            throw err;
        }
    }
    async handleResponse(request, response) {
        this.log('DEBUG', 'Response received.', { request, response });
        const rateLimitHeaders = structures_1.RateLimitHeaders.extractRateLimitFromHeaders(response.headers, isRateLimitResponse(response) ? response.data.retry_after : undefined);
        const allowQueue = Api.shouldQueueRequest(request, rateLimitHeaders.global ?? false);
        if (isRateLimitResponse(response) && allowQueue) {
            if (this.#requestQueueProcessInterval === undefined) {
                throw Error('Request rate limited without the queue running. Call `startQueue()` on this client so that rate limited requests may be handled.');
            }
            return new Promise((resolve) => {
                this.handleRateLimitedRequest(request, rateLimitHeaders).then(async (res) => resolve(await this.handleResponse(request, res)));
            });
        }
        this.updateRateLimitCache(request, rateLimitHeaders);
        return response;
    }
    handleRateLimitedRequest(request, rateLimitHeaders) {
        let message;
        if (rateLimitHeaders.global) {
            message = `Request global rate limited: ${request.method} ${request.url}`;
        }
        else {
            message = `Request rate limited: ${request.method} ${request.url}`;
        }
        this.log('DEBUG', message, rateLimitHeaders);
        this.updateRateLimitCache(request, rateLimitHeaders);
        const { resetAfter } = rateLimitHeaders;
        const { waitUntil } = request;
        if (waitUntil === undefined && resetAfter !== undefined) {
            request.assignIfStricterWait(new Date().getTime() + resetAfter);
        }
        return this.enqueueRequest(request);
    }
    updateRateLimitCache(request, rateLimitHeaders) {
        const { bucketHash } = rateLimitHeaders;
        if (bucketHash) {
            const rateLimitKey = request.getRateLimitKey(bucketHash);
            const { bucketHashKey } = request;
            this.#rateLimitCache.update(rateLimitKey, bucketHashKey, rateLimitHeaders);
        }
        this.updateRpcCache(request, rateLimitHeaders);
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
    enqueueRequest(request) {
        this.#requestQueue.push(request);
        request.response = undefined;
        function checkRequest(resolve) {
            const { response } = request;
            if (response !== undefined) {
                resolve(response);
            }
            else {
                setTimeout(() => checkRequest(resolve));
            }
        }
        return new Promise(checkRequest);
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
