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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _loggingIn, _api, _mainIdentifyLock, _identifyLocks, _ws, _wsUrl, _wsUrlRetryWait, _wsRateLimitCache, _sequence, _sessionId, _heartbeatAck, _lastHeartbeatTimestamp, _nextHeartbeatTimestamp, _heartbeatTimeout, _heartbeatIntervalTime, _emitter, _events, _identity, _mainRpcServiceOptions, _rpcServiceOptions;
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const constants_1 = require("../../constants");
const services_1 = require("../../rpc/services");
const utils_1 = require("../../utils");
const Api_1 = __importDefault(require("../Api/Api"));
const Identify_1 = __importDefault(require("./structures/Identify"));
class Gateway {
    constructor(token, options) {
        _loggingIn.set(this, void 0);
        _api.set(this, void 0);
        _mainIdentifyLock.set(this, void 0);
        _identifyLocks.set(this, []);
        _ws.set(this, void 0);
        _wsUrl.set(this, void 0);
        _wsUrlRetryWait.set(this, void 0);
        _wsRateLimitCache.set(this, void 0);
        _sequence.set(this, void 0);
        _sessionId.set(this, void 0);
        _heartbeatAck.set(this, void 0);
        _lastHeartbeatTimestamp.set(this, void 0);
        _nextHeartbeatTimestamp.set(this, void 0);
        _heartbeatTimeout.set(this, void 0);
        _heartbeatIntervalTime.set(this, void 0);
        _emitter.set(this, void 0);
        _events.set(this, void 0);
        _identity.set(this, void 0);
        _mainRpcServiceOptions.set(this, void 0);
        _rpcServiceOptions.set(this, void 0);
        const { emitter, identity, identity: { shard }, api, wsUrl, events, } = options;
        if (shard !== undefined && (shard[0] === undefined || shard[1] === undefined)) {
            throw Error(`Invalid shard provided to gateway. shard id: ${shard[0]} | shard count: ${shard[1]}`);
        }
        __classPrivateFieldSet(this, _heartbeatAck, false);
        this.online = false;
        __classPrivateFieldSet(this, _loggingIn, false);
        __classPrivateFieldSet(this, _wsRateLimitCache, {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        });
        __classPrivateFieldSet(this, _emitter, emitter !== null && emitter !== void 0 ? emitter : new events_1.EventEmitter());
        __classPrivateFieldSet(this, _identity, new Identify_1.default(utils_1.coerceTokenToBotLike(token), identity));
        __classPrivateFieldSet(this, _api, api);
        __classPrivateFieldSet(this, _wsUrl, wsUrl);
        __classPrivateFieldSet(this, _rpcServiceOptions, []);
        __classPrivateFieldSet(this, _events, events);
        __classPrivateFieldSet(this, _wsUrlRetryWait, constants_1.DEFAULT_GATEWAY_BOT_WAIT);
        this.bindTimerFunctions();
    }
    static validateLockOptions(options) {
        const { duration } = options;
        if (duration !== undefined && typeof duration !== 'number' && duration <= 0) {
            throw Error('Lock duration must be a number larger than 0.');
        }
    }
    get resumable() {
        return __classPrivateFieldGet(this, _sessionId) !== undefined && __classPrivateFieldGet(this, _sequence) !== null;
    }
    get shard() {
        return __classPrivateFieldGet(this, _identity).shard !== undefined ? __classPrivateFieldGet(this, _identity).shard : undefined;
    }
    get id() {
        return __classPrivateFieldGet(this, _identity).shard !== undefined ? __classPrivateFieldGet(this, _identity).shard[0] : 0;
    }
    get connected() {
        return __classPrivateFieldGet(this, _ws) !== undefined;
    }
    bindTimerFunctions() {
        this.login = this.login.bind(this);
        this.heartbeat = this.heartbeat.bind(this);
        this.checkLocksPromise = this.checkLocksPromise.bind(this);
    }
    log(level, message, data = {}) {
        data.shard = this.id;
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.GATEWAY,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    }
    emit(type, data) {
        if (__classPrivateFieldGet(this, _emitter) !== undefined) {
            if (__classPrivateFieldGet(this, _events) !== undefined) {
                const userType = __classPrivateFieldGet(this, _events)[type];
                type = userType !== null && userType !== void 0 ? userType : type;
            }
            __classPrivateFieldGet(this, _emitter).emit(type, data, this.id);
        }
    }
    addIdentifyLockServices(mainServiceOptions, ...serviceOptions) {
        const usedHostPorts = {};
        if (mainServiceOptions !== null) {
            let { port } = mainServiceOptions;
            if (typeof port === 'string') {
                port = Number(port);
            }
            const { host } = mainServiceOptions;
            usedHostPorts[host !== null && host !== void 0 ? host : '127.0.0.1'] = port !== null && port !== void 0 ? port : 50051;
            __classPrivateFieldSet(this, _mainIdentifyLock, this.configureLockService(mainServiceOptions));
        }
        if (serviceOptions.length) {
            __classPrivateFieldSet(this, _rpcServiceOptions, serviceOptions);
            serviceOptions.forEach((options) => {
                const { host } = options;
                let { port } = options;
                if (typeof port === 'string') {
                    port = Number(port);
                }
                if (usedHostPorts[host !== null && host !== void 0 ? host : '127.0.0.1'] === port) {
                    throw Error('Multiple locks specified for the same host:port.');
                }
                usedHostPorts[host !== null && host !== void 0 ? host : '127.0.0.1'] = port !== null && port !== void 0 ? port : 50051;
                __classPrivateFieldGet(this, _identifyLocks).push(this.configureLockService(options));
            });
        }
        __classPrivateFieldSet(this, _mainRpcServiceOptions, mainServiceOptions);
    }
    configureLockService(serviceOptions) {
        Gateway.validateLockOptions(serviceOptions);
        const identifyLock = new services_1.IdentifyLockService(serviceOptions);
        if (__classPrivateFieldGet(this, _mainRpcServiceOptions) === undefined) {
            const message = `Rpc service created for identify coordination. Connected to: ${identifyLock.target}. Default duration of lock: ${identifyLock.duration}`;
            this.log('INFO', message);
        }
        return identifyLock;
    }
    recreateRpcService() {
        if (__classPrivateFieldGet(this, _mainRpcServiceOptions) !== undefined && __classPrivateFieldGet(this, _rpcServiceOptions) !== undefined) {
            __classPrivateFieldSet(this, _mainIdentifyLock, undefined);
            __classPrivateFieldSet(this, _identifyLocks, []);
            this.addIdentifyLockServices(__classPrivateFieldGet(this, _mainRpcServiceOptions), ...__classPrivateFieldGet(this, _rpcServiceOptions));
        }
    }
    requestGuildMembers(guildId, options = {}) {
        const sendOptions = {
            limit: 0, query: '', presences: false, userIds: [],
        };
        return this.send(constants_1.GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, Object.assign({ guildId }, Object.assign(sendOptions, options)));
    }
    checkLocksPromise(resolve) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.acquireLocks()) {
                resolve();
            }
            else {
                setTimeout(() => this.checkLocksPromise(resolve), constants_1.SECOND_IN_MILLISECONDS);
            }
        });
    }
    loginWaitForLocks() {
        return new Promise(this.checkLocksPromise);
    }
    login(_websocket = ws_1.default) {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _ws) !== undefined) {
                throw Error('Client is already connected.');
            }
            if (__classPrivateFieldGet(this, _loggingIn)) {
                throw Error('Already logging in.');
            }
            try {
                __classPrivateFieldSet(this, _loggingIn, true);
                if (!this.resumable) {
                    yield this.loginWaitForLocks();
                }
                if (__classPrivateFieldGet(this, _wsUrl) === undefined) {
                    __classPrivateFieldSet(this, _wsUrl, yield this.getWebsocketUrl());
                }
                if (__classPrivateFieldGet(this, _wsUrl) !== undefined) {
                    this.log('DEBUG', `Connecting to url: ${__classPrivateFieldGet(this, _wsUrl)}`);
                    __classPrivateFieldSet(this, _ws, new _websocket(__classPrivateFieldGet(this, _wsUrl), { maxPayload: constants_1.GIGABYTE_IN_BYTES }));
                    this.assignWebsocketMethods(__classPrivateFieldGet(this, _ws));
                }
            }
            catch (err) {
                if (err.response) {
                    console.error(err.response.data.message);
                }
                else {
                    console.error(err);
                }
                if (__classPrivateFieldGet(this, _ws) !== undefined) {
                    __classPrivateFieldSet(this, _ws, undefined);
                }
            }
            finally {
                __classPrivateFieldSet(this, _loggingIn, false);
            }
        });
    }
    releaseIdentifyLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _identifyLocks).length) {
                __classPrivateFieldGet(this, _identifyLocks).forEach((l) => {
                    if (l.token !== undefined)
                        this.releaseIdentifyLock(l);
                });
            }
        });
    }
    getWebsocketUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _api) === undefined) {
                __classPrivateFieldSet(this, _api, new Api_1.default(__classPrivateFieldGet(this, _identity).token));
                __classPrivateFieldGet(this, _api).startQueue();
            }
            const { status, statusText, data } = yield __classPrivateFieldGet(this, _api).request('get', 'gateway/bot');
            if (status === 200) {
                this.lastKnownSessionLimitData = data.sessionStartLimit;
                const { total, remaining, resetAfter } = data.sessionStartLimit;
                const message = `Login limit: ${total}. Remaining: ${remaining}. Reset after ${resetAfter}ms (${new Date(new Date().getTime() + resetAfter)})`;
                this.log('INFO', message);
                return data.url + constants_1.GATEWAY_DEFAULT_WS_PARAMS;
            }
            this.handleBadStatus(status, statusText, data.message, data.code);
            return undefined;
        });
    }
    handleBadStatus(status, statusText, dataMessage, dataCode) {
        let message = `Failed to get websocket information from API. Status ${status}. Status text: ${statusText}. Discord code: ${dataCode}. Discord message: ${dataMessage}.`;
        if (status !== 401) {
            message += ` Trying again in ${__classPrivateFieldGet(this, _wsUrlRetryWait)} seconds.`;
            this.log('WARNING', message);
            setTimeout(this.login, __classPrivateFieldGet(this, _wsUrlRetryWait));
        }
        else {
            message += ' Please check your token.';
            throw Error(message);
        }
    }
    assignWebsocketMethods(websocket) {
        websocket.onopen = this._onopen.bind(this);
        websocket.onerror = this._onerror.bind(this);
        websocket.onclose = this._onclose.bind(this);
        websocket.onmessage = this._onmessage.bind(this);
    }
    handleEvent(type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _emitter).eventHandler !== undefined) {
                data = yield __classPrivateFieldGet(this, _emitter).eventHandler(type, data, this.id);
            }
            data && this.emit(type, data);
        });
    }
    _onopen() {
        this.log('DEBUG', 'Websocket open.');
        __classPrivateFieldGet(this, _wsRateLimitCache).remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
        this.handleEvent('GATEWAY_OPEN', this);
    }
    _onerror(err) {
        this.log('ERROR', `Websocket error. Message: ${err.message}`);
    }
    _onclose(event) {
        __classPrivateFieldSet(this, _ws, undefined);
        this.online = false;
        this.clearHeartbeat();
        const shouldReconnect = this.handleCloseCode(event.code);
        __classPrivateFieldSet(this, _wsRateLimitCache, {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        });
        this.handleEvent('GATEWAY_CLOSE', { shouldReconnect, gateway: this });
    }
    handleCloseCode(code) {
        const { CLEAN, GOING_AWAY, ABNORMAL_CLOSE, UNKNOWN_ERROR, UNKNOWN_OPCODE, DECODE_ERROR, NOT_AUTHENTICATED, AUTHENTICATION_FAILED, ALREADY_AUTHENTICATED, SESSION_NO_LONGER_VALID, INVALID_SEQ, RATE_LIMITED, SESSION_TIMEOUT, INVALID_SHARD, SHARDING_REQUIRED, INVALID_VERSION, INVALID_INTENT, DISALLOWED_INTENT, RECONNECT, SESSION_INVALIDATED, SESSION_INVALIDATED_RESUMABLE, HEARTBEAT_TIMEOUT, USER_TERMINATE_RESUMABLE, USER_TERMINATE_RECONNECT, USER_TERMINATE, UNKNOWN, } = constants_1.GATEWAY_CLOSE_CODES;
        let message;
        let shouldReconnect = true;
        let level = 'INFO';
        switch (code) {
            case CLEAN:
                message = 'Clean close. (Reconnecting.)';
                this.clearSession();
                break;
            case GOING_AWAY:
                message = 'The current endpoint is going away. (Reconnecting.)';
                break;
            case ABNORMAL_CLOSE:
                message = 'Abnormal close. (Reconnecting.)';
                break;
            case UNKNOWN_ERROR:
                level = 'WARNING';
                message = "Discord's not sure what went wrong. (Reconnecting.)";
                break;
            case UNKNOWN_OPCODE:
                level = 'WARNING';
                message = "Sent an invalid Gateway opcode or an invalid payload for an opcode. Don't do that! (Reconnecting.)";
                break;
            case DECODE_ERROR:
                level = 'ERROR';
                message = "Sent an invalid payload. Don't do that! (Reconnecting.)";
                break;
            case NOT_AUTHENTICATED:
                level = 'ERROR';
                message = 'Sent a payload prior to identifying. Please login first. (Reconnecting.)';
                break;
            case AUTHENTICATION_FAILED:
                level = 'FATAL';
                message = 'Account token sent with identify payload is incorrect. (Terminating login.)';
                shouldReconnect = false;
                break;
            case ALREADY_AUTHENTICATED:
                level = 'ERROR';
                message = 'Sent more than one identify payload. Stahp. (Terminating login.)';
                this.clearSession();
                break;
            case SESSION_NO_LONGER_VALID:
                message = 'Session is no longer valid. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case INVALID_SEQ:
                message = 'Sequence sent when resuming the session was invalid. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case RATE_LIMITED:
                level = 'ERROR';
                message = "Woah nelly! You're sending payloads too quickly. Slow it down! (Reconnecting.)";
                break;
            case SESSION_TIMEOUT:
                message = 'Session timed out. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case INVALID_SHARD:
                level = 'FATAL';
                message = 'Sent an invalid shard when identifying. (Terminating login.)';
                shouldReconnect = false;
                break;
            case SHARDING_REQUIRED:
                level = 'FATAL';
                message = 'Session would have handled too many guilds - client is required to shard connection in order to connect. (Terminating login.)';
                shouldReconnect = false;
                break;
            case INVALID_VERSION:
                message = 'You sent an invalid version for the gateway. (Terminating login.)';
                shouldReconnect = false;
                break;
            case INVALID_INTENT:
                message = 'You sent an invalid intent for a Gateway Intent. You may have incorrectly calculated the bitwise value. (Terminating login.)';
                shouldReconnect = false;
                break;
            case DISALLOWED_INTENT:
                message = 'You sent a disallowed intent for a Gateway Intent. You may have tried to specify an intent that you have not enabled or are not whitelisted for. (Terminating login.)';
                shouldReconnect = false;
                break;
            case HEARTBEAT_TIMEOUT:
                level = 'WARNING';
                message = 'Heartbeat Ack not received from Discord in time. (Reconnecting.)';
                break;
            case SESSION_INVALIDATED:
                message = 'Received an Invalid Session message and is not resumable. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case RECONNECT:
                message = 'Gateway has requested the client reconnect. (Reconnecting.)';
                break;
            case SESSION_INVALIDATED_RESUMABLE:
                message = 'Received an Invalid Session message and is resumable. (Reconnecting.)';
                break;
            case USER_TERMINATE_RESUMABLE:
                message = 'Connection terminated by you. (Reconnecting.)';
                break;
            case USER_TERMINATE_RECONNECT:
                message = 'Connection terminated by you. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case USER_TERMINATE:
                message = 'Connection terminated by you. (Terminating login.)';
                shouldReconnect = false;
                break;
            case UNKNOWN:
                level = 'ERROR';
                message = 'Something odd happened. Refer to other ERROR level logging events.';
                break;
            default:
                level = 'WARNING';
                message = 'Unknown close code. (Reconnecting.)';
        }
        this.log(level, `Websocket closed. Code: ${code}. Reason: ${message}`);
        return shouldReconnect;
    }
    clearSession() {
        __classPrivateFieldSet(this, _sessionId, undefined);
        __classPrivateFieldSet(this, _sequence, undefined);
        __classPrivateFieldSet(this, _wsUrl, undefined);
    }
    clearHeartbeat() {
        __classPrivateFieldGet(this, _heartbeatTimeout) && clearTimeout(__classPrivateFieldGet(this, _heartbeatTimeout));
        __classPrivateFieldSet(this, _heartbeatTimeout, undefined);
        __classPrivateFieldSet(this, _heartbeatIntervalTime, undefined);
        __classPrivateFieldSet(this, _heartbeatAck, false);
        __classPrivateFieldSet(this, _nextHeartbeatTimestamp, undefined);
    }
    _onmessage(m) {
        typeof m.data === 'string' && this.handleMessage(JSON.parse(m.data));
    }
    handleMessage(p) {
        var _a;
        const { t: type, s: sequence, op: opCode, d: data, } = p;
        const d = typeof data === 'object' && (data === null || data === void 0 ? void 0 : data.constructor.name) === 'Object' ? utils_1.objectKeysSnakeToCamel(data) : data;
        switch (opCode) {
            case constants_1.GATEWAY_OP_CODES.DISPATCH:
                if (type === 'READY') {
                    this.handleReady(d);
                }
                else if (type === 'RESUMED') {
                    this.handleResumed();
                }
                else if (type !== null) {
                    setImmediate(() => this.handleEvent(type, d));
                }
                else {
                    this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${d}`);
                }
                break;
            case constants_1.GATEWAY_OP_CODES.HELLO:
                this.handleHello(d);
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT_ACK:
                this.handleHeartbeatAck();
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT:
                this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, __classPrivateFieldGet(this, _sequence));
                break;
            case constants_1.GATEWAY_OP_CODES.INVALID_SESSION:
                this.handleInvalidSession(d);
                break;
            case constants_1.GATEWAY_OP_CODES.RECONNECT:
                (_a = __classPrivateFieldGet(this, _ws)) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.RECONNECT);
                break;
            default:
                this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${d}`);
        }
        this.updateSequence(sequence);
    }
    handleReady(data) {
        this.log('INFO', `Received Ready. Session ID: ${data.sessionId}.`);
        __classPrivateFieldSet(this, _sessionId, data.sessionId);
        this.online = true;
        this.handleEvent('READY', data);
    }
    handleResumed() {
        this.log('INFO', 'Replay finished. Resuming events.');
        this.online = true;
        this.handleEvent('RESUMED', null);
    }
    handleHello(data) {
        this.log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
        this.startHeartbeat(data.heartbeatInterval);
        this.connect(this.resumable);
        this.handleEvent('HELLO', data);
    }
    startHeartbeat(heartbeatInterval) {
        __classPrivateFieldSet(this, _heartbeatAck, true);
        __classPrivateFieldSet(this, _heartbeatIntervalTime, heartbeatInterval);
        const now = new Date().getTime();
        __classPrivateFieldSet(this, _nextHeartbeatTimestamp, now + __classPrivateFieldGet(this, _heartbeatIntervalTime));
        __classPrivateFieldSet(this, _heartbeatTimeout, setTimeout(this.heartbeat, __classPrivateFieldGet(this, _nextHeartbeatTimestamp) - now));
    }
    heartbeat() {
        var _a, _b;
        if (__classPrivateFieldGet(this, _heartbeatAck) === false) {
            this.log('ERROR', 'Heartbeat not acknowledged in time.');
            (_a = __classPrivateFieldGet(this, _ws)) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
        }
        else {
            __classPrivateFieldSet(this, _heartbeatAck, false);
            this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, __classPrivateFieldGet(this, _sequence));
            const now = new Date().getTime();
            __classPrivateFieldSet(this, _lastHeartbeatTimestamp, now);
            if (__classPrivateFieldGet(this, _heartbeatIntervalTime) !== undefined) {
                const message = __classPrivateFieldGet(this, _nextHeartbeatTimestamp) !== undefined
                    ? `Heartbeat sent ${now - __classPrivateFieldGet(this, _nextHeartbeatTimestamp)}ms after scheduled time.`
                    : 'nextHeartbeatTimestamp is undefined.';
                __classPrivateFieldSet(this, _nextHeartbeatTimestamp, now + __classPrivateFieldGet(this, _heartbeatIntervalTime));
                __classPrivateFieldSet(this, _heartbeatTimeout, setTimeout(this.heartbeat, __classPrivateFieldGet(this, _nextHeartbeatTimestamp) - now));
                this.log('DEBUG', message);
            }
            else {
                this.log('ERROR', 'heartbeatIntervalTime is undefined. Reconnecting.');
                (_b = __classPrivateFieldGet(this, _ws)) === null || _b === void 0 ? void 0 : _b.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
            }
        }
    }
    handleHeartbeatAck() {
        var _a;
        __classPrivateFieldSet(this, _heartbeatAck, true);
        this.handleEvent('HEARTBEAT_ACK', null);
        if (__classPrivateFieldGet(this, _lastHeartbeatTimestamp) !== undefined) {
            const message = `Heartbeat acknowledged. Latency: ${new Date().getTime()
                - __classPrivateFieldGet(this, _lastHeartbeatTimestamp)}ms`;
            this.log('DEBUG', message);
        }
        else {
            this.log('ERROR', 'heartbeatIntervalTime is undefined. Reconnecting.');
            (_a = __classPrivateFieldGet(this, _ws)) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    connect(resume) {
        return __awaiter(this, void 0, void 0, function* () {
            if (resume) {
                this.resume();
            }
            else {
                this.identify();
            }
        });
    }
    resume() {
        var _a;
        const message = `Attempting to resume connection. Session Id: ${__classPrivateFieldGet(this, _sessionId)}. Sequence: ${__classPrivateFieldGet(this, _sequence)}`;
        this.log('INFO', message);
        const { token } = __classPrivateFieldGet(this, _identity);
        const sequence = __classPrivateFieldGet(this, _sequence);
        const sessionId = __classPrivateFieldGet(this, _sessionId);
        if (sessionId !== undefined && sequence !== undefined) {
            const payload = {
                token,
                sessionId,
                seq: sequence,
            };
            this.handleEvent('GATEWAY_RESUME', payload);
            this.send(constants_1.GATEWAY_OP_CODES.RESUME, payload);
        }
        else {
            this.log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionI d: ${sessionId}, sequence: ${sequence}`);
            (_a = __classPrivateFieldGet(this, _ws)) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    identify() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const [shardId, shardCount] = (_a = this.shard) !== null && _a !== void 0 ? _a : [0, 1];
            this.log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
            yield this.handleEvent('GATEWAY_IDENTIFY', this);
            this.send(constants_1.GATEWAY_OP_CODES.IDENTIFY, __classPrivateFieldGet(this, _identity));
        });
    }
    acquireLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _identifyLocks) !== undefined) {
                const acquiredLocks = yield this.acquireIdentifyLocks();
                if (!acquiredLocks) {
                    return false;
                }
            }
            if (__classPrivateFieldGet(this, _mainIdentifyLock) !== undefined) {
                const acquiredLock = yield this.acquireIdentifyLock(__classPrivateFieldGet(this, _mainIdentifyLock));
                if (!acquiredLock) {
                    if (__classPrivateFieldGet(this, _identifyLocks) !== undefined) {
                        __classPrivateFieldGet(this, _identifyLocks).forEach(this.releaseIdentifyLock);
                    }
                    return false;
                }
            }
            return true;
        });
    }
    acquireIdentifyLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _identifyLocks) !== undefined) {
                const acquiredLocks = [];
                for (let i = 0; i < __classPrivateFieldGet(this, _identifyLocks).length; ++i) {
                    const lock = __classPrivateFieldGet(this, _identifyLocks)[i];
                    const acquiredLock = yield this.acquireIdentifyLock(lock);
                    if (acquiredLock) {
                        acquiredLocks.push(lock);
                    }
                    else {
                        acquiredLocks.forEach(this.releaseIdentifyLock);
                        return false;
                    }
                }
            }
            return true;
        });
    }
    acquireIdentifyLock(lock) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { success, message: err } = yield lock.acquire();
                if (!success) {
                    this.log('DEBUG', `Was not able to acquire lock. Message: ${err}`);
                    return false;
                }
                return true;
            }
            catch (err) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION && lock.allowFallback) {
                    this.recreateRpcService();
                    this.log('WARNING', `Was not able to connect to lock serviceOptions to acquire lock: ${lock.target}. Fallback allowed: ${lock.allowFallback}`);
                    return true;
                }
                if (err !== undefined) {
                    return false;
                }
                throw err;
            }
        });
    }
    releaseIdentifyLock(lock) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { message: err } = yield lock.release();
                lock.clearToken();
                if (err !== undefined) {
                    this.log('DEBUG', `Was not able to release lock. Message: ${err}`);
                }
            }
            catch (err) {
                if (err.code === constants_1.RPC_CLOSE_CODES.LOST_CONNECTION) {
                    this.recreateRpcService();
                }
                this.log('WARNING', `Was not able to connect to lock serviceOptions to release lock: ${lock.target}.}`);
                if (err.code !== constants_1.RPC_CLOSE_CODES.LOST_CONNECTION) {
                    throw err;
                }
            }
        });
    }
    send(op, data) {
        var _a;
        const payload = { op, d: data };
        if (this.canSendPacket(op)
            && ((_a = __classPrivateFieldGet(this, _ws)) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.OPEN) {
            const packet = JSON.stringify(typeof payload === 'object' ? utils_1.objectKeysCamelToSnake(payload) : payload);
            __classPrivateFieldGet(this, _ws).send(packet);
            this.updateWsRateLimit();
            this.log('DEBUG', 'Sent payload.', { payload });
            return true;
        }
        this.log('DEBUG', 'Failed to send payload.', { payload });
        return false;
    }
    canSendPacket(op) {
        const now = new Date().getTime();
        if (now >= __classPrivateFieldGet(this, _wsRateLimitCache).resetTimestamp) {
            __classPrivateFieldGet(this, _wsRateLimitCache).remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
            return true;
        }
        if (__classPrivateFieldGet(this, _wsRateLimitCache).remainingRequests >= constants_1.GATEWAY_REQUEST_BUFFER) {
            return true;
        }
        if (__classPrivateFieldGet(this, _wsRateLimitCache).remainingRequests <= constants_1.GATEWAY_REQUEST_BUFFER
            && (op === constants_1.GATEWAY_OP_CODES.HEARTBEAT || op === constants_1.GATEWAY_OP_CODES.RECONNECT)) {
            return true;
        }
        return false;
    }
    updateWsRateLimit() {
        if (__classPrivateFieldGet(this, _wsRateLimitCache).remainingRequests === constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE) {
            __classPrivateFieldGet(this, _wsRateLimitCache).resetTimestamp = new Date().getTime() + constants_1.MINUTE_IN_MILLISECONDS;
        }
        --__classPrivateFieldGet(this, _wsRateLimitCache).remainingRequests;
    }
    handleInvalidSession(resumable) {
        var _a, _b;
        this.log('INFO', `Received Invalid Session packet. Resumable: ${resumable}`);
        if (!resumable) {
            (_a = __classPrivateFieldGet(this, _ws)) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
        }
        else {
            (_b = __classPrivateFieldGet(this, _ws)) === null || _b === void 0 ? void 0 : _b.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
        }
        this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
    }
    updateSequence(s) {
        if (__classPrivateFieldGet(this, _sequence) === undefined) {
            __classPrivateFieldSet(this, _sequence, s !== null && s !== void 0 ? s : undefined);
        }
        else if (s !== null) {
            if (s > __classPrivateFieldGet(this, _sequence) + 1) {
                this.log('WARNING', `Non-consecutive sequence (${__classPrivateFieldGet(this, _sequence)} -> ${s})`);
            }
            if (s > __classPrivateFieldGet(this, _sequence)) {
                __classPrivateFieldSet(this, _sequence, s);
            }
        }
    }
}
exports.default = Gateway;
_loggingIn = new WeakMap(), _api = new WeakMap(), _mainIdentifyLock = new WeakMap(), _identifyLocks = new WeakMap(), _ws = new WeakMap(), _wsUrl = new WeakMap(), _wsUrlRetryWait = new WeakMap(), _wsRateLimitCache = new WeakMap(), _sequence = new WeakMap(), _sessionId = new WeakMap(), _heartbeatAck = new WeakMap(), _lastHeartbeatTimestamp = new WeakMap(), _nextHeartbeatTimestamp = new WeakMap(), _heartbeatTimeout = new WeakMap(), _heartbeatIntervalTime = new WeakMap(), _emitter = new WeakMap(), _events = new WeakMap(), _identity = new WeakMap(), _mainRpcServiceOptions = new WeakMap(), _rpcServiceOptions = new WeakMap();
