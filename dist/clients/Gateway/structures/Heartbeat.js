"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const constants_1 = require("../../../constants");
const CONNECT_TIMEOUT = 10 * constants_1.SECOND_IN_MILLISECONDS;
class Heart {
    #gateway;
    /** If the last heartbeat packet sent to Discord received an ACK. */
    #isAcknowledged = true;
    /** Time when last heartbeat packet was sent in ms. */
    #previousTimestamp;
    /** Time when the next heartbeat packet should be sent in ms. */
    #nextTimestamp;
    /** Node timer for sending the next heartbeat. */
    #nextHbTimer;
    /** Node timeout for timing out the shard and reconnecting. */
    #ackTimeout;
    /** Time between heartbeats with user offset subtracted. */
    #intervalTime;
    /** Time in seconds to wait for delayed ACK after missed heartbeat. */
    #ackWaitTime;
    /** Time in seconds subtracted from the heartbeat interval. Used to increase the frequency of heartbeats. */
    #intervalOffset;
    #connectTimeout;
    #handleEvent;
    #log;
    #destroyed = false;
    constructor(gateway, options) {
        const { heartbeatIntervalOffset, heartbeatTimeoutSeconds, log, handleEvent, } = options;
        this.#gateway = gateway;
        this.#intervalOffset = heartbeatIntervalOffset ?? 0;
        if (heartbeatTimeoutSeconds) {
            this.#ackWaitTime = heartbeatTimeoutSeconds * constants_1.SECOND_IN_MILLISECONDS;
        }
        this.#log = log;
        this.#handleEvent = handleEvent;
    }
    get recentTimestamp() {
        return this.#previousTimestamp;
    }
    checkDestroyed() {
        if (this.#destroyed) {
            this.#log('WARNING', 'Heartbeat is destroyed.');
            return true;
        }
        return false;
    }
    /** Starts the timeout for the connection to Discord. */
    startConnectTimeout(client) {
        if (this.checkDestroyed())
            return;
        this.#connectTimeout = setTimeout(() => {
            this.clearConnectTimeout();
            if (client.readyState === ws_1.default.OPEN || client.readyState === ws_1.default.CONNECTING) {
                this.#log('WARNING', 'Websocket open but didn\'t receive HELLO event in time.');
                client.close(constants_1.GATEWAY_CLOSE_CODES.CONNECT_TIMEOUT);
            }
            else {
                this.#log('WARNING', 'Unexpected timeout while websocket is in CLOSING / CLOSED state.');
            }
        }, CONNECT_TIMEOUT);
    }
    /** Clears heartbeat values and clears the heartbeatTimers. */
    destroy() {
        this.#destroyed = true;
        this.clearAckTimeout();
        this.clearHeartbeatTimeout();
        this.clearConnectTimeout();
        if (this.#destroyed) {
            this.#log('INFO', 'Heartbeat destroyed.');
        }
        else {
            this.#log('WARNING', 'Heartbeat already destroyed.');
        }
    }
    /**
     * Set inline with the firehose of events to check if the heartbeat needs to be sent.
     * Works in tandem with startTimeout() to ensure the heartbeats are sent on time regardless of event pressure.
     * May be passed as array to other gateways so that no one gateway blocks the others from sending timely heartbeats.
     * Now receiving the ACKs on the other hand...
     */
    checkIfShouldHeartbeat = () => {
        if (this.checkDestroyed())
            return;
        const now = new Date().getTime();
        if (this.#isAcknowledged
            && this.#nextTimestamp !== undefined
            && now > this.#nextTimestamp
            && this.#intervalTime !== undefined) {
            this.sendHeartbeat();
        }
    };
    /** Handles "Heartbeat ACK" packet from Discord. https://discord.com/developers/docs/topics/gateway#heartbeating */
    ack() {
        if (this.checkDestroyed())
            return;
        this.clearAckTimeout();
        this.#isAcknowledged = true;
        if (this.#previousTimestamp !== undefined) {
            const now = new Date().getTime();
            const latency = now - this.#previousTimestamp;
            this.#log('DEBUG', `Heartbeat acknowledged. Latency: ${latency}ms.`);
            void this.#handleEvent('HEARTBEAT_ACK', { latency, gateway: this.#gateway });
            this.#previousTimestamp = undefined;
        }
        else {
            this.#log('WARNING', 'Previous heartbeat timestamp is undefined.');
        }
    }
    /**
     * Starts heartbeat. https://discord.com/developers/docs/topics/gateway#heartbeating
     * @param heartbeatTimeout From Discord - Number of ms to wait between sending heartbeats.
     */
    start(heartbeatTimeout) {
        if (this.checkDestroyed())
            return;
        this.#log('DEBUG', `Starting heartbeat with timeout of ${heartbeatTimeout}ms.`);
        this.#isAcknowledged = true;
        this.#intervalTime = heartbeatTimeout - (this.#intervalOffset * constants_1.SECOND_IN_MILLISECONDS);
        this.scheduleNextHeartbeat();
    }
    clearHeartbeatTimeout() {
        clearInterval(this.#nextHbTimer);
        this.#nextHbTimer = undefined;
    }
    clearAckTimeout() {
        clearTimeout(this.#ackTimeout);
        this.#ackTimeout = undefined;
    }
    clearConnectTimeout() {
        clearTimeout(this.#connectTimeout);
        this.#connectTimeout = undefined;
    }
    /**
     * Clears old heartbeat timeout and starts a new one.
     */
    scheduleNextHeartbeat() {
        if (this.checkDestroyed())
            return;
        if (this.#intervalTime !== undefined) {
            this.clearHeartbeatTimeout();
            const randomOffset = Math.floor(Math.random() * 5 * constants_1.SECOND_IN_MILLISECONDS);
            const nextSendTime = this.#intervalTime - randomOffset;
            this.#nextHbTimer = setTimeout(this.sendHeartbeat, nextSendTime);
            const now = new Date().getTime();
            this.#nextTimestamp = now + nextSendTime;
            this.#log('DEBUG', `Next heartbeat scheduled in ${nextSendTime}ms. Random offset: ${randomOffset}ms.`);
        }
        else {
            this.#log('ERROR', 'heartbeatIntervalTime undefined.');
            this.#gateway.close(constants_1.GATEWAY_CLOSE_CODES.UNKNOWN);
        }
    }
    sendHeartbeat = () => {
        if (this.checkDestroyed())
            return;
        if (this.#intervalTime === undefined)
            return;
        if (!this.#isAcknowledged) {
            this.#log('ERROR', 'Heartbeat not acknowledged. Closing connection.');
            this.#gateway.close(constants_1.GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT, 0);
            return;
        }
        if (!this.#ackTimeout && this.#ackWaitTime) {
            this.#ackTimeout = setTimeout(this.checkForAck, this.#intervalTime + this.#ackWaitTime);
        }
        const now = new Date().getTime();
        if (this.#nextTimestamp) {
            const scheduleDiff = Math.max(0, now - (this.#nextTimestamp ?? now));
            void this.#handleEvent('HEARTBEAT_SENT', { scheduleDiff, gateway: this.#gateway });
            this.#log('DEBUG', `Heartbeat sent ${scheduleDiff}ms after scheduled time.`);
        }
        else {
            this.#log('WARNING', 'nextHeartbeatTimestamp is undefined.');
        }
        this.#previousTimestamp = now;
        this.#isAcknowledged = false;
        this.#gateway.sendHeartbeat();
        this.scheduleNextHeartbeat();
    };
    /** Checks if heartbeat ack was received. */
    checkForAck = () => {
        if (this.checkDestroyed())
            return;
        if (!this.#isAcknowledged) {
            this.#log('ERROR', 'Heartbeat not acknowledged in time.');
            this.#gateway.close(constants_1.GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
        }
    };
}
exports.default = Heart;
