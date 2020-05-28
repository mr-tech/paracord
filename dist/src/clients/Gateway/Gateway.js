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
const ws = require('ws');
const { EventEmitter } = require('events');
const Api = require('../Api/Api');
const Utils = require('../../utils');
const Identity = require('./structures/Identity');
const { IdentifyLockService } = require('../../rpc/services');
const { SECOND_IN_MILLISECONDS, MINUTE_IN_MILLISECONDS, GIGABYTE_IN_BYTES, GATEWAY_DEFAULT_WS_PARAMS, GATEWAY_OP_CODES, GATEWAY_CLOSE_CODES, GATEWAY_MAX_REQUESTS_PER_MINUTE, GATEWAY_REQUEST_BUFFER, LOG_LEVELS, LOG_SOURCES, } = require('../../constants');
module.exports = class Gateway {
    constructor(token, options = {}) {
        this.api;
        this.mainIdentifyLock;
        this.identifyLocks;
        this.online;
        this.ws;
        this.wsUrl;
        this.wsUrlRetryWait;
        this.wsRateLimitCache;
        this.sequence;
        this.sessionId;
        this.heartbeatAck;
        this.lastHeartbeatTimestamp;
        this.nextHeartBeatTimestamp;
        this.heartbeatTimeout;
        this.heartbeatIntervalTime;
        this.emitter;
        this.events;
        this.identity;
        this.retryWait;
        this.remoteLoginWait;
        this.lastKnownSessionLimitData;
        this.constructorDefaults(token, options);
    }
    get resumable() {
        return this.sessionId !== undefined && this.sequence !== null;
    }
    get token() {
        return this.identity.token;
    }
    get shard() {
        return this.identity.shard !== undefined ? this.identity.shard : undefined;
    }
    get id() {
        return this.identity.shard !== undefined ? this.identity.shard[0] : undefined;
    }
    get connected() {
        return this.ws !== undefined;
    }
    constructorDefaults(token, options) {
        Gateway.validateParams(token, options);
        const defaults = Object.assign({ emitter: options.emitter || new EventEmitter(), sequence: null, wsRateLimitCache: {
                remainingRequests: GATEWAY_MAX_REQUESTS_PER_MINUTE,
                resetTimestamp: 0,
            }, identifyLocks: [] }, options);
        Object.assign(this, defaults);
        const botToken = Utils.coerceTokenToBotLike(token);
        this.assignIdentity(botToken, options.identity);
        this.bindTimerFunctions();
    }
    static validateParams(token, options) {
        if (token === undefined && options.serverOptions === undefined) {
            throw Error("client requires either a 'token' or 'serverOptions' ");
        }
    }
    assignIdentity(token, identity) {
        this.identity = new Identity(token, identity);
    }
    bindTimerFunctions() {
        this.login = this.login.bind(this);
        this.heartbeat = this.heartbeat.bind(this);
        this.checkLocksPromise = this.checkLocksPromise.bind(this);
    }
    log(level, message, data = {}) {
        data.shard = this.id;
        this.emit('DEBUG', {
            source: LOG_SOURCES.GATEWAY,
            level: LOG_LEVELS[level],
            message,
            data,
        });
    }
    emit(type, data) {
        if (this.emitter !== undefined) {
            this.emitter.emit(type, data, this.id);
        }
    }
    addIdentifyLockServices(mainServerOptions = {}, ...serverOptions) {
        const usedHostPort = {};
        if (mainServerOptions !== null) {
            usedHostPort[mainServerOptions.host || '127.0.0.1'] = mainServerOptions.port || 50051;
            this.mainIdentifyLock = this.configureLockService(mainServerOptions);
        }
        if (serverOptions.length) {
            serverOptions.forEach((options) => {
                const host = serverOptions.host || '127.0.0.1';
                const port = options.port || 55051;
                if (usedHostPort[host] === port) {
                    throw Error('Multiple locks specified for the same host:port.');
                }
                usedHostPort[host] = mainServerOptions.port || port;
                this.identifyLocks.push(this.configureLockService(options));
            });
        }
    }
    configureLockService(serverOptions) {
        const identifyLock = new IdentifyLockService(serverOptions);
        Gateway.validateLockOptions(serverOptions);
        identifyLock.allowFallback = serverOptions.allowFallback;
        identifyLock.duration = serverOptions.duration;
        const message = `Rpc service created for identify coordination. Connected to: ${identifyLock.target}. Default duration of lock: ${identifyLock.duration}`;
        this.log('INFO', message);
        return identifyLock;
    }
    static validateLockOptions(options) {
        const { duration } = options;
        if (typeof duration !== 'number' && duration <= 0) {
            throw Error('Lock duration must be a number larger than 0.');
        }
    }
    requestGuildMembers(guildId, options = {}) {
        const defaults = {
            limit: 0, query: '', presences: false, user_ids: [],
        };
        for (const [k, v] of Object.entries(defaults)) {
            if (options[k] === undefined) {
                options[k] = v;
            }
        }
        return this.send(GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, Object.assign({ guild_id: guildId }, options));
    }
    checkLocksPromise(resolve) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.acquireLocks()) {
                resolve();
            }
            else {
                setTimeout(() => this.checkLocksPromise(resolve), SECOND_IN_MILLISECONDS);
            }
        });
    }
    loginWaitForLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(this.checkLocksPromise);
        });
    }
    login(_Websocket = ws) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.ws !== undefined) {
                throw Error('Client is already connected.');
            }
            try {
                if (this.wsUrl === undefined) {
                    this.wsUrl = yield this.getWebsocketUrl();
                }
                this.log('DEBUG', `Connecting to url: ${this.wsUrl}`);
                this.ws = new _Websocket(this.wsUrl, { maxPayload: GIGABYTE_IN_BYTES });
                this.assignWebsocketMethods();
            }
            catch (err) {
                if (err.response) {
                    console.error(err.response.data.message);
                }
                else {
                    console.error(err);
                }
                if (this.ws !== undefined) {
                    this.ws = undefined;
                }
            }
        });
    }
    releaseIdentifyLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.identifyLocks.length) {
                this.identifyLocks.forEach((l) => {
                    if (l.token !== undefined)
                        this.releaseIdentifyLock(l);
                });
            }
        });
    }
    getWebsocketUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.api === undefined) {
                this.createApiClient();
            }
            const { status, statusText, data } = yield this.api.request('get', 'gateway/bot');
            if (status === 200) {
                this.lastKnownSessionLimitData = data.session_start_limit;
                const { total, remaining, reset_after } = data.session_start_limit;
                const message = `Login limit: ${total}. Remaining: ${remaining}. Reset after ${reset_after}ms (${new Date(new Date().getTime() + reset_after)})`;
                this.log('INFO', message);
                return data.url + GATEWAY_DEFAULT_WS_PARAMS;
            }
            this.handleBadStatus(status, statusText, data.message, data.code);
            return undefined;
        });
    }
    createApiClient() {
        this.api = new Api(this.identity.token);
        this.api.startQueue();
    }
    handleBadStatus(status, statusText, dataMessage, dataCode) {
        let message = `Failed to get websocket information from API. Status ${status}. Status text: ${statusText}. Discord code: ${dataCode}. Discord message: ${dataMessage}.`;
        if (status !== 401) {
            message += ` Trying again in ${this.wsUrlRetryWait} seconds.`;
            this.log('WARNING', message);
            setTimeout(this.login, this.wsUrlRetryWait);
        }
        else {
            message += ' Please check your token.';
            throw Error(message);
        }
    }
    assignWebsocketMethods() {
        this.ws.onopen = this._onopen.bind(this);
        this.ws.onerror = this._onerror.bind(this);
        this.ws.onclose = this._onclose.bind(this);
        this.ws.onmessage = this._onmessage.bind(this);
    }
    handleEvent(type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.emitter.eventHandler !== undefined) {
                data = yield this.emitter.eventHandler(type, data, this.id);
            }
            if (data !== undefined) {
                this.emit(type, data, this.id);
            }
        });
    }
    terminate(option) {
        const { USER_TERMINATE, USER_TERMINATE_RESUMABLE, USER_TERMINATE_RECONNECT } = GATEWAY_CLOSE_CODES;
        let code = USER_TERMINATE;
        if (option === 'resume') {
            code = USER_TERMINATE_RESUMABLE;
        }
        else if (option === 'reconnect') {
            code = USER_TERMINATE_RECONNECT;
        }
        this.ws.close(code);
    }
    _onopen() {
        this.log('DEBUG', 'Websocket open.');
        this.wsRateLimitCache.remainingRequests = GATEWAY_MAX_REQUESTS_PER_MINUTE;
        this.handleEvent('GATEWAY_OPEN', this);
    }
    _onerror(err) {
        this.log('ERROR', `Websocket error. Message: ${err.message}`);
    }
    _onclose(event) {
        return __awaiter(this, void 0, void 0, function* () {
            this.ws = undefined;
            this.online = false;
            this.clearHeartbeat();
            const shouldReconnect = this.handleCloseCode(event.code);
            this.wsRateLimitCache = {
                remainingRequests: GATEWAY_MAX_REQUESTS_PER_MINUTE,
                resetTimestamp: 0,
            };
            yield this.handleEvent('GATEWAY_CLOSE', { shouldReconnect, gateway: this });
        });
    }
    handleCloseCode(code) {
        const { CLEAN, GOING_AWAY, ABNORMAL_CLOSE, UNKNOWN_ERROR, UNKNOWN_OPCODE, DECODE_ERROR, NOT_AUTHENTICATED, AUTHENTICATION_FAILED, ALREADY_AUTHENTICATED, SESSION_NO_LONGER_VALID, INVALID_SEQ, RATE_LIMITED, SESSION_TIMEOUT, INVALID_SHARD, SHARDING_REQUIRED, INVALID_VERSION, INVALID_INTENT, DISALLOWED_INTENT, RECONNECT, SESSION_INVALIDATED, SESSION_INVALIDATED_RESUMABLE, HEARTBEAT_TIMEOUT, USER_TERMINATE_RESUMABLE, USER_TERMINATE_RECONNECT, USER_TERMINATE, } = GATEWAY_CLOSE_CODES;
        let message;
        let shouldReconnect = true;
        let level;
        switch (code) {
            case CLEAN:
                level = LOG_LEVELS.INFO;
                message = 'Clean close. (Reconnecting.)';
                this.clearSession();
                break;
            case GOING_AWAY:
                level = LOG_LEVELS.INFO;
                message = 'The current endpoint is going away. (Reconnecting.)';
                break;
            case ABNORMAL_CLOSE:
                level = LOG_LEVELS.INFO;
                message = 'Abnormal close. (Reconnecting.)';
                break;
            case UNKNOWN_ERROR:
                level = LOG_LEVELS.WARNING;
                message = "Discord's not sure what went wrong. (Reconnecting.)";
                break;
            case UNKNOWN_OPCODE:
                level = LOG_LEVELS.WARNING;
                message = "Sent an invalid Gateway opcode or an invalid payload for an opcode. Don't do that! (Reconnecting.)";
                break;
            case DECODE_ERROR:
                level = LOG_LEVELS.ERROR;
                message = "Sent an invalid payload. Don't do that! (Reconnecting.)";
                break;
            case NOT_AUTHENTICATED:
                level = LOG_LEVELS.ERROR;
                message = 'Sent a payload prior to identifying. Please login first. (Reconnecting.)';
                break;
            case AUTHENTICATION_FAILED:
                level = LOG_LEVELS.FATAL;
                message = 'Account token sent with identify payload is incorrect. (Terminating login.)';
                shouldReconnect = false;
                break;
            case ALREADY_AUTHENTICATED:
                level = LOG_LEVELS.ERROR;
                message = 'Sent more than one identify payload. Stahp. (Terminating login.)';
                shouldReconnect = false;
                break;
            case SESSION_NO_LONGER_VALID:
                level = LOG_LEVELS.INFO;
                message = 'Session is no longer valid. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case INVALID_SEQ:
                message = 'Sequence sent when resuming the session was invalid. (Reconnecting with new session.)';
                level = LOG_LEVELS.INFO;
                this.clearSession();
                break;
            case RATE_LIMITED:
                level = LOG_LEVELS.ERROR;
                message = "Woah nelly! You're sending payloads too quickly. Slow it down! (Reconnecting.)";
                break;
            case SESSION_TIMEOUT:
                level = LOG_LEVELS.INFO;
                message = 'Session timed out. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case INVALID_SHARD:
                level = LOG_LEVELS.FATAL;
                message = 'Sent an invalid shard when identifying. (Terminating login.)';
                shouldReconnect = false;
                break;
            case SHARDING_REQUIRED:
                level = LOG_LEVELS.FATAL;
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
                level = LOG_LEVELS.WARNING;
                message = 'Heartbeat Ack not received from Discord in time. (Reconnecting.)';
                break;
            case SESSION_INVALIDATED:
                level = LOG_LEVELS.INFO;
                message = 'Received an Invalid Session message and is not resumable. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case RECONNECT:
                level = LOG_LEVELS.INFO;
                message = 'Gateway has requested the client reconnect. (Reconnecting.)';
                break;
            case SESSION_INVALIDATED_RESUMABLE:
                level = LOG_LEVELS.INFO;
                message = 'Received an Invalid Session message and is resumable. (Reconnecting.)';
                break;
            case USER_TERMINATE_RESUMABLE:
                level = LOG_LEVELS.INFO;
                message = 'Connection terminated by you. (Reconnecting.)';
                break;
            case USER_TERMINATE_RECONNECT:
                level = LOG_LEVELS.INFO;
                message = 'Connection terminated by you. (Reconnecting with new session.)';
                this.clearSession();
                break;
            case USER_TERMINATE:
                level = LOG_LEVELS.INFO;
                message = 'Connection terminated by you. (Terminating login.)';
                shouldReconnect = false;
                break;
            default:
                level = LOG_LEVELS.INFO;
                message = 'Unknown close code. (Reconnecting.)';
        }
        this.log(level, `Websocket closed. Code: ${code}. Reason: ${message}`);
        return shouldReconnect;
    }
    clearSession() {
        this.sessionId = undefined;
        this.sequence = null;
        this.wsUrl = undefined;
    }
    clearHeartbeat() {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = undefined;
        this.heartbeatIntervalTime = undefined;
        this.heartbeatAck = undefined;
    }
    _onmessage(m) {
        this.handleMessage(JSON.parse(m.data));
    }
    handleMessage(p) {
        const { t: type, s: sequence, op: opCode, d: data, } = p;
        switch (opCode) {
            case GATEWAY_OP_CODES.DISPATCH:
                if (type === 'READY') {
                    this.handleReady(data);
                }
                else if (type === 'RESUMED') {
                    this.handleResumed();
                }
                else {
                    setImmediate(() => this.handleEvent(type, data));
                }
                break;
            case GATEWAY_OP_CODES.HELLO:
                this.handleHello(data);
                break;
            case GATEWAY_OP_CODES.HEARTBEAT_ACK:
                this.handleHeartbeatAck();
                break;
            case GATEWAY_OP_CODES.HEARTBEAT:
                this.send(GATEWAY_OP_CODES.HEARTBEAT, this.sequence);
                break;
            case GATEWAY_OP_CODES.INVALID_SESSION:
                this.handleInvalidSession(data);
                break;
            case GATEWAY_OP_CODES.RECONNECT:
                this.ws.close(GATEWAY_CLOSE_CODES.RECONNECT);
                break;
            default:
                this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
        }
        this.updateSequence(sequence);
    }
    handleReady(data) {
        this.log('INFO', `Received Ready. Session ID: ${data.session_id}.`);
        this.sessionId = data.session_id;
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
        this.startHeartbeat(data.heartbeat_interval);
        this.connect(this.resumable);
        this.handleEvent('HELLO', data);
    }
    startHeartbeat(heartbeatInterval) {
        this.heartbeatAck = true;
        this.heartbeatIntervalTime = heartbeatInterval;
        const now = new Date().getTime();
        this.nextHeartBeatTimestamp = now + this.heartbeatIntervalTime;
        this.heartbeatTimeout = setTimeout(this.heartbeat, this.nextHeartBeatTimestamp - now);
    }
    heartbeat() {
        if (this.heartbeatAck === false) {
            this.log('ERROR', 'Heartbeat not acknowledged in time.');
            this.ws.close(GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
        }
        else {
            this.heartbeatAck = false;
            this.send(GATEWAY_OP_CODES.HEARTBEAT, this.sequence);
            const now = new Date().getTime();
            this.lastHeartbeatTimestamp = now;
            const message = `Heartbeat sent ${now - this.nextHeartBeatTimestamp}ms after scheduled time.`;
            this.nextHeartBeatTimestamp = now + this.heartbeatIntervalTime;
            this.heartbeatTimeout = setTimeout(this.heartbeat, this.nextHeartBeatTimestamp - now);
            this.log('DEBUG', message);
        }
    }
    handleHeartbeatAck() {
        this.heartbeatAck = true;
        this.handleEvent('HEARTBEAT_ACK', null);
        const message = `Heartbeat acknowledged. Latency: ${new Date().getTime()
            - this.lastHeartbeatTimestamp}ms`;
        this.log('DEBUG', message);
    }
    connect(resume) {
        return __awaiter(this, void 0, void 0, function* () {
            if (resume) {
                this.resume();
            }
            else {
                yield this.loginWaitForLocks();
                this.identify();
            }
        });
    }
    resume() {
        const message = `Attempting to resume connection. Session_id: ${this.sessionId}. Sequence: ${this.sequence}`;
        this.log('INFO', message);
        const payload = {
            token: this.token,
            session_id: this.sessionId,
            seq: this.sequence,
        };
        this.handleEvent('GATEWAY_RESUME', payload);
        this.send(GATEWAY_OP_CODES.RESUME, payload);
    }
    identify() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log('INFO', `Identifying as shard: ${this.identity.shard[0]}/${this.identity.shard[1] - 1} (0-indexed)`);
            this.handleEvent('GATEWAY_IDENTIFY', this.identity);
            this.send(GATEWAY_OP_CODES.IDENTIFY, this.identity);
        });
    }
    acquireLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.identifyLocks !== undefined) {
                const acquiredLocks = yield this.acquireIdentifyLocks();
                if (!acquiredLocks) {
                    return false;
                }
            }
            if (this.mainIdentifyLock !== undefined) {
                const acquiredLock = yield this.acquireIdentifyLock(this.mainIdentifyLock);
                if (!acquiredLock) {
                    if (this.identifyLocks !== undefined) {
                        this.identifyLocks.forEach(this.releaseIdentifyLock);
                    }
                    return false;
                }
            }
            return true;
        });
    }
    acquireIdentifyLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.identifyLocks !== undefined) {
                const acquiredLocks = [];
                for (let i = 0; i < this.identifyLocks.length; ++i) {
                    const lock = this.identifyLocks[i];
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
                if (err.code === 14 && lock.allowFallback) {
                    this.log('WARNING', `Was not able to connect to lock server to acquire lock: ${lock.target}. Fallback allowed: ${lock.allowFallback}`);
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
                lock.token = undefined;
                if (err !== undefined) {
                    this.log('DEBUG', `Was not able to release lock. Message: ${err}`);
                }
            }
            catch (err) {
                this.log('WARNING', `Was not able to connect to lock server to release lock: ${lock.target}.}`);
                if (err.code !== 14) {
                    throw err;
                }
            }
        });
    }
    send(op, data) {
        const payload = { op, d: data };
        if (this.canSendPacket(op)
            && this.ws !== undefined
            && this.ws.readyState === ws.OPEN) {
            const packet = JSON.stringify(payload);
            this.ws.send(packet);
            this.updateWsRateLimit();
            this.log('DEBUG', 'Sent payload.', { payload });
            return true;
        }
        this.log('DEBUG', 'Failed to send payload.', { payload });
        return false;
    }
    canSendPacket(op) {
        const now = new Date().getTime();
        if (now >= this.wsRateLimitCache.resetTimestamp) {
            this.wsRateLimitCache.remainingRequests = GATEWAY_MAX_REQUESTS_PER_MINUTE;
            return true;
        }
        if (this.wsRateLimitCache.remainingRequests >= GATEWAY_REQUEST_BUFFER) {
            return true;
        }
        if (this.wsRateLimitCache.remainingRequests <= GATEWAY_REQUEST_BUFFER
            && (op === GATEWAY_OP_CODES.HEARTBEAT || op === GATEWAY_OP_CODES.RECONNECT)) {
            return true;
        }
        return false;
    }
    updateWsRateLimit() {
        if (this.wsRateLimitCache.remainingRequests === GATEWAY_MAX_REQUESTS_PER_MINUTE) {
            this.wsRateLimitCache.resetTimestamp = new Date().getTime() + MINUTE_IN_MILLISECONDS;
        }
        --this.wsRateLimitCache.remainingRequests;
    }
    handleInvalidSession(resumable) {
        this.log('INFO', `Received Invalid Session packet. Resumable: ${resumable}`);
        if (!resumable) {
            this.ws.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
        }
        else {
            this.ws.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
        }
        this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
    }
    updateSequence(s) {
        if (this.sequence === null) {
            this.sequence = s;
        }
        else {
            if (s > this.sequence + 1) {
                this.log('WARNING', `Non-consecutive sequence (${this.sequence} -> ${s})`);
            }
            if (s > this.sequence) {
                this.sequence = s;
            }
        }
    }
};
