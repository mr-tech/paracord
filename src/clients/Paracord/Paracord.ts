import { EventEmitter } from 'events';

import {
  GATEWAY_CLOSE_CODES, LOG_LEVELS,
  LOG_SOURCES, SECOND_IN_MILLISECONDS,
} from '../../constants';
import { clone, coerceTokenToBotLike } from '../../utils';
import Gateway, {
  GatewayCloseEvent, GatewayOptions, Heartbeat,
  IdentityOptions, ParacordEvent, ParacordGatewayEvent,
} from '../Gateway';

import type { DebugLevel } from '../../@types';
import type { GatewayEvent, ReadyEventField } from '../../discord';
import type {
  GatewayMap, ParacordGatewayOptions,
  ParacordLoginOptions, ParacordOptions,
  ParacordStartupEvent,
} from './types';

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
export default class Paracord extends EventEmitter {
  public compressShards?: undefined | number[];

  public readonly gatewayLoginQueue: Gateway[];

  #processingQueue = false;

  /** Discord bot token. */
  #token: string;

  #emittedStartupComplete: boolean;

  /** During a shard's start up, how many guilds may be unavailable before forcing ready. */
  #unavailableGuildTolerance?: undefined | number;

  /** During a shard's start up, time in seconds to wait from the last GUILD_CREATE to force ready. */
  #unavailableGuildWait?: undefined | number;

  /** Interval that will force shards as ready when within set thresholds. */
  #unavailableGuildsInterval?: undefined | NodeJS.Timeout;

  #shardTimeout?: undefined | NodeJS.Timeout;

  #shardStartupTimeout?: undefined | number;

  #gatewayLoginInterval?: undefined | NodeJS.Timeout;

  /** Gateway clients keyed to their shard #. */
  #gateways: GatewayMap;

  #gatewayOptions: ParacordGatewayOptions;

  /** Shard currently in the initial phases of the gateway connection in progress. */
  #startingGateway: Gateway | undefined;

  /** Guilds left to ingest on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
  #guildWaitCount: number;

  /** Timestamp of last GUILD_CREATE event on start up for the current `#startingGateway`. */
  #previousGuildTimestamp?: undefined | number;

  #gatewayHeartbeats: Heartbeat['checkIfShouldHeartbeat'][];

  #allowConnection?: undefined | ((shard: Gateway) => boolean | Promise<boolean>);

  /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
  private static validateParams(token: string): void {
    if (token === undefined) {
      throw Error("client requires a 'token'");
    }
  }

  /**
   * Creates a new Paracord client.
   *
   * @param token Discord bot token. Will be coerced into a bot token.
   * @param options Settings for this Paracord instance.
   */
  public constructor(token: string, options: ParacordOptions) {
    super();
    Paracord.validateParams(token);

    this.#token = coerceTokenToBotLike(token);
    this.#gateways = new Map();
    this.gatewayLoginQueue = [];
    this.#guildWaitCount = 0;
    this.#gatewayHeartbeats = [];
    this.#emittedStartupComplete = false;

    const {
      gatewayOptions, unavailableGuildTolerance,
      unavailableGuildWait, shardStartupTimeout,
      compressShards,
    } = options;

    this.compressShards = compressShards;
    this.#gatewayOptions = gatewayOptions;

    this.#unavailableGuildTolerance = unavailableGuildTolerance;
    this.#unavailableGuildWait = unavailableGuildWait;
    this.#shardStartupTimeout = shardStartupTimeout;
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
    return this.gatewayLoginQueue.length !== 0 || !!this.#startingGateway;
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
   * @param gateway Gateway that emitted this event.
   */
  public handleEvent(eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent, data: unknown, gateway: Gateway): void {
    switch (eventType) {
      case 'READY':
        this.handleGatewayReady(<ReadyEventField>data);
        break;
      case 'RESUMED':
        this.completeShardStartup({ shard: gateway, resumed: true });
        break;
      default:
    }

    if (this.isStartingGateway(gateway) && this.#guildWaitCount !== undefined) {
      if (eventType === 'GUILD_CREATE') {
        --this.#guildWaitCount;
        if (this.#guildWaitCount <= 0) {
          // this ensures that the guild create event will be emitted before the start up complete events
          setImmediate(() => this.checkIfDoneStarting());
        } else {
          this.checkIfDoneStarting();
        }
      }
    }
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
   * @param args Any arguments to send with the emitted event.
   */
  public emit(event: ParacordGatewayEvent | ParacordEvent, ...args: unknown[]): boolean {
    switch (event) {
      case 'GATEWAY_CLOSE':
        this.handleGatewayClose(<GatewayCloseEvent>args[0]);
        break;
      default:
    }

    super.emit(event, ...args);

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
  public async login(options: Partial<ParacordLoginOptions> = {}): Promise<void> {
    const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;

    const loginOptions = { ...options };
    this.#allowConnection = loginOptions.allowConnection;

    if (PARACORD_SHARD_IDS !== undefined) {
      loginOptions.shards = PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
      loginOptions.shardCount = Number(PARACORD_SHARD_COUNT);
      const message = `Injecting shard settings from shard launcher. Shard Ids: ${loginOptions.shards}. Shard count: ${loginOptions.shardCount}`;
      this.log('INFO', message);
    }

    this.startGatewayLoginInterval();
    this.enqueueGateways(loginOptions);
  }

  public end() {
    clearInterval(this.#gatewayLoginInterval);
    this.#gateways.forEach((gateway) => {
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
    });
  }

  /** Begins the interval that kicks off gateway logins from the queue. */
  private startGatewayLoginInterval(): void {
    this.#gatewayLoginInterval = setInterval(() => { void this.processGatewayQueue(); }, SECOND_IN_MILLISECONDS);
  }

  /** Decides shards to spawn and pushes a gateway onto the queue for each one.
   * @param options Options used when logging in.
   */
  private enqueueGateways(options: Partial<ParacordLoginOptions>): void {
    const { identity } = options;
    let { shards, shardCount } = options;

    if (identity && Array.isArray(identity.shard)) {
      const identityCopy = clone<IdentityOptions>(identity);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (this.compressShards?.includes(identityCopy.shard![0])) {
        identityCopy.compress = true;
      }
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
          if (this.compressShards?.includes(identityCopy.shard[0])) {
            identityCopy.compress = true;
          }
          this.addNewGateway(identityCopy);
        }
      }
    }
  }

