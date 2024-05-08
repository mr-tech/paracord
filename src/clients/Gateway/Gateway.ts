import ws from 'ws';

import {
  GATEWAY_CLOSE_CODES, GATEWAY_MAX_REQUESTS_PER_MINUTE,
  GATEWAY_OP_CODES, GATEWAY_REQUEST_BUFFER, GIGABYTE_IN_BYTES,
  GatewayCloseCode, LOG_LEVELS, LOG_SOURCES, MINUTE_IN_MILLISECONDS,
} from '../../constants';
import { coerceTokenToBotLike, isApiError } from '../../utils';

import { GatewayIdentify, Heartbeat } from './structures';
// import type ZlibSyncType from 'zlib-sync';

import type { DebugLevel, EventHandler } from '../../@types';
import type {
  GUILD_MEMBERS_CHUNK_EVENT, GatewayEvent, GatewayPayload,
  GatewayPresenceUpdate, GatewayURLQueryStringParam,
  GuildRequestMember, Hello, ReadyEventField, Resume,
} from '../../discord';
import type {
  GatewayCloseEvent, GatewayOptions, ParacordGatewayEvent, WebsocketRateLimitCache,
} from './types';

// let ZlibSync: null | typeof ZlibSyncType = null;

// let Z_SYNC_FLUSH = 0;
// // eslint-disable-next-line import/no-unresolved
// import('zlib-sync')
//   .then((_zlib) => {
//     ZlibSync = _zlib;
//     ({ Z_SYNC_FLUSH } = _zlib);
//   }).catch(() => { /* do nothing */ });

interface GuildChunkState {
  receivedIndexes: number[];
}

/** A client to handle a Discord gateway connection. */
export default class Gateway {
  #heartbeat: Heartbeat;

  /** Whether or not this client should be considered 'online', connected to the gateway and receiving events. */
  #online: boolean;

  /** Whether or not the client is currently resuming a session. */
  #resuming: boolean;

  #options: GatewayOptions;

  /** Emitter for gateway and Api events. Will create a default if not provided via the options. */
  #emitter: EventHandler;

  /** Object passed to Discord when identifying. */
  #identity: GatewayIdentify;

  #checkIfStartingInterval?: undefined | NodeJS.Timer;

  #membersRequestCounter: number;

  #requestingMembersStateMap: Map<string, GuildChunkState>;

  // WEBSOCKET

  /** Websocket used to connect to gateway. */
  #ws?: undefined | ws;

  /** Websocket URL instructed to connect to. Also used to indicate it the client has an open websocket. */
  #wsUrl: string;

  /** From Discord - Url to reconnect to. */
  #resumeUrl?: undefined | string;

  #wsParams: GatewayURLQueryStringParam;

  #wsRateLimitCache: WebsocketRateLimitCache;

  /** From Discord - Most recent event sequence id received. https://discord.com/developers/docs/topics/gateway#payloads */
  #sequence: null | number;

  /** From Discord - Id of this gateway connection. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
  #sessionId?: undefined | string;

  // #zlibInflate: null | ZlibSyncType.Inflate = null;

  /** Other gateway heartbeat checks. */
  #checkSiblingHeartbeats?: undefined | Heartbeat['checkIfShouldHeartbeat'][];

  /** The amount of events received during a resume. */
  #eventsDuringResume: number;

