
const { EventEmitter } = require('events');
const Guild = require('./structures/Guild');
const Api = require('../Api/Api');
const Gateway = require('../Gateway');
const Utils = require('../../utils');
const {
  SECOND_IN_MILLISECONDS,
  MINUTE_IN_MILLISECONDS,
  LOG_LEVELS,
  LOG_SOURCES,
} = require('../../constants');

const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;

/* "Start up" refers to logging in to the gateway and waiting for all the guilds to be returned. By default, events will be suppressed during start up. */

/**
 * A client that provides caching and limited helper functions. Integrates the Api and Gateway clients into a seamless experience.
 *
 * @extends EventEmitter
 */
module.exports = class Paracord extends EventEmitter {
  /**
   * Creates a new Paracord client.
   *
   * @param {string} token Discord bot token. Will be coerced into a bot token.
   * @param {ParacordOptions} options Settings for this Paracord instance.
   */
  constructor(token, options = {}) {
    super();
    /** @type {string} Discord bot token. */
    this.token;
    /** @type {boolean} Whether or not the `init()` function has already been called. */
    this.initialized;
    /** @type {Object<string, any>} User details given by Discord in the "Ready" event form the gateway. https://discordapp.com/developers/docs/topics/gateway#ready-ready-event-fields */
    this.user;

    /** @type {number} During a shard's start up, how many guilds may be unavailable before forcing ready. */
    this.unavailableGuildTolerance;
    /** @type {number} During a shard's start up, time in seconds to wait from the last GUILD_CREATE to force ready. */
    this.unavailableGuildWait;
    /** @type {NodeJS.Timer} Interval that will force shards as ready when within set thresholds. */
    this.startWithUnavailableGuildsInterval;

    /* Internal clients. */
    /** @type {Api} Client through which to make REST API calls to Discord. */
    this.api;
    /** @type {Map<number, Gateway>} Gateway clients keyed to their shard #. */
    this.gateways;
    /** @type {Gateway[]} Gateways queue to log in. */
    this.gatewayLoginQueue;
    /** @type {GatewayLockServerOptions} Identify lock service Options passed to the gateway shards. */
    this.gatewayLockServiceOptions;

    /* State that tracks the start up process. */
    /** @type {number} Timestamp of the last gateway identify. */
    this.safeGatewayIdentifyTimestamp;
    /** @type {number} Gateways left to login on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
    this.gatewayWaitCount;
    /** @type {void|Gateway} Shard currently in the initial phases of the gateway connection in progress. */
    this.startingGateway;
    /** @type {number} Guilds left to ingest on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
    this.guildWaitCount;
    /** @type {number} Timestamp of last GUILD_CREATE event on start up for the current `startingGateway`. */
    this.lastGuildTimestamp;

    /* Client caches. */
    /** @type {Map<string, Guild>} Guild cache. */
    this.guilds;
    /** @type {Map} User cache. */
    this.users;
    /** @type {Map} Presence cache. */
    this.presences;

    /** @type {NodeJS.Timer} Interval that coordinates gateway logins. */
    this.processGatewayQueueInterval;
    /** @type {NodeJS.Timer} Interval that removes objects from the presence and user caches. */
    this.sweepCachesInterval;
    /** @type {NodeJS.Timer} Interval that removes object from the redundant presence update cache. */
    this.sweepRecentPresenceUpdatesInterval;

    /* User-defined event handling behavior. */
    /** @type {Object<string, string>} Key:Value mapping DISCORD_EVENT to user's preferred emitted name for use when connecting to the gateway. */
    this.events;
    /** @type {boolean} During startup, if events should be emitted before `PARACORD_STARTUP_COMPLETE` is emitted. `GUILD_CREATE` events will never be emitted during start up. */
    this.allowEventsDuringStartup;

    this.preventLogin;

    this.constructorDefaults(token, options);
  }

  /** @type {Map<number, Gateway>} Gateway clients keyed to their shard #. */
  get shards() {
    return this.gateways;
  }

  /** @type {Boolean} Whether or not there are gateways currently starting up. */
  get connecting() {
    return this.gatewayLoginQueue.length !== 0 || this.startingGateway !== undefined;
  }

  /*
   ********************************
   ********* CONSTRUCTOR **********
   ********************************
   */

  /**
   * Assigns default values to this Paracord instance based on the options.
   * @private
   *
   * @param {string} token Discord token. Will be coerced into a bot token.
   * @param {ParacordOptions} options Optional parameters for this handler.
   */
  constructorDefaults(token, options) {
    Paracord.validateParams(token);

    const defaults = {
      token,
      initialized: false,
      guilds: new Map(),
      users: new Map(),
      presences: new Map(),
      safeGatewayIdentifyTimestamp: 0,
      gateways: new Map(),
      gatewayLoginQueue: [],
      gatewayWaitCount: 0,
      allowEventsDuringStartup: false,
      preventLogin: false,
    };

    Object.assign(this, { ...options, ...defaults });

    if (options.autoInit === undefined || options.autoInit) {
      this.init();
    }
    this.bindTimerFunction();
    this.bindEventFunctions();
  }

  /**
   * Throws errors and warns if the parameters passed to the constructor aren't sufficient.
   * @private
   */
  static validateParams(token) {
    if (token === undefined) {
      throw Error("client requires a 'token'");
    }
  }

  /**
   * Binds `this` to the event functions defined in a separate file.
   * @private
   */
  bindEventFunctions() {
    Utils.bindFunctionsFromFile(this, require('./eventFuncs'));
  }

  /**
   * Binds `this` to functions that are used in timeouts and intervals.
   * @private
   */
  bindTimerFunction() {
    this.sweepCaches = this.sweepCaches.bind(this);
    this.processGatewayQueue = this.processGatewayQueue.bind(this);
  }

  /*
   ********************************
   *********** INTERNAL ***********
   ********************************
   */

  /**
   * Processes a gateway event.
   *
   * @param {string} eventType The type of the event from the gateway. https://discordapp.com/developers/docs/topics/gateway#commands-and-events-gateway-events (Events tend to be emitted in all caps and underlines in place of spaces.)
   * @param {Object} data From Discord.
   * @param {number} shard Shard id of the gateway that emitted this event.
   */
  eventHandler(eventType, data, shard) {
    /** @type {Function|void} Method defined in ParacordEvents.js */
    let emit = data;

    const paracordEvent = this[eventType];
    if (paracordEvent !== undefined) {
      emit = paracordEvent(data, shard);
    }

    if (this.startingGateway !== undefined && this.startingGateway.id === shard) {
      if (eventType === 'GUILD_CREATE') {
        --this.guildWaitCount;
        this.checkIfDoneStarting();
        return undefined;
      }

      return this.allowEventsDuringStartup ? data : undefined;
    }

    return emit;
  }

  /**
   * Simple alias for logging events emitted by this client.
   * @private
   *
   * @param {string} level Key of the logging level of this message.
   * @param {string} message Content of the log.
   * @param {*} [data] Data pertinent to the event.
   */
  log(level, message, data) {
    this.emit('DEBUG', {
      source: LOG_SOURCES.PARACORD,
      level: LOG_LEVELS[level],
      message,
      data,
    });
  }

  /**
   * Proxy emitter. Renames type with a key in `this.events`.
   *
   * @param {string} type Name of the event.
   * @param  {...any} args Any arguments to send with the emitted event.
   */
  emit(type, ...args) {
    if (this.events === undefined || this.events[type] === undefined) {
      super.emit(type, ...args);
    } else {
      super.emit(this.events[type], ...args);
    }
  }

  /*
   ********************************
   ************ LOGIN *************
   ********************************
   */

  /**
   * Connects to Discord's gateway and begins receiving and emitting events.
   *
   * @param {ParacordLoginOptions} [options] Options used when logging in.
   */
  async login(options = {}) {
    const {
      unavailableGuildTolerance, unavailableGuildWait, allowEventsDuringStartup,
    } = options;

    if (!this.initialized) {
      this.init();
    }

    this.unavailableGuildTolerance = unavailableGuildTolerance;
    this.unavailableGuildWait = unavailableGuildWait;

    if (PARACORD_SHARD_IDS !== undefined) {
      options.shards = PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
      options.shardCount = Number(PARACORD_SHARD_COUNT);
      const message = `Injecting shard settings from shard launcher. Shard Ids: ${options.shards}. Shard count: ${options.shardCount}`;
      this.log('INFO', message);
    }

    this.startGatewayLoginInterval();
    await this.enqueueGateways(options);

    this.allowEventsDuringStartup = allowEventsDuringStartup || false;

    this.startSweepInterval();
  }

  /**
   * Begins the interval that kicks off gateway logins from the queue.
   * @private
   */
  startGatewayLoginInterval() {
    this.processGatewayQueueInterval = setInterval(
      this.processGatewayQueue, SECOND_IN_MILLISECONDS,
    );
  }

  /**
   * Takes a gateway off of the queue and logs it in.
   * @private
   */
  async processGatewayQueue() {
    if (
      !this.preventLogin
        && this.gatewayLoginQueue.length
        && this.startingGateway === undefined
        && new Date().getTime() > this.safeGatewayIdentifyTimestamp
    ) {
      const gateway = this.gatewayLoginQueue.shift();
      this.safeGatewayIdentifyTimestamp = 10 * SECOND_IN_MILLISECONDS; // arbitrary buffer

      this.startingGateway = gateway;
      try {
        await gateway.login();

        if (this.unavailableGuildTolerance && this.unavailableGuildWait) {
          this.startWithUnavailableGuildsInterval = setInterval(this.startWithUnavailableGuilds.bind(this, gateway), 1e3);
        }
      } catch (err) {
        this.log('FATAL', err.message, gateway);
        this.clearStartingShardState();
        this.gatewayLoginQueue.unshift(gateway);
      }
    }
  }

  startWithUnavailableGuilds(gateway) {
    const {
      unavailableGuildTolerance, guildWaitCount, unavailableGuildWait, lastGuildTimestamp,
    } = this;

    const withinTolerance = this.guildWaitCount !== undefined && guildWaitCount <= unavailableGuildTolerance;
    const timedOut = lastGuildTimestamp !== undefined && lastGuildTimestamp + unavailableGuildWait * 1e3 < new Date().getTime();

    if (this.startingGateway === gateway && withinTolerance && timedOut) {
      const message = `Forcing startup complete for shard ${this.startingGateway.id} with ${this.guildWaitCount} unavailable guilds.`;
      this.log('WARNING', message);
      this.checkIfDoneStarting(true);
    }
  }

  /**
   * Decides shards to spawn and pushes a gateway onto the queue for each one.
   * @private
   *
   * @param {ParacordLoginOptions} [options] Options used when logging in.
   */
  async enqueueGateways(options) {
    let { shards, shardCount, identity } = options;
    if (shards !== undefined && shardCount !== undefined) {
      shards.forEach((s) => {
        if (s + 1 > shardCount) {
          throw Error(`shard id ${s} exceeds max shard id of ${shardCount - 1}`);
        }
      });
    }


    ({ shards, shardCount } = await this.computeShards(shards, shardCount));

    shards.forEach((shard) => {
      const identityCopy = Utils.clone(identity || {});
      identityCopy.shard = [shard, shardCount];
      this.addNewGateway(identityCopy);
    });
  }

  /**
 * Creates gateway and pushes it into cache and login queue.
 * @private
 *
 * @param {Object<string, any>} identity An object containing information for identifying with the gateway. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure
 */
  addNewGateway(identity) {
    const gatewayOptions = { identity, api: this.api, emitter: this };
    const gateway = this.setUpGateway(this.token, gatewayOptions);
    if (this.gateways.get(gateway.id) !== undefined) {
      throw Error(`duplicate shard id ${gateway.id}. shard ids must be unique`);
    }

    ++this.gatewayWaitCount;
    this.gateways.set(gateway.id, gateway);
    this.gatewayLoginQueue.push(gateway);
  }

  /** Sets up the internal handlers for this client. */
  init() {
    if (this.initialized) {
      throw Error('Client has already been initialized.');
    }
    this.api = this.setUpApi(this.token, this.apiOptions);
    this.selfAssignHandlerFunctions();
    this.initialized = true;
  }

  /**
   * Determines which shards will be spawned.
   * @private
   *
   * @param {number[]|void} shards Shard Ids to spawn.
   * @param {number|void} shardCount Total number of shards
   */
  async computeShards(shards, shardCount) {
    if (shards !== undefined && shardCount === undefined) {
      throw Error('shards defined with no shardCount.');
    }

    if (shardCount === undefined) {
      const { status, data: { shards: recommendedShards } } = await this.api.request(
        'get',
        'gateway/bot',
      );
      if (status === 200) {
        shardCount = recommendedShards;
      }
    }

    if (shards === undefined) {
      shards = [];
      for (let i = 0; i < shardCount; ++i) {
        shards.push(i);
      }
    }

    return { shards, shardCount };
  }

  /**
   * Begins the intervals that prune caches.
   * @private
   */
  startSweepInterval() {
    this.sweepCachesInterval = setInterval(
      this.sweepCaches,
      60 * MINUTE_IN_MILLISECONDS,
    );
  }

  /*
   ********************************
   ************ SETUP *************
   ********************************
   */

  /**
   * Creates the handler used when handling REST calls to Discord.
   * @private
   *
   * @param {string} token Discord token. Will be coerced to bot token.
   * @param {ApiOptions} options
   */
  setUpApi(token, options) {
    const api = new Api(token, { ...options, emitter: this });
    if (api.rpcRequestService === undefined) {
      api.startQueue();
    }

    return api;
  }

  /**
   * Creates the handler used when connecting to Discord's gateway.
   * @private
   *
   * @param {string} token Discord token. Will be coerced to bot token.
   * @param {GatewayOptions} options
   */
  setUpGateway(token, options) {
    const gateway = new Gateway(token, {
      ...options,
      emitter: this,
      api: this.api,
    });

    if (this.gatewayLockServiceOptions) {
      const { mainServerOptions, serverOptions } = this.gatewayLockServiceOptions;
      gateway.addIdentifyLockServices(mainServerOptions, ...serverOptions);
    }

    return gateway;
  }

  /**
   * Assigns some public functions from handlers to this client for easier access.
   * @private
   */
  selfAssignHandlerFunctions() {
    this.request = this.api.request.bind(this.api);
    this.addRateLimitService = this.api.addRateLimitService.bind(this.api);
    this.addRequestService = this.api.addRequestService.bind(this.api);
  }

  /**
   * Stores options that will be passed to each gateway shard when adding the service that will acquire a lock from a server(s) before identifying.
   *
   * @param  {void|IServiceOptions} mainServerOptions Options for connecting this service to the identifylock server. Will not be released except by time out. Best used for global minimum wait time. Pass `null` to ignore.
   * @param  {IServiceOptions} [serverOptions] Options for connecting this service to the identifylock server. Will be acquired and released in order.
   */
  addIdentifyLockServices(mainServerOptions, ...serverOptions) {
    this.gatewayLockServiceOptions = {
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
   * @private
   *
   * @param {Object<string, any>} data Number of unavailable guilds received from Discord.
   */
  handleReady(data, shard) {
    const { user, guilds } = data;

    this.guildWaitCount = guilds.length;
    guilds.forEach((g) => this.guilds.set(g.id, new Guild(g, this, shard)));

    user.tag = Utils.constructUserTag(user);
    this.user = user;
    this.log('INFO', `Logged in as ${user.tag}.`);

    const message = `Ready event received. Waiting on ${guilds.length} guilds.`;
    this.log('INFO', message);

    if (guilds.length === 0) {
      this.checkIfDoneStarting();
    } else {
      this.lastGuildTimestamp = new Date().getTime();
    }
  }

  /**
   * Runs with every GUILD_CREATE on initial start up. Decrements counter and emits `PARACORD_STARTUP_COMPLETE` when 0.
   * @private
   *
   * @param {boolean} emptyShard Whether or not the shard started with no guilds.
   */
  checkIfDoneStarting(forced) {
    if ((forced || this.guildWaitCount === 0) && this.startingGateway !== undefined) {
      this.completeShardStartup(forced);

      if (--this.gatewayWaitCount === 0) {
        this.completeStartup();
      }
    } else if (this.guildWaitCount < 0) {
      const message = `Shard ${this.startingGateway.id} - guildWaitCount is less than 0. This should not happen. guildWaitCount value: ${this.guildWaitCount}`;
      this.log('WARNING', message);
    } else {
      this.lastGuildTimestamp = new Date().getTime();
      const message = `Shard ${this.startingGateway.id} - ${this.guildWaitCount} guilds left in start up.`;
      this.log('INFO', message);
    }
  }

  completeShardStartup(forced = false) {
    if (!forced) {
      const message = `Shard ${this.startingGateway.id} - received all start up guilds.`;
      this.log('INFO', message);
    }

    this.startingGateway.releaseIdentifyLocks();
    const shard = this.startingGateway;

    this.clearStartingShardState();

    this.emit('SHARD_STARTUP_COMPLETE', { shard, forced });
  }

  clearStartingShardState() {
    this.startingGateway = undefined;
    this.lastGuildTimestamp = undefined;
    this.guildWaitCount = undefined;
    clearInterval(this.startWithUnavailableGuildsInterval);
  }

  /**
   * Cleans up Paracord's start up process and emits `PARACORD_STARTUP_COMPLETE`.
   * @private
   *
   * @param {string} [reason] Reason for the time out.
   */
  completeStartup(reason) {
    let message = 'Paracord start up complete.';
    if (reason !== undefined) {
      message += ` ${reason}`;
    }

    this.log('INFO', message);
    this.emit('PARACORD_STARTUP_COMPLETE');
  }

  /*
   ********************************
   *********** CACHING ************
   ********************************
   */

  /**
   * Inserts/updates properties of a guild.
   * @private
   *
   * @param {Object<string, any>} data From Discord - https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param {Paracord} client
   * @param {Function} Guild Ignore. For dependency injection.
   * @param {Number} shard Id of shard that spawned this guild.
   */
  upsertGuild(data, shard, GuildConstructor = Guild) {
    const cachedGuild = this.guilds.get(data.id);
    if (cachedGuild !== undefined) {
      return cachedGuild.constructGuildFromData(data, this);
    }

    const guild = new GuildConstructor(data, this, shard);
    this.guilds.set(data.id, guild);
    return guild;
  }

  /**
   * Inserts/updates user in this client's cache.
   * @private
   *
   * @param {Object<string, any>} user From Discord - https://discordapp.com/developers/docs/resources/user#user-object-user-structure
   * @param {Paracord} client
   */
  upsertUser(user) {
    let cachedUser = this.users.get(user.id) || {};
    cachedUser.tag = Utils.constructUserTag(user);

    cachedUser = Object.assign(cachedUser, user);

    this.users.set(cachedUser.id, cachedUser);

    Utils.assignCreatedOn(cachedUser);
    this.circularAssignCachedPresence(cachedUser);

    return cachedUser;
  }

  /**
   * Adjusts the client's presence cache, allowing ignoring events that may be redundant.
   * @private
   *
   * @param {Object<string, any>} presence From Discord - https://discordapp.com/developers/docs/topics/gateway#presence-update
   */
  updatePresences(presence) {
    if (presence.status !== 'offline') {
      presence = this.upsertPresence(presence);
    } else {
      this.deletePresence(presence.user.id);
    }

    return presence;
  }

  /**
   * Inserts/updates presence in this client's cache.
   * @private
   *
   * @param {Object<string, any>} presence From Discord - https://discordapp.com/developers/docs/topics/gateway#presence-update
   */
  upsertPresence(presence) {
    const cachedPresence = this.presences.get(presence.user.id);
    if (cachedPresence !== undefined) {
      presence = Object.assign(cachedPresence, presence);
    } else {
      this.presences.set(presence.user.id, presence);
    }

    this.circularAssignCachedUser(presence);

    return presence;
  }

  /**
   * Ensures that a user is assigned its presence from the cache and vice versa.
   * @private
   *
   * @param {Object<string, any>} user From Discord - https://discordapp.com/developers/docs/resources/user#user-object
   */
  circularAssignCachedPresence(user) {
    const cachedPresence = this.presences.get(user.id);
    if (cachedPresence !== undefined) {
      user.presence = cachedPresence;
      user.presence.user = user;
    }
  }

  /**
   * Ensures that a presence is assigned its user from the cache and vice versa.
   * @private
   *
   * @param {Object<string, any>} presence From Discord - https://discordapp.com/developers/docs/topics/gateway#presence-update
   */
  circularAssignCachedUser(presence) {
    let cachedUser;
    if (Object.keys(presence.user).length === 1) { // don't upsert if id is the only property
      cachedUser = this.users.get(presence.user.id);
    } else {
      cachedUser = this.upsertUser(presence.user);
    }

    if (cachedUser !== undefined) {
      presence.user = cachedUser;
      presence.user.presence = presence;
    }
  }

  /**
   * Removes presence from cache.
   * @private
   *
   * @param {string} userId Id of the presence's user.
   */
  deletePresence(userId) {
    this.presences.delete(userId);
    const user = this.users.get(userId);
    if (user !== undefined) {
      user.presence = undefined;
    }
  }

  /**
   * Processes presences (e.g. from PRESENCE_UPDATE, GUILD_MEMBERS_CHUNK, etc.)
   * @private
   *
   * @param {Guild} guild Paracord guild.
   * @param {Object} presence From Discord. More information on a particular payload can be found in the official docs. https://discordapp.com/developers/docs/topics/gateway#presence-update
   */
  handlePresence(guild, presence) {
    const cachedPresence = this.updatePresences(presence);

    if (cachedPresence !== undefined) {
      guild.setPresence(cachedPresence);
    } else {
      guild.deletePresence(presence.user.id);
    }
  }

  /**
   * Processes a member object (e.g. from MESSAGE_CREATE, VOICE_STATE_UPDATE, etc.)
   * @private
   *
   * @param {Guild} guild Paracord guild.
   * @param {Object} member From Discord. More information on a particular payload can be found in the official docs. https://discordapp.com/developers/docs/resources/guild#guild-member-object
   */
  cacheMemberFromEvent(guild, member) {
    if (member !== undefined) {
      const cachedMember = guild.members.get(member.user.id);
      if (cachedMember === undefined) {
        return guild.upsertMember(member, this);
      }
      return cachedMember;
    }

    return member;
  }

  /**
   * Removes from presence and user caches users who are no longer in a cached guild.
   * @private
   */
  sweepCaches() {
    const deleteIds = new Map([...this.presences, ...this.users]);

    Paracord.trimMembersFromDeleteList(deleteIds, this.guilds.values());

    let sweptCount = 0;
    for (const id of deleteIds.keys()) {
      this.clearUserFromCaches(id);
      ++sweptCount;
    }

    this.log('INFO', `Swept ${sweptCount} users from caches.`);
  }

  /**
   * Remove users referenced in a guild's members or presences from the delete list.
   * @private
   *
   * @param {Map<string, void>} deleteIds Unique set of user ids in a map.
   * @param {IterableIterator<Guild>} guilds An iterable of guilds.
   *  */
  static trimMembersFromDeleteList(deleteIds, guilds) {
    for (const { members, presences } of guilds) {
      for (const id of new Map([...members, ...presences]).keys()) {
        deleteIds.delete(id);
      }
    }
  }

  /**
   * Delete the user and its presence from this client's cache.
   * @private
   *
   * @param {string} id User id.
   */
  clearUserFromCaches(id) {
    this.presences.delete(id);
    this.users.delete(id);
  }


  /*
   ********************************
   ******* PUBLIC HELPERS *********
   ********************************
   */

  /**
   * Short-hand for sending a message to Discord.
   *
   * @param {string} channelId Discord snowflake of the channel to send the message.
   * @param {string|Object} message  When a string is passed for `message`, that string will populate the `content` field. https://discordapp.com/developers/docs/resources/channel#create-message-params
   */
  sendMessage(channelId, message) {
    return this.request('post', `channels/${channelId}/messages`, {
      data:
        typeof message === 'string' ? { content: message } : { embed: message },
    });
  }

  /**
   * Short-hand for editing a message to Discord.
   *
   * @param {Object} message Partial Discord message. https://discordapp.com/developers/docs/resources/channel#create-message-params
   * @param {string} message.id Discord snowflake of the message to edit.
   * @param {string} message.channel_id Discord snowflake of the channel the message is in.
   * @param {string|Object} message  When a string is passed for `message`, that string will populate the `content` field. https://discordapp.com/developers/docs/resources/channel#create-message-params
   */
  editMessage(message, newMessage) {
    return this.request(
      'patch',
      `channels/${message.channel_id}/messages/${message.id}`,
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
   * @param {string|Guild} guild Guild object or id in which to search for member.
   * @param {string} memberId Id of the member.
   */
  async fetchMember(guild, memberId) {
    let guildId;

    if (typeof guild === 'string') {
      guildId = guild;
      guild = this.guilds.get(guildId);
    } else {
      ({ id: guildId } = guild);
    }

    const res = await this.request('get', `/guilds/${guildId}/members/${memberId}`);

    if (res.status === 200) {
      res.data = guild.upsertMember(res.data, this);
    }

    return res;
  }


  /**
   * Fetch a user using the REST API, caching on successful hit.
   *
   * @param {string} userId Id of the user.
   */
  async fetchUser(userId) {
    const res = await this.request('get', `/users/${userId}`);

    if (res.status === 200) {
      res.data = this.upsertUser(res.data);
    }

    return res;
  }
};
