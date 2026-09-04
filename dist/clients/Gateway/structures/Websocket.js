"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const ws_1 = __importDefault(require("ws"));
const zlib_1 = __importDefault(require("zlib"));
const constants_1 = require("../../../constants");
const utils_1 = require("../../../utils");
const closeOrigin_1 = require("./closeOrigin");
const Heartbeat_1 = __importDefault(require("./Heartbeat"));
const wireCloseCode_1 = __importDefault(require("./wireCloseCode"));
const CONNECT_TIMEOUT = 10 * constants_1.SECOND_IN_MILLISECONDS;
/** @internal */
class Websocket {
    #session;
    #connection;
    #heartbeat;
    #checkSiblingHeartbeats;
    #connectTimeout;
    #destroyed = false;
    #closing = false;
    /** The code the first `close()` call was given — what a delayed or forced delivery uses, never the wire's own code (WP-1 step 1, H3). */
    #pendingCloseCode;
    /** The origin resolved for the first `close()` call, carried alongside `#pendingCloseCode`. */
    #pendingCloseOrigin;
    #closeTimeout = undefined;
    #lastEventTimestamp = 0;
    /** Timer for resume connect behavior after a close, allowing backpressure to be processed before reinitializing the websocket. */
    #flushInterval = undefined;
    #eventsDuringFlush = 0;
    #zlibInflate = null;
    #inflateBuffer = [];
    #rateLimitState = {
        resetTimestamp: 0,
        count: 0,
    };
    #textDecoder = new util_1.TextDecoder();
    /** This this.#connection's heartbeat manager. */
    get heart() {
        return this.#heartbeat;
    }
    #onClose;
    /**
     * Connects to Discord's event gateway.
     * @param _websocket Ignore. For unittest dependency injection only.
     */
    constructor(params) {
        const { ws: _websocket, url, session, onClose, } = params;
        this.#session = session;
        this.#onClose = onClose;
        this.#heartbeat = new Heartbeat_1.default({
            gateway: this.#session.gateway,
            websocket: this,
            heartbeatIntervalOffset: this.#session.gateway.options.heartbeatIntervalOffset,
            heartbeatTimeoutSeconds: this.#session.gateway.options.heartbeatTimeoutSeconds,
            log: this.#session.log,
        });
        try {
            this.#connection = new _websocket(url, { maxPayload: constants_1.GIGABYTE_IN_BYTES });
            this.setupConnection();
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
            this.clearConnectTimeout();
            throw err;
        }
    }
    get heartbeat() {
        return this.#heartbeat;
    }
    setupConnection() {
        this.#connection.binaryType = 'arraybuffer';
        if (this.#session.identity.compress) {
            this.#inflateBuffer = [];
            const inflate = zlib_1.default.createInflate({
                chunkSize: 65535,
                flush: zlib_1.default.constants.Z_SYNC_FLUSH,
            });
            inflate.on('data', (chunk) => {
                if (!this.connected)
                    return;
                this.#inflateBuffer.push(chunk);
            });
            inflate.on('error', (error) => {
                if (!this.connected)
                    return;
                this.#session.log('ERROR', error.stack ?? error.message);
                // H4: a zlib error leaves the stream unusable for every message after it —
                // tear the connection down through the normal close path rather than log-and-
                // continue on a socket that can no longer be read.
                (0, closeOrigin_1.setPendingOrigin)(this.#session.gateway, 'transport');
                this.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
            });
            this.#zlibInflate = inflate;
        }
        this.startConnectTimeout();
        this.#connection.onopen = this.handleWsOpen.bind(this);
        this.#connection.onclose = this.handleWsClose.bind(this);
        this.#connection.onerror = this.handleWsError.bind(this);
        this.#connection.onmessage = this.handleWsMessage.bind(this);
    }
    get connection() {
        return this.#connection;
    }
    /** Whether or not the websocket is open. */
    get connected() {
        return this.#connection.readyState === ws_1.default.OPEN;
    }
    close(code, flushWaitTime = 0) {
        if (this.#closing) {
            this.#session.log('DEBUG', `Websocket is already closing. Discarding code: ${code}.`);
            return;
        }
        const origin = (0, closeOrigin_1.takePendingOrigin)(this.#session.gateway) ?? 'consumer';
        this.#closing = true;
        this.#pendingCloseCode = code;
        this.#pendingCloseOrigin = origin;
        if (this.connected) {
            this.#session.log('DEBUG', `Closing websocket with code: ${code}.`);
            this.#heartbeat.destroy();
            // A caller's code that isn't legal on an actual close frame (1006 above all,
            // never sent on the wire) can never reach `ws`'s own validator, which throws
            // synchronously and would otherwise leave the connection half-closed with
            // nothing able to recover it. `#pendingCloseCode` already carries the caller's
            // code to `handleCloseCode` independently of what goes on the wire.
            if ((0, wireCloseCode_1.default)(code)) {
                this.#connection.close(code);
            }
            else {
                this.#connection.terminate();
            }
            if (flushWaitTime > 0) {
                this.#session.log('DEBUG', `Waiting ${flushWaitTime}ms for events to flush before closing.`);
                this.#flushInterval = setTimeout(() => {
                    this.#session.log('DEBUG', `Flush interval timed out. Flushed ${this.#eventsDuringFlush} events during close.`);
                    this.#flushInterval = undefined;
                    this.#onClose(code, origin);
                }, flushWaitTime);
            }
            else {
                this.#onClose(code, origin);
            }
        }
        else if (this.#connection?.readyState === ws_1.default.CONNECTING) {
            // H3: abort the handshake in flight immediately rather than waiting on a close a
            // CONNECTING socket will never send. `#onClose` runs `Session.handleClose`, which
            // calls this instance's own `destroy()` — the A-1.7 guard lives there, the one
            // place that unconditionally terminates the connection.
            this.#session.log('DEBUG', `Aborting connecting websocket with code: ${code}.`);
            this.clearConnectTimeout();
            this.#onClose(code, origin);
        }
        else if (this.#connection) {
            this.#session.log('INFO', `Websocket is already ${this.#connection.readyState === ws_1.default.CLOSED ? 'closed' : 'closing'}.`);
            if (!this.#closeTimeout) {
                this.#closeTimeout = this.startCloseTimeout(this.#connection);
            }
        }
        else {
            this.#session.log('WARNING', 'Websocket is undefined when closing.');
        }
    }
    destroy() {
        this.#destroyed = true;
        this.clearConnectTimeout();
        clearTimeout(this.#closeTimeout);
        if (this.#flushInterval) {
            this.#session.log('DEBUG', `Flushed ${this.#eventsDuringFlush} events during close.`);
            clearInterval(this.#flushInterval);
        }
        this.#closeTimeout = undefined;
        this.#flushInterval = undefined;
        this.#connection.onclose = null;
        this.#connection.onerror = null;
        this.#connection.onmessage = null;
        this.#connection.onopen = null;
        this.#connection?.removeAllListeners();
        if (this.#connection?.readyState === ws_1.default.CONNECTING) {
            // A-1.7: `terminate()`ing a socket still CONNECTING raises a synthetic 'error'
            // (deferred to `process.nextTick` by `ws` itself) that would otherwise go
            // unhandled. Guarded here — the one place that unconditionally terminates the
            // connection — rather than at each caller, so every path that can reach a
            // CONNECTING socket (a close(), or a construction failure) is covered alike.
            this.#connection.once('error', () => {
                this.#session.log('DEBUG', 'Swallowed the synthetic error from destroying a connecting websocket.');
            });
        }
        this.#connection?.terminate();
        this.#zlibInflate?.end();
        this.#zlibInflate = null;
        this.#inflateBuffer = [];
        this.#eventsDuringFlush = 0;
        this.#heartbeat.destroy();
        this.#session.log('INFO', 'Websocket destroyed.');
    }
    /*
     ********************************
     ******* WEBSOCKET - OPEN *******
     ********************************
     */
    /** Assigned to websocket `onopen`. */
    handleWsOpen = () => {
        this.#session.log('DEBUG', 'Websocket open.');
        this.#session.emit('GATEWAY_OPEN', this);
    };
    /** Starts the timeout for the connection to Discord. */
    startConnectTimeout() {
        this.#connectTimeout = setTimeout(() => {
            this.clearConnectTimeout();
            if (this.connection.readyState === ws_1.default.OPEN || this.connection.readyState === ws_1.default.CONNECTING) {
                this.#session.log('WARNING', 'Websocket open but didn\'t receive HELLO event in time.');
                (0, closeOrigin_1.setPendingOrigin)(this.#session.gateway, 'transport');
                this.close(constants_1.GATEWAY_CLOSE_CODES.CONNECT_TIMEOUT);
            }
            else {
                this.#session.log('WARNING', 'Unexpected timeout while websocket is in CLOSING / CLOSED state.');
            }
        }, CONNECT_TIMEOUT);
    }
    clearConnectTimeout() {
        clearTimeout(this.#connectTimeout);
        this.#connectTimeout = undefined;
    }
    /*
     ********************************
     ******* WEBSOCKET - ERROR ******
     ********************************
     */
    /** Assigned to websocket `onerror`. */
    handleWsError = (err) => {
        this.#session.log('ERROR', `Websocket error. Message: ${err.message}`);
    };
    /*
     ********************************
     ****** WEBSOCKET - CLOSE *******
     ********************************
     */
    /** Assigned to websocket `onclose`. Cleans up and attempts to re-connect with a fresh connection after waiting some time.
     * @param event Object containing information about the close.
     */
    handleWsClose = ({ code }) => {
        if (this.#destroyed)
            return;
        this.#session.log('DEBUG', `Websocket closed. Code: ${code}.`);
        // A close already in flight (#pendingCloseCode/#pendingCloseOrigin set) delivers the
        // caller's own code and origin, never the wire's — WP-1 step 1: the caller's code
        // wins, whether the terminal event arrives naturally or via the 60 s force-close.
        // Otherwise this is unsolicited: ABNORMAL (1006, `ws`'s own synthesis) is
        // transport/library origin; any other code arriving on the wire is Discord's own.
        const deliveredCode = this.#pendingCloseCode ?? code;
        const origin = this.#pendingCloseOrigin
            ?? (code === constants_1.GATEWAY_CLOSE_CODES.ABNORMAL ? 'transport' : 'discord');
        this.#onClose(deliveredCode, origin);
    };
    /*
     ********************************
     ****** WEBSOCKET MESSAGE *******
     ********************************
     */
    /** Assigned to websocket `onmessage`. */
    // eslint-disable-next-line arrow-body-style
    handleWsMessage = ({ data }) => {
        this.#lastEventTimestamp = Date.now();
        if (this.#closing) {
            ++this.#eventsDuringFlush;
            this.#session.log('DEBUG', `Received message ${this.#connection.readyState === ws_1.default.CLOSED ? 'after' : 'during'} close.`);
        }
        if (this.#zlibInflate && data instanceof ArrayBuffer) {
            void this.decompress(data);
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(data.toString());
            const { 
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            t: _, s: __, op: ___, d: ____, } = parsed;
        }
        catch (e) {
            this.#session.log('ERROR', `Failed to parse message. Message: ${data}`);
            (0, closeOrigin_1.setPendingOrigin)(this.#session.gateway, 'transport');
            this.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
        this.handleMessage(parsed);
    };
    async decompress(data) {
        const decompressable = new Uint8Array(data);
        const flush = decompressable.length >= 4
            && decompressable.at(-4) === 0x00
            && decompressable.at(-3) === 0x00
            && decompressable.at(-2) === 0xff
            && decompressable.at(-1) === 0xff;
        const doneWriting = new Promise((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.#zlibInflate.write(decompressable, 'binary', (error) => {
                if (error) {
                    this.#session.log('ERROR', error.stack ?? error.message);
                }
                resolve();
            });
        });
        if (!flush)
            return;
        await doneWriting;
        if (!this.connected) {
            this.#session.log('DEBUG', 'Websocket is not open on decompressing event.');
            return;
        }
        const result = Buffer.concat(this.#inflateBuffer);
        this.#inflateBuffer = [];
        let parsed;
        try {
            parsed = JSON.parse(this.#textDecoder.decode(result));
        }
        catch (e) {
            this.#session.log('ERROR', `Failed to parse decompressed message. Message: ${result}`);
            (0, closeOrigin_1.setPendingOrigin)(this.#session.gateway, 'transport');
            this.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
            return;
        }
        this.handleMessage(parsed);
    }
    /** Processes incoming messages from Discord's gateway.
     * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
     */
    handleMessage(p) {
        if (!this.connected)
            return;
        const { op: opCode, d: data } = p;
        switch (opCode) {
            case constants_1.GATEWAY_OP_CODES.DISPATCH:
                this.checkHeartbeatInline();
                break;
            case constants_1.GATEWAY_OP_CODES.HELLO:
                this.handleHello(data);
                break;
            case constants_1.GATEWAY_OP_CODES.HEARTBEAT_ACK:
                this.#heartbeat.ack();
                break;
            default:
        }
        this.#session.handleMessage(p);
    }
    /**
     * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
     * @param data From Discord.
     */
    handleHello(data) {
        this.clearConnectTimeout();
        this.#heartbeat.start(data.heartbeat_interval);
    }
    handleEvent(type, data) {
        void this.#session.handleEvent(type, data);
    }
    /** Proxy for inline heartbeat checking. */
    checkHeartbeatInline() {
        if (this.#checkSiblingHeartbeats) {
            this.#checkSiblingHeartbeats.forEach((f) => f());
        }
        else if (this.connected) {
            this.#heartbeat.checkIfShouldHeartbeat();
        }
    }
    sendHeartbeat() {
        if (this.connected)
            this.send(constants_1.GATEWAY_OP_CODES.HEARTBEAT, this.#session.sequence);
        else
            this.#session.log('WARNING', 'Heartbeat sent when websocket is not open.');
    }
    send(op, data) {
        const payload = { op, d: data };
        if (!this.#connection)
            return false;
        if (this.isPacketRateLimited(op)) {
            this.#session.log('WARNING', 'Failed to send payload. Rate limited.', { payload });
            return false;
        }
        if (this.#connection.readyState !== ws_1.default.OPEN) { // !this.connected
            this.#session.log('ERROR', 'Failed to send payload. Websocket not open.', { payload });
            if (!this.#closeTimeout) {
                this.#closeTimeout = this.startCloseTimeout(this.#connection);
            }
            return false;
        }
        this.#connection.send(JSON.stringify(payload));
        this.updateWsRateLimit();
        this.#session.log('DEBUG', 'Sent payload.', { payload });
        return true;
    }
    /**
     * Returns whether or not the message to be sent will exceed the rate limit or not, taking into account padded buffers for high priority packets (e.g. heartbeats, resumes).
     * @param op Op code of the message to be sent.
     * @returns true if sending message won't exceed rate limit or padding; false if it will
     */
    isPacketRateLimited(op) {
        if (op === constants_1.GATEWAY_OP_CODES.HEARTBEAT || op === constants_1.GATEWAY_OP_CODES.RESUME) {
            return false;
        }
        if (new Date().getTime() > this.#rateLimitState.resetTimestamp) {
            return false;
        }
        // Reserve the buffer for heartbeats and resumes, which are exempt above.
        return this.#rateLimitState.count >= constants_1.GATEWAY_MAX_REQUESTS_PER_MINUTE - constants_1.GATEWAY_REQUEST_BUFFER;
    }
    /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
    updateWsRateLimit() {
        const now = new Date().getTime();
        if (now > this.#rateLimitState.resetTimestamp) {
            this.#rateLimitState.resetTimestamp = now + constants_1.MINUTE_IN_MILLISECONDS;
            this.#rateLimitState.count = 0;
        }
        ++this.#rateLimitState.count;
    }
    startCloseTimeout(websocket) {
        return setTimeout(() => {
            if (!this.#connection) {
                this.#session.log('ERROR', 'Websocket undefined during close timeout. This shouldn\'t ever happen.');
            }
            else if (websocket === this.#connection) {
                this.#session.log('ERROR', 'Websocket did not close in time. Forcing close.');
                // WP-1 step 1: the force-close delivers the caller's own code — never UNKNOWN,
                // which would substitute a P-clear arm for whatever the caller's P-keep code was.
                this.handleWsClose({ code: this.#pendingCloseCode ?? constants_1.GATEWAY_CLOSE_CODES.UNKNOWN });
            }
        }, constants_1.MINUTE_IN_MILLISECONDS);
    }
}
exports.default = Websocket;
