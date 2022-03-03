import { EventEmitter } from 'events';

import Api from '../Api/Api';
import Gateway from '../Gateway/Gateway';
import {
  User, Guild, GuildChannel, GuildEmoji, GuildMember, GuildVoiceState, Presence, Role, CacheMap,
} from './structures';

import * as eventFuncs from './eventFuncs';

import {
  clone, coerceTokenToBotLike, isObject, objectKeysSnakeToCamel,
} from '../../utils';
import {
  LOG_LEVELS, LOG_SOURCES, SECOND_IN_MILLISECONDS,
} from '../../constants';

import type { DebugLevel, ILockServiceOptions, UserEvents } from '../../common';
import type { RemoteApiResponse } from '../../rpc/types';
import type {
  AugmentedGuildMember as AugmentedRawGuildMember, GuildMember as RawGuildMember, Presence as RawPresence, User as RawUser, ReadyEventField, Snowflake,
} from '../../types';
import type { IApiOptions, IApiResponse, ResponseData } from '../Api/types';
import type { GatewayBotResponse, GatewayOptions, IdentityOptions } from '../Gateway/types';
import type {
  DiscordResource, EventFunction, EventFunctions, FilterOptions, GatewayMap, GuildMap, Message,
  ParacordLoginOptions, ParacordOptions, PresenceMap, RawGuildType, UserMap,
} from './types';

const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;

// TODO: handle emitting of events before emitter is initialized in constructor... somehow.

/* "Start up" refers to logging in to the gateway and waiting for all the guilds to be returned. By default, events will be suppressed during start up. */

/** A client that provides caching and limited helper functions. Integrates the Api and Gateway clients into a seamless experience. */
export default class Paracord extends EventEmitter {
  public request!: Api['request'];

  public addRateLimitService!: Api['addRateLimitService'];

  public addRequestService!: Api['addRequestService'];

  /** User details given by Discord in the "Ready" event form the gateway. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
  public user!: User;

  /** Discord bot token. */
  public readonly token: string;

  /** Gateways queue to log in. */
  public readonly gatewayLoginQueue: Gateway[];

  /* Client caches. */
  /** Guild cache. */
  #guilds: GuildMap | undefined;

  /** User cache. */
  #users: UserMap;

  #presences: PresenceMap;

  #filterOptions: FilterOptions | undefined;

  /** Whether or not the `init()` function has already been called. */
  #initialized: boolean;

  /** During a shard's start up, how many guilds may be unavailable before forcing ready. */
  #unavailableGuildTolerance?: number;

  /** During a shard's start up, time in seconds to wait from the last GUILD_CREATE to force ready. */
  #unavailableGuildWait?: number;

  /** Interval that will force shards as ready when within set thresholds. */
  #startWithUnavailableGuildsInterval?: NodeJS.Timer

  /* Internal clients. */
  /** Client through which to make REST API calls to Discord. */
  #api!: Api;

  /** Gateway clients keyed to their shard #. */
  #gateways: GatewayMap;

