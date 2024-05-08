"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const Gateway_1 = __importDefault(require("../Gateway"));
/**
   * Determines which shards will be spawned.
   * @param shards Shard Ids to spawn.
   * @param shardCount Total number of shards
   */
function computeShards(shards, shardCount) {
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
class Paracord extends events_1.EventEmitter {
    gatewayLoginQueue;
    /** Discord bot token. */
    #token;
    #emittedStartupComplete;
    /** During a shard's start up, how many guilds may be unavailable before forcing ready. */
    #unavailableGuildTolerance;
    /** During a shard's start up, time in seconds to wait from the last GUILD_CREATE to force ready. */
    #unavailableGuildWait;
    /** Interval that will force shards as ready when within set thresholds. */
    #unavailableGuildsInterval;
    #shardTimeout;
    #shardStartupTimeout;
    /** Gateway clients keyed to their shard #. */
    #gateways;
    #gatewayOptions;
    /** Shard currently in the initial phases of the gateway connection in progress. */
    #startingGateway;
    /** Guilds left to ingest on start up before emitting `PARACORD_STARTUP_COMPLETE` event. */
    #guildWaitCount;
    /** Timestamp of last GUILD_CREATE event on start up for the current `#startingGateway`. */
    #previousGuildTimestamp;
    #gatewayHeartbeats;
    #allowConnect;
    /** A gateway whose events to ignore. Used in the case of failing to start up correctly. */
    #drain;
    /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
    static validateParams(token) {
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
    constructor(token, options) {
        super();
        Paracord.validateParams(token);
        this.#token = (0, utils_1.coerceTokenToBotLike)(token);
        this.#gateways = new Map();
        this.gatewayLoginQueue = [];
        this.#guildWaitCount = 0;
        this.#gatewayHeartbeats = [];
        this.#emittedStartupComplete = false;
        this.#drain = null;
        this.#allowConnect = true;
        const { gatewayOptions, unavailableGuildTolerance, unavailableGuildWait, shardStartupTimeout, } = options;
        this.#gatewayOptions = gatewayOptions;
        this.#unavailableGuildTolerance = unavailableGuildTolerance;
        this.#unavailableGuildWait = unavailableGuildWait;
        this.#shardStartupTimeout = shardStartupTimeout;
    }
    get startingGateway() {
        return this.#startingGateway;
    }
    /** Gateway clients keyed to their shard #. */
    get shards() {
        return this.#gateways;
    }
    /** Whether or not there are gateways currently starting up. */
    get connecting() {
        return this.gatewayLoginQueue.length !== 0 || !!this.#startingGateway;
    }
    set allowConnect(value) {
        this.#allowConnect = value;
    }
    get allowConnect() {
        return this.#allowConnect;
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
    handleEvent(eventType, data, gateway) {
        if (this.#drain === gateway)
            return;
        switch (eventType) {
            case 'READY':
                this.handleGatewayReady(data);
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
                }
                else {
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
    log(level, message, data) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.PARACORD,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    }
    /**
     * Proxy emitter. Renames type with a key in `this.#events`.
     * @param args Any arguments to send with the emitted event.
     */
    emit(event, ...args) {
        switch (event) {
            case 'GATEWAY_CLOSE':
                this.handleGatewayClose(args[0]);
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
    async login(options = {}) {
        const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;
        const loginOptions = (0, utils_1.clone)(options);
        if (PARACORD_SHARD_IDS !== undefined) {
            loginOptions.shards = PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
            loginOptions.shardCount = Number(PARACORD_SHARD_COUNT);
            const message = `Injecting shard settings from shard launcher. Shard Ids: ${loginOptions.shards}. Shard count: ${loginOptions.shardCount}`;
            this.log('INFO', message);
        }
        this.startGatewayLoginInterval();
        this.enqueueGateways(loginOptions);
    }
    /** Begins the interval that kicks off gateway logins from the queue. */
    startGatewayLoginInterval() {
        setInterval(() => { void this.processGatewayQueue(); }, constants_1.SECOND_IN_MILLISECONDS);
    }
    /** Decides shards to spawn and pushes a gateway onto the queue for each one.
     * @param options Options used when logging in.
     */
    enqueueGateways(options) {
        const { identity } = options;
        let { shards, shardCount } = options;
        if (identity && Array.isArray(identity.shard)) {
            const identityCopy = (0, utils_1.clone)(identity);
            this.addNewGateway(identityCopy);
        }
        else {
            if (!identity?.intents)
                throw Error('intents missing on options#identity');
            if (shards !== undefined && shardCount !== undefined) {
                shards.forEach((s) => {
                    if (s + 1 > shardCount) {
                        throw Error(`shard id ${s} exceeds max shard id of ${shardCount - 1}`);
                    }
                });
            }
            else if (shards && shardCount) {
                ({ shards, shardCount } = computeShards(shards, shardCount));
            }
            if (shards === undefined || shardCount === undefined) {
                throw Error(`shards ids or shard count are invalid - ids ${shards} , count: ${shardCount}`);
            }
            else {
                for (const shard of shards) {
                    const identityCopy = identity ? (0, utils_1.clone)(identity) : { token: this.#token, intents: 0 };
                    identityCopy.shard = [shard, shardCount];
                    this.addNewGateway(identityCopy);
                }
            }
        }
    }
    /** Takes a gateway off of the queue and logs it in. */
    processGatewayQueue = async () => {
        if (this.#allowConnect && !this.#drain && (!this.#startingGateway || this.isStartingGateway(this.gatewayLoginQueue[0]))) {
            const gateway = this.gatewayLoginQueue.shift();
            if (gateway) {
                this.#startingGateway = gateway;
                try {
                    await gateway.login();
                    if (this.#shardStartupTimeout) {
                        const timeout = this.#shardStartupTimeout;
                        this.#shardTimeout = setTimeout(() => {
                            this.timeoutShard(gateway, timeout);
                        }, timeout * constants_1.SECOND_IN_MILLISECONDS);
                    }
                    if (this.#unavailableGuildTolerance !== undefined
                        && this.#unavailableGuildWait !== undefined
                        && !gateway.resumable) {
                        const tolerance = this.#unavailableGuildTolerance;
                        const waitSeconds = this.#unavailableGuildWait;
                        const interval = setInterval(() => {
                            this.checkUnavailable(interval, gateway, tolerance, waitSeconds);
                        }, constants_1.SECOND_IN_MILLISECONDS);
                        this.#unavailableGuildsInterval = interval;
                    }
                }
                catch (err) {
                    this.clearStartingShardState(gateway);
                    this.upsertGatewayQueue(gateway, this.isStartingGateway(gateway));
                    this.log('FATAL', err instanceof Error ? err.message : String(err), gateway);
                }
            }
        }
    };
    checkUnavailable(self, gateway, tolerance, waitSeconds) {
        const timedOut = !!this.#previousGuildTimestamp && this.#previousGuildTimestamp + (waitSeconds * constants_1.SECOND_IN_MILLISECONDS) < new Date().getTime();
        const withinTolerance = this.#guildWaitCount <= tolerance;
        if (this.isStartingGateway(gateway) && timedOut && withinTolerance) {
            const message = `Forcing startup complete for shard ${this.#startingGateway?.id} with ${this.#guildWaitCount} unavailable guilds.`;
            this.log('WARNING', message);
            this.checkIfDoneStarting(true);
        }
        else if (!this.isStartingGateway(gateway)) {
            const message = `Unavailable guilds check expected shard ${gateway.id}. Got ${this.#startingGateway?.id} instead.`;
            clearInterval(self);
            this.log('WARNING', message);
        }
    }
    timeoutShard(gateway, waitTime) {
        if (this.isStartingGateway(gateway)) {
            this.#drain = gateway;
            setTimeout(() => { this.#drain = null; }, 3 * constants_1.SECOND_IN_MILLISECONDS);
            gateway.close(constants_1.GATEWAY_CLOSE_CODES.INTERNAL_TERMINATE_RECONNECT);
            this.log('WARNING', `Shard timed out after ${waitTime} seconds. Draining and reconnecting.`);
        }
    }
    /**
     * Creates gateway and pushes it into cache and login queue.
     * @param identity An object containing information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure
     */
    addNewGateway(identity) {
        const gatewayOptions = this.createGatewayOptions(identity);
        const gateway = this.setUpGateway(this.#token, gatewayOptions);
        if (this.#gateways.get(gateway.id) !== undefined) {
            throw Error(`duplicate shard id ${gateway.id}. shard ids must be unique`);
        }
        this.#gatewayHeartbeats.push(gateway.heart.checkIfShouldHeartbeat.bind(gateway.heart));
        this.#gateways.set(gateway.id, gateway);
        this.upsertGatewayQueue(gateway);
    }
    createGatewayOptions(identity) {
        const gatewayOptions = {
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
    setUpGateway(token, options) {
        const gateway = new Gateway_1.default(token, {
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
    checkIfDoneStarting(forced = false) {
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
            }
            else {
                this.#previousGuildTimestamp = new Date().getTime();
                const message = `Shard ${startingGateway.id} - ${guildWaitCount} guilds left in start up.`;
                this.log('INFO', message);
            }
        }
        else {
            const message = 'Starting check conducted without a defined gateway.';
            this.log('WARNING', message);
        }
    }
    completeShardStartup(event) {
        const { shard: gateway, forced = false, resumed = false } = event;
        if (resumed) {
            const message = 'Resumed shard.';
            this.log('INFO', message, { shard: gateway.id });
        }
        else if (!forced) {
            const message = 'Received all start up guilds.';
            this.log('INFO', message, { shard: gateway.id });
        }
        this.clearStartingShardState(gateway);
        this.emit('SHARD_STARTUP_COMPLETE', event);
    }
    clearStartingShardState(gateway) {
        if (this.isStartingGateway(gateway)) {
            this.#startingGateway = undefined;
            this.#previousGuildTimestamp = undefined;
            this.#guildWaitCount = 0;
            clearInterval(this.#unavailableGuildsInterval);
            clearTimeout(this.#shardTimeout);
        }
    }
    /**
     * Cleans up Paracord start up process and emits `PARACORD_STARTUP_COMPLETE`.
     * @param reason Reason for the time out.
     */
    emitStartupComplete(reason) {
        this.#emittedStartupComplete = true;
        let message = 'Paracord start up complete.';
        if (reason !== undefined) {
            message += ` ${reason}`;
        }
        this.log('INFO', message);
        this.emit('PARACORD_STARTUP_COMPLETE');
    }
    /**
     * Prepares the client for caching guilds on start up.
     * @param data From Discord - Initial ready event after identify.
     */
    handleGatewayReady(data) {
        const { user, guilds } = data;
        this.#guildWaitCount = guilds.length;
        this.log('INFO', `Logged in as ${user.username}#${user.discriminator}.`);
        const message = `Ready event received. Waiting on ${guilds.length} guilds.`;
        this.log('INFO', message);
        if (guilds.length === 0) {
            this.checkIfDoneStarting();
        }
        else {
            this.#previousGuildTimestamp = new Date().getTime();
        }
    }
    // { gateway, shouldReconnect }: { gateway: Gateway, shouldReconnect: boolean },
    handleGatewayClose(data) {
        const { gateway, shouldReconnect } = data;
        if (!gateway.resumable) {
            this.clearStartingShardState(gateway);
        }
        this.upsertGatewayQueue(gateway, shouldReconnect);
    }
    upsertGatewayQueue(gateway, front = false) {
        if (!this.gatewayLoginQueue.includes(gateway)) {
            if (front) {
                this.gatewayLoginQueue.unshift(gateway);
            }
            else {
                this.gatewayLoginQueue.push(gateway);
            }
        }
    }
    isStartingGateway(gateway) {
        return this.#startingGateway === gateway;
    }
}
exports.default = Paracord;
