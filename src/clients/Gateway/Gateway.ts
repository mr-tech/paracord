
import { EventEmitter } from 'events';
import ws from 'ws';
import { DebugLevel, ExtendedEmitter, ILockServiceOptions } from '../../common';
import {
  DEFAULT_GATEWAY_BOT_WAIT, GATEWAY_CLOSE_CODES, GATEWAY_DEFAULT_WS_PARAMS, GATEWAY_MAX_REQUESTS_PER_MINUTE, GATEWAY_OP_CODES, GATEWAY_REQUEST_BUFFER, GIGABYTE_IN_BYTES, LOG_LEVELS, LOG_SOURCES, MINUTE_IN_MILLISECONDS, RPC_CLOSE_CODES, SECOND_IN_MILLISECONDS,
} from '../../constants';
import { IdentifyLockService } from '../../rpc/services';
import {
  GatewayPayload, GuildRequestMembers, Hello, ReadyEventFields, Resume,
} from '../../types';
import { coerceTokenToBotLike, objectKeysCamelToSnake } from '../../utils';
import Api from '../Api/Api';
import Identify from './structures/Identify';
import {
  GatewayBotResponse, GatewayCloseEvent, GatewayOptions, Heartbeat, SessionLimitData, StartupCheckFunction, WebsocketRateLimitCache,
} from './types';
import { IServiceOptions } from '../Api/types';

/** A client to handle a Discord gateway connection. */
export default class Gateway {
  /** Whether or not this client should be considered 'online', connected to the gateway and receiving events. */
  #online: boolean;

  #loggingIn: boolean;

  /** Client through which to make REST api calls to Discord. */
  #api?: Api;

  /** @ Rpc service through which to coordinate identifies with other shards. Will not be released except by time out. Best used for global minimum wait time. */
  #mainIdentifyLock?: IdentifyLockService;

  /** Rpc service through which to coordinate identifies with other shards. */
  #identifyLocks: IdentifyLockService[] = [];

  /** Websocket used to connect to gateway. */
  #ws?: ws;

  /** From Discord - Websocket URL instructed to connect to. Also used to indicate it the client has an open websocket. */
  #wsUrl?: string;

  /** Time to wait between this client's attempts to connect to the gateway in seconds. */
  #wsUrlRetryWait: number;

  #wsRateLimitCache: WebsocketRateLimitCache;

  /** From Discord - Most recent event sequence id received. https://discord.com/developers/docs/topics/gateway#payloads */
  #sequence?: number;

  /** From Discord - Id of this gateway connection. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
  #sessionId?: string;

  /** If the last heartbeat packet sent to Discord received an ACK. */
  #heartbeatAck: boolean;

  /** Time when last heartbeat packet was sent in ms. */
  #lastHeartbeatTimestamp?: number;

  /** Time when the next heartbeat packet should be sent in ms. */
  #nextHeartbeatTimestamp?:number;

  /** Node timeout for the next heartbeat. */
  #heartbeatTimeout?: NodeJS.Timer;

  /** From Discord - Time between heartbeats. */
  #heartbeatIntervalTime?: number;

  #heartbeatIntervalOffset: number;

  #startupHeartbeatTolerance: number;

  #allowedMissedHeartbeatAcks: number;

  #isStarting?: StartupCheckFunction;

  /** Emitter for gateway and Api events. Will create a default if not provided via the options. */
  #emitter: ExtendedEmitter;

  /** Key:Value mapping DISCORD_EVENT to user's preferred emitted value. */
  #events?: Record<string, string>;

  /** Object passed to Discord when identifying. */
  #identity: Identify;

  // /** Whether or not to keep all properties on Discord objects in their original snake case. */
  // #keepCase: false;

  // /** Minimum time to wait between gateway identifies in ms. */
  // #retryWait: number;

  // /** Time that the shard's identify mutex will be locked for in ms. */
  // #remoteLoginWait: number;

  /** Amount of identifies reported by the last call to /gateway/bot. */
  public lastKnownSessionLimitData?: SessionLimitData;

  #mainRpcServiceOptions?: IServiceOptions | null;

  #rpcServiceOptions?: IServiceOptions[];

