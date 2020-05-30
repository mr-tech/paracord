"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Guild_1 = __importDefault(require("./structures/Guild"));
const Api_1 = __importDefault(require("../Api/Api"));
const Gateway_1 = __importDefault(require("../Gateway/Gateway"));
const utils_1 = __importDefault(require("../../utils"));
const constants_1 = require("../../constants");
const module_1 = require();
module.exports = class Paracord extends events_1.EventEmitter {
    constructor(token, options = {}) {
        super();
        this.token;
        this.initialized;
        this.user;
        this.unavailableGuildTolerance;
        this.unavailableGuildWait;
        this.startWithUnavailableGuildsInterval;
        this.api;
        this.gateways;
        this.gatewayLoginQueue;
        this.gatewayLockServiceOptions;
        this.safeGatewayIdentifyTimestamp;
        this.gatewayWaitCount;
        this.startingGateway;
        this.guildWaitCount;
        this.lastGuildTimestamp;
        this.guilds;
        this.users;
        this.presences;
        this.processGatewayQueueInterval;
        this.sweepCachesInterval;
        this.sweepRecentPresenceUpdatesInterval;
        this.events;
        this.allowEventsDuringStartup;
        this.preventLogin;
        this.constructorDefaults(token, options);
    }
    get shards() {
        return this.gateways;
    }
    get connecting() {
        return this.gatewayLoginQueue.length !== 0 || this.startingGateway !== undefined;
    }
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
        Object.assign(this, Object.assign(Object.assign({}, options), defaults));
        if (options.autoInit === undefined || options.autoInit) {
            this.init();
        }
        this.bindTimerFunction();
        this.bindEventFunctions();
    }
    static validateParams(token) {
        if (token === undefined) {
            throw Error("client requires a 'token'");
        }
    }
    bindEventFunctions() {
        utils_1.default.bindFunctionsFromFile(this, require('./eventFuncs'));
    }
    bindTimerFunction() {
        this.sweepCaches = this.sweepCaches.bind(this);
        this.processGatewayQueue = this.processGatewayQueue.bind(this);
    }
    eventHandler(eventType, data, shard) {
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
    log(level, message, data) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.PARACORD,
            level: constants_1.LOG_LEVELS[level],
            message,
            data,
        });
    }
    emit(type, ...args) {
        if (this.events === undefined || this.events[type] === undefined) {
            super.emit(type, ...args);
        }
        else {
            super.emit(this.events[type], ...args);
        }
    }
    login(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { unavailableGuildTolerance, unavailableGuildWait, allowEventsDuringStartup, } = options;
            if (!this.initialized) {
                this.init();
            }
            this.unavailableGuildTolerance = unavailableGuildTolerance;
            this.unavailableGuildWait = unavailableGuildWait;
            if (module_1.PARACORD_SHARD_IDS !== undefined) {
                options.shards = module_1.PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
                options.shardCount = Number(module_1.PARACORD_SHARD_COUNT);
                const message = `Injecting shard settings from shard launcher. Shard Ids: ${options.shards}. Shard count: ${options.shardCount}`;
                this.log('INFO', message);
            }
            this.startGatewayLoginInterval();
            yield this.enqueueGateways(options);
            this.allowEventsDuringStartup = allowEventsDuringStartup || false;
            this.startSweepInterval();
        });
    }
    startGatewayLoginInterval() {
        this.processGatewayQueueInterval = setInterval(this.processGatewayQueue, constants_1.SECOND_IN_MILLISECONDS);
    }
    processGatewayQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.preventLogin
                && this.gatewayLoginQueue.length
                && this.startingGateway === undefined
                && new Date().getTime() > this.safeGatewayIdentifyTimestamp) {
                const gateway = this.gatewayLoginQueue.shift();
                this.safeGatewayIdentifyTimestamp = 10 * constants_1.SECOND_IN_MILLISECONDS;
                this.startingGateway = gateway;
                try {
                    yield gateway.login();
                    if (this.unavailableGuildTolerance && this.unavailableGuildWait) {
                        this.startWithUnavailableGuildsInterval = setInterval(this.startWithUnavailableGuilds.bind(this, gateway), 1e3);
                    }
                }
                catch (err) {
                    this.log('FATAL', err.message, gateway);
                    this.clearStartingShardState();
                    this.gatewayLoginQueue.unshift(gateway);
                }
            }
        });
    }
    startWithUnavailableGuilds(gateway) {
        const { unavailableGuildTolerance, guildWaitCount, unavailableGuildWait, lastGuildTimestamp, } = this;
        const withinTolerance = this.guildWaitCount !== undefined && guildWaitCount <= unavailableGuildTolerance;
        const timedOut = lastGuildTimestamp !== undefined && lastGuildTimestamp + unavailableGuildWait * 1e3 < new Date().getTime();
        if (this.startingGateway === gateway && withinTolerance && timedOut) {
            const message = `Forcing startup complete for shard ${this.startingGateway.id} with ${this.guildWaitCount} unavailable guilds.`;
            this.log('WARNING', message);
            this.checkIfDoneStarting(true);
        }
    }
    enqueueGateways(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let { shards, shardCount, identity } = options;
            if (shards !== undefined && shardCount !== undefined) {
                shards.forEach((s) => {
                    if (s + 1 > shardCount) {
                        throw Error(`shard id ${s} exceeds max shard id of ${shardCount - 1}`);
                    }
                });
            }
            ({ shards, shardCount } = yield this.computeShards(shards, shardCount));
            shards.forEach((shard) => {
                const identityCopy = utils_1.default.clone(identity || {});
                identityCopy.shard = [shard, shardCount];
                this.addNewGateway(identityCopy);
            });
        });
    }
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
    init() {
        if (this.initialized) {
            throw Error('Client has already been initialized.');
        }
        this.api = this.setUpApi(this.token, this.apiOptions);
        this.selfAssignHandlerFunctions();
        this.initialized = true;
    }
    computeShards(shards, shardCount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shards !== undefined && shardCount === undefined) {
                throw Error('shards defined with no shardCount.');
            }
            if (shardCount === undefined) {
                const { status, data: { shards: recommendedShards } } = yield this.api.request('get', 'gateway/bot');
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
        });
    }
    startSweepInterval() {
        this.sweepCachesInterval = setInterval(this.sweepCaches, 60 * constants_1.MINUTE_IN_MILLISECONDS);
    }
    setUpApi(token, options) {
        const api = new Api_1.default(token, Object.assign(Object.assign({}, options), { emitter: this }));
        if (api.rpcRequestService === undefined) {
            api.startQueue();
        }
        return api;
    }
    setUpGateway(token, options) {
        const gateway = new Gateway_1.default(token, Object.assign(Object.assign({}, options), { emitter: this, api: this.api }));
        if (this.gatewayLockServiceOptions) {
            const { mainServerOptions, serverOptions } = this.gatewayLockServiceOptions;
            gateway.addIdentifyLockServices(mainServerOptions, ...serverOptions);
        }
        return gateway;
    }
    selfAssignHandlerFunctions() {
        this.request = this.api.request.bind(this.api);
        this.addRateLimitService = this.api.addRateLimitService.bind(this.api);
        this.addRequestService = this.api.addRequestService.bind(this.api);
    }
    addIdentifyLockServices(mainServerOptions, ...serverOptions) {
        this.gatewayLockServiceOptions = {
            mainServerOptions,
            serverOptions,
        };
    }
    handleReady(data, shard) {
        const { user, guilds } = data;
        this.guildWaitCount = guilds.length;
        guilds.forEach((g) => this.guilds.set(g.id, new Guild_1.default(g, this, shard)));
        user.tag = utils_1.default.constructUserTag(user);
        this.user = user;
        this.log('INFO', `Logged in as ${user.tag}.`);
        const message = `Ready event received. Waiting on ${guilds.length} guilds.`;
        this.log('INFO', message);
        if (guilds.length === 0) {
            this.checkIfDoneStarting();
        }
        else {
            this.lastGuildTimestamp = new Date().getTime();
        }
    }
    checkIfDoneStarting(forced) {
        if ((forced || this.guildWaitCount === 0) && this.startingGateway !== undefined) {
            this.completeShardStartup(forced);
            if (--this.gatewayWaitCount === 0) {
                this.completeStartup();
            }
        }
        else if (this.guildWaitCount < 0) {
            const message = `Shard ${this.startingGateway.id} - guildWaitCount is less than 0. This should not happen. guildWaitCount value: ${this.guildWaitCount}`;
            this.log('WARNING', message);
        }
        else {
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
    completeStartup(reason) {
        let message = 'Paracord start up complete.';
        if (reason !== undefined) {
            message += ` ${reason}`;
        }
        this.log('INFO', message);
        this.emit('PARACORD_STARTUP_COMPLETE');
    }
    upsertGuild(data, shard, GuildConstructor = Guild_1.default) {
        const cachedGuild = this.guilds.get(data.id);
        if (cachedGuild !== undefined) {
            return cachedGuild.constructGuildFromData(data, this);
        }
        const guild = new GuildConstructor(data, this, shard);
        this.guilds.set(data.id, guild);
        return guild;
    }
    upsertUser(user) {
        let cachedUser = this.users.get(user.id) || {};
        cachedUser.tag = utils_1.default.constructUserTag(user);
        cachedUser = Object.assign(cachedUser, user);
        this.users.set(cachedUser.id, cachedUser);
        utils_1.default.assignCreatedOn(cachedUser);
        this.circularAssignCachedPresence(cachedUser);
        return cachedUser;
    }
    updatePresences(presence) {
        if (presence.status !== 'offline') {
            presence = this.upsertPresence(presence);
        }
        else {
            this.deletePresence(presence.user.id);
        }
        return presence;
    }
    upsertPresence(presence) {
        const cachedPresence = this.presences.get(presence.user.id);
        if (cachedPresence !== undefined) {
            presence = Object.assign(cachedPresence, presence);
        }
        else {
            this.presences.set(presence.user.id, presence);
        }
        this.circularAssignCachedUser(presence);
        return presence;
    }
    circularAssignCachedPresence(user) {
        const cachedPresence = this.presences.get(user.id);
        if (cachedPresence !== undefined) {
            user.presence = cachedPresence;
            user.presence.user = user;
        }
    }
    circularAssignCachedUser(presence) {
        let cachedUser;
        if (Object.keys(presence.user).length === 1) {
            cachedUser = this.users.get(presence.user.id);
        }
        else {
            cachedUser = this.upsertUser(presence.user);
        }
        if (cachedUser !== undefined) {
            presence.user = cachedUser;
            presence.user.presence = presence;
        }
    }
    deletePresence(userId) {
        this.presences.delete(userId);
        const user = this.users.get(userId);
        if (user !== undefined) {
            user.presence = undefined;
        }
    }
    handlePresence(guild, presence) {
        const cachedPresence = this.updatePresences(presence);
        if (cachedPresence !== undefined) {
            guild.setPresence(cachedPresence);
        }
        else {
            guild.deletePresence(presence.user.id);
        }
    }
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
    static trimMembersFromDeleteList(deleteIds, guilds) {
        for (const { members, presences } of guilds) {
            for (const id of new Map([...members, ...presences]).keys()) {
                deleteIds.delete(id);
            }
        }
    }
    clearUserFromCaches(id) {
        this.presences.delete(id);
        this.users.delete(id);
    }
    sendMessage(channelId, message) {
        return this.request('post', `channels/${channelId}/messages`, {
            data: typeof message === 'string' ? { content: message } : { embed: message },
        });
    }
    editMessage(message, newMessage) {
        return this.request('patch', `channels/${message.channel_id}/messages/${message.id}`, {
            data: typeof newMessage === 'string'
                ? { content: newMessage }
                : { embed: newMessage },
        });
    }
    fetchMember(guild, memberId) {
        return __awaiter(this, void 0, void 0, function* () {
            let guildId;
            if (typeof guild === 'string') {
                guildId = guild;
                guild = this.guilds.get(guildId);
            }
            else {
                ({ id: guildId } = guild);
            }
            const res = yield this.request('get', `/guilds/${guildId}/members/${memberId}`);
            if (res.status === 200) {
                res.data = guild.upsertMember(res.data, this);
            }
            return res;
        });
    }
    fetchUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.request('get', `/users/${userId}`);
            if (res.status === 200) {
                res.data = this.upsertUser(res.data);
            }
            return res;
        });
    }
};
