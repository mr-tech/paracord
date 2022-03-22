import { EventEmitter } from 'events';

import Api from '../Api/Api';
import Gateway from '../Gateway/Gateway';
import {
  clone, coerceTokenToBotLike, isObject, objectKeysSnakeToCamel,
} from '../../utils';

import {
  LOG_LEVELS, LOG_SOURCES, SECOND_IN_MILLISECONDS,
} from '../../constants';

import type { DebugLevel, ILockServiceOptions, UserEvents } from '../../common';
import type { ReadyEventField } from '../../types';
import type { IApiOptions } from '../Api/types';
import type { GatewayOptions, IdentityOptions, GatewayCloseEvent } from '../Gateway/types';
import type { GatewayMap, ParacordLoginBaseOptions, ParacordBaseOptions } from './types';

/**
   * Determines which shards will be spawned.
   * @param shards Shard Ids to spawn.
   * @param shardCount Total number of shards
   */
function computeShards(shards: number[], shardCount: number): { shards: number[] | undefined, shardCount: number | undefined } {
  if (shards === undefined && shardCount !== undefined) {
    shards = [];
    for (let i = 0; i < shardCount; ++i) {
      shards.push(i);
    }
  }

  return { shards, shardCount };
}

/* "Start up" refers to logging in to the gateway and waiting for all the guilds to be returned. By default, events will be suppressed during start up. */

/** A client that provides caching and limited helper functions. Integrates the Api and Gateway clients into a seamless experience. */
export default class Base extends EventEmitter {
  public request!: Api['request'];

  public addRateLimitService!: Api['addRateLimitService'];

  public addRequestService!: Api['addRequestService'];

  /** Gateways queue to log in. */
  public readonly gatewayLoginQueue: Gateway[];

  /** Discord bot token. */
  #token: string;

  /** Whether or not the `init()` function has already been called. */
  #initialized: boolean;

  /** During a shard's start up, how many guilds may be unavailable before forcing ready. */
  #unavailableGuildTolerance?: number;

  /** During a shard's start up, time in seconds to wait from the last GUILD_CREATE to force ready. */
  #unavailableGuildWait?: number;

  /** Interval that will force shards as ready when within set thresholds. */
  #startWithUnavailableGuildsInterval?: NodeJS.Timer;

  /* Internal clients. */
  /** Client through which to make REST API calls to Discord. */
  #api?: Api;

  /** Gateway clients keyed to their shard #. */
  #gateways: GatewayMap;

