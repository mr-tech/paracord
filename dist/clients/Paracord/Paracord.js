"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Api_1 = __importDefault(require("../Api"));
const Gateway_1 = __importDefault(require("../Gateway"));
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
function computeShards(shards, shardCount) {
    if (shards === undefined && shardCount !== undefined) {
        shards = [];
        for (let i = 0; i < shardCount; ++i) {
            shards.push(i);
        }
    }
    return { shards, shardCount };
}
class Paracord extends events_1.EventEmitter {
    request;
    addRateLimitService;
    addRequestService;
    gatewayLoginQueue;
    #token;
    #initialized;
    #unavailableGuildTolerance;
    #unavailableGuildWait;
    #startWithUnavailableGuildsInterval;
    #api;
    #gateways;
    #apiOptions;
    #gatewayOptions;
    #safeGatewayIdentifyTimestamp;
    #startingGateway;
    #gatewayWaitCount;
    #guildWaitCount;
    #lastGuildTimestamp;
    #startupHeartbeatTolerance;
    #events;
    #preventLogin;
    #gatewayHeartbeats;
    static validateParams(token) {
        if (token === undefined) {
            throw Error("client requires a 'token'");
        }
    }
    constructor(token, options = {}) {
        super();
        Paracord.validateParams(token);
        this.#token = (0, utils_1.coerceTokenToBotLike)(token);
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
    get startingGateway() {
        return this.#startingGateway;
    }
    get shards() {
        return this.#gateways;
    }
    get connecting() {
        return this.gatewayLoginQueue.length !== 0 || this.#startingGateway !== undefined;
    }
    eventHandler(eventType, data, shard) {
        switch (eventType) {
            case 'READY':
                this.handleGatewayReady(data);
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
    log(level, message, data) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.PARACORD,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    }
    emit(event, ...args) {
        switch (event) {
            case 'GATEWAY_IDENTIFY':
                this.handleGatewayIdentify(args[0]);
                break;
            case 'GATEWAY_CLOSE':
                this.handleGatewayClose(args[0]);
                break;
            default:
        }
        const events = this.#events;
        if (events === undefined) {
            return super.emit(event, ...args);
        }
        const type = events[event];
        if (type !== undefined) {
            return super.emit(type, ...args);
        }
        return false;
    }
    async login(options = {}) {
        const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;
        const loginOptions = (0, utils_1.clone)(options);
        const { unavailableGuildTolerance, unavailableGuildWait, startupHeartbeatTolerance, } = loginOptions;
        if (!this.#initialized) {
            this.init();
        }
        this.#unavailableGuildTolerance = unavailableGuildTolerance;
        this.#unavailableGuildWait = unavailableGuildWait;
        this.#startupHeartbeatTolerance = startupHeartbeatTolerance;
        if (PARACORD_SHARD_IDS !== undefined) {
            loginOptions.shards = PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
            loginOptions.shardCount = Number(PARACORD_SHARD_COUNT);
            const message = `Injecting shard settings from shard launcher. Shard Ids: ${loginOptions.shards}. Shard count: ${loginOptions.shardCount}`;
            this.log('INFO', message);
        }
        this.startGatewayLoginInterval();
        await this.enqueueGateways(loginOptions);
    }
    startGatewayLoginInterval() {
        setInterval(this.processGatewayQueue, constants_1.SECOND_IN_MILLISECONDS);
    }
    processGatewayQueue = async () => {
        const preventLogin = this.#preventLogin;
        const { gatewayLoginQueue } = this;
        const startingGateway = this.#startingGateway;
        const unavailableGuildTolerance = this.#unavailableGuildTolerance;
        const unavailableGuildWait = this.#unavailableGuildWait;
        const now = new Date().getTime();
        if (!preventLogin
            && gatewayLoginQueue.length
            && startingGateway === undefined
            && now > this.#safeGatewayIdentifyTimestamp) {
            const gateway = this.gatewayLoginQueue.shift();
            this.#safeGatewayIdentifyTimestamp = now + 10 * constants_1.SECOND_IN_MILLISECONDS;
            this.#startingGateway = gateway;
            try {
                await gateway.login();
                if (unavailableGuildTolerance !== undefined && unavailableGuildWait !== undefined) {
                    this.#startWithUnavailableGuildsInterval = setInterval(this.startWithUnavailableGuilds.bind(this, gateway), 1e3);
                }
            }
            catch (err) {
                this.log('FATAL', err.message, gateway);
                this.clearStartingShardState();
                gatewayLoginQueue.unshift(gateway);
            }
        }
    };
    startWithUnavailableGuilds = (gateway) => {
        const unavailableGuildTolerance = this.#unavailableGuildTolerance;
        const guildWaitCount = this.#guildWaitCount;
        const unavailableGuildWait = this.#unavailableGuildWait;
        const lastGuildTimestamp = this.#lastGuildTimestamp;
        const withinTolerance = guildWaitCount !== undefined && guildWaitCount <= unavailableGuildTolerance;
        const timedOut = lastGuildTimestamp !== undefined && lastGuildTimestamp + unavailableGuildWait * 1e3 < new Date().getTime();
        if (this.#startingGateway === gateway && withinTolerance && timedOut) {
            const message = `Forcing startup complete for shard ${this.#startingGateway.id} with ${this.#guildWaitCount} unavailable guilds.`;
            this.log('WARNING', message);
            this.checkIfDoneStarting(true);
        }
    };
    async enqueueGateways(options) {
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
    addNewGateway(identity) {
        const gatewayOptions = this.createGatewayOptions(identity);
        const gateway = this.setUpGateway(this.#token, gatewayOptions);
        if (this.#gateways.get(gateway.id) !== undefined) {
            throw Error(`duplicate shard id ${gateway.id}. shard ids must be unique`);
        }
        this.#gatewayHeartbeats.push(gateway.checkIfShouldHeartbeat);
        if (this.#gatewayWaitCount === null) {
            this.#gatewayWaitCount = 1;
        }
        else {
            ++this.#gatewayWaitCount;
        }
        this.#gateways.set(gateway.id, gateway);
        this.gatewayLoginQueue.push(gateway);
    }
    createGatewayOptions(identity) {
        const gatewayOptions = {
            identity, api: this.#api, emitter: this, checkSiblingHeartbeats: this.#gatewayHeartbeats,
        };
        if (this.#startupHeartbeatTolerance !== undefined) {
            gatewayOptions.startupHeartbeatTolerance = this.#startupHeartbeatTolerance;
            gatewayOptions.isStartingFunc = (gateway) => this.#startingGateway === gateway;
        }
        return gatewayOptions;
    }
    init() {
        if (this.#initialized) {
            throw Error('Client has already been initialized.');
        }
        this.#api = this.setUpApi(this.#token, this.#apiOptions ?? {});
        this.#initialized = true;
    }
    setUpApi(token, options) {
        const api = new Api_1.default(token, { ...options, emitter: this });
        if (api.rpcRequestService === undefined) {
            api.startQueue();
        }
        return api;
    }
    setUpGateway(token, options) {
        const gateway = new Gateway_1.default(token, {
            ...this.#gatewayOptions,
            ...options,
            emitter: this,
            api: this.#api,
        });
        return gateway;
    }
    checkIfDoneStarting(forced) {
        const startingGateway = this.#startingGateway;
        const guildWaitCount = this.#guildWaitCount;
        if (startingGateway !== undefined) {
            if (forced || guildWaitCount === 0) {
                this.completeShardStartup(startingGateway, forced);
                if (typeof this.#gatewayWaitCount === 'number' && --this.#gatewayWaitCount === 0) {
                    this.completeStartup();
                }
            }
            else if (guildWaitCount !== undefined && guildWaitCount < 0) {
                const message = `Shard ${startingGateway.id} - guildWaitCount is less than 0. This should not happen. guildWaitCount value: ${this.#guildWaitCount}`;
                this.log('WARNING', message);
            }
            else {
                this.#lastGuildTimestamp = new Date().getTime();
                const message = `Shard ${startingGateway.id} - ${guildWaitCount} guilds left in start up.`;
                this.log('INFO', message);
            }
        }
        else {
            const message = 'Starting check conducted without a defined gateway.';
            this.log('WARNING', message);
        }
    }
    completeShardStartup(startingGateway, forced = false) {
        if (!forced) {
            const message = 'Received all start up guilds.';
            this.log('INFO', message, { shard: startingGateway.id });
        }
        const shard = this.#startingGateway;
        this.clearStartingShardState();
        this.emit('SHARD_STARTUP_COMPLETE', { shard, forced });
    }
    clearStartingShardState() {
        this.#startingGateway = undefined;
        this.#lastGuildTimestamp = undefined;
        this.#guildWaitCount = 0;
        this.#startWithUnavailableGuildsInterval && clearInterval(this.#startWithUnavailableGuildsInterval);
    }
    completeStartup(reason) {
        let message = 'Paracord start up complete.';
        if (reason !== undefined) {
            message += ` ${reason}`;
        }
        this.log('INFO', message);
        this.emit('PARACORD_STARTUP_COMPLETE');
        this.#gatewayWaitCount = null;
    }
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
            this.#lastGuildTimestamp = new Date().getTime();
        }
    }
    handleGatewayIdentify(gateway) {
        this.#safeGatewayIdentifyTimestamp = new Date().getTime() + (6 * constants_1.SECOND_IN_MILLISECONDS);
        return gateway;
    }
    handleGatewayClose(data) {
        const { gateway, shouldReconnect } = data;
        if (shouldReconnect) {
            if (gateway.resumable) {
                gateway.login();
            }
            else if (this.startingGateway === gateway) {
                this.clearStartingShardState();
                this.gatewayLoginQueue.unshift(gateway);
            }
            else {
                this.gatewayLoginQueue.push(gateway);
            }
        }
        return data;
    }
}
exports.default = Paracord;
