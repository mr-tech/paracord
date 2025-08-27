"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const structures_1 = require("./structures");
/** A client to handle a Discord gateway connection. */
class Gateway {
    #options;
    /** Emitter for gateway and Api events. Will create a default if not provided via the options. */
    #emitter;
    /** Object passed to Discord when identifying. */
    #identity;
    #session = null;
    /**
     * Creates a new Discord gateway handler.
     * @param token Discord token. Will be coerced into a bot token.
     * @param options Optional parameters for this handler.
     */
    constructor(token, options) {
        const { emitter, identity, identity: { shard }, } = options;
        if (shard !== undefined && (shard[0] === undefined || shard[1] === undefined)) {
            throw Error(`Invalid shard provided to gateway. shard id: ${shard[0]} | shard count: ${shard[1]}`);
        }
        this.#identity = new structures_1.GatewayIdentify((0, utils_1.coerceTokenToBotLike)(token), identity);
        this.#options = options;
        this.#emitter = emitter;
    }
    /** [ShardID, ShardCount] to identify with; `undefined` if not sharding. */
    get shard() {
        return this.#identity.shard !== undefined ? this.#identity.shard : undefined;
    }
    /** The shard id that this gateway is connected to. */
    get id() {
        return this.#identity.shard !== undefined ? this.#identity.shard[0] : 0;
    }
    get compression() {
        return !!this.#identity.compress;
    }
    setCompression(compress) {
        this.#identity.compress = compress;
    }
    /** This gateway's active websocket connection. */
    get ws() {
        return this.#session?.connection;
    }
    /** Whether or not the websocket is open. */
    get connected() {
        return !!this.#session?.connected;
    }
    get resumable() {
        return !!this.#session?.resumable;
    }
    /** Whether or not the client is currently resuming a session. */
    get resuming() {
        return !!this.#session?.resuming;
    }
    get options() {
        return this.#options;
    }
    get heartbeat() {
        return this.#session?.websocket?.heartbeat;
    }
    get isFetchingMembers() {
        return !!this.#session?.isFetchingMembers;
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
    setToken(token) {
        const botToken = (0, utils_1.coerceTokenToBotLike)(token);
        this.#identity = new structures_1.GatewayIdentify(botToken, this.#identity);
    }
    /**
     * Sends a `Request Guild Members` websocket message.
     * @param guildId Id of the guild to request members from.
     * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
     */
    requestGuildMembers(options) {
        return this.#session?.requestGuildMembers(options) ?? false;
    }
    updatePresence(presence) {
        void this.handleEvent('PRESENCE_UPDATE', { gateway: this, presence });
        if (!this.#session) {
            this.log('WARNING', 'Session is null when updating presence.');
            return false;
        }
        const sent = this.#session.send(constants_1.GATEWAY_OP_CODES.GATEWAY_PRESENCE_UPDATE, presence);
        if (sent)
            this.#identity.updatePresence(presence);
        return sent;
    }
    login = async () => {
        if (!this.#session) {
            this.#session = new structures_1.Session({
                gateway: this,
                identity: this.#identity,
                wsUrl: this.#options.wsUrl,
                wsParams: this.#options.wsParams,
                log: this.log.bind(this),
                handleEvent: this.handleEvent.bind(this),
                emit: this.emit.bind(this),
                onClose: this.handleClose.bind(this),
            });
        }
        await this.#session?.login();
    };
    close(code = constants_1.GATEWAY_CLOSE_CODES.USER_TERMINATE_RECONNECT, flushWait = 0) {
        this.#session?.close(code, flushWait);
    }
    checkIfShouldHeartbeat() {
        return this.#session?.websocket?.heartbeat.checkIfShouldHeartbeat();
    }
    /**
     * Handles emitting events from Discord. Will first pass through `this.#emitter.handleEvent` function if one exists.
     * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
     * @param data Data of the event from Discord.
     */
    handleEvent(type, data) {
        void this.#emitter.handleEvent(type, data, this);
    }
    handleClose(code) {
        const shouldReconnect = this.handleCloseCode(code);
        const gatewayCloseEvent = { shouldReconnect, code, gateway: this };
        this.emit('GATEWAY_CLOSE', gatewayCloseEvent);
    }
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
                message = 'Unknown close code. (Reconnecting with new session.)';
                this.clearSession();
        }
        this.log(level, `Websocket closed. Code: ${code}. Reason: ${message}`);
        return shouldReconnect;
    }
    clearSession() {
        this.#session?.destroy();
        this.#session = null;
    }
}
exports.default = Gateway;
