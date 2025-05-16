import { TextDecoder } from 'util';
import ws from 'ws';
import zlib from 'zlib';

import {
  GATEWAY_CLOSE_CODES, GATEWAY_MAX_REQUESTS_PER_MINUTE,
  GATEWAY_OP_CODES, GATEWAY_REQUEST_BUFFER, GIGABYTE_IN_BYTES,
  GatewayCloseCode, MINUTE_IN_MILLISECONDS, SECOND_IN_MILLISECONDS,
} from '../../../constants';
import { isApiError } from '../../../utils';

import GatewayIdentify from './GatewayIdentify';
import Heartbeat from './Heartbeat';

import type {
  GatewayEvent, GatewayPayload, GatewayPresenceUpdate, GuildRequestMember, Hello, Resume,
} from '../../../discord';
import type { ParacordGatewayEvent } from '../types';
import type Session from './Session';

interface WebsocketParams {
  ws: typeof ws;
  session: Session;
  url: string;
  onClose: Session['handleClose'];
}

/** Information about the current request count and time that it should reset in relation to Discord rate limits. https://discord.com/developers/docs/topics/gateway#rate-limiting */
type WebsocketRateLimitState = {
  /** Timestamp in ms when the request limit is expected to reset. */
  resetTimestamp: number;
  /** Number of requests made since last reset. */
  count: number;
}

const CONNECT_TIMEOUT = 10 * SECOND_IN_MILLISECONDS;

export default class Websocket {
  #session: Session;

  #connection: ws;

  #heartbeat: Heartbeat;

  #checkSiblingHeartbeats?: undefined | Heartbeat['checkIfShouldHeartbeat'][];

  #connectTimeout?: undefined | NodeJS.Timeout;

  #destroyed = false;

  #closing = false;

  #closeTimeout: undefined | NodeJS.Timeout = undefined;

  #lastEventTimestamp = 0;

  /** Timer for resume connect behavior after a close, allowing backpressure to be processed before reinitializing the websocket. */
  #flushInterval: undefined | NodeJS.Timeout = undefined;

  #eventsDuringFlush = 0;

  #zlibInflate: null | zlib.Inflate = null;

  #inflateBuffer: Buffer[] = [];

