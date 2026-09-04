"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const constants_1 = require("../../../constants");
const utils_1 = require("../../../utils");
const closeOrigin_1 = require("./closeOrigin");
const Websocket_1 = __importDefault(require("./Websocket"));
/** Idle time since a nonce's last chunk before its entry is dropped (WP-1 step 4c, F-4). */
const CHUNK_STATE_TTL_MILLISECONDS = 60 * constants_1.SECOND_IN_MILLISECONDS;
/** @internal */
class Session {
    #gateway;
    #identity;
    /** The amount of events received during a resume. */
    #eventsDuringResume = 0;
    /** Websocket used to connect to gateway. */
    #websocket;
    /** Websocket URL instructed to connect to. Also used to indicate it the client has an open websocket. */
    #wsUrl;
    /** From Discord - Url to reconnect to. */
    #resumeUrl;
    /** Consecutive ABNORMAL (1006) closes against `#resumeUrl`; abandons the host at 3 (WP-1 step 2, F-19). */
    #consecutiveAbnormalOnResumeHost = 0;
    /** Whether the connection attempt that just closed was made against `#resumeUrl` — set at login, read at close, since `#resumeUrl` itself may already reflect a later READY by the time a close is handled. */
    #lastAttemptTargetedResumeHost = false;
    /** Whether or not the client is currently resuming a session. */
    #resuming = false;
    #wsParams;
    /** From Discord - Most recent event sequence id received. https://discord.com/developers/docs/topics/gateway#payloads */
    #sequence = null;
    /** From Discord - Id of this gateway connection. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
    #sessionId;
    #membersRequestNonceCounter = 0;
    #requestingMembersStateMap = new Map();
    #gatewayHandleEvent;
    #log;
    #emit;
    #onClose;
    constructor(params) {
        const { gateway, identity, wsUrl, wsParams, emit, log, handleEvent, onClose, } = params;
        this.#gateway = gateway;
        this.#identity = identity;
        this.#log = log;
        this.#gatewayHandleEvent = handleEvent;
        this.#emit = emit;
        this.#wsUrl = wsUrl;
        this.#wsParams = wsParams;
        this.#onClose = onClose;
        this.#log('DEBUG', `Session object created with url: ${wsUrl}.`);
    }
    get connection() {
        return this.#websocket?.connection;
    }
    /** Whether or not the websocket is open. */
    get connected() {
        return this.connection?.readyState === ws_1.default.OPEN;
    }
    /**
     * Whether or not the client has the conditions necessary to attempt to resume a
     * gateway connection — session identity alone (a held `session_id` and a sequence
     * seen), decoupled from `#resumeUrl` (WP-1 step 2, critique F-19): after the resume
     * host is abandoned, the session survives and resumes against the base URL.
     */
    get resumable() {
        return this.#sessionId !== undefined && this.#sequence !== null;
    }
    /** Whether or not the client is currently resuming a session. */
    get resuming() {
        return this.#resuming;
    }
    get sequence() {
        return this.#sequence;
    }
    get websocket() {
        return this.#websocket;
    }
    get gateway() {
        return this.#gateway;
    }
    get identity() {
        return this.#identity;
    }
    get isFetchingMembers() {
        this.sweepStaleChunkState();
        return this.#requestingMembersStateMap.size > 0;
    }
    /**
     * Drops any nonce whose last chunk is older than the TTL — a pure predicate over
     * elapsed time (time-seam rule), evaluated here (read) and by the heartbeat's inline
     * check (`Gateway.isFetchingMembers` on every dispatch), never a timer per entry.
     */
    sweepStaleChunkState() {
        const now = new Date().getTime();
        for (const [nonce, state] of this.#requestingMembersStateMap) {
            if (now - state.lastChunkAt >= CHUNK_STATE_TTL_MILLISECONDS) {
                this.#requestingMembersStateMap.delete(nonce);
            }
        }
    }
    log = (...args) => this.#log(...args);
    emit = (...args) => this.#emit(...args);
    /**
     * Sends a `Request Guild Members` websocket message.
     * @param guildId Id of the guild to request members from.
     * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
     */
    requestGuildMembers(options) {
        if (this.#websocket === undefined) {
            this.#log('WARNING', 'Failed to request guild members. Session websocket is undefined.');
            return false;
        }
        if (options.nonce === undefined) {
            options.nonce = `${options.guild_id}-${++this.#membersRequestNonceCounter}`;
        }
        this.#requestingMembersStateMap.set(options.nonce, { receivedIndexes: new Set(), lastChunkAt: new Date().getTime() });
        void this.#gatewayHandleEvent('REQUEST_GUILD_MEMBERS', { gateway: this.#gateway, options });
        const sent = this.#websocket.send(constants_1.GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);
        // The payload never left the process, so no chunks will arrive to clear this nonce. Leaving it
        // would pin `isFetchingMembers` true, which indefinitely vetoes the missed-heartbeat close.
        if (!sent)
            this.#requestingMembersStateMap.delete(options.nonce);
        return sent;
    }
    /**
     * Connects to Discord's event gateway.
     * @param _websocket Ignore. For unittest dependency injection only.
     */
    login = () => {
        if (this.#websocket !== undefined) {
            throw Error('Client is already initialized.');
        }
        try {
            const wsUrl = this.constructWsUrl();
            this.#log('INFO', `${this.#resumeUrl ? 'Resuming on' : 'Connecting to'} url: ${wsUrl}`);
            this.#websocket = new Websocket_1.default({
                ws: ws_1.default,
                session: this,
                url: wsUrl,
                onClose: this.handleClose.bind(this),
            });
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
            this.#websocket?.destroy();
            this.#websocket = undefined;
        }
    };
    close(code, flushWaitTime = 0) {
        if (this.#websocket === undefined) {
            // QUEUED (F-2): no socket, but the gateway is still tracked (Session survives a
            // P-keep close). Runs the close path directly — the arm for `code`, one
            // `GATEWAY_CLOSE` — without a socket to touch.
            const origin = (0, closeOrigin_1.takePendingOrigin)(this.#gateway) ?? 'consumer';
            this.handleClose(code, origin);
            return;
        }
        this.#websocket.close(code, flushWaitTime);
    }
    send = (op, data) => {
        if (!this.#websocket) {
            this.#log('WARNING', 'Failed to send payload. Session websocket is undefined.');
            return false;
        }
        return this.#websocket.send(op, data);
    };
    destroy() {
        this.#websocket?.destroy();
        this.#websocket = undefined;
        this.#log('INFO', `Session ${this.#sessionId} destroyed.`);
        this.#eventsDuringResume = 0;
        this.#membersRequestNonceCounter = 0;
        this.#requestingMembersStateMap = new Map();
        this.#sessionId = undefined;
        this.#resumeUrl = undefined;
    }
    constructWsUrl() {
        if (!this.resumable)
            this.#resumeUrl = undefined;
        const endpoint = this.#resumeUrl ?? this.#wsUrl;
        this.#lastAttemptTargetedResumeHost = this.#resumeUrl !== undefined;
        const params = { ...this.#wsParams };
        if (this.#identity.compress) {
            this.#log('DEBUG', 'Compressing websocket connection.');
            params.compress = 'zlib-stream';
        }
        return `${endpoint}?${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}`;
    }
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
                    void this.handleEvent(type, data);
                }
                else {
                    this.#log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
                }
                break;
            case constants_1.GATEWAY_OP_CODES.HELLO:
                this.handleHello(data);
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT:
                if (!this.#resuming)
                    this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.#sequence);
                break;
            case constants_1.GATEWAY_OP_CODES.INVALID_SESSION:
                this.handleInvalidSession(data);
                break;
            case constants_1.GATEWAY_OP_CODES.RECONNECT:
                (0, closeOrigin_1.setPendingOrigin)(this.#gateway, 'discord');
                this.close(constants_1.GATEWAY_CLOSE_CODES.RECONNECT);
                break;
            default:
        }
    }
    /**
     * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
     * @param data From Discord.
     */
    handleReady(data) {
        this.#log('DEBUG', `Received Ready. Session ID: ${data.session_id}.`);
        this.#resumeUrl = data.resume_gateway_url;
        this.#sessionId = data.session_id;
        this.#consecutiveAbnormalOnResumeHost = 0;
        void this.handleEvent('READY', data);
    }
    /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
    handleResumed() {
        this.#log('INFO', `Replay finished after ${this.#eventsDuringResume} events. Resuming events.`);
        this.#resuming = false;
        this.#consecutiveAbnormalOnResumeHost = 0;
        void this.handleEvent('RESUMED', null);
    }
    /**
     * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
     * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
     * @param resumable Whether or not Discord has said that the connection as able to be resumed.
     */
    handleInvalidSession(resumable) {
        this.#log('WARNING', `Received Invalid Session packet. Resumable: ${resumable}`);
        (0, closeOrigin_1.setPendingOrigin)(this.#gateway, 'discord');
        if (!resumable) {
            this.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
        }
        else {
            this.close(constants_1.GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
        }
        void this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
    }
    /**
     * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
     * @param data From Discord.
     */
    handleHello(data) {
        this.#log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
        this.connect(this.resumable);
        void this.handleEvent('HELLO', data);
    }
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
        this.#log('DEBUG', `Attempting to resume connection. Session Id: ${this.#sessionId}. Sequence: ${this.#sequence}`);
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
            this.#log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionId: ${sessionId}, sequence: ${sequence}`);
            (0, closeOrigin_1.setPendingOrigin)(this.#gateway, 'transport');
            this.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    /** Sends an "Identify" payload. */
    identify() {
        if (this.#sequence !== null) {
            this.#log('WARNING', `Unexpected sequence ${this.#sequence} when identifying.`);
            this.#sequence = null;
        }
        const [shardId, shardCount] = this.#identity.shard ?? [0, 1];
        this.#log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
        this.#emit('GATEWAY_IDENTIFY', this);
        this.send(constants_1.GATEWAY_OP_CODES.IDENTIFY, this.#identity.toJSON());
    }
    handleEvent(type, data) {
        if (type === 'GUILD_MEMBERS_CHUNK')
            this.handleGuildMemberChunk(data);
        void this.#gatewayHandleEvent(type, data);
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
                this.#log('WARNING', `Non-consecutive sequence (${this.#sequence} -> ${s})`);
            }
            if (s > this.#sequence) {
                this.#sequence = s;
            }
        }
    }
    handleClose(code, origin) {
        const isResumeHostAbnormalFailure = code === constants_1.GATEWAY_CLOSE_CODES.ABNORMAL && this.#lastAttemptTargetedResumeHost;
        if (isResumeHostAbnormalFailure) {
            this.#consecutiveAbnormalOnResumeHost += 1;
            if (this.#consecutiveAbnormalOnResumeHost >= 3) {
                this.#log('WARNING', `Resume host failed ${this.#consecutiveAbnormalOnResumeHost} consecutive times. Abandoning it — the session continues on the base host.`);
                this.#resumeUrl = undefined;
                this.#consecutiveAbnormalOnResumeHost = 0;
            }
        }
        else {
            this.#consecutiveAbnormalOnResumeHost = 0;
        }
        this.websocket?.destroy();
        this.#websocket = undefined;
        // H5(a): a cut member-chunk stream cannot outlive the close it was cut by, on any
        // close code — P-keep included, so a reconnect starts with no stale nonce pinning
        // `isFetchingMembers` true and vetoing the next heartbeat's missed-ack close.
        this.#requestingMembersStateMap = new Map();
        this.#onClose(code, origin);
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
            // Set semantics (H5(b)): a duplicate index is already received, not a new slot —
            // completion is every index in 0..chunkCount-1 having been seen, not a count of
            // deliveries, which a duplicate or an out-of-order replay would otherwise skew.
            guildChunkState.receivedIndexes.add(chunkIndex);
            guildChunkState.lastChunkAt = new Date().getTime();
            if (guildChunkState.receivedIndexes.size === chunkCount) {
                this.#requestingMembersStateMap.delete(nonce);
            }
        }
    }
}
exports.default = Session;
