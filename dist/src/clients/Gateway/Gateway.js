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
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const constants_1 = require("../../constants");
const services_1 = require("../../rpc/services");
const Utils_1 = require("../../Utils");
const Api_1 = __importDefault(require("../Api/Api"));
const Identify_1 = __importDefault(require("./structures/Identify"));
class Gateway {
    constructor(token, options = {}) {
        var _a;
        this.identifyLocks = [];
        this.heartbeatAck = false;
        this.online = false;
        this.wsRateLimitCache = {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        };
        this.keepCase = options.keepCase || false;
        this.emitter = (_a = options.emitter) !== null && _a !== void 0 ? _a : new events_1.EventEmitter();
        this.identity = new Identify_1.default(Utils_1.coerceTokenToBotLike(token), options.identity);
        this.api = options.api;
        this.wsUrlRetryWait = constants_1.DEFAULT_GATEWAY_BOT_WAIT;
        this.bindTimerFunctions();
    }
    static validateLockOptions(options) {
        const { duration } = options;
        if (duration !== undefined && typeof duration !== 'number' && duration <= 0) {
            throw Error('Lock duration must be a number larger than 0.');
        }
    }
    get resumable() {
        return this.sessionId !== undefined && this.sequence !== null;
    }
    get shard() {
        return this.identity.shard !== undefined ? this.identity.shard : undefined;
    }
    get id() {
        return this.identity.shard !== undefined ? this.identity.shard[0] : 0;
    }
    get connected() {
        return this.ws !== undefined;
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
        if (this.emitter !== undefined) {
            if (this.events !== undefined) {
                const userType = this.events[type];
                type = userType !== null && userType !== void 0 ? userType : type;
            }
            this.emitter.emit(type, data, this.id);
        }
    }
    addIdentifyLockServices(mainServerOptions, ...serverOptions) {
        const usedHostPorts = {};
        if (mainServerOptions !== null) {
            let { port } = mainServerOptions;
            if (typeof port === 'string') {
                port = Number(port);
            }
            const { host } = mainServerOptions;
            usedHostPorts[host !== null && host !== void 0 ? host : '127.0.0.1'] = port !== null && port !== void 0 ? port : 50051;
            this.mainIdentifyLock = this.configureLockService(mainServerOptions);
        }
        if (serverOptions.length) {
            serverOptions.forEach((options) => {
                const { host } = options;
                let { port } = options;
                if (typeof port === 'string') {
                    port = Number(port);
                }
                if (usedHostPorts[host !== null && host !== void 0 ? host : '127.0.0.1'] === port) {
                    throw Error('Multiple locks specified for the same host:port.');
                }
                usedHostPorts[host !== null && host !== void 0 ? host : '127.0.0.1'] = port !== null && port !== void 0 ? port : 50051;
                this.identifyLocks.push(this.configureLockService(options));
            });
        }
    }
    configureLockService(serverOptions) {
        Gateway.validateLockOptions(serverOptions);
        const identifyLock = new services_1.IdentifyLockService(serverOptions);
        const message = `Rpc service created for identify coordination. Connected to: ${identifyLock.target}. Default duration of lock: ${identifyLock.duration}`;
        this.log('INFO', message);
        return identifyLock;
    }
    requestGuildMembers(guildId, options = {}) {
        const sendOptions = {
            limit: 0, query: '', presences: false, userIds: [],
        };
        Object.assign(sendOptions, options);
        return this.send(constants_1.GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, Object.assign({ guild_id: guildId }, Utils_1.objectKeysCamelToSnake(options)));
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
            if (this.ws !== undefined) {
                throw Error('Client is already connected.');
            }
            try {
                if (this.wsUrl === undefined) {
                    this.wsUrl = yield this.getWebsocketUrl();
                }
                if (this.wsUrl !== undefined) {
                    this.log('DEBUG', `Connecting to url: ${this.wsUrl}`);
                    this.ws = new _websocket(this.wsUrl, { maxPayload: constants_1.GIGABYTE_IN_BYTES });
                    this.assignWebsocketMethods(this.ws);
                }
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
                this.api = new Api_1.default(this.identity.token);
                this.api.startQueue();
            }
            const { status, statusText, data } = yield this.api.request('get', 'gateway/bot');
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
            message += ` Trying again in ${this.wsUrlRetryWait} seconds.`;
            this.log('WARNING', message);
            setTimeout(this.login, this.wsUrlRetryWait);
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
            if (this.emitter.eventHandler !== undefined) {
                data = yield this.emitter.eventHandler(type, data, this.id);
            }
            data !== null && data !== void 0 ? data : this.emit(type, data);
        });
    }
    _onopen() {
        this.log('DEBUG', 'Websocket open.');
        this.wsRateLimitCache.remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
        this.handleEvent('GATEWAY_OPEN', this);
    }
    _onerror(err) {
        this.log('ERROR', `Websocket error. Message: ${err.message}`);
    }
    _onclose(event) {
        this.ws = undefined;
        this.online = false;
        this.clearHeartbeat();
        const shouldReconnect = this.handleCloseCode(event.code);
        this.wsRateLimitCache = {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        };
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
                shouldReconnect = false;
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
        this.sessionId = undefined;
        this.sequence = undefined;
        this.wsUrl = undefined;
    }
    clearHeartbeat() {
        this.heartbeatTimeout && clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = undefined;
        this.heartbeatIntervalTime = undefined;
        this.heartbeatAck = false;
    }
    _onmessage(m) {
        typeof m.data === 'string' && this.handleMessage(JSON.parse(m.data));
    }
    handleMessage(p) {
        var _a;
        const { t: type, s: sequence, op: opCode, d, } = p;
        switch (opCode) {
            case constants_1.GATEWAY_OP_CODES.DISPATCH:
                if (type === 'READY') {
                    this.handleReady(Utils_1.objectKeysSnakeToCamel(d));
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
                this.handleHello(Utils_1.objectKeysSnakeToCamel(d));
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT_ACK:
                this.handleHeartbeatAck();
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT:
                this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.sequence);
                break;
            case constants_1.GATEWAY_OP_CODES.INVALID_SESSION:
                this.handleInvalidSession(d);
                break;
            case constants_1.GATEWAY_OP_CODES.RECONNECT:
                (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.RECONNECT);
                break;
            default:
                this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${d}`);
        }
        this.updateSequence(sequence);
    }
    handleReady(data) {
        this.log('INFO', `Received Ready. Session ID: ${data.sessionId}.`);
        this.sessionId = data.sessionId;
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
        this.heartbeatAck = true;
        this.heartbeatIntervalTime = heartbeatInterval;
        const now = new Date().getTime();
        this.nextHeartbeatTimestamp = now + this.heartbeatIntervalTime;
        this.heartbeatTimeout = setTimeout(this.heartbeat, this.nextHeartbeatTimestamp - now);
    }
    heartbeat() {
        var _a, _b;
        if (this.heartbeatAck === false) {
            this.log('ERROR', 'Heartbeat not acknowledged in time.');
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
        }
        else {
            this.heartbeatAck = false;
            this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.sequence);
            const now = new Date().getTime();
            this.lastHeartbeatTimestamp = now;
            if (this.heartbeatIntervalTime !== undefined) {
                const message = this.nextHeartbeatTimestamp !== undefined
                    ? `Heartbeat sent ${now - this.nextHeartbeatTimestamp}ms after scheduled time.`
                    : 'nextHeartbeatTimestamp is undefined.';
                this.nextHeartbeatTimestamp = now + this.heartbeatIntervalTime;
                this.heartbeatTimeout = setTimeout(this.heartbeat, this.nextHeartbeatTimestamp - now);
                this.log('DEBUG', message);
            }
            else {
                this.log('ERROR', 'heartbeatIntervalTime is undefined. Reconnecting.');
                (_b = this.ws) === null || _b === void 0 ? void 0 : _b.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
            }
        }
    }
    handleHeartbeatAck() {
        var _a;
        this.heartbeatAck = true;
        this.handleEvent('HEARTBEAT_ACK', null);
        if (this.lastHeartbeatTimestamp !== undefined) {
            const message = `Heartbeat acknowledged. Latency: ${new Date().getTime()
                - this.lastHeartbeatTimestamp}ms`;
            this.log('DEBUG', message);
        }
        else {
            this.log('ERROR', 'heartbeatIntervalTime is undefined. Reconnecting.');
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
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
        var _a;
        const message = `Attempting to resume connection. Session_id: ${this.sessionId}. Sequence: ${this.sequence}`;
        this.log('INFO', message);
        const { identity: { token }, sequence, sessionId } = this;
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
            this.log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - sessionId: ${sessionId}, sequence: ${sequence}`);
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    identify() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const [shardId, shardCount] = (_a = this.shard) !== null && _a !== void 0 ? _a : [0, 1];
            this.log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
            yield this.handleEvent('GATEWAY_IDENTIFY', this);
            this.send(constants_1.GATEWAY_OP_CODES.IDENTIFY, this);
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
                lock.clearToken();
                if (err !== undefined) {
                    this.log('DEBUG', `Was not able to release lock. Message: ${err}`);
                }
            }
            catch (err) {
                this.log('WARNING', `Was not able to connect to lock server to release lock: ${lock.target}.}`);
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
            && ((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.OPEN) {
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
            this.wsRateLimitCache.remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
            return true;
        }
        if (this.wsRateLimitCache.remainingRequests >= constants_1.GATEWAY_REQUEST_BUFFER) {
            return true;
        }
        if (this.wsRateLimitCache.remainingRequests <= constants_1.GATEWAY_REQUEST_BUFFER
            && (op === constants_1.GATEWAY_OP_CODES.HEARTBEAT || op === constants_1.GATEWAY_OP_CODES.RECONNECT)) {
            return true;
        }
        return false;
    }
    updateWsRateLimit() {
        if (this.wsRateLimitCache.remainingRequests === constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE) {
            this.wsRateLimitCache.resetTimestamp = new Date().getTime() + constants_1.MINUTE_IN_MILLISECONDS;
        }
        --this.wsRateLimitCache.remainingRequests;
    }
    handleInvalidSession(resumable) {
        var _a, _b;
        this.log('INFO', `Received Invalid Session packet. Resumable: ${resumable}`);
        if (!resumable) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
        }
        else {
            (_b = this.ws) === null || _b === void 0 ? void 0 : _b.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
        }
        this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
    }
    updateSequence(s) {
        if (this.sequence === undefined) {
            this.sequence = s !== null && s !== void 0 ? s : undefined;
        }
        else if (s !== null) {
            if (s > this.sequence + 1) {
                this.log('WARNING', `Non-consecutive sequence (${this.sequence} -> ${s})`);
            }
            if (s > this.sequence) {
                this.sequence = s;
            }
        }
    }
}
exports.default = Gateway;
