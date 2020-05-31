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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const Utils_1 = require("../../Utils");
const services_1 = require("../../rpc/services");
const structures_1 = require("./structures");
const constants_1 = require("../../constants");
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
        const botToken = Utils_1.coerceTokenToBotLike(token);
        this.wrappedRequest = this.createWrappedRequest(botToken, requestOptions);
    }
    static validateParams(token) {
        if (token === undefined) {
            throw Error('client requires a bot token');
        }
    }
    createWrappedRequest(token, requestOptions) {
        const instance = axios_1.default.create(Object.assign({ baseURL: `${constants_1.DISCORD_API_URL}/${constants_1.DISCORD_API_DEFAULT_VERSION}`, headers: {
                Authorization: token,
                'Content-Type': 'application/json',
                'X-RateLimit-Precision': 'millisecond',
            } }, (requestOptions || {})));
        return this.rateLimitCache.wrapRequest(instance.request);
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
    addRequestService(serverOptions = {}) {
        if (this.rpcRateLimitService !== undefined
            || this.rpcRequestService !== undefined) {
            throw Error('A rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRequestService = new services_1.RequestService(serverOptions || {});
        this.allowFallback = serverOptions.allowFallback !== false;
        {
            const message = `Rpc service created for sending requests remotely. Connected to: ${this.rpcRequestService.target}`;
            this.log('INFO', message);
        }
        if (!this.allowFallback) {
            const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
            this.log('WARNING', message);
        }
    }
    addRateLimitService(serverOptions = {}) {
        if (this.rpcRateLimitService !== undefined
            || this.rpcRequestService !== undefined) {
            throw Error('A rpc service has already been defined for this client. Only one may be added.');
        }
        this.rpcRateLimitService = new services_1.RateLimitService(serverOptions || {});
        this.allowFallback = serverOptions.allowFallback !== false;
        {
            const message = `Rpc service created for handling rate limits remotely. Connected to: ${this.rpcRateLimitService.target}`;
            this.log('INFO', message);
        }
        if (!this.allowFallback) {
            const message = '`allowFallback` option is not true. Requests will fail when unable to connect to the Rpc server.';
            this.log('WARNING', message);
        }
    }
    startQueue(interval = 100) {
        if (this.requestQueueProcessInterval === undefined) {
            this.log('INFO', 'Starting request queue.');
            this.requestQueueProcessInterval = setInterval(this.requestQueue.process.bind(this.requestQueue), interval);
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
    sendQueuedRequest(request) {
        const message = `Sending queued request: ${request.method} ${request.url}`;
        this.log('DEBUG', message, request);
        return this.wrappedRequest(request);
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
                if (err.code === 14 && this.allowFallback) {
                    const message = 'Could not reach RPC server. Falling back to handling request locally.';
                    this.log('ERROR', message);
                    return this.handleRequestLocal(request);
                }
                throw err;
            }
        });
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
                response.data = Utils_1.objectKeysSnakeToCamel(response.data);
            return response;
        });
    }
    handleRequestLocal(request) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.requestQueueProcessInterval === undefined) {
                const message = 'Making a request with a local Api client without a running request queue. Please invoke `startQueue()` on this client so that rate limits may be handled.';
                this.log('WARNING', message);
            }
            let response = yield this.sendRequest(request);
            let rateLimitHeaders = structures_1.RateLimitHeaders.extractRateLimitFromHeaders(response.headers);
            while (response.status === 429 && request.allowQueue) {
                rateLimitHeaders = structures_1.RateLimitHeaders.extractRateLimitFromHeaders(response.headers);
                if (this.requestQueueProcessInterval === undefined) {
                    const message = 'A request has been rate limited and will not be processed. Please invoke `startQueue()` on this client so that rate limits may be handled.';
                    this.log('WARNING', message);
                }
                response = yield this.handleRateLimitedRequest(request, rateLimitHeaders);
            }
            if (rateLimitHeaders !== undefined) {
                this.updateRateLimitCache(request, rateLimitHeaders);
            }
            return response;
        });
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
                    if (err.code !== 14) {
                        throw err;
                    }
                }
            }
        });
    }
    sendRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            let isRateLimited;
            if (this.rpcRateLimitService !== undefined) {
                isRateLimited = !(yield this.authorizeRequestWithServer(request));
            }
            else {
                isRateLimited = this.rateLimitCache.returnIsRateLimited(request);
            }
            if (!isRateLimited) {
                const message = `Sending request: ${request.method} ${request.url}`;
                this.log('DEBUG', message, request);
                return this.wrappedRequest(request);
            }
            const message = `Enqueuing request: ${request.method} ${request.url}`;
            this.log('DEBUG', message, request);
            return this.enqueueRequest(request);
        });
    }
    returnOkToMakeRequest(request) {
        if (this.rpcRateLimitService !== undefined) {
            return this.authorizeRequestWithServer(request);
        }
        return !this.rateLimitCache.returnIsRateLimited(request);
    }
    authorizeRequestWithServer(request) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.rpcRateLimitService !== undefined) {
                try {
                    const { resetAfter } = yield this.rpcRateLimitService.authorize(request);
                    if (resetAfter === 0) {
                        return true;
                    }
                    if (request.waitUntil === undefined
                        || request.waitUntil < new Date().getTime()) {
                        const waitUntil = new Date().getTime() + resetAfter;
                        request.assignIfStricterWait(waitUntil);
                    }
                    return false;
                }
                catch (err) {
                    if (err.code === 14 && this.allowFallback) {
                        const message = 'Could not reach RPC server. Fallback is allowed. Allowing request to be made.';
                        this.log('ERROR', message);
                        return true;
                    }
                    throw err;
                }
            }
            return false;
        });
    }
    handleRateLimitedRequest(request, rateLimitHeaders) {
        let message;
        if (rateLimitHeaders === undefined || rateLimitHeaders.global) {
            message = `ApiRequest global rate limited: ${request.method} ${request.url}`;
        }
        else {
            message = `ApiRequest rate limited: ${request.method} ${request.url}`;
        }
        this.log('DEBUG', message, rateLimitHeaders);
        if (rateLimitHeaders !== undefined) {
            this.updateRateLimitCache(request, rateLimitHeaders);
        }
        return this.enqueueRequest(request);
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
