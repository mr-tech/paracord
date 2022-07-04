"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const Api_1 = __importDefault(require("../Api"));
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const structures_1 = require("./structures");
let ZlibSync = null;
let Z_SYNC_FLUSH = 0;
Promise.resolve().then(() => __importStar(require('zlib-sync'))).then((_zlib) => {
    ZlibSync = _zlib;
    ({ Z_SYNC_FLUSH } = _zlib);
}).catch(() => { });
class Gateway {
    #online;
    #loggingIn;
    #options;
    #api;
    #ws;
    #wsUrl;
    #wsUrlRetryWait;
    #wsRateLimitCache;
    #zlibInflate = null;
    #version;
    #sequence;
    #sessionId;
    #heartbeatAck;
    #lastHeartbeatTimestamp;
    #nextHeartbeatTimestamp;
    #heartbeatTimeout;
    #heartbeatAckTimeout;
    #receivedHeartbeatIntervalTime;
    #heartbeatIntervalTime;
    #heartbeatIntervalOffset;
    #heartbeatExpectedTimestamp;
    #startupHeartbeatTolerance;
    #heartbeatsMissedDuringStartup;
    #isStartingFunction;
    #isStarting;
    #checkIfStartingInterval;
    #emitter;
    #events;
    #identity;
    #checkSiblingHeartbeats;
    #membersRequestCounter;
    #requestingMembersStateMap;
    lastKnownSessionLimitData;
    static validateOptions(option) {
        if (option.startupHeartbeatTolerance !== undefined && option.isStartingFunc === undefined) {
            throw Error("Gateway option 'startupHeartbeatTolerance' requires 'isStartingFunc'.");
        }
        else if (option.isStartingFunc !== undefined
            && (option.startupHeartbeatTolerance === undefined || option.startupHeartbeatTolerance <= 0)) {
            throw Error("Gateway option 'isStartingFunc' requires 'startupHeartbeatTolerance' larger than 0.");
        }
    }
    constructor(token, options) {
        Gateway.validateOptions(options);
        const { emitter, identity, identity: { shard }, api, wsUrl, events, heartbeatIntervalOffset, startupHeartbeatTolerance, isStartingFunc, checkSiblingHeartbeats, } = options;
        if (shard !== undefined && (shard[0] === undefined || shard[1] === undefined)) {
            throw Error(`Invalid shard provided to gateway. shard id: ${shard[0]} | shard count: ${shard[1]}`);
        }
        this.#options = options;
        this.#version = constants_1.DISCORD_WS_VERSION;
        this.#sequence = null;
        this.#heartbeatAck = true;
        this.#online = false;
        this.#loggingIn = false;
        this.#wsRateLimitCache = {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        };
        this.#membersRequestCounter = 0;
        this.#requestingMembersStateMap = new Map();
        this.#emitter = emitter ?? new events_1.EventEmitter();
        this.#identity = new structures_1.GatewayIdentify((0, utils_1.coerceTokenToBotLike)(token), identity);
        this.#api = api;
        this.#events = events;
        this.#heartbeatIntervalOffset = heartbeatIntervalOffset || 0;
        this.#startupHeartbeatTolerance = startupHeartbeatTolerance || 0;
        this.#heartbeatsMissedDuringStartup = 0;
        this.#isStartingFunction = isStartingFunc;
        this.#checkSiblingHeartbeats = checkSiblingHeartbeats;
        this.#wsUrl = wsUrl;
        this.#wsUrlRetryWait = constants_1.DEFAULT_GATEWAY_BOT_WAIT;
        this.#isStarting = false;
    }
    get resumable() {
        return this.#sessionId !== undefined && this.#sequence !== null;
    }
    get shard() {
        return this.#identity.shard !== undefined ? this.#identity.shard : undefined;
    }
    get id() {
        return this.#identity.shard !== undefined ? this.#identity.shard[0] : 0;
    }
    get connected() {
        return this.#ws !== undefined;
    }
    get online() {
        return this.#online;
    }
    get ws() {
        return this.#ws;
    }
    get heartbeatAck() {
        return this.#heartbeatAck;
    }
    get lastHeartbeatTimestamp() {
        return this.#lastHeartbeatTimestamp;
    }
    get nextHeartbeatTimestamp() {
        return this.#nextHeartbeatTimestamp;
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
        if (this.#emitter !== undefined) {
            if (this.#events !== undefined) {
                const userType = this.#events[type];
                type = userType ?? type;
            }
            this.#emitter.emit(type, data, this.id);
        }
    }
    requestGuildMembers(options) {
        let { nonce } = options;
        if (nonce === undefined) {
            nonce = `${options.guild_id}-${++this.#membersRequestCounter}`;
        }
        this.#requestingMembersStateMap.set(nonce, { receivedIndexes: [] });
        return this.send(constants_1.GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);
    }
    login = async (_websocket = ws_1.default) => {
        if (this.#ws !== undefined) {
            throw Error('Client is already connected.');
        }
        if (this.#loggingIn) {
            throw Error('Already logging in.');
        }
        if (ZlibSync || this.#identity.compress) {
            if (!ZlibSync)
                throw Error('zlib-sync is required for compression');
            this.#zlibInflate = new ZlibSync.Inflate({
                flush: ZlibSync.Z_SYNC_FLUSH,
                chunkSize: constants_1.ZLIB_CHUNKS_SIZE,
            });
        }
        try {
            this.#loggingIn = true;
            if (this.#wsUrl === undefined) {
                this.#wsUrl = await this.getWebsocketUrl();
            }
            if (this.#wsUrl !== undefined) {
                this.log('DEBUG', `Connecting to url: ${this.#wsUrl}`);
                this.#ws = new _websocket(this.#wsUrl, { maxPayload: constants_1.GIGABYTE_IN_BYTES });
                this.assignWebsocketMethods(this.#ws);
            }
            else {
                this.log('ERROR', 'Failed to get websocket url.');
            }
        }
        catch (err) {
            if ((0, utils_1.isApiError)(err)) {
                console.error(err.response?.data?.message);
            }
            else {
                console.error(err);
            }
            if (this.#ws !== undefined) {
                this.#ws = undefined;
            }
        }
        finally {
            this.#loggingIn = false;
        }
    };
    async getWebsocketUrl() {
        if (this.#api === undefined) {
            this.#api = new Api_1.default(this.#identity.token);
            this.#api.startQueue();
        }
        const { status, statusText, data } = await this.#api.request('get', 'gateway/bot');
        if (status === 200) {
            this.lastKnownSessionLimitData = data.sessionStartLimit;
            const { total, remaining, resetAfter } = data.sessionStartLimit;
            const message = `Login limit: ${total}. Remaining: ${remaining}. Reset after ${resetAfter}ms (${new Date(new Date().getTime() + resetAfter)})`;
            this.log('INFO', message);
            return `${data.url}?v=${this.#version}&encoding=json${this.#zlibInflate ? '&compress=zlib-stream' : ''}`;
        }
        this.handleBadStatus(status, statusText, data.message, data.code);
        return undefined;
    }
    handleBadStatus(status, statusText, dataMessage, dataCode) {
        let message = `Failed to get websocket information from API. Status ${status}. Status text: ${statusText}. Discord code: ${dataCode}. Discord message: ${dataMessage}.`;
        if (status !== 401) {
            message += ` Trying again in ${this.#wsUrlRetryWait} seconds.`;
            this.log('WARNING', message);
            setTimeout(this.login, this.#wsUrlRetryWait);
        }
        else {
            message += ' Please check your token.';
            throw Error(message);
        }
    }
    assignWebsocketMethods(websocket) {
        websocket.onopen = this._onopen;
        websocket.onerror = this._onerror;
        websocket.onclose = this._onclose;
        websocket.onmessage = this._onmessage;
    }
    async handleEvent(type, data) {
        if (type === 'GUILD_MEMBERS_CHUNK')
            this.handleGuildMemberChunk(data);
        if (this.#emitter.eventHandler !== undefined) {
            await this.#emitter.eventHandler(type, data, this.id);
        }
        else {
            this.emit(type, data);
        }
    }
    handleGuildMemberChunk(data) {
        const { nonce, not_found, chunk_count, chunk_index, } = data;
        if (nonce) {
            if (not_found) {
                this.#requestingMembersStateMap.delete(nonce);
            }
            else {
                this.updateRequestMembersState(nonce, chunk_count, chunk_index);
            }
        }
    }
    updateRequestMembersState(nonce, chunkCount, chunkIndex) {
        const guildChunkState = this.#requestingMembersStateMap.get(nonce);
        if (guildChunkState) {
            const { receivedIndexes } = guildChunkState;
            receivedIndexes.push(chunkIndex);
            if (receivedIndexes.length === chunkCount) {
                this.#requestingMembersStateMap.delete(nonce);
            }
        }
    }
    _onopen = () => {
        this.log('DEBUG', 'Websocket open.');
        this.#wsRateLimitCache.remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
        if (this.#isStartingFunction !== undefined) {
            this.#isStarting = this.#isStartingFunction(this);
            this.#checkIfStartingInterval = setInterval(this.checkIfStarting, 100);
        }
        this.emit('GATEWAY_OPEN', this);
    };
    checkIfStarting = () => {
        this.#isStarting = !!(this.#isStartingFunction && this.#isStartingFunction(this));
        if (!this.#isStarting) {
            if (this.#heartbeatAckTimeout)
                clearTimeout(this.#heartbeatAckTimeout);
            if (this.#checkIfStartingInterval !== undefined)
                clearInterval(this.#checkIfStartingInterval);
        }
    };
    _onerror = (err) => {
        this.log('ERROR', `Websocket error. Message: ${err.message}`);
    };
    _onclose = (event) => {
        this.#ws = undefined;
        this.#online = false;
        this.#membersRequestCounter = 0;
        this.#requestingMembersStateMap = new Map();
        this.clearHeartbeat();
        const shouldReconnect = this.handleCloseCode(event.code);
        this.#wsRateLimitCache = {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        };
        const gatewayCloseEvent = { shouldReconnect, code: event.code, gateway: this };
        this.emit('GATEWAY_CLOSE', gatewayCloseEvent);
    };
    handleCloseCode(code) {
        const { CLEAN, GOING_AWAY, ABNORMAL, UNKNOWN_ERROR, UNKNOWN_OPCODE, DECODE_ERROR, NOT_AUTHENTICATED, AUTHENTICATION_FAILED, ALREADY_AUTHENTICATED, SESSION_NO_LONGER_VALID, INVALID_SEQ, RATE_LIMITED, SESSION_TIMEOUT, INVALID_SHARD, SHARDING_REQUIRED, INVALID_VERSION, INVALID_INTENT, DISALLOWED_INTENT, RECONNECT, SESSION_INVALIDATED, SESSION_INVALIDATED_RESUMABLE, HEARTBEAT_TIMEOUT, USER_TERMINATE_RESUMABLE, USER_TERMINATE_RECONNECT, USER_TERMINATE, UNKNOWN, } = constants_1.GATEWAY_CLOSE_CODES;
        let message;
        let shouldReconnect = true;
        let level = 'INFO';
        switch (code) {
            case CLEAN:
                message = 'Clean close. (Reconnecting.)';
                break;
            case GOING_AWAY:
                message = 'The current endpoint is going away. (Reconnecting.)';
                break;
            case ABNORMAL:
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
        this.#sessionId = undefined;
        this.#sequence = null;
        this.#wsUrl = this.#options.wsUrl;
        this.log('DEBUG', 'Session cleared.');
    }
    clearHeartbeat() {
        if (this.#heartbeatTimeout)
            clearInterval(this.#heartbeatTimeout);
        if (this.#heartbeatAckTimeout)
            clearInterval(this.#heartbeatAckTimeout);
        this.#heartbeatAck = false;
        this.#lastHeartbeatTimestamp = undefined;
        this.#nextHeartbeatTimestamp = undefined;
        this.#heartbeatTimeout = undefined;
        this.#heartbeatAckTimeout = undefined;
        this.#receivedHeartbeatIntervalTime = undefined;
        this.#heartbeatIntervalTime = undefined;
        this.#heartbeatExpectedTimestamp = undefined;
        this.#heartbeatsMissedDuringStartup = 0;
        this.log('DEBUG', 'Heartbeat cleared.');
    }
    _onmessage = ({ data }) => {
        if (this.#zlibInflate) {
            return this.decompress(this.#zlibInflate, data);
        }
        return this.handleMessage(JSON.parse(data.toString()));
    };
    decompress(inflate, data) {
        if (data instanceof ArrayBuffer)
            data = new Uint8Array(data);
        const done = data.length >= 4 && data.readUInt32BE(data.length - 4) === 0xFFFF;
        if (done) {
            inflate.push(data, Z_SYNC_FLUSH);
            if (inflate.err) {
                this.log('ERROR', `zlib error ${inflate.err}: ${inflate.msg}`);
                return;
            }
            data = Buffer.from(inflate.result);
            this.handleMessage(JSON.parse(data.toString()));
            return;
        }
        inflate.push(data, false);
    }
    handleMessage(p) {
        const { t: type, s: sequence, op: opCode, d: data, } = p;
        switch (opCode) {
            case constants_1.GATEWAY_OP_CODES.DISPATCH:
                if (type === 'READY') {
                    this.handleReady(data);
                }
                else if (type === 'RESUMED') {
                    this.handleResumed();
                }
                else if (type !== null) {
                    this._checkIfShouldHeartbeat();
                    this.handleEvent(type, data);
                }
                else {
                    this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
                }
                break;
            case constants_1.GATEWAY_OP_CODES.HELLO:
                this.handleHello(data);
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT_ACK:
                this.handleHeartbeatAck();
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT:
                this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.#sequence);
                break;
            case constants_1.GATEWAY_OP_CODES.INVALID_SESSION:
                this.handleInvalidSession(data);
                break;
            case constants_1.GATEWAY_OP_CODES.RECONNECT:
                this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.RECONNECT);
                break;
            default:
                this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
        }
        this.updateSequence(sequence);
    }
    _checkIfShouldHeartbeat() {
        if (this.#checkSiblingHeartbeats !== undefined)
            this.#checkSiblingHeartbeats.forEach((f) => f());
        else
            this.checkIfShouldHeartbeat();
    }
    checkIfShouldHeartbeat = () => {
        const now = new Date().getTime();
        if (this.#heartbeatAck
            && this.#nextHeartbeatTimestamp !== undefined
            && now > this.#nextHeartbeatTimestamp) {
            this.sendHeartbeat();
        }
    };
    handleReady(data) {
        this.log('INFO', `Received Ready. Session ID: ${data.session_id}.`);
        this.#sessionId = data.session_id;
        this.#online = true;
        this.handleEvent('READY', data);
    }
    handleResumed() {
        this.log('INFO', 'Replay finished. Resuming events.');
        this.#online = true;
        this.handleEvent('RESUMED', null);
    }
    handleHello(data) {
        this.log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
        this.startHeartbeat(data.heartbeat_interval);
        this.connect(this.resumable);
        this.handleEvent('HELLO', data);
    }
    startHeartbeat(heartbeatTimeout) {
        this.#heartbeatAck = true;
        this.#receivedHeartbeatIntervalTime = heartbeatTimeout;
        this.#heartbeatIntervalTime = heartbeatTimeout - this.#heartbeatIntervalOffset;
        this.refreshHeartbeatTimeout();
        this.refreshHeartbeatAckTimeout();
    }
    refreshHeartbeatTimeout = () => {
        if (this.#heartbeatIntervalTime !== undefined) {
            if (this.#heartbeatTimeout !== undefined)
                clearTimeout(this.#heartbeatTimeout);
            const randomOffset = (Math.floor(Math.random() * 5) * constants_1.SECOND_IN_MILLISECONDS);
            const nextSendTime = this.#heartbeatIntervalTime - randomOffset;
            this.#heartbeatTimeout = setTimeout(this.sendHeartbeat, nextSendTime);
            const now = new Date().getTime();
            this.#nextHeartbeatTimestamp = now + nextSendTime;
        }
        else {
            this.log('ERROR', 'heartbeatIntervalTime undefined.');
        }
    };
    refreshHeartbeatAckTimeout = () => {
        if (this.#receivedHeartbeatIntervalTime !== undefined) {
            if (this.#heartbeatAckTimeout !== undefined)
                clearTimeout(this.#heartbeatAckTimeout);
            this.#heartbeatAckTimeout = setTimeout(this.checkHeartbeatAck, this.#receivedHeartbeatIntervalTime);
            const now = new Date().getTime();
            this.#heartbeatExpectedTimestamp = now + (this.#receivedHeartbeatIntervalTime * 2);
        }
        else {
            this.log('ERROR', 'refreshHeartbeatAckTimeout undefined.');
        }
    };
    checkHeartbeatAck = () => {
        const waitingForAck = this.#heartbeatAck === false;
        const ackIsOverdue = this.#heartbeatExpectedTimestamp === undefined || this.#heartbeatExpectedTimestamp < new Date().getTime();
        const requestingMembers = this.#requestingMembersStateMap.size;
        if (waitingForAck && ackIsOverdue && !requestingMembers) {
            this.handleMissedHeartbeatAck();
        }
    };
    handleMissedHeartbeatAck = () => {
        let close = false;
        if (this.#isStarting) {
            if (this.allowMissingAckOnStartup()) {
                this.log('WARNING', `Missed heartbeat Ack on startup. ${this.#heartbeatsMissedDuringStartup} out of ${this.#startupHeartbeatTolerance} misses allowed.`);
            }
            else {
                this.log('ERROR', 'Missed heartbeats exceeded startupHeartbeatTolerance.');
                close = true;
            }
        }
        else {
            this.log('ERROR', 'Heartbeat not acknowledged in time.');
            close = true;
        }
        if (close) {
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
        }
        else {
            if (this.#heartbeatAckTimeout)
                clearTimeout(this.#heartbeatAckTimeout);
            this.#heartbeatAckTimeout = undefined;
        }
    };
    allowMissingAckOnStartup() {
        return ++this.#heartbeatsMissedDuringStartup <= this.#startupHeartbeatTolerance;
    }
    sendHeartbeat = () => {
        this.#heartbeatAck = false;
        const now = new Date().getTime();
        const message = this.#nextHeartbeatTimestamp !== undefined
            ? `Heartbeat sent ${now - this.#nextHeartbeatTimestamp}ms after scheduled time.`
            : 'nextHeartbeatTimestamp is undefined.';
        this._sendHeartbeat();
        this.log('DEBUG', message);
    };
    _sendHeartbeat() {
        const now = new Date().getTime();
        this.#lastHeartbeatTimestamp = now;
        this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.#sequence);
        this.refreshHeartbeatTimeout();
        if (this.#heartbeatAckTimeout === undefined)
            this.refreshHeartbeatAckTimeout();
    }
    handleHeartbeatAck() {
        this.#heartbeatAck = true;
        this.handleEvent('HEARTBEAT_ACK', null);
        if (this.#heartbeatAckTimeout) {
            clearTimeout(this.#heartbeatAckTimeout);
            this.#heartbeatAckTimeout = undefined;
        }
        if (this.#lastHeartbeatTimestamp !== undefined) {
            const message = `Heartbeat acknowledged. Latency: ${new Date().getTime() - this.#lastHeartbeatTimestamp}ms.`;
            this.#lastHeartbeatTimestamp = undefined;
            this.log('DEBUG', message);
        }
    }
    async connect(resume) {
        if (resume) {
            this.resume();
        }
        else {
            this.identify();
        }
    }
    resume() {
        const message = `Attempting to resume connection. Session Id: ${this.#sessionId}. Sequence: ${this.#sequence}`;
        this.log('INFO', message);
        const { token } = this.#identity;
        const sequence = this.#sequence;
        const sessionId = this.#sessionId;
        if (sessionId !== undefined && sequence !== null) {
            const payload = {
                token,
                session_id: sessionId,
                seq: sequence,
            };
            this.handleEvent('GATEWAY_RESUME', payload);
            this.send(constants_1.GATEWAY_OP_CODES.RESUME, payload);
        }
        else {
            this.log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionId: ${sessionId}, sequence: ${sequence}`);
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    async identify() {
        const [shardId, shardCount] = this.shard ?? [0, 1];
        this.log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
        this.emit('GATEWAY_IDENTIFY', this);
        this.send(constants_1.GATEWAY_OP_CODES.IDENTIFY, this.#identity.toJSON());
    }
    send(op, data) {
        if (this.canSendPacket(op) && this.#ws?.readyState === ws_1.default.OPEN) {
            const payload = { op, d: data };
            this.#ws.send(JSON.stringify(payload));
            this.updateWsRateLimit();
            this.log('DEBUG', 'Sent payload.', { payload: { op, d: data } });
            return true;
        }
        this.log('DEBUG', 'Failed to send payload.', { payload: { op, d: data } });
        return false;
    }
    canSendPacket(op) {
        const now = new Date().getTime();
        if (now >= this.#wsRateLimitCache.resetTimestamp) {
            this.#wsRateLimitCache.remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
            return true;
        }
        if (this.#wsRateLimitCache.remainingRequests >= constants_1.GATEWAY_REQUEST_BUFFER) {
            return true;
        }
        if (this.#wsRateLimitCache.remainingRequests <= constants_1.GATEWAY_REQUEST_BUFFER
            && (op === constants_1.GATEWAY_OP_CODES.HEARTBEAT || op === constants_1.GATEWAY_OP_CODES.RECONNECT)) {
            return true;
        }
        return false;
    }
    updateWsRateLimit() {
        if (this.#wsRateLimitCache.remainingRequests === constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE) {
            this.#wsRateLimitCache.resetTimestamp = new Date().getTime() + constants_1.MINUTE_IN_MILLISECONDS;
        }
        --this.#wsRateLimitCache.remainingRequests;
    }
    handleInvalidSession(resumable) {
        this.log('INFO', `Received Invalid Session packet. Resumable: ${resumable}`);
        if (!resumable) {
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
        }
        else {
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
        }
        this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
    }
    updateSequence(s) {
        if (this.#sequence === null) {
            this.#sequence = s;
        }
        else if (s !== null) {
            if (s !== this.#sequence + 1) {
                this.log('WARNING', `Non-consecutive sequence (${this.#sequence} -> ${s})`);
            }
            if (s > this.#sequence) {
                this.#sequence = s;
            }
        }
    }
}
exports.default = Gateway;
