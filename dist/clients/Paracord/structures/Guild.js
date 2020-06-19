"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _client, _roles, _emojis, _voiceStates, _members, _channels, _presences, _roleIds, _emojiIds, _memberIds, _channelIds, _throwOnAccess;
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const utils_1 = require("../../../utils");
const Base_1 = __importDefault(require("./Base"));
class Guild extends Base_1.default {
    constructor(guildData, client, shard) {
        var _a;
        super();
        _client.set(this, void 0);
        _roles.set(this, void 0);
        _emojis.set(this, void 0);
        _voiceStates.set(this, void 0);
        _members.set(this, void 0);
        _channels.set(this, void 0);
        _presences.set(this, void 0);
        _roleIds.set(this, void 0);
        _emojiIds.set(this, void 0);
        _memberIds.set(this, void 0);
        _channelIds.set(this, void 0);
        _throwOnAccess.set(this, void 0);
        __classPrivateFieldSet(this, _client, client);
        __classPrivateFieldSet(this, _throwOnAccess, true);
        this.shard = shard;
        ({ id: this.id } = guildData);
        this.unavailable = (_a = guildData.unavailable) !== null && _a !== void 0 ? _a : false;
        this.update(guildData);
    }
    get client() {
        return __classPrivateFieldGet(this, _client);
    }
    get channels() {
        const channels = __classPrivateFieldGet(this, _channels);
        if (channels === undefined)
            throw Error('channels are not cached');
        return channels;
    }
    get members() {
        if (__classPrivateFieldGet(this, _members) === undefined)
            throw Error('members are not cached');
        return __classPrivateFieldGet(this, _members);
    }
    get presences() {
        if (__classPrivateFieldGet(this, _presences) === undefined)
            throw Error('presences are not cached');
        return __classPrivateFieldGet(this, _presences);
    }
    get voiceStates() {
        if (__classPrivateFieldGet(this, _voiceStates) === undefined)
            throw Error('voiceStates are not cached');
        return __classPrivateFieldGet(this, _voiceStates);
    }
    get roles() {
        if (__classPrivateFieldGet(this, _roles) === undefined)
            throw Error('roles are not cached');
        return __classPrivateFieldGet(this, _roles);
    }
    get emojis() {
        if (__classPrivateFieldGet(this, _emojis) === undefined)
            throw Error('emojis are not cached');
        return __classPrivateFieldGet(this, _emojis);
    }
    get unsafe_channels() {
        return __classPrivateFieldGet(this, _channels);
    }
    get unsafe_members() {
        return __classPrivateFieldGet(this, _members);
    }
    get unsafe_presences() {
        return __classPrivateFieldGet(this, _presences);
    }
    get unsafe_voiceStates() {
        return __classPrivateFieldGet(this, _voiceStates);
    }
    get unsafe_roles() {
        return __classPrivateFieldGet(this, _roles);
    }
    get unsafe_emojis() {
        return __classPrivateFieldGet(this, _emojis);
    }
    get channelIds() {
        if (__classPrivateFieldGet(this, _channels) !== undefined) {
            return Array.from(__classPrivateFieldGet(this, _channels).keys());
        }
        if (this.isInProps('channels')) {
            return __classPrivateFieldGet(this, _channelIds);
        }
        if (!__classPrivateFieldGet(this, _throwOnAccess)) {
            return [];
        }
        throw Error('channels are not cached or in props');
    }
    get memberIds() {
        if (__classPrivateFieldGet(this, _members) !== undefined) {
            return Array.from(__classPrivateFieldGet(this, _members).keys());
        }
        if (this.isInProps('members')) {
            return __classPrivateFieldGet(this, _memberIds);
        }
        if (!__classPrivateFieldGet(this, _throwOnAccess)) {
            return [];
        }
        throw Error('members are not cached or in props');
    }
    get createdOn() {
        return utils_1.timestampFromSnowflake(this.id);
    }
    update(guildData) {
        const { channels, roles, emojis, members, voice_states, presences } = guildData, rest = __rest(guildData, ["channels", "roles", "emojis", "members", "voice_states", "presences"]);
        if (channels !== undefined) {
            if (__classPrivateFieldGet(this, _channels) !== undefined) {
                channels.forEach((c) => this.insertChannel(c));
            }
            else if (this.isInProps('channelIds')) {
                __classPrivateFieldSet(this, _channelIds, channels.map(({ id }) => id));
            }
        }
        if (roles !== undefined) {
            if (this.isCached('roles')) {
                roles.forEach((r) => this.upsertRole(r));
            }
            else if (this.isInProps('roleIds')) {
                __classPrivateFieldSet(this, _roleIds, roles.map(({ id }) => id));
            }
        }
        if (emojis !== undefined) {
            if (this.isCached('emojis')) {
                this.upsertEmojis(emojis);
            }
            else if (this.isInProps('emojiIds')) {
                __classPrivateFieldSet(this, _emojiIds, emojis.map(({ id }) => id));
            }
        }
        if (members !== undefined) {
            if (this.isCached('members')) {
                members.forEach((m) => this.upsertMember(m));
            }
            else if (this.isInProps('memberIds')) {
                __classPrivateFieldSet(this, _memberIds, members.map(({ user: { id } }) => id));
            }
        }
        if (voice_states !== undefined && this.isCached('voiceStates')) {
            voice_states.forEach((v) => this.upsertVoiceState(v));
        }
        if (presences !== undefined && this.isCached('presences')) {
            presences.forEach((p) => this.insertPresence(p));
        }
        super.update(rest);
        return this;
    }
    hasPermission(permission, member, adminOverride = true) {
        if (__classPrivateFieldGet(this, _roles) === undefined)
            throw Error('roles are not cached');
        const perms = utils_1.computeGuildPerms({ member, guild: this, stopOnOwnerAdmin: adminOverride });
        if (perms & constants_1.PERMISSIONS.ADMINISTRATOR && adminOverride) {
            return true;
        }
        return Boolean(perms & permission);
    }
    hasChannelPermission(permission, member, channel, stopOnOwnerAdmin = true) {
        var _a;
        if (__classPrivateFieldGet(this, _roles) === undefined)
            throw Error('roles are not cached');
        if (__classPrivateFieldGet(this, _channels) === undefined)
            throw Error('channels are not cached');
        if (typeof channel === 'string') {
            channel = (_a = __classPrivateFieldGet(this, _channels).get(channel)) !== null && _a !== void 0 ? _a : channel;
        }
        if (typeof channel === 'string') {
            throw Error('channel not found');
        }
        const perms = utils_1.computeChannelPerms({
            member, guild: this, channel, stopOnOwnerAdmin,
        });
        if (perms & constants_1.PERMISSIONS.ADMINISTRATOR && stopOnOwnerAdmin) {
            return true;
        }
        return Boolean(perms & permission);
    }
    insertChannel(channel) {
        const { id } = channel;
        const channels = __classPrivateFieldGet(this, _channels);
        if (channels !== undefined) {
            const guildChannel = this.cacheChannel(channels, id, channel);
            if (id === this.afkChannelId)
                this.afkChannel = guildChannel;
            if (id === this.rulesChannelId)
                this.rulesChannel = guildChannel;
            if (id === this.publicUpdatesChannelId)
                this.publicUpdatesChannel = guildChannel;
            if (id === this.systemChannelId)
                this.systemChannel = guildChannel;
            if (id === this.widgetChannelId)
                this.widgetChannel = guildChannel;
            return guildChannel;
        }
        const channelIds = __classPrivateFieldGet(this, _channelIds);
        if (channelIds !== undefined) {
            channelIds.push(id);
        }
        return undefined;
    }
    updateChannel(channel) {
        const { id } = channel;
        const channels = __classPrivateFieldGet(this, _channels);
        if (channels !== undefined) {
            const cachedChannel = channels.get(id);
            if (cachedChannel === undefined) {
                return this.cacheChannel(channels, id, channel);
            }
            return Object.assign(cachedChannel, channel);
        }
        const channelIds = __classPrivateFieldGet(this, _channelIds);
        if (channelIds !== undefined) {
            const idx = channelIds.indexOf(id);
            if (idx === -1) {
                channelIds.push(id);
            }
        }
        return undefined;
    }
    cacheChannel(channels, id, channel) {
        channel.guild = this;
        channels.set(id, channel);
        return channel;
    }
    removeChannel(id) {
        const channels = __classPrivateFieldGet(this, _channels);
        if (channels !== undefined) {
            const channel = channels.get(id);
            channels.delete(id);
            return channel;
        }
        const channelIds = __classPrivateFieldGet(this, _channelIds);
        if (channelIds !== undefined) {
            const idx = channelIds.indexOf(id);
            if (idx > -1) {
                channelIds.splice(idx, 1);
            }
        }
        return undefined;
    }
    upsertMember(member) {
        const { user, user: { id } } = member;
        const members = __classPrivateFieldGet(this, _members);
        if (members !== undefined) {
            const cachedMember = members.get(id);
            if (cachedMember === undefined) {
                return this.cacheMember(members, id, member);
            }
            return Object.assign(cachedMember, member);
        }
        const channelIds = __classPrivateFieldGet(this, _channelIds);
        if (channelIds !== undefined) {
            const idx = channelIds.indexOf(id);
            if (idx === -1) {
                channelIds.push(id);
            }
        }
        return undefined;
        const now = new Date().getTime();
        const readOnly = {
            get cachedTimestamp() {
                return now;
            },
        };
        member = Object.assign(Object.assign({}, member), readOnly);
        member.user = __classPrivateFieldGet(this, _client).upsertUser(user);
        const cachedMember = Object.assign(__classPrivateFieldGet(this, _members).get(id) || {}, member);
        __classPrivateFieldGet(this, _members).set(id, cachedMember);
        if (this.ownerId === id) {
            this.owner = cachedMember;
        }
        if (__classPrivateFieldGet(this, _client).user.id === id) {
            this.me = cachedMember;
        }
        return member;
    }
    cacheMember(members, id, member) {
        member.guild = this;
        members.set(id, member);
        return member;
    }
    upsertRole(role) {
        const roles = __classPrivateFieldGet(this, _roles);
        const { id } = role;
        const cachedRole = Object.assign(roles.get(id) || {}, role);
        roles.set(id, cachedRole);
        return cachedRole;
    }
    upsertEmojis(emojis) {
        const removedEmojis = Array.from(__classPrivateFieldGet(this, _emojis).values());
        while (emojis.length) {
            const emoji = emojis.shift();
            const { id } = emoji;
            const cachedEmoji = __classPrivateFieldGet(this, _emojis).get(id);
            Object.assign(cachedEmoji || {}, emoji);
            if (cachedEmoji !== undefined) {
                removedEmojis.splice(removedEmojis.indexOf(emoji), 1);
            }
            else {
                __classPrivateFieldGet(this, _emojis).set(id, emoji);
            }
        }
        return [emojis, removedEmojis];
    }
    upsertVoiceState(voiceState) {
        var _a;
        const { user_id: userId, member } = voiceState;
        const cachedMember = (_a = __classPrivateFieldGet(this, _members).get(userId)) !== null && _a !== void 0 ? _a : (member !== undefined ? this.upsertMember(member) : undefined);
        if (cachedMember !== undefined) {
            voiceState.member = cachedMember;
        }
        __classPrivateFieldGet(this, _voiceStates).set(userId, voiceState);
        return voiceState;
    }
    insertPresence(presence) {
        const cachedPresence = __classPrivateFieldGet(this, _client).updatePresences(presence);
        if (cachedPresence !== undefined) {
            __classPrivateFieldGet(this, _presences).set(cachedPresence.user.id, cachedPresence);
        }
        return presence;
    }
    setPresence(presence) {
        __classPrivateFieldGet(this, _presences).set(presence.user.id, presence);
    }
    deletePresence(userId) {
        __classPrivateFieldGet(this, _presences).delete(userId);
    }
}
exports.default = Guild;
_client = new WeakMap(), _roles = new WeakMap(), _emojis = new WeakMap(), _voiceStates = new WeakMap(), _members = new WeakMap(), _channels = new WeakMap(), _presences = new WeakMap(), _roleIds = new WeakMap(), _emojiIds = new WeakMap(), _memberIds = new WeakMap(), _channelIds = new WeakMap(), _throwOnAccess = new WeakMap();
