"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const structures_1 = require("./structures");
/** A client to handle a Discord gateway connection. */
class Gateway {
    /** Whether or not this client should be considered 'online', connected to the gateway and receiving events. */
    #online;
    #loggingIn;
    /** Whether or not the client is currently resuming a session. */
    #resuming;
    #connectTimeout;
    #options;
    /** Emitter for gateway and Api events. Will create a default if not provided via the options. */
    #emitter;
    /** Object passed to Discord when identifying. */
    #identity;
    #isStartingFunction;
    #isStarting;
    #checkIfStartingInterval;
    #membersRequestCounter;
    #requestingMembersStateMap;
    // WEBSOCKET
    /** Websocket used to connect to gateway. */
    #ws;
    /** Websocket URL instructed to connect to. Also used to indicate it the client has an open websocket. */
    #wsUrl;
    /** From Discord - Url to reconnect to. */
    #resumeUrl;
    #wsParams;
    #wsRateLimitCache;
    /** From Discord - Most recent event sequence id received. https://discord.com/developers/docs/topics/gateway#payloads */
    #sequence;
    /** From Discord - Id of this gateway connection. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
    #sessionId;
    // #zlibInflate: null | ZlibSyncType.Inflate = null;
    // HEARTBEAT
    /** If the last heartbeat packet sent to Discord received an ACK. */
    #hbAcked;
    /** Time when last heartbeat packet was sent in ms. */
    #prevHbTimestamp;
    /** Time when the next heartbeat packet should be sent in ms. */
    #nextHbTimestamp;
    /** Node timer for sending the next heartbeat. */
    #nextHbTimer;
    /** Node timeout for timing out the shard and reconnecting. */
    #hbAckTimeout;
    /** Time between heartbeats with user offset subtracted. */
    #hbIntervalTime;
    /** Time in seconds to wait for delayed ACK after missed heartbeat. */
    #hbAckWaitTime;
    /** Time in seconds subtracted from the heartbeat interval. Used to increase the frequency of heartbeats. */
    #hbIntervalOffset;
    /** Other gateway heartbeat checks. */
    #checkSiblingHeartbeats;
    /** The amount of events received during a resume. */
    #eventsDuringResume;
    /**
     * Creates a new Discord gateway handler.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
    constructor(token, options) {
        const { emitter, identity, identity: { shard }, wsUrl, wsParams, heartbeatIntervalOffset, checkSiblingHeartbeats, heartbeatTimeoutSeconds, isStarting, } = options;
        if (shard !== undefined && (shard[0] === undefined || shard[1] === undefined)) {
            throw Error(`Invalid shard provided to gateway. shard id: ${shard[0]} | shard count: ${shard[1]}`);
        }
        this.#options = options;
        this.#sequence = null;
        this.#hbAcked = true;
        this.#online = false;
        this.#loggingIn = false;
        this.#isStarting = false;
        this.#wsRateLimitCache = {
            remainingRequests: constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE,
            resetTimestamp: 0,
        };
        this.#membersRequestCounter = 0;
        this.#requestingMembersStateMap = new Map();
        this.#emitter = emitter;
        this.#identity = new structures_1.GatewayIdentify((0, utils_1.coerceTokenToBotLike)(token), identity);
        this.#hbIntervalOffset = heartbeatIntervalOffset || 0;
        this.#isStartingFunction = isStarting;
        this.#checkSiblingHeartbeats = checkSiblingHeartbeats;
        this.#wsUrl = wsUrl;
        this.#wsParams = wsParams;
        this.#hbAckWaitTime = heartbeatTimeoutSeconds ? (heartbeatTimeoutSeconds * constants_1.SECOND_IN_MILLISECONDS) : undefined;
        this.#resuming = false;
        this.#eventsDuringResume = 0;
    }
    /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
    get resumable() {
        return this.#sessionId !== undefined && this.#sequence !== null && this.#resumeUrl !== undefined;
    }
    /** Whether or not the client is currently resuming a session. */
    get resuming() {
        return this.#resuming;
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
        return this.#hbAcked;
    }
    /** Between Heartbeat/ACK, time when last heartbeat packet was sent in ms. */
    get lastHeartbeatTimestamp() {
        return this.#prevHbTimestamp;
    }
    /** Time when the next heartbeat packet should be sent in ms. */
    get nextHeartbeatTimestamp() {
        return this.#nextHbTimestamp;
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
        data.shard = this;
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
            this.#emitter.emit(type, data, this);
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
        if (options.nonce === undefined) {
            options.nonce = `${options.guild_id}-${++this.#membersRequestCounter}`;
        }
        this.#requestingMembersStateMap.set(options.nonce, { receivedIndexes: [] });
        void this.handleEvent('REQUEST_GUILD_MEMBERS', { gateway: this, options });
        return this.send(constants_1.GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);
    }
    updatePresence(presence) {
        void this.handleEvent('PRESENCE_UPDATE', { gateway: this, presence });
        const sent = this.send(constants_1.GATEWAY_OP_CODES.GATEWAY_PRESENCE_UPDATE, presence);
        if (sent)
            this.#identity.updatePresence(presence);
        return sent;
    }
    /**
     * Connects to Discord's event gateway.
     * @param _websocket Ignore. For unittest dependency injection only.
     */
    login = async (_websocket = ws_1.default) => {
        if (this.#ws !== undefined) {
            throw Error('Client is already connected.');
        }
        if (this.#loggingIn) {
            throw Error('Already logging in.');
        }
        // if (ZlibSync || this.#identity.compress) {
        //   if (!ZlibSync) throw Error('zlib-sync is required for compression');
        //   this.#zlibInflate = new ZlibSync.Inflate({
        //     flush: ZlibSync.Z_SYNC_FLUSH,
        //     chunkSize: ZLIB_CHUNKS_SIZE,
        //   });
        // }
        try {
            this.#loggingIn = true;
            const wsUrl = this.constructWsUrl();
            this.log('DEBUG', `Connecting to url: ${wsUrl}`);
            const client = new _websocket(wsUrl, { maxPayload: constants_1.GIGABYTE_IN_BYTES });
            this.#ws = client;
            this.#ws.onopen = this.handleWsOpen;
            this.#ws.onclose = this.handleWsClose;
            this.#ws.onerror = this.handleWsError;
            this.#ws.onmessage = this.handleWsMessage;
            this.setConnectTimeout(client);
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
    setConnectTimeout(client) {
        this.#connectTimeout = setTimeout(() => {
            this.clearConnectTimeout();
            if (client.readyState === ws_1.default.OPEN) {
                client.onopen = null;
                client.onmessage = null;
                client.onerror = null;
                client.close(constants_1.GATEWAY_CLOSE_CODES.CONNECT_TIMEOUT);
                this.log('WARNING', 'Websocket open but didn\'t receive HELLO event in time.');
            }
            else if (client.readyState === ws_1.default.CONNECTING) {
                if (client === this.#ws) {
                    client.onopen = () => client.close(1000);
                    client.onmessage = () => client.close(1000);
                    client.onerror = () => client.close(1000);
                    client.onclose = null;
                    this.#ws = undefined;
                    this.log('WARNING', 'Failed to connect to websocket. Retrying.');
                    void this.login();
                }
            }
            else {
                this.log('WARNING', 'Unexpected timeout while websocket is in CLOSING / CLOSED state.');
            }
        }, 5 * constants_1.SECOND_IN_MILLISECONDS);
    }
    constructWsUrl() {
        if (!this.resumable)
            this.#resumeUrl = undefined;
        const endpoint = this.#resumeUrl ?? this.#wsUrl;
        return `${endpoint}?${Object.entries(this.#wsParams).map(([k, v]) => `${k}=${v}`).join('&')}`;
    }
    /**
     * Closes the connection.
     * @param reconnect Whether to reconnect after closing.
     */
    close(code = constants_1.GATEWAY_CLOSE_CODES.USER_TERMINATE_RECONNECT) {
        this.#ws?.close(code);
    }
    /**
     * Handles emitting events from Discord. Will first pass through `this.#emitter.handleEvent` function if one exists.
     * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
     * @param data Data of the event from Discord.
     */
    handleEvent(type, data) {
        if (type === 'GUILD_MEMBERS_CHUNK')
            this.handleGuildMemberChunk(data);
        void this.#emitter.handleEvent(type, data, this);
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
    handleWsOpen = () => {
        this.log('DEBUG', 'Websocket open.');
        this.#wsRateLimitCache.remainingRequests = constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE;
        if (this.#isStartingFunction !== undefined) {
            this.#isStarting = this.#isStartingFunction(this);
            this.#checkIfStartingInterval = setInterval(this.checkIfStarting, 100);
        }
        this.emit('GATEWAY_OPEN', this);
    };
    checkIfStarting = () => {
        this.#isStarting = !!this.#isStartingFunction?.(this);
        if (!this.#isStarting && this.#checkIfStartingInterval !== undefined)
            clearInterval(this.#checkIfStartingInterval);
    };
    /*
     ********************************
     ******* WEBSOCKET - ERROR ******
     ********************************
     */
    /** Assigned to websocket `onerror`. */
    handleWsError = (err) => {
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
    handleWsClose = (event) => {
        this.#ws = undefined;
        this.#online = false;
        this.#resuming = false;
        this.#membersRequestCounter = 0;
        this.#requestingMembersStateMap = new Map();
        this.clearHeartbeat();
        this.clearConnectTimeout();
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
        const { CLEAN, GOING_AWAY, ABNORMAL, UNKNOWN_ERROR, UNKNOWN_OPCODE, DECODE_ERROR, NOT_AUTHENTICATED, AUTHENTICATION_FAILED, ALREADY_AUTHENTICATED, SESSION_NO_LONGER_VALID, INVALID_SEQ, RATE_LIMITED, SESSION_TIMEOUT, INVALID_SHARD, SHARDING_REQUIRED, INVALID_VERSION, INVALID_INTENT, DISALLOWED_INTENT, CONNECT_TIMEOUT, INTERNAL_TERMINATE_RECONNECT, RECONNECT, SESSION_INVALIDATED, SESSION_INVALIDATED_RESUMABLE, HEARTBEAT_TIMEOUT, USER_TERMINATE_RESUMABLE, USER_TERMINATE_RECONNECT, USER_TERMINATE, UNKNOWN, } = constants_1.GATEWAY_CLOSE_CODES;
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
            case CONNECT_TIMEOUT:
                message = 'Connection timed out before any events were received. (Reconnecting.)';
                break;
            case INTERNAL_TERMINATE_RECONNECT:
                message = 'Something internal caused a reconnect. (Reconnecting with new session.)';
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
                this.clearSession();
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
        this.#resumeUrl = undefined;
        this.#sequence = null;
        this.#wsUrl = this.#options.wsUrl;
        this.log('DEBUG', 'Session cleared.');
    }
    /** Clears heartbeat values and clears the heartbeatTimers. */
    clearHeartbeat() {
        this.clearAckTimeout();
        this.clearHeartbeatTimer();
        this.#hbAcked = false;
        this.#prevHbTimestamp = undefined;
        this.#nextHbTimestamp = undefined;
        this.#hbIntervalTime = undefined;
        this.#hbAckWaitTime = undefined;
        this.#eventsDuringResume = 0;
        this.log('DEBUG', 'Heartbeat cleared.');
    }
    clearHeartbeatTimer() {
        if (this.#nextHbTimer)
            clearInterval(this.#nextHbTimer);
        this.#nextHbTimer = undefined;
    }
    clearAckTimeout() {
        if (this.#hbAckTimeout)
            clearTimeout(this.#hbAckTimeout);
        this.#hbAckTimeout = undefined;
    }
    clearConnectTimeout() {
        if (this.#connectTimeout)
            clearTimeout(this.#connectTimeout);
        this.#connectTimeout = undefined;
    }
    /*
     ********************************
     ****** WEBSOCKET MESSAGE *******
     ********************************
     */
    /** Assigned to websocket `onmessage`. */
    // eslint-disable-next-line arrow-body-style
    handleWsMessage = ({ data }) => {
        // if (this.#zlibInflate) {
        //   return this.decompress(this.#zlibInflate, data);
        // }
        let parsed;
        try {
            parsed = JSON.parse(data.toString());
        }
        catch (e) {
            this.log('ERROR', `Failed to parse message. Message: ${data}`);
            this.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
            throw e;
        }
        return this.handleMessage(parsed);
    };
    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // private decompress(inflate: ZlibSyncType.Inflate, data: any): void {
    //   if (data instanceof ArrayBuffer) data = new Uint8Array(data);
    //   const done = data.length >= 4 && data.readUInt32BE(data.length - 4) === 0xFFFF;
    //   if (done) {
    //     inflate.push(data, Z_SYNC_FLUSH);
    //     if (inflate.err) {
    //       this.log('ERROR', `zlib error ${inflate.err}: ${inflate.msg}`);
    //       return;
    //     }
    //     data = Buffer.from(inflate.result);
    //     this.handleMessage(JSON.parse(data.toString()));
    //     return;
    //   }
    //   inflate.push(data, false);
    // }
    /** Processes incoming messages from Discord's gateway.
     * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
     */
    handleMessage(p) {
        const { t: type, s: sequence, op: opCode, d: data, } = p;
        this.updateSequence(sequence);
        if (this.#resuming && (opCode !== constants_1.GATEWAY_OP_CODES.DISPATCH || (type !== 'RESUMED' && type !== 'READY'))) {
            ++this.#eventsDuringResume;
        }
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
                    this.checkHeartbeatInline();
                    void this.handleEvent(type, data);
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
    }
    /** Proxy for inline heartbeat checking. */
    checkHeartbeatInline() {
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
        if (this.#hbAcked
            && this.#nextHbTimestamp !== undefined
            && now > this.#nextHbTimestamp) {
            this.sendHeartbeat();
        }
    };
    /** Handles "Heartbeat ACK" packet from Discord. https://discord.com/developers/docs/topics/gateway#heartbeating */
    handleHeartbeatAck() {
        this.clearAckTimeout();
        this.#hbAcked = true;
        if (this.#prevHbTimestamp !== undefined) {
            const now = new Date().getTime();
            const latency = now - this.#prevHbTimestamp;
            void this.handleEvent('HEARTBEAT_ACK', { latency, gateway: this });
            const message = `Heartbeat acknowledged. Latency: ${latency}ms.`;
            this.#prevHbTimestamp = undefined;
            this.log('DEBUG', message);
        }
    }
    /**
     * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
     * @param data From Discord.
     */
    handleReady(data) {
        this.log('INFO', `Received Ready. Session ID: ${data.session_id}.`);
        this.#resumeUrl = data.resume_gateway_url;
        this.#sessionId = data.session_id;
        this.#online = true;
        void this.handleEvent('READY', data);
    }
    /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
    handleResumed() {
        this.log('INFO', `Replay finished after ${this.#eventsDuringResume} events. Resuming events.`);
        this.#online = true;
        this.#resuming = false;
        void this.handleEvent('RESUMED', null);
    }
    /**
     * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
     * @param data From Discord.
     */
    handleHello(data) {
        this.clearConnectTimeout();
        this.log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
        this.startHeartbeat(data.heartbeat_interval);
        this.connect(this.resumable);
        void this.handleEvent('HELLO', data);
    }
    /**
     * Starts heartbeat. https://discord.com/developers/docs/topics/gateway#heartbeating
     * @param heartbeatTimeout From Discord - Number of ms to wait between sending heartbeats.
     */
    startHeartbeat(heartbeatTimeout) {
        this.#hbAcked = true;
        this.#hbIntervalTime = heartbeatTimeout - (this.#hbIntervalOffset * constants_1.SECOND_IN_MILLISECONDS);
        this.setHeartbeatTimer();
    }
    /**
     * Clears old heartbeat timeout and starts a new one.
     */
    setHeartbeatTimer() {
        if (this.#hbIntervalTime !== undefined) {
            this.clearHeartbeatTimer();
            const randomOffset = Math.floor(Math.random() * 5 * constants_1.SECOND_IN_MILLISECONDS);
            const nextSendTime = this.#hbIntervalTime - randomOffset;
            this.#nextHbTimer = setTimeout(this.sendHeartbeat, nextSendTime);
            const now = new Date().getTime();
            this.#nextHbTimestamp = now + nextSendTime;
        }
        else {
            this.log('ERROR', 'heartbeatIntervalTime undefined.');
            this.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    sendHeartbeat = () => {
        if (this.#hbAckTimeout === undefined && this.#hbIntervalTime && this.#hbAckWaitTime) {
            this.#hbAckTimeout = setTimeout(this.timeoutShard, this.#hbIntervalTime + this.#hbAckWaitTime);
        }
        const now = new Date().getTime();
        if (this.#nextHbTimestamp !== undefined) {
            const scheduleDiff = Math.max(0, now - (this.#nextHbTimestamp ?? now));
            const message = `Heartbeat sent ${scheduleDiff}ms after scheduled time.`;
            void this.handleEvent('HEARTBEAT_SENT', { scheduleDiff, gateway: this });
            this.log('DEBUG', message);
        }
        else {
            const message = 'nextHeartbeatTimestamp is undefined.';
            this.log('DEBUG', message);
        }
        this.#prevHbTimestamp = now;
        this.#hbAcked = false;
        this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.#sequence);
        this.setHeartbeatTimer();
    };
    /** Checks if heartbeat ack was received. */
    timeoutShard = () => {
        if (!this.#hbAcked) {
            this.log('ERROR', 'Heartbeat not acknowledged in time.');
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
        }
    };
    /** Connects to gateway. */
    connect(resume) {
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
            this.#resuming = true;
            this.#eventsDuringResume = 0;
            const payload = {
                token,
                session_id: sessionId,
                seq: sequence,
            };
            void this.handleEvent('GATEWAY_RESUME', payload);
            this.send(constants_1.GATEWAY_OP_CODES.RESUME, payload);
        }
        else {
            this.log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionId: ${sessionId}, sequence: ${sequence}`);
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    /** Sends an "Identify" payload. */
    identify() {
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
        this.log('ERROR', 'Failed to send payload.', { payload: { op, d: data } });
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
            const now = new Date().getTime();
            this.#wsRateLimitCache.resetTimestamp = now + constants_1.MINUTE_IN_MILLISECONDS;
        }
        --this.#wsRateLimitCache.remainingRequests;
    }
    /**
     * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
     * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
     * @param resumable Whether or not Discord has said that the connection as able to be resumed.
     */
    handleInvalidSession(resumable) {
        this.log('WARNING', `Received Invalid Session packet. Resumable: ${resumable}`);
        if (!resumable) {
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
        }
        else {
            this.#ws?.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
        }
        void this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
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