  /** Identify lock service options passed to the gateway shards. */
  #gatewayLockServiceOptions?: {
    mainServerOptions: ILockServiceOptions,
    serverOptions: ILockServiceOptions[],
  };

  #apiOptions: Partial<IApiOptions> | undefined;

  #gatewayOptions: Partial<GatewayOptions> | undefined;

  /* State that tracks the start up process. */
  /** Timestamp of the last gateway identify. */
  public safeGatewayIdentifyTimestamp: number;

  /** Shard currently in the initial phases of the gateway connection in progress. */
  #startingGateway: Gateway | undefined;

  /** Gateways left to login on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
  #gatewayWaitCount: number;

  /** Guilds left to ingest on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
  #guildWaitCount: number;

  /** Timestamp of last GUILD_CREATE event on start up for the current `#startingGateway`. */
  #lastGuildTimestamp?: number;

  #startupHeartbeatTolerance?: number;

  /** Interval that coordinates gateway logins. */
  #processGatewayQueueInterval?: NodeJS.Timer;

  /* User-defined event handling behavior. */
  /** Key:Value mapping DISCORD_EVENT to user's preferred emitted name for use when connecting to the gateway. */
  #events?: UserEvents;

  /** During startup, if events should be emitted before `PARACORD_STARTUP_COMPLETE` is emitted. `GUILD_CREATE` events will never be emitted during start up. */
  #allowEventsDuringStartup: boolean;

  #preventLogin: boolean;

  #gatewayEvents: EventFunctions;

  #gatewayHeartbeats: Gateway['checkIfShouldHeartbeat'][];

  /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
  private static validateParams(token: string): void {
    if (token === undefined) {
      throw Error("client requires a 'token'");
    }
  }

  private static ensureCamelProps(data: DiscordResource | unknown): unknown {
    if (
      data instanceof Guild
      || data instanceof GuildChannel
      || data instanceof GuildEmoji
      || data instanceof GuildMember
      || data instanceof GuildVoiceState
      || data instanceof Presence
      || data instanceof Role
      || data instanceof User
    ) {
      return data;
    }

    return isObject(data) ? objectKeysSnakeToCamel(<Record<string, unknown>> data) : data;
  }

  /**
   * Creates a new Paracord client.
   *
   * @param token Discord bot token. Will be coerced into a bot token.
   * @param options Settings for this Paracord instance.
   */
  public constructor(token: string, options: ParacordOptions = {}) {
    super();
    Paracord.validateParams(token);

    this.token = coerceTokenToBotLike(token);
    this.#initialized = false;
    this.#gateways = new Map();
    this.gatewayLoginQueue = [];
    this.#guildWaitCount = 0;
    this.#gatewayWaitCount = 0;
    this.#allowEventsDuringStartup = false;
    this.#preventLogin = false;
    this.safeGatewayIdentifyTimestamp = 0;
    this.#gatewayHeartbeats = [];

    const {
      events, apiOptions, gatewayOptions, filterOptions,
    } = options;
    this.#events = events;
    this.#apiOptions = apiOptions;
    this.#gatewayOptions = gatewayOptions;
    this.#filterOptions = filterOptions;

    if (!filterOptions?.caches?.guilds ?? true) {
      this.#guilds = new CacheMap(Guild, filterOptions?.props);
    }
    this.#users = new CacheMap(User, filterOptions?.props);
    this.#presences = new CacheMap(Presence, filterOptions?.props);

    if (options.autoInit !== false) {
      this.init();
    }
    this.bindTimerFunction();
    this.#gatewayEvents = this.bindEventFunctions();
    this.handlePresenceRemovedFromGuild = this.handlePresenceRemovedFromGuild.bind(this);
    this.handleUserRemovedFromGuild = this.handleUserRemovedFromGuild.bind(this);
  }

  public get startingGateway(): Gateway | undefined {
    return this.#startingGateway;
  }

  public get filterOptions(): FilterOptions | undefined {
    return this.#filterOptions;
  }

  /** Gateway clients keyed to their shard #. */
  public get shards(): GatewayMap {
    return this.#gateways;
  }

  /** Whether or not there are gateways currently starting up. */
  public get connecting(): boolean {
    return this.gatewayLoginQueue.length !== 0 || this.#startingGateway !== undefined;
  }

  /** The api client of this Paracord client. */
  public get api(): Api {
    return this.#api;
  }

  public get guilds(): GuildMap {
    if (this.#guilds === undefined) throw Error('guilds are not cached');
    return this.#guilds;
  }

  public get users(): UserMap {
    return this.#users;
  }

  public get presences(): PresenceMap {
    return this.#presences;
  }

  public get unsafe_guilds(): GuildMap | undefined {
    return this.#guilds;
  }

  public get unsafe_users(): UserMap | undefined {
    return this.#users;
  }

  public get unsafe_presences(): PresenceMap | undefined {
    return this.#presences;
  }

  /*
   ********************************
   ******** BIND FUNCTIONS ********
   ********************************
   */

  /** Binds `this` to the event functions defined in a separate file. */
  private bindEventFunctions(): EventFunctions {
    const funcs: EventFunctions = {};
    for (const prop of Object.getOwnPropertyNames(eventFuncs)) {
      if (typeof (<EventFunctions> eventFuncs)[prop] === 'function') {
        funcs[prop] = (<EventFunctions> eventFuncs)[prop].bind(this);
      }
    }

    return funcs;
  }

  /** Binds `this` to functions that are used in timeouts and intervals. */
  private bindTimerFunction(): void {
    this.processGatewayQueue = this.processGatewayQueue.bind(this);
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
    let emit = data;

    /** Method defined in ParacordEvents.ts */
    const paracordEvent = <EventFunction | undefined> this.#gatewayEvents[eventType];
    if (paracordEvent !== undefined) {
      emit = paracordEvent(data, shard);
    }

    if (this.#startingGateway?.id === shard && this.#guildWaitCount !== undefined) {
      if (eventType === 'GUILD_CREATE') {
        --this.#guildWaitCount;
        this.checkIfDoneStarting();
        return undefined;
      }

      return this.#allowEventsDuringStartup ? emit : undefined;
    }

    return emit;
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
    const type = this.#events && this.#events[event];
    if (type !== undefined) {
      args = args.map(Paracord.ensureCamelProps);
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
  public async login(options: ParacordLoginOptions): Promise<void> {
    const {
      unavailableGuildTolerance, unavailableGuildWait, allowEventsDuringStartup, startupHeartbeatTolerance,
    } = options;

    if (!this.#initialized) {
      this.init();
    }

    this.#unavailableGuildTolerance = unavailableGuildTolerance;
    this.#unavailableGuildWait = unavailableGuildWait;
    this.#startupHeartbeatTolerance = startupHeartbeatTolerance;

    if (PARACORD_SHARD_IDS !== undefined) {
      options.shards = <[number, number]>PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
      options.shardCount = Number(PARACORD_SHARD_COUNT);
      const message = `Injecting shard settings from shard launcher. Shard Ids: ${options.shards}. Shard count: ${options.shardCount}`;
      this.log('INFO', message);
    }

    this.startGatewayLoginInterval();
    await this.enqueueGateways(options);

    this.#allowEventsDuringStartup = allowEventsDuringStartup || false;
  }

  /** Begins the interval that kicks off gateway logins from the queue. */
  private startGatewayLoginInterval(): void {
    this.#processGatewayQueueInterval = setInterval(
      this.processGatewayQueue, SECOND_IN_MILLISECONDS,
    );
  }

  /** Takes a gateway off of the queue and logs it in. */
  async processGatewayQueue(): Promise<void> {
    const preventLogin = this.#preventLogin;
    const {
      gatewayLoginQueue, safeGatewayIdentifyTimestamp,
    } = this;
    const startingGateway = this.#startingGateway;
    const unavailableGuildTolerance = this.#unavailableGuildTolerance;
    const unavailableGuildWait = this.#unavailableGuildWait;
    const now = new Date().getTime();

    if (
      !preventLogin
        && gatewayLoginQueue.length
        && startingGateway === undefined
        && now > safeGatewayIdentifyTimestamp
    ) {
      const gateway = <Gateway> this.gatewayLoginQueue.shift();
      this.safeGatewayIdentifyTimestamp = now + 10 * SECOND_IN_MILLISECONDS; // arbitrary buffer to allow previous to finish

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
  }

  private startWithUnavailableGuilds(gateway: Gateway): void {
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
  }

  /** Decides shards to spawn and pushes a gateway onto the queue for each one.
   * @param options Options used when logging in.
   */
  private async enqueueGateways(options: ParacordLoginOptions): Promise<void> {
    const { identity } = options;
    let { shards, shardCount } = options;

    if (identity && Array.isArray(identity.shard)) {
      const identityCopy = clone<IdentityOptions>(identity);
      this.addNewGateway(identityCopy);
    } else {
      if (shards !== undefined && shardCount !== undefined) {
        shards.forEach((s) => {
          if (s + 1 > <number>shardCount) {
            throw Error(`shard id ${s} exceeds max shard id of ${<number>shardCount - 1}`);
          }
        });
      } else {
        ({ shards, shardCount } = await this.computeShards(shards, shardCount));
      }

      if (shards === undefined || shardCount === undefined) {
        throw Error(`shards ids or shard count are invalid - ids ${shards} , count: ${shardCount}`);
      } else {
        for (const shard of shards) {
          const identityCopy = clone<IdentityOptions>(identity);
          identityCopy.token = this.token;
          identityCopy.shard = [shard, shardCount];
          this.addNewGateway(identityCopy);
        }
      }
    }
  }

  /**
   * Determines which shards will be spawned.
   * @param shards Shard Ids to spawn.
   * @param shardCount Total number of shards
   */
  private async computeShards(
    shards: number[] | undefined, shardCount: number | undefined,
  ): Promise<{ shards: number[] | undefined, shardCount: number | undefined }> {
    if (shards !== undefined && shardCount === undefined) {
      throw Error('shards defined with no shardCount.');
    }

    if (shardCount === undefined) {
      const { status, data: { shards: recommendedShards } } = <GatewayBotResponse> await this.api.request(
        'get',
        'gateway/bot',
      );
      if (status === 200) {
        shardCount = recommendedShards;
      } else {
        throw Error('failed to retrieve recommended shard count from Discord');
      }
    }

    if (shards === undefined && shardCount !== undefined) {
      shards = [];
      for (let i = 0; i < shardCount; ++i) {
        shards.push(i);
      }
    }

    return { shards, shardCount };
  }

  /**
   * Creates gateway and pushes it into cache and login queue.
   * @param identity An object containing information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure
   */
  private addNewGateway(identity: IdentityOptions): void {
    const gatewayOptions = this.createGatewayOptions(identity);

    const gateway = this.setUpGateway(this.token, gatewayOptions);
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
      identity, api: this.api, emitter: this, checkSiblingHeartbeats: this.#gatewayHeartbeats,
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
    this.#api = this.setUpApi(this.token, this.#apiOptions ?? {});
    this.selfAssignHandlerFunctions();
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
      api: this.api,
    });

    if (this.#gatewayLockServiceOptions) {
      const { mainServerOptions, serverOptions } = this.#gatewayLockServiceOptions;
      gateway.addIdentifyLockServices(mainServerOptions, ...serverOptions);
    }

    return gateway;
  }

  /** Assigns some public functions from handlers to this client for easier access. */
  private selfAssignHandlerFunctions(): void {
    this.request = this.api.request.bind(this.api);
    this.addRateLimitService = this.api.addRateLimitService.bind(this.api);
    this.addRequestService = this.api.addRequestService.bind(this.api);
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
   * Prepares the client for caching guilds on start up.
   * @param data From Discord - Initial ready event after identify.
   */
  public handleReady(data: ReadyEventField, shard: number): void {
    const { user, guilds } = data;
    this.user = new User(this.#filterOptions?.props, user, this);

    this.#guildWaitCount = guilds.length;
    this.log('INFO', `Logged in as ${this.user.tag}.`);

    if (this.#guilds !== undefined) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      for (const guild of guilds) {
        this.#guilds.add(guild.id, guild, this, shard);
      }
    }

    const message = `Ready event received. Waiting on ${guilds.length} guilds.`;
    this.log('INFO', message);

    if (guilds.length === 0) {
      this.checkIfDoneStarting();
    } else {
      this.#lastGuildTimestamp = new Date().getTime();
    }
  }

  public clearShardGuilds(shardId: number): void {
    const guilds = this.#guilds;
    if (guilds !== undefined) {
      guilds.forEach((guild) => {
        if (guild.shard === shardId) this.removeGuild(guild);
      });
    }
  }

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

  /*
   ********************************
   *********** CACHING ************
   ********************************
   */

  // protected removeInactiveUsersFromCache(iterator?: IterableIterator<User>, removedCount = 0): void {
  //   let throttle = 10000;
  //   let runAgain = false;
  //   const iter = iterator ?? this.#users.values();
  //   for (const user of iter) {
  //     if (user.activeReferenceCount === 0) {
  //       this.#users.delete(user.id);
  //       ++removedCount;
  //       if (!--throttle) {
  //         runAgain = true;
  //         break;
  //       }
  //     }
  //   }

  //   if (runAgain) setTimeout(() => this.removeInactiveUsersFromCache(iter, removedCount));
  //   else {
  //     // final pass
  //     setTimeout(() => {
  //       for (const user of this.#users.values()) {
  //         if (user.activeReferenceCount === 0) {
  //           this.#users.delete(user.id);
  //           ++removedCount;
  //         }
  //       }

  //       this.log('INFO', `Removed ${removedCount} inactive users from cache.`);
  //     });
  //   }
  // }

  /**
   * Inserts/updates properties of a guild.
   * @param data From Discord - https://discord.com/developers/docs/resources/guild#guild-object
   * @param shard Id of shard that spawned this guild.
   */
  protected upsertGuild(guild: RawGuildType, shard: number): Guild | undefined {
    return this.#guilds?.get(guild.id)?.update(guild) ?? this.#guilds?.add(guild.id, guild, this, shard);
  }

  /**
   * Inserts/updates user in this client's cache.
   * @param user From Discord - https://discord.com/developers/docs/resources/user#user-object-user-structure
   */
  public upsertUser(user: RawUser): User {
    const cachedUser = this.#users?.get(user.id)?.update(user) ?? this.#users?.add(user.id, user, this);
    if (cachedUser) this.circularAssignCachedPresence(cachedUser);
    return cachedUser;
  }

  public removeUserWithNoReferences(user: User): void {
    if (this.#guilds !== undefined) {
      // only need to delete from members because 0 active references means no voice states and presences
      for (const guild of this.#guilds.values()) {
        guild.members.delete(user.id);
      }
    }

    this.#users.delete(user.id);
  }

  /**
   * Adjusts the client's presence cache, allowing ignoring events that may be redundant.
   * @param presence From Discord - https://discord.com/developers/docs/topics/gateway#presence-update
   */
  public updatePresences(presence: RawPresence): Presence | undefined {
    if (presence.status !== 'offline') {
      return this.upsertPresence(presence);
    }

    this.deletePresence(presence.user.id);
    return undefined;
  }

  /**
   * Inserts/updates presence in this client's cache.
   * @param presence From Discord - https://discord.com/developers/docs/topics/gateway#presence-update
   */
  private upsertPresence(presence: RawPresence): Presence {
    let cachedPresence = this.#presences.get(presence.user.id);
    if (cachedPresence !== undefined) {
      cachedPresence.update(presence);
    } else {
      cachedPresence = this.#presences.add(presence.user.id, presence);
      this.circularAssignCachedUser(cachedPresence);
    }

    return cachedPresence;
  }

  /**
   * Ensures that a user is assigned its presence from the cache and vice versa.
   * @param user From Discord - https://discord.com/developers/docs/resources/user#user-object
   */
  private circularAssignCachedPresence(user: User): void {
    const cachedPresence = this.#presences.get(user.id);
    if (cachedPresence !== undefined) {
      user.presence = cachedPresence;
      user.presence.user = user;
      user.incrementActiveReferenceCount();
    }
  }

  /**
   * Ensures that a presence is assigned its user from the cache and vice versa.
   * @param presence From Discord - https://discord.com/developers/docs/topics/gateway#presence-update
   */
  private circularAssignCachedUser(presence: Presence): void {
    const cachedUser = this.#users.get(presence.user.id);
    if (cachedUser !== undefined) {
      presence.user = cachedUser;
      cachedUser.presence = presence;
      cachedUser.incrementActiveReferenceCount();
    }
  }

  /**
   * Removes presence from cache.
   * @param userId Id of the presence's user.
   */
  private deletePresence(userId: Snowflake): void {
    const cachedPresence = this.#presences.get(userId);
    if (cachedPresence) {
      this.#presences.delete(userId);

      const { user } = cachedPresence;
      if (user instanceof User) {
        user.decrementActiveReferenceCount();
        // break circular reference just to be safe
        user.presence = undefined;
      }
    }
  }

  /**
   * Processes presences (e.g. from PRESENCE_UPDATE, GUILD_MEMBERS_CHUNK, etc.)
   * @param guild Paracord guild.
   * @param presence From Discord. More information on a particular payload can be found in the official docs. https://discord.com/developers/docs/topics/gateway#presence-update
   */
  public handlePresence(presence: RawPresence, guild: Guild | undefined): Presence | undefined {
    const cachedPresence = this.updatePresences(presence);

    if (guild !== undefined) {
      if (cachedPresence !== undefined) {
        guild.insertCachedPresence(cachedPresence);
      } else {
        guild.removePresence(presence.user.id);
      }
    }

    return cachedPresence;
  }

  public removeGuild(guild: Guild): void {
    Array.from(guild.members.values()).forEach(({ user }) => this.handleUserRemovedFromGuild(user, guild));
    Array.from(guild.voiceStates.values()).forEach(({ user }) => {
      user?.decrementActiveReferenceCount();
    });
    if (guild.presences) {
      Array.from(guild.presences.values()).forEach(this.handlePresenceRemovedFromGuild);
    }
    this.#guilds?.delete(guild.id);
  }

  public handleUserRemovedFromGuild(user: User, guild: Guild): void {
    user.decrementGuildCount();
    if (user.guildCount === 0) {
      if (user !== this.user) {
        this.#users.delete(user.id);
        user.resetActiveReferenceCount();
      }
    } else if (guild.voiceStates.has(user.id)) user.decrementActiveReferenceCount();
  }

  public handlePresenceRemovedFromGuild(presence: Presence): void {
    presence.decrementGuildCount();
    if (presence.guildCount === 0) {
      this.#presences.delete(presence.user.id);
    }
  }

  // /**
  //  * Processes a member object (e.g. from MESSAGE_CREATE, VOICE_STATE_UPDATE, etc.)
  //  * @param guild Paracord guild.
  //  * @param member From Discord. More information on a particular payload can be found in the official docs. https://discord.com/developers/docs/resources/guild#guild-member-object
  //  */
  // public cacheMemberFromEvent(guild: Guild, member: GuildMember | RawGuildMember): GuildMember {
  //   const cachedMember = guild.members.get(member.user.id);
  //   return cachedMember === undefined ? guild.upsertMember(member, this) : cachedMember;
  // }

  /*
   ********************************
   ******* PUBLIC HELPERS *********
   ********************************
   */

  /**
   * Short-hand for sending a message to Discord.
   * @param channelId Discord snowflake of the channel to send the message.
   * @param message  When a string is passed for `message`, that string will populate the `content` field. https://discord.com/developers/docs/resources/channel#create-message-params
   */
  public sendMessage<T extends ResponseData = any>(channelId: Snowflake, message: string | Record<string, unknown> | Message): Promise<IApiResponse<T> | RemoteApiResponse<T>> {
    return this.request<T>('post', `channels/${channelId}/messages`, {
      data:
        typeof message === 'string' ? { content: message } : { embed: message },
    });
  }

  /**
   * Short-hand for editing a message to Discord.
   *
   * @param message Partial Discord message. https://discord.com/developers/docs/resources/channel#create-message-params
   * @param newMessage  When a string is passed for `message`, that string will populate the `content` field. https://discord.com/developers/docs/resources/channel#create-message-params
   */
  public editMessage<T extends ResponseData = any>(message: Record<string, unknown> | Message, newMessage: string | Record<string, unknown> | Message): Promise<IApiResponse<T> | RemoteApiResponse<T>> {
    return this.request<T>(
      'patch',
      `channels/${message.channelId}/messages/${message.id}`,
      {
        data:
        typeof newMessage === 'string'
          ? { content: newMessage }
          : { embed: newMessage },
      },
    );
  }

  /**
   * Fetch a guild member using the REST API, caching on successful hit.
   *
   * @param guild Guild object or id in which to search for member.
   * @param memberId Id of the member.
   */
  public async fetchMember(guild: Snowflake | Guild, memberId: Snowflake): Promise<IApiResponse<RawGuildMember> | RemoteApiResponse<RawGuildMember>> { // TODO create cached type
    let guildId: string;

    if (typeof guild === 'string') {
      guildId = guild;
    } else {
      ({ id: guildId } = guild);
    }

    const res = await this.request<RawGuildMember>('get', `/guilds/${guildId}/members/${memberId}`);

    if (res.status === 200) {
      const guilds = this.#guilds;
      if (guilds === undefined) return res;

      const cacheGuild = typeof guild === 'string' ? guilds.get(guild) : guild;

      if (cacheGuild !== undefined) {
        cacheGuild.upsertMember(<AugmentedRawGuildMember><unknown>res.data);
      }
    }

    return res;
  }

  /**
   * Fetch a user using the REST API, caching on successful hit.
   * @param userId Id of the user.
   */
  public async fetchUser<T extends ResponseData = any>(userId: Snowflake): Promise<IApiResponse<T> | RemoteApiResponse<T>> {
    const res = await this.request<T>('get', `/users/${userId}`);

    if (res.status === 200) {
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore
      res.cached = this.upsertUser(res.data);
    }

    return res;
  }
}
