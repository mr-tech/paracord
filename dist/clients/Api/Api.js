"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _rateLimitCache, _requestQueue, _requestQueueProcessInterval, _rpcRateLimitService, _allowFallback, _emitter, _wrappedAxiosInstance, _rpcServiceOptions;
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../../constants");
const services_1 = require("../../rpc/services");
const utils_1 = require("../../utils");
const structures_1 = require("./structures");
class Api {
    constructor(token, options = {}) {
        _rateLimitCache.set(this, void 0);
        _requestQueue.set(this, void 0);
        _requestQueueProcessInterval.set(this, void 0);
        _rpcRateLimitService.set(this, void 0);
        _allowFallback.set(this, void 0);
        _emitter.set(this, void 0);
        _wrappedAxiosInstance.set(this, void 0);
        _rpcServiceOptions.set(this, void 0);
        Api.validateParams(token);
        __classPrivateFieldSet(this, _rateLimitCache, new structures_1.RateLimitCache());
        __classPrivateFieldSet(this, _requestQueue, new structures_1.RequestQueue(this));
        __classPrivateFieldGet(this, _requestQueueProcessInterval);
        const { emitter, events, requestOptions } = options;
        __classPrivateFieldSet(this, _emitter, emitter);
        this.events = events;
        this.rpcRequestService;
        __classPrivateFieldGet(this, _rpcRateLimitService);
        __classPrivateFieldSet(this, _allowFallback, false);
        const botToken = utils_1.coerceTokenToBotLike(token);
        __classPrivateFieldSet(this, _wrappedAxiosInstance, Api.createWrappedAxiosInstance(__classPrivateFieldGet(this, _rateLimitCache), botToken, requestOptions));
    }
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
    static createWrappedAxiosInstance(rateLimitCache, token, requestOptions) {
        const instance = axios_1.default.create(Object.assign({ baseURL: `${constants_1.DISCORD_API_URL}/${constants_1.DISCORD_API_DEFAULT_VERSION}`, headers: {
                Authorization: token,
                'Content-Type': 'application/json',
                'X-RateLimit-Precision': 'millisecond',
                'Accept-Encoding': 'gzip,deflate',
            } }, (requestOptions !== null && requestOptions !== void 0 ? requestOptions : {})));
        instance.interceptors.response.use((response) => response, (error) => ({
            status: 500, message: error.message, headers: {}, data: {},
        }));
        return rateLimitCache.wrapRequest(instance.request);
    }
    get hasRateLimitService() {
        return __classPrivateFieldGet(this, _rpcRateLimitService) !== undefined;
    }
    get hasRequestService() {
        return this.rpcRequestService !== undefined;
    }
    log(level, message, data) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.API,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    }
    emit(type, data) {
        if (__classPrivateFieldGet(this, _emitter) !== undefined) {
            __classPrivateFieldGet(this, _emitter).emit(type, data);
        }
    }
    addRequestService(serviceOptions = {}) {
        if (this.hasRateLimitService
            || this.hasRequestService) {
            throw Error('An rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRequestService = new services_1.RequestService(serviceOptions);
        __classPrivateFieldSet(this, _allowFallback, this.rpcRequestService.allowFallback);
        if (__classPrivateFieldGet(this, _rpcServiceOptions) === undefined) {
            {
                const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
                this.log('INFO', message);
            }
            if (!__classPrivateFieldGet(this, _allowFallback)) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', message);
            }
        }
        __classPrivateFieldSet(this, _rpcServiceOptions, serviceOptions);
    }
    addRateLimitService(serviceOptions = {}) {
        if (this.hasRateLimitService
            || this.hasRequestService) {
            throw Error('A rpc service has already been defined for this client. Only one may be added.');
        }
        __classPrivateFieldSet(this, _rpcRateLimitService, new services_1.RateLimitService(serviceOptions));
        __classPrivateFieldSet(this, _allowFallback, serviceOptions.allowFallback !== false);
        if (__classPrivateFieldGet(this, _rpcServiceOptions) === undefined) {
            {
                const message = `Rpc service created for handling rate limits remotely. Connected to: ${__classPrivateFieldGet(this, _rpcRateLimitService).target}`;
                this.log('INFO', message);
            }
            if (!__classPrivateFieldGet(this, _allowFallback)) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', message);
            }
        }
        __classPrivateFieldSet(this, _rpcServiceOptions, serviceOptions);
    }
    recreateRpcService() {
        if (this.hasRateLimitService) {
            __classPrivateFieldSet(this, _rpcRateLimitService, undefined);
            this.addRateLimitService(__classPrivateFieldGet(this, _rpcServiceOptions));
        }
        else {
            this.rpcRequestService = undefined;
            this.addRequestService(__classPrivateFieldGet(this, _rpcServiceOptions));
        }
    }
    startQueue(interval = 100) {
        if (__classPrivateFieldGet(this, _requestQueueProcessInterval) === undefined) {
            this.log('INFO', 'Starting request queue.');
            __classPrivateFieldSet(this, _requestQueueProcessInterval, __classPrivateFieldGet(this, _requestQueue).startQueue(interval));
        }
        else {
            throw Error('request queue already started');
        }
    }
    stopQueue() {
        if (__classPrivateFieldGet(this, _requestQueueProcessInterval) !== undefined) {
            this.log('INFO', 'Stopping request queue.');
            clearInterval(__classPrivateFieldGet(this, _requestQueueProcessInterval));
            __classPrivateFieldSet(this, _requestQueueProcessInterval, undefined);
        }
    }
    request(method, url, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { local, keepCase } = options;
            if (url.startsWith('/')) {
                url = url.slice(1);
            }
            const request = new structures_1.ApiRequest(method.toUpperCase(), url, options);
            let response;
            if (this.rpcRequestService === undefined || local) {
                response = yield this.handleRequestLocal(request);
            }
            else {
                response = yield this.handleRequestRemote(this.rpcRequestService, request);
            }
            if (!keepCase)
                response.data = utils_1.objectKeysSnakeToCamel(response.data);
            return response;
        });
    }
    handleRequestLocal(request) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _requestQueueProcessInterval) === undefined) {
                const message = 'Making a request with a local Api client without a running request queue. Please invoke `startQueue()` on this client so that rate limits may be handled.';
                this.log('WARNING', message);
            }
            let _b = yield this.sendRequest(request), { response } = _b, rateLimitState = __rest(_b, ["response"]);
            if (response !== undefined) {
                response = yield this.handleResponse(request, response);
            }
            if (response === undefined) {
                const customResponse = {
                    status: 429,
                    statusText: 'Too Many Requests',
                    'retry-after': rateLimitState.resetAfter,
                    data: Object.assign({}, rateLimitState),
                    headers: {
                        _paracord: true,
                        'x-ratelimit-global': (_a = rateLimitState.global) !== null && _a !== void 0 ? _a : false,
                    },
                };
                return customResponse;
            }
            return response;
        });
    }
    handleRequestRemote(rpcRequestService, request) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit('DEBUG', {
                source: constants_1.LOG_SOURCES.API,
                level: constants_1.LOG_LEVELS.DEBUG,
                message: 'Sending request over Rpc to server.',
            });
            try {
                return yield rpcRequestService.request(request);
            }
            catch (err) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && __classPrivateFieldGet(this, _allowFallback)) {
                    this.recreateRpcService();
                    const message = 'Could not reach RPC server. Falling back to handling request locally.';
                    this.log('ERROR', message);
                    return this.handleRequestLocal(request);
                }
                throw err;
            }
        });
    }
    sendRequest(request, fromQueue) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                request.running = true;
                let rateLimitState;
                if (this.hasRateLimitService) {
                    rateLimitState = yield this.authorizeRequestWithServer(request);
                }
                if (rateLimitState === undefined) {
                    rateLimitState = __classPrivateFieldGet(this, _rateLimitCache).returnIsRateLimited(request);
                }
                const { resetAfter, global } = rateLimitState;
                if (resetAfter === 0) {
                    const message = `Sending request: ${request.method} ${request.url}`;
                    this.log('DEBUG', message, request);
                    return { response: yield __classPrivateFieldGet(this, _wrappedAxiosInstance).call(this, request), resetAfter: 0 };
                }
                request.running = false;
                if (!Api.shouldQueueRequest(request, global !== null && global !== void 0 ? global : false)) {
                    return rateLimitState;
                }
                request.assignIfStricterWait(new Date().getTime() + resetAfter);
                if (!fromQueue) {
                    const message = `Enqueuing request: ${request.method} ${request.url}`;
                    this.log('DEBUG', message, request);
                    return { response: yield this.enqueueRequest(request), resetAfter: 0 };
                }
                const message = `Requeuing request: ${request.method} ${request.url}`;
                this.log('DEBUG', message, request);
                return { resetAfter: -1 };
            }
            finally {
                request.running = false;
            }
        });
    }
    authorizeRequestWithServer(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const authorizationMessage = yield __classPrivateFieldGet(this, _rpcRateLimitService).authorize(request);
                const { resetAfter, global } = authorizationMessage;
                if (resetAfter === 0) {
                    return { resetAfter };
                }
                return { resetAfter, global };
            }
            catch (err) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && __classPrivateFieldGet(this, _allowFallback)) {
                    this.recreateRpcService();
                    const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
                    this.log('ERROR', message);
                    return undefined;
                }
                throw err;
            }
        });
    }
    handleResponse(request, response) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let rateLimitHeaders = structures_1.RateLimitHeaders.extractRateLimitFromHeaders(response.headers);
            let allowQueue = Api.shouldQueueRequest(request, (_a = rateLimitHeaders.global) !== null && _a !== void 0 ? _a : false);
            while (response.status === 429 && allowQueue) {
                if (__classPrivateFieldGet(this, _requestQueueProcessInterval) === undefined) {
                    const message = 'A request has been rate limited, queued, and will not be processed. Please invoke `startQueue()` on this client so that rate limited requests may be handled.';
                    this.log('WARNING', message);
                }
                response = yield this.handleRateLimitedRequest(request, rateLimitHeaders);
                rateLimitHeaders = structures_1.RateLimitHeaders.extractRateLimitFromHeaders(response.headers);
                allowQueue = Api.shouldQueueRequest(request, (_b = rateLimitHeaders.global) !== null && _b !== void 0 ? _b : false);
            }
            this.updateRateLimitCache(request, rateLimitHeaders);
            return response;
        });
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
        __classPrivateFieldGet(this, _rateLimitCache).update(request, rateLimitHeaders);
        this.updateRpcCache(request, rateLimitHeaders);
    }
    updateRpcCache(request, rateLimitHeaders) {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _rpcRateLimitService) !== undefined) {
                try {
                    const [global, bucket, limit, remaining, resetAfter] = rateLimitHeaders.rpcArgs;
                    yield __classPrivateFieldGet(this, _rpcRateLimitService).update(request, global, bucket, limit, remaining, resetAfter);
                }
                catch (err) {
                    if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION) {
                        this.recreateRpcService();
                    }
                    else {
                        throw err;
                    }
                }
            }
        });
    }
    enqueueRequest(request) {
        __classPrivateFieldGet(this, _requestQueue).push(request);
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
_rateLimitCache = new WeakMap(), _requestQueue = new WeakMap(), _requestQueueProcessInterval = new WeakMap(), _rpcRateLimitService = new WeakMap(), _allowFallback = new WeakMap(), _emitter = new WeakMap(), _wrappedAxiosInstance = new WeakMap(), _rpcServiceOptions = new WeakMap();