  private static validateOptions(option: GatewayOptions) {
    if (option.startupHeartbeatTolerance !== undefined && option.isStartingFunc === undefined) {
      throw Error("Gateway option 'startupHeartbeatTolerance' requires 'isStartingFunc'.");
    } else if (option.isStartingFunc !== undefined
      && (option.startupHeartbeatTolerance === undefined || option.startupHeartbeatTolerance <= 0)) {
      throw Error("Gateway option 'isStartingFunc' requires 'allowedMissedHeartbeatAcks' larger than 0.");
    }
  }

  /** Verifies parameters to set lock are valid. */
  private static validateLockOptions(options: Partial<ILockServiceOptions>): void {
    const { duration } = options;
    if (duration !== undefined && typeof duration !== 'number' && duration <= 0) {
      throw Error('Lock duration must be a number larger than 0.');
    }
  }

  /**
   * Creates a new Discord gateway handler.
   * @param token Discord token. Will be coerced into a bot token.
   * @param options Optional parameters for this handler.
   */
  public constructor(token: string, options: GatewayOptions) {
    Gateway.validateOptions(options);
    const {
      emitter, identity, identity: { shard }, api, wsUrl, events, heartbeatIntervalOffset, startupHeartbeatTolerance, isStartingFunc,
    } = options;

    if (shard !== undefined && (shard[0] === undefined || shard[1] === undefined)) {
      throw Error(`Invalid shard provided to gateway. shard id: ${shard[0]} | shard count: ${shard[1]}`);
    }
    this.#heartbeatAck = false;
    this.#online = false;
    this.#loggingIn = false;
    this.#wsRateLimitCache = {
      remainingRequests: GATEWAY_MAX_REQUESTS_PER_MINUTE,
      resetTimestamp: 0,
    };
    // this.keepCase = options.keepCase || false;
    this.#emitter = emitter ?? new EventEmitter();
    this.#identity = new Identify(coerceTokenToBotLike(token), identity);
    this.#api = api;
    this.#wsUrl = wsUrl;
    this.#rpcServiceOptions = [];
    this.#events = events;
    this.#heartbeatIntervalOffset = heartbeatIntervalOffset || 0;
    this.#startupHeartbeatTolerance = startupHeartbeatTolerance || 0;
    this.#allowedMissedHeartbeatAcks = startupHeartbeatTolerance || 0;
    this.#isStarting = isStartingFunc;