  /** IdentityOptions lock service options passed to the gateway shards. */
  #gatewayLockServiceOptions?: {
    mainServerOptions: ILockServiceOptions,
    serverOptions: ILockServiceOptions[],
  };

  #apiOptions: Partial<IApiOptions> | undefined;

  #gatewayOptions: Partial<GatewayOptions> | undefined;

  /* State that tracks the start up process. */
  /** Timestamp of the last gateway identify. */
  #safeGatewayIdentifyTimestamp: number;

  /** Shard currently in the initial phases of the gateway connection in progress. */
  #startingGateway: Gateway | undefined;

  /** Gateways left to login on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
  #gatewayWaitCount: number;

  /** Guilds left to ingest on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
  #guildWaitCount: number;

  /** Timestamp of last GUILD_CREATE event on start up for the current `#startingGateway`. */
  #lastGuildTimestamp?: number;

  #startupHeartbeatTolerance?: number;

  /* User-defined event handling behavior. */
  /** Key:Value mapping DISCORD_EVENT to user's preferred emitted name for use when connecting to the gateway. */
  #events?: UserEvents;

  #preventLogin: boolean;

  #gatewayHeartbeats: Gateway['checkIfShouldHeartbeat'][];

  /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
  private static validateParams(token: string): void {
    if (token === undefined) {
      throw Error("client requires a 'token'");
    }
  }

  private static ensureCamelProps(data: unknown): unknown {
    return isObject(data) ? objectKeysSnakeToCamel(<Record<string, unknown>> data) : data;
  }

  /**
   * Creates a new Paracord client.
   *
   * @param token Discord bot token. Will be coerced into a bot token.
   * @param options Settings for this Paracord instance.
   */
  public constructor(token: string, options: ParacordBaseOptions = {}) {
    super();
    Base.validateParams(token);

    this.#token = coerceTokenToBotLike(token);
    this.#initialized = false;
    this.#gateways = new Map();
    this.gatewayLoginQueue = [];
    this.#guildWaitCount = 0;
    this.#gatewayWaitCount = 0;
    this.#preventLogin = false;
    this.#gatewayHeartbeats = [];

    this.#safeGatewayIdentifyTimestamp = 0;

    const { events, apiOptions, gatewayOptions } = options;
    this.#events = events;
    this.#apiOptions = apiOptions;
    this.#gatewayOptions = gatewayOptions;

    if (options.autoInit !== false) {
      this.init();
    }
  }

  public get startingGateway(): Gateway | undefined {
    return this.#startingGateway;
  }

  /** Gateway clients keyed to their shard #. */
  public get shards(): GatewayMap {
    return this.#gateways;
  }

  /** Whether or not there are gateways currently starting up. */
  public get connecting(): boolean {
    return this.gatewayLoginQueue.length !== 0 || this.#startingGateway !== undefined;
  }

  /*
   ********************************
   *********** INTERNAL ***********
   ********************************
   */

  /**
   * Processes a gateway event.
   * @param eventType The type of the event from the gateway. https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events (Events tend to be emitted in all caps and underlines in place of spaces.)
   * @param data From Discord.
   * @param shard Shard id of the gateway that emitted this event.
   */
  public eventHandler(eventType: string, data: unknown, shard: number): unknown {
    switch (eventType) {
      case 'READY':
        this.handleGatewayReady(<ReadyEventField>data);
        break;
      case 'GATEWAY_IDENTIFY':
        this.handleGatewayIdentify(<Gateway>data);
        break;
      case 'GATEWAY_CLOSE':
        this.handleGatewayClose(<GatewayCloseEvent>data);
        break;
      default:
    }

    if (this.#startingGateway?.id === shard && this.#guildWaitCount !== undefined) {
      if (eventType === 'GUILD_CREATE') {
        --this.#guildWaitCount;
        this.checkIfDoneStarting();
      }
    }

    return data;
  }

  /**
   * Simple alias for logging events emitted by this client.
   * @param level Key of the logging level of this message.
   * @param message Content of the log.
   * @param data Data pertinent to the event.
   */
  public log(level: DebugLevel, message: string, data?: unknown): void {
    this.emit('DEBUG', {
      source: LOG_SOURCES.PARACORD,
      level: LOG_LEVELS[level],
      message,
      data,
    });
  }

  /**
   * Proxy emitter. Renames type with a key in `this.#events`.
   * @param type Name of the event.
   * @param args Any arguments to send with the emitted event.
   */
  public emit(event: string, ...args: unknown[]): boolean {
    const events = this.#events;
    if (events === undefined) {
      return super.emit(event, ...args);
    }

    const type = events[event];
    if (type !== undefined) {
      args = args.map(Base.ensureCamelProps);
      return super.emit(type, ...args);
    }

    return false;
  }

  /*
   ********************************
   ************ LOGIN *************
   ********************************
   */

  /**
   * Connects to Discord's gateway and begins receiving and emitting events.
   * @param options Options used when logging in.
   */
  public async login(options: Partial<ParacordLoginBaseOptions> = {}): Promise<void> {
    const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;

    const {
      unavailableGuildTolerance, unavailableGuildWait, startupHeartbeatTolerance,
    } = options;

    if (!this.#initialized) {
      this.init();
    }

    this.#unavailableGuildTolerance = unavailableGuildTolerance;
    this.#unavailableGuildWait = unavailableGuildWait;
    this.#startupHeartbeatTolerance = startupHeartbeatTolerance;

    if (PARACORD_SHARD_IDS !== undefined) {
      options.shards = PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
      options.shardCount = Number(PARACORD_SHARD_COUNT);
      const message = `Injecting shard settings from shard launcher. Shard Ids: ${options.shards}. Shard count: ${options.shardCount}`;
      this.log('INFO', message);
    }

    this.startGatewayLoginInterval();
    await this.enqueueGateways(options);
  }

  /** Begins the interval that kicks off gateway logins from the queue. */
  private startGatewayLoginInterval(): void {
    setInterval(this.processGatewayQueue, SECOND_IN_MILLISECONDS);
  }

  /** Takes a gateway off of the queue and logs it in. */
  private processGatewayQueue = async (): Promise<void> => {
    const preventLogin = this.#preventLogin;
    const { gatewayLoginQueue } = this;
    const startingGateway = this.#startingGateway;
    const unavailableGuildTolerance = this.#unavailableGuildTolerance;
    const unavailableGuildWait = this.#unavailableGuildWait;
    const now = new Date().getTime();

    if (
      !preventLogin
      && gatewayLoginQueue.length
      && startingGateway === undefined
      && now > this.#safeGatewayIdentifyTimestamp
    ) {
      const gateway = <Gateway> this.gatewayLoginQueue.shift();
      this.#safeGatewayIdentifyTimestamp = now + 10 * SECOND_IN_MILLISECONDS; // arbitrary buffer to allow previous to finish

      this.#startingGateway = gateway;
      try {
        await gateway.login();

        if (unavailableGuildTolerance !== undefined && unavailableGuildWait !== undefined) {
          this.#startWithUnavailableGuildsInterval = setInterval(this.startWithUnavailableGuilds.bind(this, gateway), 1e3);
        }
      } catch (err) {
        this.log('FATAL', err.message, gateway);
        this.clearStartingShardState();
        gatewayLoginQueue.unshift(gateway);
      }
    }
  };

  private startWithUnavailableGuilds = (gateway: Gateway): void => {
    const unavailableGuildTolerance = this.#unavailableGuildTolerance;
    const guildWaitCount = this.#guildWaitCount;
    const unavailableGuildWait = this.#unavailableGuildWait;
    const lastGuildTimestamp = this.#lastGuildTimestamp;

    const withinTolerance = guildWaitCount !== undefined && guildWaitCount <= <number>unavailableGuildTolerance;
    const timedOut = lastGuildTimestamp !== undefined && lastGuildTimestamp + <number>unavailableGuildWait * 1e3 < new Date().getTime();

    if (this.#startingGateway === gateway && withinTolerance && timedOut) {
      const message = `Forcing startup complete for shard ${this.#startingGateway.id} with ${this.#guildWaitCount} unavailable guilds.`;
      this.log('WARNING', message);
      this.checkIfDoneStarting(true);
    }
  };

  /** Decides shards to spawn and pushes a gateway onto the queue for each one.
   * @param options Options used when logging in.
   */
  private async enqueueGateways(options: Partial<ParacordLoginBaseOptions>): Promise<void> {
    const { identity } = options;
    let { shards, shardCount } = options;

    if (identity && Array.isArray(identity.shard)) {
      const identityCopy = clone<IdentityOptions>(identity);
      this.addNewGateway(identityCopy);
    } else {
      if (!identity?.intents) throw Error('intents missing on options#identity');

      if (shards !== undefined && shardCount !== undefined) {
        shards.forEach((s) => {
          if (s + 1 > <number>shardCount) {
            throw Error(`shard id ${s} exceeds max shard id of ${<number>shardCount - 1}`);
          }
        });
      } else if (shards && shardCount) {
        ({ shards, shardCount } = computeShards(shards, shardCount));
      }

      if (shards === undefined || shardCount === undefined) {
        throw Error(`shards ids or shard count are invalid - ids ${shards} , count: ${shardCount}`);
      } else {
        for (const shard of shards) {
          const identityCopy: IdentityOptions = identity ? clone<IdentityOptions>(identity) : { token: this.#token, intents: 0 };
          identityCopy.shard = [shard, shardCount];
          this.addNewGateway(identityCopy);
        }
      }
    }
  }

  /**
   * Creates gateway and pushes it into cache and login queue.
   * @param identity An object containing information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure
   */
  private addNewGateway(identity: IdentityOptions): void {
    const gatewayOptions = this.createGatewayOptions(identity);

    const gateway = this.setUpGateway(this.#token, gatewayOptions);
    if (this.#gateways.get(gateway.id) !== undefined) {
      throw Error(`duplicate shard id ${gateway.id}. shard ids must be unique`);
    }

    this.#gatewayHeartbeats.push(gateway.checkIfShouldHeartbeat);

    ++this.#gatewayWaitCount;
    this.#gateways.set(gateway.id, gateway);
    this.gatewayLoginQueue.push(gateway);
  }

  private createGatewayOptions(identity: IdentityOptions): GatewayOptions {
    const gatewayOptions: GatewayOptions = {
      identity, api: this.#api, emitter: this, checkSiblingHeartbeats: this.#gatewayHeartbeats,
    };

    if (this.#startupHeartbeatTolerance !== undefined) {
      gatewayOptions.startupHeartbeatTolerance = this.#startupHeartbeatTolerance;
      gatewayOptions.isStartingFunc = (gateway: Gateway) => this.#startingGateway === gateway;
    }

    return gatewayOptions;
  }

  /** Sets up the internal handlers for this client. */
  public init(): void {
    if (this.#initialized) {
      throw Error('Client has already been initialized.');
    }
    this.#api = this.setUpApi(this.#token, this.#apiOptions ?? {});
    this.#initialized = true;
  }

  /*
  ********************************
  ************ SETUP *************
  ********************************
  */

  /**
   * Creates the handler used when handling REST calls to Discord.
   * @param token Discord token. Will be coerced to bot token.
   * @param options
   */
  private setUpApi(token: string, options: Partial<IApiOptions>): Api {
    const api = new Api(token, { ...options, emitter: this });
    if (api.rpcRequestService === undefined) {
      api.startQueue();
    }

    return api;
  }

  /**
   * Creates the handler used when connecting to Discord's gateway.
   * @param token Discord token. Will be coerced to bot token.
   * @param options
   */
  private setUpGateway(token: string, options: GatewayOptions): Gateway {
    const gateway = new Gateway(token, {
      ...this.#gatewayOptions,
      ...options,
      emitter: this,
      api: this.#api,
    });

    if (this.#gatewayLockServiceOptions) {
      const { mainServerOptions, serverOptions } = this.#gatewayLockServiceOptions;
      gateway.addIdentifyLockServices(mainServerOptions, ...serverOptions);
    }

    return gateway;
  }

  /**
   * Stores options that will be passed to each gateway shard when adding the service that will acquire a lock from a server(s) before identifying.
   * @param mainServerOptions Options for connecting this service to the identify lock server. Will not be released except by time out. Best used for global minimum wait time. Pass `null` to ignore.
   * @param serverOptions Options for connecting this service to the identify lock server. Will be acquired and released in order.
   */
  public addIdentifyLockServices(mainServerOptions: ILockServiceOptions, ...serverOptions: ILockServiceOptions[]): void {
    this.#gatewayLockServiceOptions = {
      mainServerOptions,
      serverOptions,
    };
  }

  /*
  ********************************
  ********** START UP ************
  ********************************
  */

  /**
   * Runs with every GUILD_CREATE on initial start up. Decrements counter and emits `PARACORD_STARTUP_COMPLETE` when 0.
   * @param emptyShard Whether or not the shard started with no guilds.
   */
  private checkIfDoneStarting(forced?: boolean): void {
    const startingGateway = this.#startingGateway;
    const guildWaitCount = this.#guildWaitCount;

    if (startingGateway !== undefined) {
      if (forced || guildWaitCount === 0) {
        this.completeShardStartup(startingGateway, forced);

        --this.#gatewayWaitCount === 0 && this.completeStartup();
      } else if (guildWaitCount !== undefined && guildWaitCount < 0) {
        const message = `Shard ${startingGateway.id} - guildWaitCount is less than 0. This should not happen. guildWaitCount value: ${this.#guildWaitCount}`;
        this.log('WARNING', message);
      } else {
        this.#lastGuildTimestamp = new Date().getTime();
        const message = `Shard ${startingGateway.id} - ${guildWaitCount} guilds left in start up.`;
        this.log('INFO', message);
      }
    } else {
      const message = 'Starting check conducted without a defined gateway.';
      this.log('WARNING', message);
    }
  }

  private completeShardStartup(startingGateway: Gateway, forced = false): void {
    if (!forced) {
      const message = 'Received all start up guilds.';
      this.log('INFO', message, { shard: startingGateway.id });
    }

    startingGateway.releaseIdentifyLocks();
    const shard = this.#startingGateway;

    this.clearStartingShardState();
    this.emit('SHARD_STARTUP_COMPLETE', { shard, forced });
  }

  public clearStartingShardState(): void {
    this.#startingGateway = undefined;
    this.#lastGuildTimestamp = undefined;
    this.#guildWaitCount = 0;
    this.#startWithUnavailableGuildsInterval && clearInterval(this.#startWithUnavailableGuildsInterval);
  }

  /**
   * Cleans up Paracord start up process and emits `PARACORD_STARTUP_COMPLETE`.
   * @param reason Reason for the time out.
   */
  private completeStartup(reason?: string): void {
    let message = 'Paracord start up complete.';
    if (reason !== undefined) {
      message += ` ${reason}`;
    }

    this.log('INFO', message);
    this.emit('PARACORD_STARTUP_COMPLETE');
    // this.removeInactiveUsersFromCache();
  }

  /**
   * Prepares the client for caching guilds on start up.
   * @param data From Discord - Initial ready event after identify.
   */
  private handleGatewayReady(data: ReadyEventField): void {
    const { user, guilds } = data;

    this.#guildWaitCount = guilds.length;
    this.log('INFO', `Logged in as ${user.username}#${user.discriminator}.`);

    const message = `Ready event received. Waiting on ${guilds.length} guilds.`;
    this.log('INFO', message);

    if (guilds.length === 0) {
      this.checkIfDoneStarting();
    } else {
      this.#lastGuildTimestamp = new Date().getTime();
    }
  }

  /**
   * @param identity From a gateway client.
   */
  private handleGatewayIdentify(gateway: Gateway): Gateway {
    this.#safeGatewayIdentifyTimestamp = new Date().getTime() + (6 * SECOND_IN_MILLISECONDS);
    return gateway;
  }

  // { gateway, shouldReconnect }: { gateway: Gateway, shouldReconnect: boolean },
  /**
   * @param gateway Gateway that emitted the event.
   * @param shouldReconnect Whether or not to attempt to login again.
   */
  private handleGatewayClose(data: GatewayCloseEvent): GatewayCloseEvent {
    const { gateway, shouldReconnect } = data;
    if (shouldReconnect) {
      if (gateway.resumable) {
        gateway.login();
      } else if (this.startingGateway === gateway) {
        this.clearStartingShardState();
        this.gatewayLoginQueue.unshift(gateway);
      } else {
        this.gatewayLoginQueue.push(gateway);
      }
    }

    return data;
  }
}
