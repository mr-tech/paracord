import ws from 'ws';

import { GATEWAY_CLOSE_CODES, SECOND_IN_MILLISECONDS } from '../../../constants';

import type Gateway from '../Gateway';

interface Options {
  heartbeatIntervalOffset?: undefined | number;
  heartbeatTimeoutSeconds?: undefined | number;
  log: Gateway['log'];
  handleEvent: Gateway['handleEvent'];
}

export default class Heart {
  #gateway: Gateway;

  /** If the last heartbeat packet sent to Discord received an ACK. */
  #isAcknowledged = true;

  /** Time when last heartbeat packet was sent in ms. */
  #previousTimestamp?: undefined | number;

  /** Time when the next heartbeat packet should be sent in ms. */
  #nextTimestamp?: undefined | number;

  /** Node timer for sending the next heartbeat. */
  #nextHbTimer?: undefined | NodeJS.Timer;

  /** Node timeout for timing out the shard and reconnecting. */
  #ackTimeout?: undefined | NodeJS.Timer;

  /** Time between heartbeats with user offset subtracted. */
  #intervalTime?: undefined | number;

  /** Time in seconds to wait for delayed ACK after missed heartbeat. */
  #ackWaitTime?: undefined | number;

  /** Time in seconds subtracted from the heartbeat interval. Used to increase the frequency of heartbeats. */
  #intervalOffset: number;

  #connectTimeout?: undefined | NodeJS.Timeout;

  #handleEvent: Gateway['handleEvent'];

  #log: Gateway['log'];

  public constructor(gateway: Gateway, options: Options) {
    const {
      heartbeatIntervalOffset, heartbeatTimeoutSeconds, log, handleEvent,
    } = options;

    this.#gateway = gateway;
    this.#intervalOffset = heartbeatIntervalOffset ?? 0;
    if (heartbeatTimeoutSeconds) {
      this.#ackWaitTime = heartbeatTimeoutSeconds * SECOND_IN_MILLISECONDS;
    }
    this.#log = log;
    this.#handleEvent = handleEvent;
  }

  /** Starts the timeout for the connection to Discord. */
  public startConnectTimeout(client: ws) {
    this.#connectTimeout = setTimeout(() => {
      this.clearConnectTimeout();

      if (client.readyState === ws.OPEN || client.readyState === ws.CONNECTING) {
        this.#log('WARNING', 'Websocket open but didn\'t receive HELLO event in time.');
        client.close(GATEWAY_CLOSE_CODES.CONNECT_TIMEOUT);
      } else {
        this.#log('WARNING', 'Unexpected timeout while websocket is in CLOSING / CLOSED state.');
      }
    }, 5 * SECOND_IN_MILLISECONDS);
  }

  /** Clears heartbeat values and clears the heartbeatTimers. */
  public reset() {
    this.clearAckTimeout();
    this.clearHeartbeatTimeout();
    this.clearConnectTimeout();

    this.#isAcknowledged = false;
    this.#previousTimestamp = undefined;
    this.#nextTimestamp = undefined;
    this.#intervalTime = undefined;
    this.#ackWaitTime = undefined;

    this.#log('DEBUG', 'Heartbeat cleared.');
  }

  /**
   * Set inline with the firehose of events to check if the heartbeat needs to be sent.
   * Works in tandem with startTimeout() to ensure the heartbeats are sent on time regardless of event pressure.
   * May be passed as array to other gateways so that no one gateway blocks the others from sending timely heartbeats.
   * Now receiving the ACKs on the other hand...
   */
  public checkIfShouldHeartbeat = (): void => {
    const now = new Date().getTime();
    if (
      this.#isAcknowledged
      && this.#nextTimestamp !== undefined
      && now > this.#nextTimestamp
      && this.#intervalTime !== undefined
    ) {
      this.sendHeartbeat();
    }
  };

  /** Handles "Heartbeat ACK" packet from Discord. https://discord.com/developers/docs/topics/gateway#heartbeating */
  public ack(): void {
    this.clearAckTimeout();

    this.#isAcknowledged = true;

    if (this.#previousTimestamp !== undefined) {
      const now = new Date().getTime();
      const latency = now - this.#previousTimestamp;
      void this.#handleEvent('HEARTBEAT_ACK', { latency, gateway: this.#gateway });

      this.#log('DEBUG', `Heartbeat acknowledged. Latency: ${latency}ms.`);
      this.#previousTimestamp = undefined;
    }
  }

  /**
   * Starts heartbeat. https://discord.com/developers/docs/topics/gateway#heartbeating
   * @param heartbeatTimeout From Discord - Number of ms to wait between sending heartbeats.
   */
  public start(heartbeatTimeout: number): void {
    this.#isAcknowledged = true;
    this.#intervalTime = heartbeatTimeout - (this.#intervalOffset * SECOND_IN_MILLISECONDS);
    this.scheduleNextHeartbeat();
  }

  private clearHeartbeatTimeout() {
    clearInterval(this.#nextHbTimer);
    this.#nextHbTimer = undefined;
  }

  private clearAckTimeout() {
    clearTimeout(this.#ackTimeout);
    this.#ackTimeout = undefined;
  }

  public clearConnectTimeout() {
    clearTimeout(this.#connectTimeout);
    this.#connectTimeout = undefined;
  }

  /**
   * Clears old heartbeat timeout and starts a new one.
   */
  private scheduleNextHeartbeat() {
    if (this.#intervalTime !== undefined) {
      this.clearHeartbeatTimeout();

      const randomOffset = Math.floor(Math.random() * 5 * SECOND_IN_MILLISECONDS);
      const nextSendTime = this.#intervalTime - randomOffset;
      this.#nextHbTimer = setTimeout(this.sendHeartbeat, nextSendTime);
      const now = new Date().getTime();
      this.#nextTimestamp = now + nextSendTime;
    } else {
      this.#log('ERROR', 'heartbeatIntervalTime undefined.');
      this.#gateway.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }
  }

  private sendHeartbeat = (): void => {
    if (!this.#isAcknowledged) {
      this.#gateway.close(GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
      return;
    }

    if (!this.#ackTimeout && this.#intervalTime && this.#ackWaitTime) {
      this.#ackTimeout = setTimeout(this.checkForAck, this.#intervalTime + this.#ackWaitTime);
    }

    const now = new Date().getTime();
    if (this.#nextTimestamp) {
      const scheduleDiff = Math.max(0, now - (this.#nextTimestamp ?? now));
      void this.#handleEvent('HEARTBEAT_SENT', { scheduleDiff, gateway: this.#gateway });

      this.#log('DEBUG', `Heartbeat sent ${scheduleDiff}ms after scheduled time.`);
    } else {
      this.#log('DEBUG', 'nextHeartbeatTimestamp is undefined.');
    }

    this.#previousTimestamp = now;
    this.#isAcknowledged = false;
    this.#gateway.sendHeartbeat();
    this.scheduleNextHeartbeat();
  };

  /** Checks if heartbeat ack was received. */
  private checkForAck = () => {
    if (!this.#isAcknowledged) {
      this.#log('ERROR', 'Heartbeat not acknowledged in time.');
      this.#gateway.close(GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
    }
  };
}
