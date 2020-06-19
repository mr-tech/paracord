"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _guilds, _users, _presences, _filteredProps, _initialized, _unavailableGuildTolerance, _unavailableGuildWait, _startWithUnavailableGuildsInterval, _api, _gateways, _gatewayLockServiceOptions, _apiOptions, _gatewayWaitCount, _guildWaitCount, _lastGuildTimestamp, _processGatewayQueueInterval, _sweepCachesInterval, _sweepRecentPresenceUpdatesInterval, _events, _allowEventsDuringStartup, _preventLogin, _gatewayEvents;
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const Api_1 = __importDefault(require("../Api/Api"));
const Gateway_1 = __importDefault(require("../Gateway/Gateway"));
const eventFuncs = __importStar(require("./eventFuncs"));
const Base_1 = __importDefault(require("./structures/Base"));
const Guild_1 = __importDefault(require("./structures/Guild"));
const { PARACORD_SHARD_IDS, PARACORD_SHARD_COUNT } = process.env;
class Paracord extends events_1.EventEmitter {
    constructor(token, options = {}) {
        super();
        _guilds.set(this, void 0);
        _users.set(this, void 0);
        _presences.set(this, void 0);
        _filteredProps.set(this, void 0);
        _initialized.set(this, void 0);
        _unavailableGuildTolerance.set(this, void 0);
        _unavailableGuildWait.set(this, void 0);
        _startWithUnavailableGuildsInterval.set(this, void 0);
        _api.set(this, void 0);
        _gateways.set(this, void 0);
        _gatewayLockServiceOptions.set(this, void 0);
        _apiOptions.set(this, void 0);
        _gatewayWaitCount.set(this, void 0);
        _guildWaitCount.set(this, void 0);
        _lastGuildTimestamp.set(this, void 0);
        _processGatewayQueueInterval.set(this, void 0);
        _sweepCachesInterval.set(this, void 0);
        _sweepRecentPresenceUpdatesInterval.set(this, void 0);
        _events.set(this, void 0);
        _allowEventsDuringStartup.set(this, void 0);
        _preventLogin.set(this, void 0);
        _gatewayEvents.set(this, void 0);
        Paracord.validateParams(token);
        this.token = utils_1.coerceTokenToBotLike(token);
        __classPrivateFieldSet(this, _initialized, false);
        __classPrivateFieldSet(this, _guilds, new Map());
        __classPrivateFieldSet(this, _users, new Map());
        __classPrivateFieldSet(this, _presences, new Map());
        __classPrivateFieldSet(this, _gateways, new Map());
        this.gatewayLoginQueue = [];
        __classPrivateFieldSet(this, _guildWaitCount, 0);
        __classPrivateFieldSet(this, _gatewayWaitCount, 0);
        __classPrivateFieldSet(this, _allowEventsDuringStartup, false);
        __classPrivateFieldSet(this, _preventLogin, false);
        this.safeGatewayIdentifyTimestamp = 0;
        __classPrivateFieldSet(this, _events, options.events);
        __classPrivateFieldSet(this, _apiOptions, options.apiOptions);
        __classPrivateFieldSet(this, _filteredProps, options.filters);
        if (options.autoInit !== false) {
            this.init();
        }
        this.bindTimerFunction();
        __classPrivateFieldSet(this, _gatewayEvents, this.bindEventFunctions());
    }
    get guilds() {
        if (!this.isCached('guilds'))
            throw Error('guilds are not cached');
        return __classPrivateFieldGet(this, _guilds);
    }
    get users() {
        if (!this.isCached('users'))
            throw Error('users are not cached');
        return __classPrivateFieldGet(this, _users);
    }
    get presences() {
        if (!this.isCached('presences'))
            throw Error('users are not cached');
        return __classPrivateFieldGet(this, _presences);
    }
    static validateParams(token) {
        if (token === undefined) {
            throw Error("client requires a 'token'");
        }
    }
    static ensureCamelProps(data) {
        if (data instanceof Base_1.default) {
            return data;
        }
        return utils_1.isObject(data) ? utils_1.objectKeysSnakeToCamel(data) : data;
    }
    get shards() {
        return __classPrivateFieldGet(this, _gateways);
    }
    get connecting() {
        return this.gatewayLoginQueue.length !== 0 || this.startingGateway !== undefined;
    }
    get api() {
        return __classPrivateFieldGet(this, _api);
    }
    bindEventFunctions() {
        const funcs = {};
        for (const prop of Object.getOwnPropertyNames(eventFuncs)) {
            if (typeof eventFuncs[prop] === 'function') {
                funcs[prop] = eventFuncs[prop].bind(this);
            }
        }
        return funcs;
    }
    bindTimerFunction() {
        this.sweepCaches = this.sweepCaches.bind(this);
        this.processGatewayQueue = this.processGatewayQueue.bind(this);
    }
    eventHandler(eventType, data, shard) {
        var _a;
        let emit = data;
        const paracordEvent = __classPrivateFieldGet(this, _gatewayEvents)[eventType];
        if (paracordEvent !== undefined) {
            emit = paracordEvent(data, shard);
        }
        if (((_a = this.startingGateway) === null || _a === void 0 ? void 0 : _a.id) === shard && __classPrivateFieldGet(this, _guildWaitCount) !== undefined) {
            if (eventType === 'GUILD_CREATE') {
                __classPrivateFieldSet(this, _guildWaitCount, +__classPrivateFieldGet(this, _guildWaitCount) - 1);
                this.checkIfDoneStarting();
                return undefined;
            }
            return __classPrivateFieldGet(this, _allowEventsDuringStartup) ? emit : undefined;
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
    emit(event, ...args) {
        const type = __classPrivateFieldGet(this, _events) && __classPrivateFieldGet(this, _events)[event];
        if (type !== undefined) {
            args = args.map(Paracord.ensureCamelProps);
            return super.emit(type, ...args);
        }
        return false;
    }
    isCached(prop) {
        var _a, _b, _c, _d;
        return (_d = (_c = (_b = (_a = __classPrivateFieldGet(this, _filteredProps)) === null || _a === void 0 ? void 0 : _a.caches) === null || _b === void 0 ? void 0 : _b.paracord) === null || _c === void 0 ? void 0 : _c.includes(prop)) !== null && _d !== void 0 ? _d : true;
    }
    login(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { unavailableGuildTolerance, unavailableGuildWait, allowEventsDuringStartup, } = options;
            if (!__classPrivateFieldGet(this, _initialized)) {
                this.init();
            }
            __classPrivateFieldSet(this, _unavailableGuildTolerance, unavailableGuildTolerance);
            __classPrivateFieldSet(this, _unavailableGuildWait, unavailableGuildWait);
            if (PARACORD_SHARD_IDS !== undefined) {
                options.shards = PARACORD_SHARD_IDS.split(',').map((s) => Number(s));
                options.shardCount = Number(PARACORD_SHARD_COUNT);
                const message = `Injecting shard settings from shard launcher. Shard Ids: ${options.shards}. Shard count: ${options.shardCount}`;
                this.log('INFO', message);
            }
            this.startGatewayLoginInterval();
            yield this.enqueueGateways(options);
            __classPrivateFieldSet(this, _allowEventsDuringStartup, allowEventsDuringStartup || false);
            this.startSweepInterval();
        });
    }
    startGatewayLoginInterval() {
        __classPrivateFieldSet(this, _processGatewayQueueInterval, setInterval(this.processGatewayQueue, constants_1.SECOND_IN_MILLISECONDS));
    }
    processGatewayQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            const preventLogin = __classPrivateFieldGet(this, _preventLogin);
            const { gatewayLoginQueue, startingGateway, safeGatewayIdentifyTimestamp, } = this;
            const unavailableGuildTolerance = __classPrivateFieldGet(this, _unavailableGuildTolerance);
            const unavailableGuildWait = __classPrivateFieldGet(this, _unavailableGuildWait);
            const now = new Date().getTime();
            if (!preventLogin
                && gatewayLoginQueue.length
                && startingGateway === undefined
                && now > safeGatewayIdentifyTimestamp) {
                const gateway = this.gatewayLoginQueue.shift();
                this.safeGatewayIdentifyTimestamp = now + 10 * constants_1.SECOND_IN_MILLISECONDS;
                this.startingGateway = gateway;
                try {
                    yield gateway.login();
                    if (unavailableGuildTolerance !== undefined && unavailableGuildWait !== undefined) {
                        __classPrivateFieldSet(this, _startWithUnavailableGuildsInterval, setInterval(this.startWithUnavailableGuilds.bind(this, gateway), 1e3));
                    }
                }
                catch (err) {
                    this.log('FATAL', err.message, gateway);
                    this.clearStartingShardState();
                    gatewayLoginQueue.unshift(gateway);
                }
            }
        });
    }
    startWithUnavailableGuilds(gateway) {
        const unavailableGuildTolerance = __classPrivateFieldGet(this, _unavailableGuildTolerance);
        const guildWaitCount = __classPrivateFieldGet(this, _guildWaitCount);
        const unavailableGuildWait = __classPrivateFieldGet(this, _unavailableGuildWait);
        const lastGuildTimestamp = __classPrivateFieldGet(this, _lastGuildTimestamp);
        const withinTolerance = guildWaitCount !== undefined && guildWaitCount <= unavailableGuildTolerance;
        const timedOut = lastGuildTimestamp !== undefined && lastGuildTimestamp + unavailableGuildWait * 1e3 < new Date().getTime();
        if (this.startingGateway === gateway && withinTolerance && timedOut) {
            const message = `Forcing startup complete for shard ${this.startingGateway.id} with ${__classPrivateFieldGet(this, _guildWaitCount)} unavailable guilds.`;
            this.log('WARNING', message);
            this.checkIfDoneStarting(true);
        }
    }
    enqueueGateways(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { identity } = options;
            let { shards, shardCount } = options;
            let wsUrl;
            if (identity && Array.isArray(identity.shard)) {
                const identityCopy = utils_1.clone(identity);
                this.addNewGateway(identityCopy);
            }
            else {
                if (shards !== undefined && shardCount !== undefined) {
                    shards.forEach((s) => {
                        if (s + 1 > shardCount) {
                            throw Error(`shard id ${s} exceeds max shard id of ${shardCount - 1}`);
                        }
                    });
                }
                else {
                    ({ shards, shardCount, wsUrl } = yield this.computeShards(shards, shardCount));
                }
                if (shards === undefined || shardCount === undefined) {
                    throw Error(`shards ids or shard count are invalid - ids ${shards} , count: ${shardCount}`);
                }
                else {
                    shards.forEach((shard) => {
                        const identityCopy = utils_1.clone(identity !== null && identity !== void 0 ? identity : {});
                        identityCopy.token = this.token;
                        identityCopy.shard = [shard, shardCount];
                        this.addNewGateway(identityCopy, wsUrl);
                    });
                }
            }
        });
    }
    computeShards(shards, shardCount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shards !== undefined && shardCount === undefined) {
                throw Error('shards defined with no shardCount.');
            }
            let wsUrl;
            if (shardCount === undefined) {
                const { status, data: { url, shards: recommendedShards } } = yield this.api.request('get', 'gateway/bot');
                wsUrl = url;
                if (status === 200) {
                    shardCount = recommendedShards;
                }
            }
            if (shards === undefined && shardCount !== undefined) {
                shards = [];
                for (let i = 0; i < shardCount; ++i) {
                    shards.push(i);
                }
            }
            return { shards, shardCount, wsUrl };
        });
    }
    addNewGateway(identity, wsUrl) {
        const gatewayOptions = {
            identity, api: this.api, emitter: this, wsUrl,
        };
        const gateway = this.setUpGateway(this.token, gatewayOptions);
        if (__classPrivateFieldGet(this, _gateways).get(gateway.id) !== undefined) {
            throw Error(`duplicate shard id ${gateway.id}. shard ids must be unique`);
        }
        __classPrivateFieldSet(this, _gatewayWaitCount, +__classPrivateFieldGet(this, _gatewayWaitCount) + 1);
        __classPrivateFieldGet(this, _gateways).set(gateway.id, gateway);
        this.gatewayLoginQueue.push(gateway);
    }
    init() {
        var _a;
        if (__classPrivateFieldGet(this, _initialized)) {
            throw Error('Client has already been initialized.');
        }
        __classPrivateFieldSet(this, _api, this.setUpApi(this.token, (_a = __classPrivateFieldGet(this, _apiOptions)) !== null && _a !== void 0 ? _a : {}));
        this.selfAssignHandlerFunctions();
        __classPrivateFieldSet(this, _initialized, true);
    }
    startSweepInterval() {
        __classPrivateFieldSet(this, _sweepCachesInterval, setInterval(this.sweepCaches, 60 * constants_1.MINUTE_IN_MILLISECONDS));
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
        if (__classPrivateFieldGet(this, _gatewayLockServiceOptions)) {
            const { mainServerOptions, serverOptions } = __classPrivateFieldGet(this, _gatewayLockServiceOptions);
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
        __classPrivateFieldSet(this, _gatewayLockServiceOptions, {
            mainServerOptions,
            serverOptions,
        });
    }
    handleReady(data, shard) {
        const { user, guilds } = data;
        __classPrivateFieldSet(this, _guildWaitCount, guilds.length);
        this.user = Object.assign(Object.assign({}, user), { get tag() {
                return `${user.username}#${user.discriminator}`;
            },
            get createdOn() {
                return 0;
            } });
        this.log('INFO', `Logged in as ${this.user.tag}.`);
        guilds.forEach((g) => __classPrivateFieldGet(this, _guilds).set(g.id, new Guild_1.default(g, this, shard)));
        const message = `Ready event received. Waiting on ${guilds.length} guilds.`;
        this.log('INFO', message);
        if (guilds.length === 0) {
            this.checkIfDoneStarting();
        }
        else {
            __classPrivateFieldSet(this, _lastGuildTimestamp, new Date().getTime());
        }
    }
    checkIfDoneStarting(forced) {
        const { startingGateway } = this;
        const guildWaitCount = __classPrivateFieldGet(this, _guildWaitCount);
        if (startingGateway !== undefined) {
            if (forced || guildWaitCount === 0) {
                this.completeShardStartup(startingGateway, forced);
                __classPrivateFieldSet(this, _gatewayWaitCount, +__classPrivateFieldGet(this, _gatewayWaitCount) - 1) === 0 && this.completeStartup();
            }
            else if (guildWaitCount !== undefined && guildWaitCount < 0) {
                const message = `Shard ${startingGateway.id} - guildWaitCount is less than 0. This should not happen. guildWaitCount value: ${__classPrivateFieldGet(this, _guildWaitCount)}`;
                this.log('WARNING', message);
            }
            else {
                __classPrivateFieldSet(this, _lastGuildTimestamp, new Date().getTime());
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
            const message = `Shard ${startingGateway.id} - received all start up guilds.`;
            this.log('INFO', message);
        }
        startingGateway.releaseIdentifyLocks();
        const shard = this.startingGateway;
        this.clearStartingShardState();
        this.emit('SHARD_STARTUP_COMPLETE', { shard, forced });
    }
    clearStartingShardState() {
        this.startingGateway = undefined;
        __classPrivateFieldSet(this, _lastGuildTimestamp, undefined);
        __classPrivateFieldSet(this, _guildWaitCount, 0);
        __classPrivateFieldGet(this, _startWithUnavailableGuildsInterval) && clearInterval(__classPrivateFieldGet(this, _startWithUnavailableGuildsInterval));
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
        const cachedGuild = __classPrivateFieldGet(this, _guilds).get(data.id);
        if (cachedGuild !== undefined) {
            return cachedGuild.update(data);
        }
        if (shard !== undefined) {
            const guild = new GuildConstructor(data, this, shard);
            __classPrivateFieldGet(this, _guilds).set(data.id, guild);
            return guild;
        }
        return undefined;
    }
    upsertUser(user) {
        let cachedUser = __classPrivateFieldGet(this, _users).get(user.id) || {};
        cachedUser = Object.assign(cachedUser, Object.assign(Object.assign({}, user), { tag: `${user.username}#${user.discriminator}` }));
        if (cachedUser.createdOn === undefined) {
            cachedUser.createdOn = utils_1.timestampFromSnowflake(user.id);
        }
        __classPrivateFieldGet(this, _users).set(cachedUser.id, cachedUser);
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
        const cachedPresence = __classPrivateFieldGet(this, _presences).get(presence.user.id);
        if (cachedPresence !== undefined) {
            presence = Object.assign(cachedPresence, presence);
        }
        else {
            __classPrivateFieldGet(this, _presences).set(presence.user.id, presence);
        }
        this.circularAssignCachedUser(presence);
        return presence;
    }
    circularAssignCachedPresence(user) {
        const cachedPresence = __classPrivateFieldGet(this, _presences).get(user.id);
        if (cachedPresence !== undefined) {
            user.presence = cachedPresence;
            user.presence.user = user;
        }
    }
    circularAssignCachedUser(presence) {
        let cachedUser;
        if (Object.keys(presence.user).length === 1) {
            cachedUser = __classPrivateFieldGet(this, _users).get(presence.user.id);
        }
        else {
            cachedUser = this.upsertUser(presence.user);
        }
        if (cachedUser !== undefined) {
            presence.user = cachedUser;
            cachedUser.presence = presence;
        }
    }
    deletePresence(userId) {
        __classPrivateFieldGet(this, _presences).delete(userId);
        const user = __classPrivateFieldGet(this, _users).get(userId);
        if (user !== undefined) {
            user.presence = undefined;
        }
    }
    handlePresence(presence, guild) {
        const cachedPresence = this.updatePresences(presence);
        if (cachedPresence !== undefined) {
            guild && guild.setPresence(cachedPresence);
        }
        else {
            guild && guild.deletePresence(presence.user.id);
        }
        return cachedPresence;
    }
    sweepCaches() {
        const idsFromPresences = __classPrivateFieldGet(this, _presences).keys();
        const idsFromUsers = __classPrivateFieldGet(this, _users).keys();
        const deleteIds = Paracord.deDupe(Array.from(idsFromPresences).concat(Array.from(idsFromUsers)));
        Paracord.trimMembersFromDeleteList(deleteIds, __classPrivateFieldGet(this, _guilds).values());
        let sweptCount = 0;
        for (const id of deleteIds.keys()) {
            this.clearUserFromCaches(id);
            ++sweptCount;
        }
        this.log('INFO', `Swept ${sweptCount} users from caches.`);
    }
    static uqSnowflakes(...args) {
        let arr = [];
        for (const arg of args) {
            if (typeof arg === 'string') {
                arr = arr.concat(arg);
            }
            else {
                arr = arr.concat(Array.from(arg.keys()));
            }
        }
        return arr;
    }
    static deDupe(a) {
        const temp = new Map();
        for (let i = 0; i < a.length; i++) {
            temp.set(a[i], undefined);
        }
        return temp;
    }
    static trimMembersFromDeleteList(deleteIds, guilds) {
        for (const { members, presences } of guilds) {
            const idsFromPresences = presences.keys();
            const idFromMembers = members.keys();
            const cachedIds = Paracord.deDupe(Array.from(idsFromPresences).concat(Array.from(idFromMembers)));
            for (const id of cachedIds.keys()) {
                deleteIds.delete(id);
            }
        }
    }
    clearUserFromCaches(id) {
        __classPrivateFieldGet(this, _presences).delete(id);
        __classPrivateFieldGet(this, _users).delete(id);
    }
    sendMessage(channelId, message) {
        return this.request('post', `channels/${channelId}/messages`, {
            data: typeof message === 'string' ? { content: message } : { embed: message },
        });
    }
    editMessage(message, newMessage) {
        return this.request('patch', `channels/${message.channelId}/messages/${message.id}`, {
            data: typeof newMessage === 'string'
                ? { content: newMessage }
                : { embed: newMessage },
        });
    }
    fetchMember(guild, memberId) {
        return __awaiter(this, void 0, void 0, function* () {
            let guildId;
            if (typeof guild !== 'string') {
                ({ id: guildId } = guild);
            }
            const res = yield this.request('get', `/guilds/${guildId}/members/${memberId}`);
            if (res.status === 200) {
                let cacheGuild;
                if (typeof guild === 'string') {
                    cacheGuild = __classPrivateFieldGet(this, _guilds).get(guild);
                }
                if (cacheGuild !== undefined) {
                    res.data = cacheGuild.upsertMember(res.data);
                }
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
}
exports.default = Paracord;
_guilds = new WeakMap(), _users = new WeakMap(), _presences = new WeakMap(), _filteredProps = new WeakMap(), _initialized = new WeakMap(), _unavailableGuildTolerance = new WeakMap(), _unavailableGuildWait = new WeakMap(), _startWithUnavailableGuildsInterval = new WeakMap(), _api = new WeakMap(), _gateways = new WeakMap(), _gatewayLockServiceOptions = new WeakMap(), _apiOptions = new WeakMap(), _gatewayWaitCount = new WeakMap(), _guildWaitCount = new WeakMap(), _lastGuildTimestamp = new WeakMap(), _processGatewayQueueInterval = new WeakMap(), _sweepCachesInterval = new WeakMap(), _sweepRecentPresenceUpdatesInterval = new WeakMap(), _events = new WeakMap(), _allowEventsDuringStartup = new WeakMap(), _preventLogin = new WeakMap(), _gatewayEvents = new WeakMap();
