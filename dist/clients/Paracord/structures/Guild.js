"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const Utils_1 = require("../../../Utils");
class Guild {
    constructor(guildCreate, client, shard) {
        var _a;
        this.members = new Map();
        this.channels = new Map();
        this.presences = new Map();
        this.voiceStates = new Map();
        this.roles = new Map();
        this.emojis = new Map();
        this.unavailable = (_a = guildCreate.unavailable) !== null && _a !== void 0 ? _a : false;
        this.shard = shard;
        this.mergeGuildData(guildCreate, client);
        if (this.members !== undefined && this.me === undefined) {
            this.me = this.members.get(client.user.id);
            if (this.me === undefined) {
                console.log('This message is intentional and is made to appear when a guild is created but the bot user was not included in the initial member list.');
            }
        }
    }
    get createdOn() {
        return Utils_1.timestampFromSnowflake(this.id);
    }
    mergeGuildData(guildData, client) {
        if (guildData.channels !== undefined && this.channels !== undefined) {
            guildData.channels.forEach((c) => this.upsertChannel(c));
            delete guildData.channels;
        }
        if (guildData.roles !== undefined) {
            guildData.roles.forEach((r) => this.upsertRole(r));
            delete guildData.roles;
        }
        if (guildData.emojis !== undefined) {
            guildData.emojis.forEach((e) => this.upsertEmoji(e));
            delete guildData.emojis;
        }
        if (guildData.members !== undefined) {
            guildData.members.forEach((m) => this.upsertMember(m, client));
            delete guildData.members;
        }
        if (guildData.voiceStates !== undefined) {
            guildData.voiceStates.forEach((v) => this.upsertVoiceState(v, client));
            delete guildData.voiceStates;
        }
        if (guildData.presences !== undefined) {
            guildData.presences.forEach((p) => this.upsertPresence(p, client));
            delete guildData.presences;
        }
        Object.assign(this, guildData);
        return this;
    }
    hasPermission(permission, member, adminOverride = true) {
        const perms = Utils_1.computeGuildPerms({ member, guild: this, stopOnOwnerAdmin: adminOverride });
        if (perms & constants_1.PERMISSIONS.ADMINISTRATOR && adminOverride) {
            return true;
        }
        return Boolean(perms & permission);
    }
    hasChannelPermission(permission, member, channel, stopOnOwnerAdmin = true) {
        var _a;
        if (typeof channel === 'string') {
            channel = (_a = this.channels.get(channel)) !== null && _a !== void 0 ? _a : channel;
        }
        if (typeof channel === 'string') {
            throw Error('channel not found');
        }
        const perms = Utils_1.computeChannelPerms({
            member, guild: this, channel, stopOnOwnerAdmin,
        });
        if (perms & constants_1.PERMISSIONS.ADMINISTRATOR && stopOnOwnerAdmin) {
            return true;
        }
        return Boolean(perms & permission);
    }
    upsertChannel(channel) {
        const { channels } = this;
        const cachedChannel = Object.assign(channels.get(channel.id) || {}, channel);
        channels.set(channel.id, cachedChannel);
        cachedChannel.guildId = this.id;
        return cachedChannel;
    }
    upsertRole(role) {
        const { roles } = this;
        const cachedRole = Object.assign(roles.get(role.id) || {}, role);
        roles.set(role.id, cachedRole);
        return cachedRole;
    }
    upsertEmoji(emoji) {
        const { emojis } = this;
        const cachedEmoji = Object.assign(emojis.get(emoji.id) || {}, emoji);
        emojis.set(emoji.id, cachedEmoji);
        return cachedEmoji;
    }
    upsertMember(member, client) {
        const { user } = member;
        const now = new Date().getTime();
        const readOnly = {
            get cachedTimestamp() {
                return now;
            },
        };
        member = Object.assign(Object.assign({}, member), readOnly);
        member.user = client.upsertUser(user);
        const { members } = this;
        const cachedMember = Object.assign(members.get(user.id) || {}, member);
        members.set(user.id, cachedMember);
        if (this.ownerId === user.id) {
            this.owner = cachedMember;
        }
        return member;
    }
    upsertVoiceState(voiceState, client) {
        var _a;
        const member = (_a = this.members.get(voiceState.userId)) !== null && _a !== void 0 ? _a : this.upsertMember(voiceState.member, client);
        voiceState.member = member;
        const { voiceStates } = this;
        voiceStates.set(voiceState.userId, voiceState);
        return voiceState;
    }
    upsertPresence(presence, client) {
        const { presences } = this;
        const cachedPresence = client.updatePresences(presence);
        if (cachedPresence !== undefined) {
            presences.set(cachedPresence.user.id, cachedPresence);
        }
        return presence;
    }
    setPresence(presence) {
        this.presences.set(presence.user.id, presence);
    }
    deletePresence(userId) {
        this.presences.delete(userId);
    }
}
exports.default = Guild;
