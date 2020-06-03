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
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../../constants");
const services_1 = require("../../rpc/services");
const utils_1 = require("../../utils");
const structures_1 = require("./structures");
class Api {
    constructor(token, options = {}) {
        Api.validateParams(token);
        this.rateLimitCache = new structures_1.RateLimitCache();
        this.requestQueue = new structures_1.RequestQueue(this.rateLimitCache, this);
        this.requestQueueProcessInterval;
        const { emitter, events, requestOptions } = options;
        this.emitter = emitter;
        this.events = events;
        this.rpcRequestService;
        this.rpcRateLimitService;
        this.allowFallback = false;
        const botToken = utils_1.coerceTokenToBotLike(token);
        this.wrappedAxiosInstance = Api.createWrappedAxiosInstance(this.rateLimitCache, botToken, requestOptions);
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
        return rateLimitCache.wrapRequest(instance.request);
    }
    get hasRateLimitService() {
        return this.rpcRateLimitService !== undefined;
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
        if (this.emitter !== undefined) {
            this.emitter.emit(type, data);
        }
    }
    addRequestService(serviceOptions = {}) {
        if (this.hasRateLimitService
            || this.hasRequestService) {
            throw Error('An rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRequestService = new services_1.RequestService(serviceOptions);
        this.allowFallback = this.rpcRequestService.allowFallback;
        if (this.rpcServiceOptions === undefined) {
            {
                const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
                this.log('INFO', message);
            }
            if (!this.allowFallback) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', message);
            }
        }
        this.rpcServiceOptions = serviceOptions;
    }
    addRateLimitService(serviceOptions = {}) {
        if (this.hasRateLimitService
            || this.hasRequestService) {
            throw Error('A rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRateLimitService = new services_1.RateLimitService(serviceOptions);
        this.allowFallback = serviceOptions.allowFallback !== false;
        if (this.rpcServiceOptions === undefined) {
            {
                const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.rpcRateLimitService.target}`;
                this.log('INFO', message);
            }
            if (!this.allowFallback) {
                const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
                this.log('WARNING', message);
            }
        }
        this.rpcServiceOptions = serviceOptions;
    }
    recreateRpcService() {
        if (this.hasRateLimitService) {
            this.rpcRateLimitService = undefined;
            this.addRateLimitService(this.rpcServiceOptions);
        }
        else {
            this.rpcRequestService = undefined;
            this.addRequestService(this.rpcServiceOptions);
        }
    }
    startQueue(interval = 100) {
        if (this.requestQueueProcessInterval === undefined) {
            this.log('INFO', 'Starting request queue.');
            this.requestQueueProcessInterval = this.requestQueue.startQueue(interval);
        }
        else {
            throw Error('request queue already started');
        }
    }
    stopQueue() {
        if (this.requestQueueProcessInterval !== undefined) {
            this.log('INFO', 'Stopping request queue.');
            clearInterval(this.requestQueueProcessInterval);
            this.requestQueueProcessInterval = undefined;
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
            if (this.requestQueueProcessInterval === undefined) {
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
                    headers: { _paracord: true },
                    'x-ratelimit-global': (_a = rateLimitState.global) !== null && _a !== void 0 ? _a : false,
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
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && this.allowFallback) {
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
                    rateLimitState = this.rateLimitCache.returnIsRateLimited(request);
                }
                const { resetAfter, global } = rateLimitState;
                if (resetAfter === 0) {
                    const message = `Sending request: ${request.method} ${request.url}`;
                    this.log('DEBUG', message, request);
                    return { response: yield this.wrappedAxiosInstance(request), resetAfter: 0 };
                }
                if (!Api.shouldQueueRequest(request, global !== null && global !== void 0 ? global : false)) {
                    return rateLimitState;
                }
                const { waitUntil } = request;
                if (waitUntil === undefined) {
                    request.assignIfStricterWait(new Date().getTime() + resetAfter);
                }
                console.log('waitUntil', request.waitUntil);
                console.log('resetAfter', resetAfter);
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
                const authorizationMessage = yield this.rpcRateLimitService.authorize(request);
                const { resetAfter, global } = authorizationMessage;
                if (resetAfter === 0) {
                    return { resetAfter };
                }
                return { resetAfter, global };
            }
            catch (err) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && this.allowFallback) {
                    this.recreateRpcService();
                    const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
                    this.log('ERROR', message);
                    return { resetAfter: 0 };
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
                if (this.requestQueueProcessInterval === undefined) {
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
        console.log('RateLimitHeaders', rateLimitHeaders);
        this.updateRateLimitCache(request, rateLimitHeaders);
        const { resetAfter } = rateLimitHeaders;
        const { waitUntil } = request;
        if (waitUntil === undefined && resetAfter !== undefined) {
            request.assignIfStricterWait(new Date().getTime() + resetAfter);
        }
        return this.enqueueRequest(request);
    }
    updateRateLimitCache(request, rateLimitHeaders) {
        this.rateLimitCache.update(request, rateLimitHeaders);
        this.updateRpcCache(request, rateLimitHeaders);
    }
    updateRpcCache(request, rateLimitHeaders) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.rpcRateLimitService !== undefined) {
                try {
                    const [global, bucket, limit, remaining, resetAfter] = rateLimitHeaders.rpcArgs;
                    yield this.rpcRateLimitService.update(request, global, bucket, limit, remaining, resetAfter);
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
        this.requestQueue.push(request);
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