  #rateLimitState: WebsocketRateLimitState = {
    resetTimestamp: 0,
    count: 0,
  };

  readonly #textDecoder = new TextDecoder();

  /** This this.#connection's heartbeat manager. */
  public get heart(): undefined | Heartbeat {
    return this.#heartbeat;
  }

  #onClose: Session['handleClose'];

  /**
   * Connects to Discord's event gateway.
   * @param _websocket Ignore. For unittest dependency injection only.
   */
  constructor(params: WebsocketParams) {
    const {
      ws: _websocket, url, session, onClose,
    } = params;

    this.#session = session;
    this.#onClose = onClose;

    this.#heartbeat = new Heartbeat({
      gateway: this.#session.gateway,
      websocket: this,
      heartbeatIntervalOffset: this.#session.gateway.options.heartbeatIntervalOffset,
      heartbeatTimeoutSeconds: this.#session.gateway.options.heartbeatTimeoutSeconds,
      log: this.#session.log,
    });

    try {
      this.#connection = new _websocket(url, { maxPayload: GIGABYTE_IN_BYTES });
      this.setupConnection();
    } catch (err) {
      if (isApiError(err)) {
        /* eslint-disable-next-line no-console */
        console.error(err.response?.data?.message); // TODO: emit
      } else {
        /* eslint-disable-next-line no-console */
        console.error(err); // TODO: emit
      }

      this.clearConnectTimeout();
      throw err;
    }
  }

  public get heartbeat(): Heartbeat {
    return this.#heartbeat;
  }

  private setupConnection() {
    this.#connection.binaryType = 'arraybuffer';

    if (this.#session.identity.compress) {
      this.#inflateBuffer = [];

      const inflate = zlib.createInflate({
        chunkSize: 65_535,
        flush: zlib.constants.Z_SYNC_FLUSH,
      });

      inflate.on('data', (chunk) => {
        if (!this.connected) return;
        this.#inflateBuffer.push(chunk);
      });

      inflate.on('error', (error) => {
        if (!this.connected) return;
        this.#session.log('ERROR', error.stack ?? error.message);
      });

      this.#zlibInflate = inflate;
    }

    this.startConnectTimeout();

    this.#connection.onopen = this.handleWsOpen.bind(this);
    this.#connection.onclose = this.handleWsClose.bind(this);
    this.#connection.onerror = this.handleWsError.bind(this);
    this.#connection.onmessage = this.handleWsMessage.bind(this);
  }

  public get connection(): ws {
    return this.#connection;
  }

  /** Whether or not the websocket is open. */
  public get connected(): boolean {
    return this.#connection.readyState === ws.OPEN;
  }

  public close(code: GatewayCloseCode, flushWaitTime = 0) {
    if (this.#closing) {
      this.#session.log('DEBUG', 'Websocket is already closing.');
      return;
    }

    this.#closing = true;

    if (this.connected) {
      this.#session.log('DEBUG', `Closing websocket with code: ${code}.`);

      this.#heartbeat.destroy();

      this.#connection.close(code);

      if (flushWaitTime > 0) {
        this.#session.log('DEBUG', `Waiting ${flushWaitTime}ms for events to flush before closing.`);

        this.#flushInterval = setTimeout(() => {
          this.#session.log('DEBUG', `Flush interval timed out. Flushed ${this.#eventsDuringFlush} events during close.`);
          this.#flushInterval = undefined;
          this.#onClose(code);
        }, flushWaitTime);
      } else {
        this.#onClose(code);
      }
    } else if (this.#connection) {
      this.#session.log('INFO', `Websocket is already ${this.#connection.readyState === ws.CLOSED ? 'closed' : 'closing'}.`);

      if (!this.#closeTimeout) {
        this.#closeTimeout = this.startCloseTimeout(this.#connection);
      }
    } else {
      this.#session.log('WARNING', 'Websocket is undefined when closing.');
    }
  }

  public destroy() {
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
  private handleWsOpen = (): void => {
    this.#session.log('DEBUG', 'Websocket open.');
    this.#session.emit('GATEWAY_OPEN', this);
  };

  /** Starts the timeout for the connection to Discord. */
  private startConnectTimeout() {
    this.#connectTimeout = setTimeout(() => {
      this.clearConnectTimeout();

      if (this.connection.readyState === ws.OPEN || this.connection.readyState === ws.CONNECTING) {
        this.#session.log('WARNING', 'Websocket open but didn\'t receive HELLO event in time.');
        this.close(GATEWAY_CLOSE_CODES.CONNECT_TIMEOUT);
      } else {
        this.#session.log('WARNING', 'Unexpected timeout while websocket is in CLOSING / CLOSED state.');
      }
    }, CONNECT_TIMEOUT);
  }

  private clearConnectTimeout() {
    clearTimeout(this.#connectTimeout);
    this.#connectTimeout = undefined;
  }

  /*
   ********************************
   ******* WEBSOCKET - ERROR ******
   ********************************
   */

  /** Assigned to websocket `onerror`. */
  private handleWsError = (err: ws.ErrorEvent): void => {
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
  private handleWsClose = ({ code }: Pick<ws.CloseEvent, 'code'>): void => {
    if (this.#destroyed) return;

    this.#session.log('DEBUG', `Websocket closed. Code: ${code}.`);

    this.#onClose(code as GatewayCloseCode);
  };

  /*
   ********************************
   ****** WEBSOCKET MESSAGE *******
   ********************************
   */

  /** Assigned to websocket `onmessage`. */
  // eslint-disable-next-line arrow-body-style
  private handleWsMessage = ({ data }: ws.MessageEvent): void => {
    this.#lastEventTimestamp = Date.now();

    if (this.#closing) {
      ++this.#eventsDuringFlush;
      this.#session.log('DEBUG', `Received message ${this.#connection.readyState === ws.CLOSED ? 'after' : 'during'} close.`);
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
        t: _, s: __, op: ___, d: ____,
      } = parsed;
    } catch (e) {
      this.#session.log('ERROR', `Failed to parse message. Message: ${data}`);
      this.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }

    this.handleMessage(parsed);
  };

  private async decompress(data: ArrayBuffer): Promise<void> {
    const decompressable = new Uint8Array(data as ArrayBuffer);

    const flush = decompressable.length >= 4
    && decompressable.at(-4) === 0x00
    && decompressable.at(-3) === 0x00
    && decompressable.at(-2) === 0xff
    && decompressable.at(-1) === 0xff;

    const doneWriting = new Promise<void>((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.#zlibInflate!.write(decompressable, 'binary', (error) => {
        if (error) {
          this.#session.log('ERROR', error.stack ?? error.message);
        }

        resolve();
      });
    });

    if (!flush) return;

    await doneWriting;

    if (!this.connected) {
      this.#session.log('DEBUG', 'Websocket is not open on decompressing event.');
      return;
    }

    const result = Buffer.concat(this.#inflateBuffer);
    this.#inflateBuffer = [];
    this.handleMessage(JSON.parse(this.#textDecoder.decode(result)) as GatewayPayload);
  }

  /** Processes incoming messages from Discord's gateway.
   * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
   */
  private handleMessage(p: GatewayPayload): void {
    if (!this.connected) return;

    const { op: opCode, d: data } = p;

    switch (opCode) {
      case GATEWAY_OP_CODES.DISPATCH:
        this.checkHeartbeatInline();
        break;

      case GATEWAY_OP_CODES.HELLO:
        this.handleHello(<Hello><unknown>data);
        break;

      case GATEWAY_OP_CODES.HEARTBEAT_ACK:
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
  private handleHello(data: Hello): void {
    this.clearConnectTimeout();
    this.#heartbeat.start(data.heartbeat_interval);
  }

  public handleEvent(type: GatewayEvent | ParacordGatewayEvent, data: unknown): void {
    void this.#session.handleEvent(type, data);
  }

  /** Proxy for inline heartbeat checking. */
  private checkHeartbeatInline(): void {
    if (this.#checkSiblingHeartbeats) {
      this.#checkSiblingHeartbeats.forEach((f) => f());
    } else if (this.connected) {
      this.#heartbeat.checkIfShouldHeartbeat();
    }
  }

  public sendHeartbeat(): void {
    if (this.connected) this.send(GATEWAY_OP_CODES.HEARTBEAT, this.#session.sequence as number);
    else this.#session.log('WARNING', 'Heartbeat sent when websocket is not open.');
  }

  /**
   * Sends a websocket message to Discord.
   * @param op Gateway Opcode https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
   * @param data Data of the message.
   * @returns true if the packet was sent; false if the packet was not due to rate limiting or websocket not open.
   */
  public send(op: typeof GATEWAY_OP_CODES['HEARTBEAT'], data: number): boolean

  public send(op: typeof GATEWAY_OP_CODES['IDENTIFY'], data: GatewayIdentify): boolean

  public send(op: typeof GATEWAY_OP_CODES['RESUME'], data: Resume): boolean

  public send(op: typeof GATEWAY_OP_CODES['REQUEST_GUILD_MEMBERS'], data: GuildRequestMember): boolean

  public send(op: typeof GATEWAY_OP_CODES['GATEWAY_PRESENCE_UPDATE'], data: GatewayPresenceUpdate): boolean

  public send(op: number, data: number | GatewayIdentify | GuildRequestMember | Resume | GatewayPresenceUpdate): boolean {
    const payload = { op, d: data };

    if (!this.#connection) return false;

    if (this.isPacketRateLimited(op)) {
      this.#session.log('WARNING', 'Failed to send payload. Rate limited.', { payload });
      return false;
    }

    if (this.#connection.readyState !== ws.OPEN) { // !this.connected
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
  private isPacketRateLimited(op: number): boolean {
    if (op === GATEWAY_OP_CODES.HEARTBEAT || op === GATEWAY_OP_CODES.RESUME) {
      return false;
    }

    if (new Date().getTime() > this.#rateLimitState.resetTimestamp) {
      return false;
    }

    if (this.#rateLimitState.count <= GATEWAY_REQUEST_BUFFER) {
      return false;
    }

    return true;
  }

  /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
  private updateWsRateLimit(): void {
    if (
      this.#rateLimitState.count === GATEWAY_MAX_REQUESTS_PER_MINUTE
    ) {
      const now = new Date().getTime();
      this.#rateLimitState.resetTimestamp = now + MINUTE_IN_MILLISECONDS;
    }

    --this.#rateLimitState.count;
  }

  private startCloseTimeout(websocket: ws): NodeJS.Timeout {
    return setTimeout(() => {
      if (!this.#connection) {
        this.#session.log('ERROR', 'Websocket undefined during close timeout. This shouldn\'t ever happen.');
      } else if (websocket === this.#connection) {
        this.#session.log('ERROR', 'Websocket did not close in time. Forcing close.');
        this.handleWsClose({ code: GATEWAY_CLOSE_CODES.UNKNOWN });
      }
    }, MINUTE_IN_MILLISECONDS);
  }
}