    this.#wsUrlRetryWait = DEFAULT_GATEWAY_BOT_WAIT;
    this.bindTimerFunctions();
  }

  /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
  public get resumable(): boolean {
    return this.#sessionId !== undefined && this.#sequence !== null;
  }

  /** [ShardID, ShardCount] to identify with; `undefined` if not sharding. */
  private get shard(): Identify['shard'] {
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
    return this.#online !== undefined;
  }

  public get ws(): ws | undefined {
    return this.#ws;
  }

  /** Binds `this` to certain methods so that they are able to be called in `setInterval()` and `setTimeout()`. */
  private bindTimerFunctions(): void {
    this.login = this.login.bind(this);
    this.heartbeat = this.heartbeat.bind(this);
    this.checkLocksPromise = this.checkLocksPromise.bind(this);
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
    data.shard = this.id;
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
  private emit(type: string, data?: unknown): void {
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
   ********* RPC SERVICE **********
   ********************************
   */

  /**
   * Adds the service that will acquire a lock from a serviceOptions(s) before identifying.
   * @param mainServiceOptions Options for connecting this service to the identify lock serviceOptions. Will not be released except by time out. Best used for global minimum wait time. Pass `null` to ignore.
   * @param serviceOptions Options for connecting this service to the identify lock serviceOptions. Will be acquired and released in order.
   */
  public addIdentifyLockServices(mainServiceOptions: null | Partial<ILockServiceOptions>, ...serviceOptions: Partial<ILockServiceOptions>[]): void {
    const usedHostPorts: Record<string, number> = {};

    if (mainServiceOptions !== null) {
      let { port } = mainServiceOptions;
      if (typeof port === 'string') {
        port = Number(port);
      }

      const { host } = mainServiceOptions;
      usedHostPorts[host ?? '127.0.0.1'] = port ?? 50051; // TODO: move port to constant

      this.#mainIdentifyLock = this.configureLockService(mainServiceOptions);
    }

    if (serviceOptions.length) {
      this.#rpcServiceOptions = serviceOptions;
      serviceOptions.forEach((options) => {
        const { host } = options;
        let { port } = options;
        if (typeof port === 'string') {
          port = Number(port);
        }

        if (usedHostPorts[host ?? '127.0.0.1'] === port) {
          throw Error('Multiple locks specified for the same host:port.');
        }

        usedHostPorts[host ?? '127.0.0.1'] = port ?? 50051; // TODO: move port to constant
        this.#identifyLocks.push(this.configureLockService(options));
      });
    }

    this.#mainRpcServiceOptions = mainServiceOptions;
  }

  private configureLockService(serviceOptions: Partial<ILockServiceOptions>): IdentifyLockService {
    Gateway.validateLockOptions(serviceOptions);
    const identifyLock = new IdentifyLockService(serviceOptions);

    if (this.#mainRpcServiceOptions === undefined) {
      const message = `Rpc service created for identify coordination. Connected to: ${identifyLock.target}. Default duration of lock: ${identifyLock.duration}`;
      this.log('INFO', message);
    }

    return identifyLock;
  }

  // TODO: reach out to grpc maintainers to find out why the current state goes bad after this error
  private recreateRpcService(): void {
    if (this.#mainRpcServiceOptions !== undefined && this.#rpcServiceOptions !== undefined) {
      this.#mainIdentifyLock = undefined;
      this.#identifyLocks = [];
      this.addIdentifyLockServices(this.#mainRpcServiceOptions, ...this.#rpcServiceOptions);
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
  public requestGuildMembers(guildId: string, options: Partial<GuildRequestMembers> = {}): boolean {
    const sendOptions: Partial<GuildRequestMembers> = {
      limit: 0, query: '', presences: false, user_ids: [],
    };

    return this.send(GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, <GuildRequestMembers>{ guildId, ...Object.assign(sendOptions, options) });
  }

  private async checkLocksPromise(resolve: () => void): Promise<void> {
    if (await this.acquireLocks()) {
      resolve();
    } else {
      setTimeout(() => this.checkLocksPromise(resolve), SECOND_IN_MILLISECONDS);
    }
  }

  private loginWaitForLocks(): Promise<void> {
    /** Continuously checks if the response has returned. */
    return new Promise(this.checkLocksPromise);
  }

  /**
   * Connects to Discord's event gateway.
   * @param _Websocket Ignore. For unittest dependency injection only.
   */
  public async login(_websocket = ws): Promise<void> {
    if (this.#ws !== undefined) {
      throw Error('Client is already connected.');
    }

    if (this.#loggingIn) {
      throw Error('Already logging in.');
    }

    try {
      this.#loggingIn = true;

      if (!this.resumable) {
        await this.loginWaitForLocks();
      }

      if (this.#wsUrl === undefined) {
        this.#wsUrl = await this.getWebsocketUrl();
      }

      if (this.#wsUrl !== undefined) {
        this.log('DEBUG', `Connecting to url: ${this.#wsUrl}`);

        this.#ws = new _websocket(this.#wsUrl, { maxPayload: GIGABYTE_IN_BYTES });

        this.assignWebsocketMethods(this.#ws);
      }
    } catch (err) {
      if (err.response) {
        /* eslint-disable-next-line no-console */
        console.error(err.response.data.message); // TODO: emit
      } else {
        /* eslint-disable-next-line no-console */
        console.error(err); // TODO: emit
      }

      if (this.#ws !== undefined) {
        this.#ws = undefined;
      }
    } finally {
      this.#loggingIn = false;
    }
  }

  /** Releases all non-main identity locks. */
  public async releaseIdentifyLocks(): Promise<void> {
    if (this.#identifyLocks.length) {
      this.#identifyLocks.forEach((l) => {
        if (l.token !== undefined) this.releaseIdentifyLock(l);
      });
    }
  }

  /**
   * Obtains the websocket url from Discord's REST API. Will attempt to login again after some time if the return status !== 200 and !== 401.
   * @returns Url if status === 200; or undefined if status !== 200.
   */
  private async getWebsocketUrl(): Promise<string | undefined> {
    if (this.#api === undefined) {
      this.#api = new Api(this.#identity.token);
      this.#api.startQueue();
    }

    const { status, statusText, data } = <GatewayBotResponse> await this.#api.request(
      'get',
      'gateway/bot',
    );

    if (status === 200) {
      this.lastKnownSessionLimitData = data.sessionStartLimit;
      const { total, remaining, resetAfter } = data.sessionStartLimit;

      const message = `Login limit: ${total}. Remaining: ${remaining}. Reset after ${resetAfter}ms (${new Date(
        new Date().getTime() + resetAfter,
      )})`;
      this.log('INFO', message);

      return data.url + GATEWAY_DEFAULT_WS_PARAMS;
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
  private handleBadStatus(status: number, statusText: string, dataMessage: string, dataCode: number): void {
    let message = `Failed to get websocket information from API. Status ${status}. Status text: ${statusText}. Discord code: ${dataCode}. Discord message: ${dataMessage}.`;

    if (status !== 401) {
      message += ` Trying again in ${this.#wsUrlRetryWait} seconds.`;
      this.log('WARNING', message);

      setTimeout(this.login, this.#wsUrlRetryWait);
    } else {
      // 401 is bad token, unable to continue.
      message += ' Please check your token.';
      throw Error(message);
    }
  }

  /** Binds `this` to methods used by the websocket. */
  private assignWebsocketMethods(websocket: ws): void {
    websocket.onopen = this._onopen.bind(this);
    websocket.onerror = this._onerror.bind(this);
    websocket.onclose = this._onclose.bind(this);
    websocket.onmessage = this._onmessage.bind(this);
  }

  /**
   * Handles emitting events from Discord. Will first pass through `this.#emitter.eventHandler` function if one exists.
   * @param type Type of event. (e.g. CHANNEL_CREATE) https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
   * @param data Data of the event from Discord.
   */
  private async handleEvent(type: string, data: unknown): Promise<void> {
    if (this.#emitter.eventHandler !== undefined) {
      data = await this.#emitter.eventHandler(type, data, this.id);
    }

    data && this.emit(type, data);
  }

  // /**
  //  * Close the websocket.
  //  * @param option `resume` to reconnect and attempt resume. `reconnect` to reconnect with a new session. Blank to not reconnect.
  //  */
  // private terminate(option?: string): void {
  //   if (this.#ws !== undefined) {
  //     const { USER_TERMINATE, USER_TERMINATE_RESUMABLE, USER_TERMINATE_RECONNECT } = GATEWAY_CLOSE_CODES;

  //     let code = USER_TERMINATE;
  //     if (option === 'resume') {
  //       code = USER_TERMINATE_RESUMABLE;
  //     } else if (option === 'reconnect') {
  //       code = USER_TERMINATE_RECONNECT;
  //     }

  //     this.#ws.close(code);
  //   } else {
  //     /* eslint-disable-next-line no-console */
  //     console.warn('websocket not open');
  //   }
  // }

  /*
   ********************************
   ******* WEBSOCKET - OPEN *******
   ********************************
   */

  /** Assigned to websocket `onopen`. */
  private _onopen(): void {
    this.log('DEBUG', 'Websocket open.');

    this.#wsRateLimitCache.remainingRequests = GATEWAY_MAX_REQUESTS_PER_MINUTE;
    this.handleEvent('GATEWAY_OPEN', this);
  }

  /*
   ********************************
   ******* WEBSOCKET - CLOSE ******
   ********************************
   */

  /** Assigned to websocket `onerror`. */
  private _onerror(err: ws.ErrorEvent): void {
    this.log('ERROR', `Websocket error. Message: ${err.message}`);
  }

  /*
   ********************************
   ****** WEBSOCKET - CLOSE *******
   ********************************
   */

  /** Assigned to websocket `onclose`. Cleans up and attempts to re-connect with a fresh connection after waiting some time.
   * @param event Object containing information about the close.
   */
  private _onclose(event: ws.CloseEvent): void {
    this.#ws = undefined;
    this.#online = false;
    this.clearHeartbeat();
    const shouldReconnect = this.handleCloseCode(event.code);

    this.#wsRateLimitCache = {
      remainingRequests: GATEWAY_MAX_REQUESTS_PER_MINUTE,
      resetTimestamp: 0,
    };

    const gatewayCloseEvent: GatewayCloseEvent = { shouldReconnect, code: event.code, gateway: this };
    this.handleEvent('GATEWAY_CLOSE', gatewayCloseEvent);
  }

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
      RECONNECT,
      SESSION_INVALIDATED,
      SESSION_INVALIDATED_RESUMABLE,
      HEARTBEAT_TIMEOUT,
      USER_TERMINATE_RESUMABLE,
      USER_TERMINATE_RECONNECT,
      USER_TERMINATE,
      UNKNOWN,
    } = GATEWAY_CLOSE_CODES;

    let message;
    let shouldReconnect = true;
    let level: DebugLevel = 'INFO';

    switch (code) {
      case CLEAN:
        message = 'Clean close. (Reconnecting.)';
        this.clearSession();
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
  private clearSession(): void {
    this.#sessionId = undefined;
    this.#sequence = undefined;
    this.#wsUrl = undefined;
  }

  /** Clears heartbeat values and clears the heartbeatTimeout. */
  private clearHeartbeat(): void {
    this.#heartbeatTimeout && clearTimeout(this.#heartbeatTimeout);
    this.#heartbeatTimeout = undefined;
    this.#heartbeatIntervalTime = undefined;
    this.#heartbeatAck = false;
    this.#nextHeartbeatTimestamp = undefined;
  }

  /*
   ********************************
   ****** WEBSOCKET MESSAGE *******
   ********************************
   */

  /** Assigned to websocket `onmessage`. */
  private _onmessage(m: ws.MessageEvent): void {
    typeof m.data === 'string' && this.handleMessage(JSON.parse(m.data));
  }

  /** Processes incoming messages from Discord's gateway.
   * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
   */
  private handleMessage(p: GatewayPayload): void {
    const {
      t: type, s: sequence, op: opCode, d: data,
    } = p;

    // const d = typeof data === 'object' && data?.constructor.name === 'Object' ? objectKeysSnakeToCamel(<Record<string, unknown>>data) : data;

    switch (opCode) {
      case GATEWAY_OP_CODES.DISPATCH:
        if (type === 'READY') {
          this.handleReady(<ReadyEventFields><unknown>data);
        } else if (type === 'RESUMED') {
          this.handleResumed();
        } else if (type !== null) {
          setImmediate(() => this.handleEvent(type, data));
        } else {
          this.log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
        }
        break;

      case GATEWAY_OP_CODES.HELLO:
        this.handleHello(<Hello><unknown>data);
        break;

      case GATEWAY_OP_CODES.HEARTBEAT_ACK:
        this.handleHeartbeatAck();
        break;

      case GATEWAY_OP_CODES.HEARTBEAT:
        this.send(GATEWAY_OP_CODES.HEARTBEAT, <Heartbeat> this.#sequence);
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

    this.updateSequence(sequence);
  }

  /**
   * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
   * @param data From Discord.
   */
  private handleReady(data: ReadyEventFields): void {
    this.log('INFO', `Received Ready. Session ID: ${data.session_id}.`);

    this.#sessionId = data.session_id;
    this.#allowedMissedHeartbeatAcks = this.#startupHeartbeatTolerance;
    this.#online = true;

    this.handleEvent('READY', data);
  }

  /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
  private handleResumed(): void {
    this.log('INFO', 'Replay finished. Resuming events.');
    this.#online = true;

    this.handleEvent('RESUMED', null);
  }

  /**
   * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
   * @param data From Discord.
   */
  private handleHello(data: Hello): void {
    this.log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
    this.startHeartbeat(data.heartbeat_interval - this.#heartbeatIntervalOffset);
    this.connect(this.resumable);

    this.handleEvent('HELLO', data);
  }

  /**
   * Starts heartbeat. https://discord.com/developers/docs/topics/gateway#heartbeating
   * @param heartbeatInterval From Discord - Number of ms to wait between sending heartbeats.
   */
  private startHeartbeat(heartbeatInterval: number): void {
    this.#heartbeatAck = true;
    this.#heartbeatIntervalTime = heartbeatInterval;

    const now = new Date().getTime();
    this.#nextHeartbeatTimestamp = now + this.#heartbeatIntervalTime;
    this.#heartbeatTimeout = setTimeout(this.heartbeat, this.#nextHeartbeatTimestamp - now);
  }

  /** Checks if heartbeat ack was received. If not, closes gateway connection. If so, send a heartbeat. */
  private heartbeat() {
    if (this.#heartbeatAck === false) {
      this.handleMissedHeartbeatAck();
    } else {
      this.handleSuccessfulHeartbeat();
    }
  }

  private handleMissedHeartbeatAck(): void {
    if (this.#isStarting !== undefined && this.#isStarting(this) && this.allowMissingAckOnStartup()) {
      this.sendHeartbeat();
      this.log('WARNING', `Missed heartbeat Ack on startup. ${this.#allowedMissedHeartbeatAcks} out of ${this.#startupHeartbeatTolerance} misses allowed.`);
    } else {
      this.log('ERROR', 'Heartbeat not acknowledged in time.');
      this.#ws?.close(GATEWAY_CLOSE_CODES.HEARTBEAT_TIMEOUT);
    }
  }

  private allowMissingAckOnStartup(): boolean {
    return this.#allowedMissedHeartbeatAcks-- > 0;
  }

  private handleSuccessfulHeartbeat(): void {
    this.#heartbeatAck = false;
    this.sendHeartbeat();

    const now = new Date().getTime();

    if (this.#heartbeatIntervalTime !== undefined) {
      const message = this.#nextHeartbeatTimestamp !== undefined
        ? `Heartbeat sent ${now - this.#nextHeartbeatTimestamp}ms after scheduled time.`
        : 'nextHeartbeatTimestamp is undefined.';
      this.#nextHeartbeatTimestamp = now + this.#heartbeatIntervalTime;
      this.#heartbeatTimeout = setTimeout(this.heartbeat, this.#nextHeartbeatTimestamp - now);
      this.log('DEBUG', message);
    } else {
      this.log('ERROR', 'heartbeatIntervalTime is undefined. Reconnecting.');
      this.#ws?.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }
  }

  private sendHeartbeat(): void {
    const now = new Date().getTime();
    this.#lastHeartbeatTimestamp = now;
    this.send(GATEWAY_OP_CODES.HEARTBEAT, <Heartbeat> this.#sequence);
  }

  /** Handles "Heartbeat ACK" packet from Discord. https://discord.com/developers/docs/topics/gateway#heartbeating */
  private handleHeartbeatAck(): void {
    this.#heartbeatAck = true;
    this.handleEvent('HEARTBEAT_ACK', null);

    if (this.#lastHeartbeatTimestamp !== undefined) {
      const message = `Heartbeat acknowledged. Latency: ${new Date().getTime()
      - this.#lastHeartbeatTimestamp}ms`;
      this.log('DEBUG', message);
    } else {
      this.log('ERROR', 'heartbeatIntervalTime is undefined. Reconnecting.');
      this.#ws?.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }
  }

  /** Connects to gateway. */
  private async connect(resume: boolean): Promise<void> {
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

    if (sessionId !== undefined && sequence !== undefined) {
      const payload: Resume = {
        token,
        session_id: sessionId,
        seq: sequence,
      };

      this.handleEvent('GATEWAY_RESUME', payload);

      this.send(GATEWAY_OP_CODES.RESUME, payload);
    } else {
      this.log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionI d: ${sessionId}, sequence: ${sequence}`);
      this.#ws?.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }
  }

  /** Sends an "Identify" payload. */
  private async identify(): Promise<void> {
    const [shardId, shardCount] = this.shard ?? [0, 1];
    this.log(
      'INFO',
      `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`,
    );

    await this.handleEvent('GATEWAY_IDENTIFY', this);

    this.send(GATEWAY_OP_CODES.IDENTIFY, <Identify> this.#identity);
  }

  /**
   * Attempts to acquire all the necessary locks to identify.
   * @returns `true` if acquired locks; `false` if not.
   */
  private async acquireLocks(): Promise<boolean> {
    if (this.#identifyLocks !== undefined) {
      const acquiredLocks = await this.acquireIdentifyLocks();
      if (!acquiredLocks) {
        return false;
      }
    }

    if (this.#mainIdentifyLock !== undefined) {
      const acquiredLock = await this.acquireIdentifyLock(this.#mainIdentifyLock);
      if (!acquiredLock) {
        if (this.#identifyLocks !== undefined) {
          this.#identifyLocks.forEach(this.releaseIdentifyLock);
        }

        return false;
      }
    }

    return true;
  }

  /**
   * Attempts to acquire all the non-main identify locks in succession, releasing if one fails.
   * @returns `true` if acquired locks; `false` if not.
   */
  private async acquireIdentifyLocks(): Promise<boolean> {
    if (this.#identifyLocks !== undefined) {
      const acquiredLocks: IdentifyLockService[] = [];

      for (let i = 0; i < this.#identifyLocks.length; ++i) {
        const lock = this.#identifyLocks[i]; // for intellisense

        const acquiredLock = await this.acquireIdentifyLock(lock);
        if (acquiredLock) {
          acquiredLocks.push(lock);
        } else {
          acquiredLocks.forEach(this.releaseIdentifyLock);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Attempts to acquire an identify lock.
   * @param lock Lock to acquire.
   * @returns `true` if acquired lock (or fallback); `false` if not.
   */
  private async acquireIdentifyLock(lock: IdentifyLockService): Promise<boolean> {
    try {
      const { success, message: err } = await lock.acquire();

      if (!success) {
        this.log('DEBUG', `Was not able to acquire lock. Message: ${err}`);
        return false;
      }

      return true;
    } catch (err) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION && lock.allowFallback) {
        this.recreateRpcService();
        this.log('WARNING', `Was not able to connect to lock serviceOptions to acquire lock: ${lock.target}. Fallback allowed: ${lock.allowFallback}`);
        return true;
      }

      if (err !== undefined) {
        return false;
      }

      throw err;
    }
  }


  /**
   * Releases the identity lock.
   * @param lock Lock to release.
   */
  private async releaseIdentifyLock(lock: IdentifyLockService): Promise<void> {
    try {
      const { message: err } = await lock.release();
      lock.clearToken();

      if (err !== undefined) {
        this.log('DEBUG', `Was not able to release lock. Message: ${err}`);
      }
    } catch (err) {
      if (err.code === RPC_CLOSE_CODES.LOST_CONNECTION) {
        this.recreateRpcService();
      }

      this.log('WARNING', `Was not able to connect to lock serviceOptions to release lock: ${lock.target}.}`);

      if (err.code !== RPC_CLOSE_CODES.LOST_CONNECTION) {
        throw err;
      }
    }
  }

  /**
   * Sends a websocket message to Discord.
   * @param op Gateway Opcode https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
   * @param data Data of the message.
   * @returns true if the packet was sent; false if the packet was not due to rate limiting or websocket not open.
   */
  private send(op: number, data: Heartbeat | Identify | GuildRequestMembers | Resume): boolean {
    const payload = { op, d: data };

    if (
      this.canSendPacket(op)
      && this.#ws?.readyState === ws.OPEN
    ) {
      const packet = JSON.stringify(typeof payload === 'object' ? objectKeysCamelToSnake(payload) : payload);
      this.#ws.send(packet);

      this.updateWsRateLimit();

      this.log('DEBUG', 'Sent payload.', { payload });

      return true;
    }

    this.log('DEBUG', 'Failed to send payload.', { payload });

    return false;
  }

  /**
   * Returns whether or not the message to be sent will exceed the rate limit or not, taking into account padded buffers for high priority packets (e.g. heartbeats, resumes).
   * @param op Op code of the message to be sent.
   * @returns true if sending message won't exceed rate limit or padding; false if it will
   */
  private canSendPacket(op: number): boolean {
    const now = new Date().getTime();

    if (now >= this.#wsRateLimitCache.resetTimestamp) {
      this.#wsRateLimitCache.remainingRequests = GATEWAY_MAX_REQUESTS_PER_MINUTE;
      return true;
    }

    if (this.#wsRateLimitCache.remainingRequests >= GATEWAY_REQUEST_BUFFER) {
      return true;
    }

    if (
      this.#wsRateLimitCache.remainingRequests <= GATEWAY_REQUEST_BUFFER
      && (op === GATEWAY_OP_CODES.HEARTBEAT || op === GATEWAY_OP_CODES.RECONNECT)
    ) {
      return true;
    }
    return false;
  }

  /** Updates the rate limit cache upon sending a websocket message, resetting it if enough time has passed */
  private updateWsRateLimit(): void {
    if (
      this.#wsRateLimitCache.remainingRequests === GATEWAY_MAX_REQUESTS_PER_MINUTE
    ) {
      this.#wsRateLimitCache.resetTimestamp = new Date().getTime() + MINUTE_IN_MILLISECONDS;
    }

    --this.#wsRateLimitCache.remainingRequests;
  }

  /**
   * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
   * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
   * @param resumable Whether or not Discord has said that the connection as able to be resumed.
   */
  private handleInvalidSession(resumable: boolean): void {
    this.log(
      'INFO',
      `Received Invalid Session packet. Resumable: ${resumable}`,
    );

    if (!resumable) {
      this.#ws?.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
    } else {
      this.#ws?.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
    }

    this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
  }

  /**
   * Updates the sequence value of Discord's gateway if it's larger than the current.
   * @param s Sequence value from Discord.
   */
  private updateSequence(s: number | null): void {
    if (this.#sequence === undefined) {
      this.#sequence = s ?? undefined;
    } else if (s !== null) {
      if (s > this.#sequence + 1) {
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