  /**
   * Creates a new Discord gateway handler.
   * @param token Discord token. Will be coerced into a bot token.
   * @param options Optional parameters for this handler.
   */
  public constructor(token: string, options: GatewayOptions) {
    const {
      emitter, identity, identity: { shard }, wsUrl, wsParams,
      heartbeatIntervalOffset, checkSiblingHeartbeats, heartbeatTimeoutSeconds,
    } = options;

    if (shard !== undefined && (shard[0] === undefined || shard[1] === undefined)) {
      throw Error(`Invalid shard provided to gateway. shard id: ${shard[0]} | shard count: ${shard[1]}`);
    }

    this.#heartbeat = new Heartbeat(this, {
      heartbeatIntervalOffset,
      heartbeatTimeoutSeconds,
      log: this.log.bind(this),
      handleEvent: this.handleEvent.bind(this),
    });

    this.#identity = new GatewayIdentify(coerceTokenToBotLike(token), identity);

    this.#options = options;
    this.#sequence = null;
    this.#online = false;
    this.#wsRateLimitCache = {
      count: 0,
      resetTimestamp: 0,
    };
    this.#membersRequestCounter = 0;
    this.#requestingMembersStateMap = new Map();
    this.#emitter = emitter;
    this.#checkSiblingHeartbeats = checkSiblingHeartbeats;
    this.#wsUrl = wsUrl;
    this.#wsParams = wsParams;
    this.#resuming = false;
    this.#eventsDuringResume = 0;
  }

  /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
  public get resumable(): boolean {
    return this.#sessionId !== undefined && this.#sequence !== null && this.#resumeUrl !== undefined;
  }

  /** Whether or not the client is currently resuming a session. */
  public get resuming(): boolean {
    return this.#resuming;
  }

  /** [ShardID, ShardCount] to identify with; `undefined` if not sharding. */
  public get shard(): GatewayIdentify['shard'] {
    return this.#identity.shard !== undefined ? this.#identity.shard : undefined;
  }

  /** The shard id that this gateway is connected to. */
  public get id(): number {
    return this.#identity.shard !== undefined ? this.#identity.shard[0] : 0;
  }

  /** Whether or not the client is connected to the gateway. */
  public get connected(): boolean {
    return this.#ws !== undefined;
  }

  /** Whether or not the client is connected to the gateway. */
  public get online(): boolean {
    return this.#online;
  }

  /** This gateway's active websocket connection. */
  public get ws(): ws | undefined {
    return this.#ws;
  }

  public get heart(): Heartbeat {
    return this.#heartbeat;
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
  private log(level: DebugLevel, message: string, data: Record<string, unknown> = {}): void {
    data.shard = this;
    this.emit('DEBUG', {
      source: LOG_SOURCES.GATEWAY,
      level: LOG_LEVELS[level],
      message,
      data,
    });
  }

  /**
   * Emits various events through `this.#emitter`, both Discord and Api. Will emit all events if `this.#events` is undefined; otherwise will only emit those defined as keys in the `this.#events` object.
   * @param type Type of event. (e.g. "GATEWAY_CLOSE" or "CHANNEL_CREATE")
   * @param data Data to send with the event.
   */
  private emit(type: ParacordGatewayEvent, data?: unknown): void {
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
  public requestGuildMembers(options: GuildRequestMember): boolean {
    if (options.nonce === undefined) {
      options.nonce = `${options.guild_id}-${++this.#membersRequestCounter}`;
    }

    this.#requestingMembersStateMap.set(options.nonce, { receivedIndexes: [] });

    void this.handleEvent('REQUEST_GUILD_MEMBERS', { gateway: this, options });

    return this.send(GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);
  }

  public updatePresence(presence: GatewayPresenceUpdate) {
    void this.handleEvent('PRESENCE_UPDATE', { gateway: this, presence });

    const sent = this.send(GATEWAY_OP_CODES.GATEWAY_PRESENCE_UPDATE, presence);
    if (sent) this.#identity.updatePresence(presence);
    return sent;
  }

  /**
   * Connects to Discord's event gateway.
   * @param _websocket Ignore. For unittest dependency injection only.
   */
  public login = async (_websocket = ws): Promise<void> => {
    if (this.#ws !== undefined) {
      throw Error('Client is already initialized.');
    }

    // if (ZlibSync || this.#identity.compress) {
    //   if (!ZlibSync) throw Error('zlib-sync is required for compression');

    //   this.#zlibInflate = new ZlibSync.Inflate({
    //     flush: ZlibSync.Z_SYNC_FLUSH,
    //     chunkSize: ZLIB_CHUNKS_SIZE,
    //   });
    // }

    try {
      const wsUrl = this.constructWsUrl();
      this.log('DEBUG', `Connecting to url: ${wsUrl}`);

      const client = new _websocket(wsUrl, { maxPayload: GIGABYTE_IN_BYTES });
      this.#heartbeat.startConnectTimeout(client);
      this.#ws = client;
      this.#ws.onopen = this.handleWsOpen;
      this.#ws.onclose = this.handleWsClose;
      this.#ws.onerror = this.handleWsError;
      this.#ws.onmessage = this.handleWsMessage;
    } catch (err) {
      if (isApiError(err)) {
        /* eslint-disable-next-line no-console */
        console.error(err.response?.data?.message); // TODO: emit
      } else {
        /* eslint-disable-next-line no-console */
        console.error(err); // TODO: emit
      }

      this.#ws = undefined;
      this.#heartbeat.clearConnectTimeout();
      this.clearStartingInterval();
    }
  };

  private constructWsUrl() {
    if (!this.resumable) this.#resumeUrl = undefined;
    const endpoint = this.#resumeUrl ?? this.#wsUrl;
    return `${endpoint}?${Object.entries(this.#wsParams).map(([k, v]) => `${k}=${v}`).join('&')}`;
  }

  /**
   * Closes the connection.
   * @param reconnect Whether to reconnect after closing.
   */
  public close(code: GatewayCloseCode = GATEWAY_CLOSE_CODES.USER_TERMINATE_RECONNECT) {
    if (this.#ws?.readyState === ws.OPEN) {
      this.#ws?.close(code);
    } else {
      this.handleWsClose({ code });
      this.log('WARNING', `Websocket is already ${this.#ws?.CLOSED ? 'closed' : 'closing'}.`);
    }
  }

  /**
   * Handles emitting events from Discord. Will first pass through `this.#emitter.handleEvent` function if one exists.
   * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
   * @param data Data of the event from Discord.
   */
  private handleEvent(type: GatewayEvent | ParacordGatewayEvent, data: unknown): void {
    if (type === 'GUILD_MEMBERS_CHUNK') this.handleGuildMemberChunk(data as GUILD_MEMBERS_CHUNK_EVENT);
    void this.#emitter.handleEvent(type, data, this);
  }

  private handleGuildMemberChunk(data: GUILD_MEMBERS_CHUNK_EVENT): void {
    const {
      nonce, not_found, chunk_count, chunk_index,
    } = data;
    if (nonce) {
      if (not_found) {
        this.#requestingMembersStateMap.delete(nonce);
      } else {
        this.updateRequestMembersState(nonce, chunk_count, chunk_index);
      }
    }
  }

  private updateRequestMembersState(nonce: string, chunkCount: number, chunkIndex: number) {
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
  private handleWsOpen = (): void => {
    this.log('DEBUG', 'Websocket open.');

    this.#wsRateLimitCache.count = 0;

    this.emit('GATEWAY_OPEN', this);
  };

  private clearStartingInterval() {
    if (this.#checkIfStartingInterval !== undefined) {
      clearInterval(this.#checkIfStartingInterval);
      this.#checkIfStartingInterval = undefined;
    }
  }

  /*
   ********************************
   ******* WEBSOCKET - ERROR ******
   ********************************
   */

  /** Assigned to websocket `onerror`. */
  private handleWsError = (err: ws.ErrorEvent): void => {
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
  private handleWsClose = ({ code }: Pick<ws.CloseEvent, 'code'>): void => {
    this.#ws = undefined;
    this.#online = false;
    this.#resuming = false;

    this.#eventsDuringResume = 0;
    this.#membersRequestCounter = 0;
    this.#requestingMembersStateMap = new Map();
    this.#heartbeat.reset();

    this.clearStartingInterval();

    const shouldReconnect = this.handleCloseCode(code);

    this.#wsRateLimitCache = {
      resetTimestamp: 0,
      count: 0,
    };

    const gatewayCloseEvent: GatewayCloseEvent = { shouldReconnect, code, gateway: this };
    this.emit('GATEWAY_CLOSE', gatewayCloseEvent);
  };

  /** Uses the close code to determine what message to log and if the client should attempt to reconnect.
   * @param code Code that came with the websocket close event.
   * @return Whether or not the client should attempt to login again.
   */
  private handleCloseCode(code: ws.CloseEvent['code']): boolean {
    const {
      CLEAN,
      GOING_AWAY,
      ABNORMAL,
      UNKNOWN_ERROR,
      UNKNOWN_OPCODE,
      DECODE_ERROR,
      NOT_AUTHENTICATED,
      AUTHENTICATION_FAILED,
      ALREADY_AUTHENTICATED,
      SESSION_NO_LONGER_VALID,
      INVALID_SEQ,
      RATE_LIMITED,
      SESSION_TIMEOUT,
      INVALID_SHARD,
      SHARDING_REQUIRED,
      INVALID_VERSION,
      INVALID_INTENT,
      DISALLOWED_INTENT,
      CONNECT_TIMEOUT,
      INTERNAL_TERMINATE_RECONNECT,
      RECONNECT,
      SESSION_INVALIDATED,
      SESSION_INVALIDATED_RESUMABLE,
      HEARTBEAT_TIMEOUT,
      USER_TERMINATE_RESUMABLE,
      USER_TERMINATE_RECONNECT,
      USER_TERMINATE,
      UNKNOWN,
    } = GATEWAY_CLOSE_CODES;

    let message: string;
    let shouldReconnect = true;
    let level: DebugLevel = 'INFO';

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

  /** Removes current session information. */
  private clearSession(): void {
    this.#sessionId = undefined;
    this.#resumeUrl = undefined;
    this.#sequence = null;
    this.#wsUrl = this.#options.wsUrl;
    this.log('DEBUG', 'Session cleared.');
  }

  /*
   ********************************
   ****** WEBSOCKET MESSAGE *******
   ********************************
   */

  /** Assigned to websocket `onmessage`. */
  // eslint-disable-next-line arrow-body-style
  private handleWsMessage = ({ data }: ws.MessageEvent): void => {
    // if (this.#zlibInflate) {
    //   return this.decompress(this.#zlibInflate, data);
    // }

    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch (e) {
      this.log('ERROR', `Failed to parse message. Message: ${data}`);
      this.close(GATEWAY_CLOSE_CODES.UNKNOWN);
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
  private handleMessage(p: GatewayPayload): void {
    const {
      t: type, s: sequence, op: opCode, d: data,
    } = p;

    this.updateSequence(sequence);

    if (this.#resuming && (opCode !== GATEWAY_OP_CODES.DISPATCH || (type !== 'RESUMED' && type !== 'READY'))) {
      ++this.#eventsDuringResume;
    }

    switch (opCode) {
      case GATEWAY_OP_CODES.DISPATCH:
        if (type === 'READY') {
          this.handleReady(<ReadyEventField><unknown>data);
        } else if (type === 'RESUMED') {
          this.handleResumed();
        } else if (type !== null) {
          // back pressure may cause the interval to occur too late, hence this check
          this.checkHeartbeatInline();
          void this.handleEvent(type as GatewayEvent, data);
        } else {
          this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
        }
        break;

      case GATEWAY_OP_CODES.HELLO:
        this.handleHello(<Hello><unknown>data);
        break;

      case GATEWAY_OP_CODES.HEARTBEAT_ACK:
        this.#heartbeat.ack();
        break;

      case GATEWAY_OP_CODES.HEARTBEAT:
        this.send(GATEWAY_OP_CODES.HEARTBEAT, <number> this.#sequence);
        break;

      case GATEWAY_OP_CODES.INVALID_SESSION:
        this.handleInvalidSession(<boolean>data);
        break;

      case GATEWAY_OP_CODES.RECONNECT:
        this.#ws?.close(GATEWAY_CLOSE_CODES.RECONNECT);
        break;

      default:
        this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
    }
  }

  /** Proxy for inline heartbeat checking. */
  private checkHeartbeatInline(): void {
    if (this.#checkSiblingHeartbeats !== undefined) this.#checkSiblingHeartbeats.forEach((f) => f());
    else this.#heartbeat.checkIfShouldHeartbeat();
  }

  /**
   * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
   * @param data From Discord.
   */
  private handleReady(data: ReadyEventField): void {
    this.log('INFO', `Received Ready. Session ID: ${data.session_id}.`);

    this.#resumeUrl = data.resume_gateway_url;
    this.#sessionId = data.session_id;
    this.#online = true;

    void this.handleEvent('READY', data);
  }

  /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
  private handleResumed(): void {
    this.log('INFO', `Replay finished after ${this.#eventsDuringResume} events. Resuming events.`);
    this.#online = true;
    this.#resuming = false;

    void this.handleEvent('RESUMED', null);
  }

  /**
   * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
   * @param data From Discord.
   */
  private handleHello(data: Hello): void {
    this.#heartbeat.clearConnectTimeout();

    this.log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
    this.#heartbeat.start(data.heartbeat_interval);
    this.connect(this.resumable);

    void this.handleEvent('HELLO', data);
  }

  /** Connects to gateway. */
  private connect(resume: boolean): void {
    if (resume) {
      this.resume();
    } else {
      this.identify();
    }
  }

  /** Sends a "Resume" payload to Discord's gateway. */
  private resume(): void {
    const message = `Attempting to resume connection. Session Id: ${this.#sessionId}. Sequence: ${this.#sequence}`;
    this.log('INFO', message);

    const { token } = this.#identity;
    const sequence = this.#sequence;
    const sessionId = this.#sessionId;

    if (sessionId !== undefined && sequence !== null) {
      this.#resuming = true;
      this.#eventsDuringResume = 0;
      const payload: Resume = {
        token,
        session_id: sessionId,
        seq: sequence,
      };

      void this.handleEvent('GATEWAY_RESUME', payload);

      this.send(GATEWAY_OP_CODES.RESUME, payload);
    } else {
      this.log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionId: ${sessionId}, sequence: ${sequence}`);
      this.#ws?.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }
  }

  /** Sends an "Identify" payload. */
  private identify(): void {
    if (this.#sequence !== null) {
      this.log('WARNING', `Unexpected sequence ${this.#sequence} when identifying.`);
      this.#sequence = null;
    }

    const [shardId, shardCount] = this.shard ?? [0, 1];
    this.log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
    this.emit('GATEWAY_IDENTIFY', this);
    this.send(GATEWAY_OP_CODES.IDENTIFY, <GatewayIdentify> this.#identity.toJSON());
  }

  public sendHeartbeat(): void {
    this.send(GATEWAY_OP_CODES.HEARTBEAT, this.#sequence as number);
  }

  /**
   * Sends a websocket message to Discord.
   * @param op Gateway Opcode https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
   * @param data Data of the message.
   * @returns true if the packet was sent; false if the packet was not due to rate limiting or websocket not open.
   */
  private send(op: typeof GATEWAY_OP_CODES['HEARTBEAT'], data: number): boolean

  private send(op: typeof GATEWAY_OP_CODES['IDENTIFY'], data: GatewayIdentify): boolean

  private send(op: typeof GATEWAY_OP_CODES['RESUME'], data: Resume): boolean

  private send(op: typeof GATEWAY_OP_CODES['REQUEST_GUILD_MEMBERS'], data: GuildRequestMember): boolean

  private send(op: typeof GATEWAY_OP_CODES['GATEWAY_PRESENCE_UPDATE'], data: GatewayPresenceUpdate): boolean

  private send(op: number, data: number | GatewayIdentify | GuildRequestMember | Resume | GatewayPresenceUpdate): boolean {
    const payload = { op, d: data };

    if (this.isPacketRateLimited(op)) {
      this.log('WARNING', 'Failed to send payload. Rate limited.', { payload });
      return false;
    }

    if (this.#ws?.readyState !== ws.OPEN) {
      this.log('ERROR', 'Failed to send payload. Websocket not open.', { payload });
      this.close(GATEWAY_CLOSE_CODES.UNKNOWN);
      return false;
    }

    this.#ws.send(JSON.stringify(payload));

    this.updateWsRateLimit();

    this.log('DEBUG', 'Sent payload.', { payload });

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

    if (new Date().getTime() > this.#wsRateLimitCache.resetTimestamp) {
      return false;
    }

    if (this.#wsRateLimitCache.count <= GATEWAY_REQUEST_BUFFER) {
      return false;
    }

    return true;
  }

  /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
  private updateWsRateLimit(): void {
    if (
      this.#wsRateLimitCache.count === GATEWAY_MAX_REQUESTS_PER_MINUTE
    ) {
      const now = new Date().getTime();
      this.#wsRateLimitCache.resetTimestamp = now + MINUTE_IN_MILLISECONDS;
    }

    --this.#wsRateLimitCache.count;
  }

  /**
   * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
   * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
   * @param resumable Whether or not Discord has said that the connection as able to be resumed.
   */
  private handleInvalidSession(resumable: boolean): void {
    this.log(
      'WARNING',
      `Received Invalid Session packet. Resumable: ${resumable}`,
    );

    if (!resumable) {
      this.#ws?.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
    } else {
      this.#ws?.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
    }

    void this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
  }

  /**
   * Updates the sequence value of Discord's gateway if it's larger than the current.
   * @param s Sequence value from Discord.
   */
  private updateSequence(s: number | null): void {
    if (this.#sequence === null) {
      this.#sequence = s;
    } else if (s !== null) {
      if (s !== this.#sequence + 1) {
        this.log(
          'WARNING',
          `Non-consecutive sequence (${this.#sequence} -> ${s})`,
        );
      }

      if (s > this.#sequence) {
        this.#sequence = s;
      }
    }
  }
}
