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
// eslint-disable-next-line import/no-unresolved
Promise.resolve().then(() => __importStar(require('zlib-sync'))).then((_zlib) => {
    ZlibSync = _zlib;
    ({ Z_SYNC_FLUSH } = _zlib);
}).catch(() => { });
/** A client to handle a Discord gateway connection. */
class Gateway {
    /** Whether or not this client should be considered 'online', connected to the gateway and receiving events. */
    #online;
    #loggingIn;
    #options;
    /** Client through which to make REST api calls to Discord. */
    #api;
    /** Websocket used to connect to gateway. */
    #ws;
    /** From Discord - Websocket URL instructed to connect to. Also used to indicate it the client has an open websocket. */
    #wsUrl;
    /** Time to wait between this client's attempts to connect to the gateway in seconds. */
    #wsUrlRetryWait;
    #wsRateLimitCache;
    #zlibInflate = null;
    /** Discord gateway version to use. Default: 9 */
    #version;
    /** From Discord - Most recent event sequence id received. https://discord.com/developers/docs/topics/gateway#payloads */
    #sequence;
    /** From Discord - Id of this gateway connection. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
    #sessionId;
    /** If the last heartbeat packet sent to Discord received an ACK. */
    #heartbeatAck;
    /** Time when last heartbeat packet was sent in ms. */
    #lastHeartbeatTimestamp;
    /** Time when the next heartbeat packet should be sent in ms. */
    #nextHeartbeatTimestamp;
    /** Node timeout for the next heartbeat. */
    #heartbeatTimeout;
    #heartbeatAckTimeout;
    /** From Discord - Time between heartbeats. */
    #receivedHeartbeatIntervalTime;
    /** Time between heartbeats with user offset subtracted. */
    #heartbeatIntervalTime;
    #heartbeatIntervalOffset;
    #heartbeatExpectedTimestamp;
    #startupHeartbeatTolerance;
    #heartbeatsMissedDuringStartup;
    #isStartingFunction;
    #isStarting;
    #checkIfStartingInterval;
    /** Emitter for gateway and Api events. Will create a default if not provided via the options. */
    #emitter;
    /** Key:Value mapping DISCORD_EVENT to user's preferred emitted value. */
    #events;
    /** Object passed to Discord when identifying. */
    #identity;
    #checkSiblingHeartbeats;
    #membersRequestCounter;
    #requestingMembersStateMap;
    /** Amount of identifies reported by the last call to /gateway/bot. */
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
    /**
     * Creates a new Discord gateway handler.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
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
    /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
    get resumable() {
        return this.#sessionId !== undefined && this.#sequence !== null;
    }
    /** [ShardID, ShardCount] to identify with; `undefined` if not sharding. */
    get shard() {
        return this.#identity.shard !== undefined ? this.#identity.shard : undefined;
    }
    /** The shard id that this gateway is connected to. */
    get id() {
        return this.#identity.shard !== undefined ? this.#identity.shard[0] : 0;
    }
    /** Whether or not the client is connected to the gateway. */
    get connected() {
        return this.#ws !== undefined;
    }
    /** Whether or not the client is connected to the gateway. */
    get online() {
        return this.#online;
    }
    /** This gateway's active websocket connection. */
    get ws() {
        return this.#ws;
    }
    /** If the last heartbeat packet sent to Discord received an ACK. */
    get heartbeatAck() {
        return this.#heartbeatAck;
    }
    /** Between Heartbeat/ACK, time when last heartbeat packet was sent in ms. */
    get lastHeartbeatTimestamp() {
        return this.#lastHeartbeatTimestamp;
    }
    /** Time when the next heartbeat packet should be sent in ms. */
    get nextHeartbeatTimestamp() {
        return this.#nextHeartbeatTimestamp;
    }
    /*
     ********************************
     *********** INTERNAL ***********
     ********************************
     */
    /**
     * Simple alias for logging events emitted by this client.
     * @param level Key of the logging level of this message.
     * @param message Content of the log
     * @param data Data pertinent to the event.
     */
    log(level, message, data = {}) {
        data.shard = this.id;
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.GATEWAY,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    }
    /**
     * Emits various events through `this.#emitter`, both Discord and Api. Will emit all events if `this.#events` is undefined; otherwise will only emit those defined as keys in the `this.#events` object.
     * @param type Type of event. (e.g. "GATEWAY_CLOSE" or "CHANNEL_CREATE")
     * @param data Data to send with the event.
     */
    emit(type, data) {
        if (this.#emitter !== undefined) {
            if (this.#events !== undefined) {
                const userType = this.#events[type];
                type = userType ?? type;
            }
            this.#emitter.emit(type, data, this.id);
        }
    }
    /*
     ********************************
     ************ PUBLIC ************
     ********************************
     */
    /**
     * Sends a `Request Guild Members` websocket message.
     * @param guildId Id of the guild to request members from.
     * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
     */
    requestGuildMembers(options) {
        let { nonce } = options;
        if (nonce === undefined) {
            nonce = `${options.guild_id}-${++this.#membersRequestCounter}`;
        }
        this.#requestingMembersStateMap.set(nonce, { receivedIndexes: [] });
        return this.send(constants_1.GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);
    }
    /**
     * Connects to Discord's event gateway.
     * @param _Websocket Ignore. For unittest dependency injection only.
     */
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
                /* eslint-disable-next-line no-console */
                console.error(err.response?.data?.message); // TODO: emit
            }
            else {
                /* eslint-disable-next-line no-console */
                console.error(err); // TODO: emit
            }
            if (this.#ws !== undefined) {
                this.#ws = undefined;
            }
        }
        finally {
            this.#loggingIn = false;
        }
    };
    /**
     * Closes the connection.
     * @param reconnect Whether to reconnect after closing.
     */
    close(reconnect = true) {
        this.#ws?.close(reconnect ? constants_1.GATEWAY_CLOSE_CODES.USER_TERMINATE_RECONNECT : constants_1.GATEWAY_CLOSE_CODES.USER_TERMINATE);
    }
    /**
     * Obtains the websocket url from Discord's REST API. Will attempt to login again after some time if the return status !== 200 and !== 401.
     * @returns Url if status === 200; or undefined if status !== 200.
     */
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
    /**
     * Emits logging message and sets a timeout to re-attempt login. Throws on 401 status code.
     * @param status HTTP status code.
     * @param statusText Status message from Discord.
     * @param dataMessage Discord's error message.
     * @param dataCode Discord's error code.
     */
    handleBadStatus(status, statusText, dataMessage, dataCode) {
        let message = `Failed to get websocket information from API. Status ${status}. Status text: ${statusText}. Discord code: ${dataCode}. Discord message: ${dataMessage}.`;
        if (status !== 401) {
            message += ` Trying again in ${this.#wsUrlRetryWait} seconds.`;
            this.log('WARNING', message);
            setTimeout(this.login, this.#wsUrlRetryWait);
        }
        else {
            // 401 is bad token, unable to continue.
            message += ' Please check your token.';
            throw Error(message);
        }
    }
    /** Binds `this` to methods used by the websocket. */
    assignWebsocketMethods(websocket) {
        websocket.onopen = this._onopen;
        websocket.onerror = this._onerror;
        websocket.onclose = this._onclose;
        websocket.onmessage = this._onmessage;
    }
    /**
     * Handles emitting events from Discord. Will first pass through `this.#emitter.eventHandler` function if one exists.
     * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
     * @param data Data of the event from Discord.
     */
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
    /*
     ********************************
     ******* WEBSOCKET - OPEN *******
     ********************************
     */
    /** Assigned to websocket `onopen`. */
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
    /*
     ********************************
     ******* WEBSOCKET - ERROR ******
     ********************************
     */
    /** Assigned to websocket `onerror`. */
    _onerror = (err) => {
        this.log('ERROR', `Websocket error. Message: ${err.message}`);
    };
    /*
     ********************************
     ****** WEBSOCKET - CLOSE *******
     ********************************
     */
    /** Assigned to websocket `onclose`. Cleans up and attempts to re-connect with a fresh connection after waiting some time.
     * @param event Object containing information about the close.
     */
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
    /** Uses the close code to determine what message to log and if the client should attempt to reconnect.
     * @param code Code that came with the websocket close event.
     * @return Whether or not the client should attempt to login again.
     */
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
                message = 'Session is no longer valid. (Reconnecting with new session.)'; // Also occurs when trying to resume with a bad or mismatched token (different than identified with).
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
    /** Removes current session information. */
    clearSession() {
        this.#sessionId = undefined;
        this.#sequence = null;
        this.#wsUrl = this.#options.wsUrl;
        this.log('DEBUG', 'Session cleared.');
    }
    /** Clears heartbeat values and clears the heartbeatTimeout. */
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
    /*
     ********************************
     ****** WEBSOCKET MESSAGE *******
     ********************************
     */
    /** Assigned to websocket `onmessage`. */
    _onmessage = ({ data }) => {
        if (this.#zlibInflate) {
            return this.decompress(this.#zlibInflate, data);
        }
        return this.handleMessage(JSON.parse(data.toString()));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    /** Processes incoming messages from Discord's gateway.
     * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
     */
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
                    // back pressure may cause the interval to occur too late, hence this check
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
    /** Proxy for inline heartbeat checking. */
    _checkIfShouldHeartbeat() {
        if (this.#checkSiblingHeartbeats !== undefined)
            this.#checkSiblingHeartbeats.forEach((f) => f());
        else
            this.checkIfShouldHeartbeat();
    }
    /**
     * Set inline with the firehose of events to check if the heartbeat needs to be sent.
     * Works in tandem with startTimeout() to ensure the heartbeats are sent on time regardless of event pressure.
     * May be passed as array to other gateways so that no one gateway blocks the others from sending timely heartbeats.
     * Now receiving the ACKs on the other hand...
     */
    checkIfShouldHeartbeat = () => {
        const now = new Date().getTime();
        if (this.#heartbeatAck
            && this.#nextHeartbeatTimestamp !== undefined
            && now > this.#nextHeartbeatTimestamp) {
            this.sendHeartbeat();
        }
    };
    /**
     * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
     * @param data From Discord.
     */
    handleReady(data) {
        this.log('INFO', `Received Ready. Session ID: ${data.session_id}.`);
        this.#sessionId = data.session_id;
        this.#online = true;
        this.handleEvent('READY', data);
    }
    /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
    handleResumed() {
        this.log('INFO', 'Replay finished. Resuming events.');
        this.#online = true;
        this.handleEvent('RESUMED', null);
    }
    /**
     * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
     * @param data From Discord.
     */
    handleHello(data) {
        this.log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
        this.startHeartbeat(data.heartbeat_interval);
        this.connect(this.resumable);
        this.handleEvent('HELLO', data);
    }
    /**
     * Starts heartbeat. https://discord.com/developers/docs/topics/gateway#heartbeating
     * @param heartbeatTimeout From Discord - Number of ms to wait between sending heartbeats.
     */
    startHeartbeat(heartbeatTimeout) {
        this.#heartbeatAck = true;
        this.#receivedHeartbeatIntervalTime = heartbeatTimeout;
        this.#heartbeatIntervalTime = heartbeatTimeout - this.#heartbeatIntervalOffset;
        this.refreshHeartbeatTimeout();
        this.refreshHeartbeatAckTimeout();
    }
    /**
     * Clears old heartbeat timeout and starts a new one.
     */
    refreshHeartbeatTimeout = () => {
        if (this.#heartbeatIntervalTime !== undefined) {
            if (this.#heartbeatTimeout !== undefined)
                clearTimeout(this.#heartbeatTimeout);
            const randomOffset = Math.random() * 5 * constants_1.SECOND_IN_MILLISECONDS;
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
    /** Checks if heartbeat ack was received. */
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
    /** Handles "Heartbeat ACK" packet from Discord. https://discord.com/developers/docs/topics/gateway#heartbeating */
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
    /** Connects to gateway. */
    async connect(resume) {
        if (resume) {
            this.resume();
        }
        else {
            this.identify();
        }
    }
    /** Sends a "Resume" payload to Discord's gateway. */
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
    /** Sends an "Identify" payload. */
    async identify() {
        const [shardId, shardCount] = this.shard ?? [0, 1];
        this.log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
        this.emit('GATEWAY_IDENTIFY', this);
        this.send(constants_1.GATEWAY_OP_CODES.IDENTIFY, this.#identity.toJSON());
    }
    /**
     * Sends a websocket message to Discord.
     * @param op Gateway Opcode https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
     * @param data Data of the message.
     * @returns true if the packet was sent; false if the packet was not due to rate limiting or websocket not open.
     */
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
    /**
     * Returns whether or not the message to be sent will exceed the rate limit or not, taking into account padded buffers for high priority packets (e.g. heartbeats, resumes).
     * @param op Op code of the message to be sent.
     * @returns true if sending message won't exceed rate limit or padding; false if it will
     */
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
    /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
    updateWsRateLimit() {
        if (this.#wsRateLimitCache.remainingRequests === constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE) {
            this.#wsRateLimitCache.resetTimestamp = new Date().getTime() + constants_1.MINUTE_IN_MILLISECONDS;
        }
        --this.#wsRateLimitCache.remainingRequests;
    }
    /**
     * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
     * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
     * @param resumable Whether or not Discord has said that the connection as able to be resumed.
     */
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
    /**
     * Updates the sequence value of Discord's gateway if it's larger than the current.
     * @param s Sequence value from Discord.
     */
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