  /** Takes a gateway off of the queue and logs it in. */
  private processGatewayQueue = async (): Promise<void> => {
    if (this.#processingQueue || this.gatewayLoginQueue.length === 0) return;
    if (this.#startingGateway && !this.gatewayLoginQueue.some((g) => g === this.#startingGateway)) return;

    this.#processingQueue = true;
    try {
      if (!this.#startingGateway) {
        // get resumable shard
        this.#startingGateway = this.gatewayLoginQueue.find((g) => g.resumable);
      }

      // if no resumable shard, get first shard in queue that is allowed to connect
      if (!this.#startingGateway && this.#allowConnection) {
        this.log('INFO', 'Checking if a shard is allowed to connect.');
        const queue = [...this.gatewayLoginQueue];
        for (const gateway of queue) {
          if (await this.#allowConnection(gateway)) {
            this.#startingGateway = gateway;
            this.log('INFO', 'Shard is allowed to connect.', { shard: gateway });
            break;
          }
        }

        // if no resumable shard and no shard allowed to connect, return
        if (!this.#startingGateway) {
          this.log('DEBUG', `No shards available to connect. ${this.gatewayLoginQueue.length} in queue.`);
          return;
        }
      }

      // if no resumable shard, get first shard in queue
      if (!this.#startingGateway) {
        this.#startingGateway = this.gatewayLoginQueue.shift();
      }

      if (!this.#startingGateway) {
        return;
      }

      // remove the starting shard from the queue
      this.gatewayLoginQueue.splice(this.gatewayLoginQueue.indexOf(this.#startingGateway), 1);

      if (this.#startingGateway.connected) {
        this.log('DEBUG', `Shard ${this.#startingGateway.id} already connected.`, { shard: this.#startingGateway });
        return;
      }

      const gateway = this.#startingGateway;

      try {
        await gateway.login();

        if (this.#shardStartupTimeout) {
          const timeout = this.#shardStartupTimeout;
          this.#shardTimeout = setTimeout(() => {
            this.timeoutShard(gateway, timeout);
          }, timeout * SECOND_IN_MILLISECONDS);
        }

        if (
          this.#unavailableGuildTolerance !== undefined
            && this.#unavailableGuildWait !== undefined
            && !gateway.resumable
        ) {
          const tolerance = this.#unavailableGuildTolerance;
          const waitSeconds = this.#unavailableGuildWait;
          const interval = setInterval(() => {
            this.checkUnavailable(interval, gateway, tolerance, waitSeconds);
          }, SECOND_IN_MILLISECONDS);
          this.#unavailableGuildsInterval = interval;
        }
      } catch (err: unknown) {
        this.clearStartingShardState(gateway);
        this.upsertGatewayQueue(gateway, this.isStartingGateway(gateway));
        this.log('ERROR', err instanceof Error ? err.message : String(err), { shard: gateway });
      }
    } finally {
      this.#processingQueue = false;
    }
  };

  private checkUnavailable(self: NodeJS.Timeout, gateway: Gateway, tolerance: number, waitSeconds: number): void {
    const timedOut = !!this.#previousGuildTimestamp && this.#previousGuildTimestamp + (waitSeconds * SECOND_IN_MILLISECONDS) < new Date().getTime();
    const withinTolerance = this.#guildWaitCount <= tolerance;

    if (this.isStartingGateway(gateway) && timedOut && withinTolerance) {
      const message = `Forcing startup complete for shard ${this.#startingGateway?.id} with ${this.#guildWaitCount} unavailable guilds.`;
      this.log('INFO', message, { shard: gateway });
      this.checkIfDoneStarting(true);
    } else if (!this.isStartingGateway(gateway)) {
      const message = `Unavailable guilds check expected shard ${gateway.id}. Got ${this.#startingGateway?.id} instead.`;
      clearInterval(self);
      this.log('WARNING', message, { shard: gateway });
    }
  }

  private timeoutShard(gateway: Gateway, waitTime: number) {
    if (this.isStartingGateway(gateway)) {
      this.log('WARNING', `Shard timed out after ${waitTime} seconds during startup. Reconnecting.`, { shard: gateway });
      gateway.close(GATEWAY_CLOSE_CODES.INTERNAL_TERMINATE_RECONNECT);
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

    this.#gatewayHeartbeats.push(() => gateway.checkIfShouldHeartbeat());

    this.#gateways.set(gateway.id, gateway);
    this.upsertGatewayQueue(gateway);
  }

  private createGatewayOptions(identity: IdentityOptions): GatewayOptions {
    const gatewayOptions: GatewayOptions = {
      ...this.#gatewayOptions,
      identity,
      emitter: this,
      checkSiblingHeartbeats: this.#gatewayHeartbeats,
    };

    return gatewayOptions;
  }

  /*
  ********************************
  ************ SETUP *************
  ********************************
  */

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
    });

    return gateway;
  }

  /*
  ********************************
  ********** START UP ************
  ********************************
  */

  /** Runs with every GUILD_CREATE on initial start up. Decrements counter and emits `PARACORD_STARTUP_COMPLETE` when 0. */
  private checkIfDoneStarting(forced = false): void {
    const startingGateway = this.#startingGateway;
    const guildWaitCount = this.#guildWaitCount;

    if (startingGateway !== undefined) {
      if (forced || guildWaitCount <= 0) {
        this.completeShardStartup({ shard: startingGateway, forced });

        const eventNotEmitted = !this.#emittedStartupComplete;
        const queueEmpty = this.gatewayLoginQueue.length === 0;
        const noStartingShard = !this.#startingGateway;
        if (eventNotEmitted && queueEmpty && noStartingShard) {
          this.emitStartupComplete();
        }
      } else {
        this.#previousGuildTimestamp = new Date().getTime();
        const message = `Shard ${startingGateway.id} - ${guildWaitCount} guilds left in start up.`;
        this.log('INFO', message, { shard: startingGateway });
      }
    } else {
      const message = 'Starting check conducted without a defined gateway.';
      this.log('WARNING', message);
    }
  }

  private completeShardStartup(event: ParacordStartupEvent): void {
    const { shard: gateway, forced = false, resumed = false } = event;

    if (resumed) {
      const message = 'Resumed shard.';
      this.log('INFO', message, { shard: gateway });
    } else if (!forced) {
      const message = 'Received all start up guilds.';
      this.log('INFO', message, { shard: gateway });
    }

    this.clearStartingShardState(gateway);
    this.emit('SHARD_STARTUP_COMPLETE', event);
  }

  private clearStartingShardState(gateway: Gateway): void {
    if (this.isStartingGateway(gateway)) {
      this.log('INFO', 'Clearing start up state.', { shard: gateway });

      this.#startingGateway = undefined;
      this.#previousGuildTimestamp = undefined;
      this.#guildWaitCount = 0;
      clearInterval(this.#unavailableGuildsInterval);
      clearTimeout(this.#shardTimeout);
    }
  }

  /**
   * Cleans up Paracord start up process and emits `PARACORD_STARTUP_COMPLETE`.
   */
  private emitStartupComplete(): void {
    this.#emittedStartupComplete = true;

    this.log('INFO', 'Paracord start up complete.');
    this.emit('PARACORD_STARTUP_COMPLETE');
  }

  /**
   * Prepares the client for caching guilds on start up.
   * @param data From Discord - Initial ready event after identify.
   */
  private handleGatewayReady(data: ReadyEventField): void {
    const { user, guilds } = data;

    this.#guildWaitCount = guilds.length;
    this.log('INFO', `Ready event received. Logged in as ${user.username}#${user.discriminator}. Waiting on ${guilds.length} guilds.`, { shard: this.#startingGateway });

    if (guilds.length === 0) {
      this.checkIfDoneStarting();
    } else {
      this.#previousGuildTimestamp = new Date().getTime();
    }
  }

  // { gateway, shouldReconnect }: { gateway: Gateway, shouldReconnect: boolean },
  private handleGatewayClose(data: GatewayCloseEvent): void {
    const { gateway, shouldReconnect } = data;

    if (!gateway.resumable) {
      this.clearStartingShardState(gateway);
    }

    if (shouldReconnect) {
      if (gateway.resumable) {
        void gateway.login();
      } else {
        this.upsertGatewayQueue(gateway);
      }
    }
  }

  private upsertGatewayQueue(gateway: Gateway, front = false): void {
    if (!this.gatewayLoginQueue.includes(gateway)) {
      if (front) {
        this.gatewayLoginQueue.unshift(gateway);
      } else {
        this.gatewayLoginQueue.push(gateway);
      }
    }

    this.log('INFO', `Upserting shard ${gateway.id} at ${front ? 'start' : 'end'} of login queue. Queue size: ${this.gatewayLoginQueue.length}`, { shard: gateway });
  }

  private isStartingGateway(gateway: Gateway): boolean {
    return this.#startingGateway === gateway;
  }
}
