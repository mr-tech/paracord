"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GATEWAY_CLOSE = exports.GATEWAY_IDENTIFY = exports.GUILD_DELETE = exports.GUILD_UPDATE = exports.GUILD_CREATE = exports.GUILD_ROLE_DELETE = exports.GUILD_ROLE_UPDATE = exports.GUILD_ROLE_CREATE = exports.CHANNEL_DELETE = exports.CHANNEL_UPDATE = exports.CHANNEL_CREATE = exports.GUILD_MEMBERS_CHUNK = exports.GUILD_MEMBER_REMOVE = exports.GUILD_MEMBER_UPDATE = exports.GUILD_MEMBER_ADD = exports.VOICE_STATE_UPDATE = exports.MESSAGE_CREATE = exports.USER_UPDATE = exports.PRESENCE_UPDATE = exports.READY = void 0;
const constants_1 = require("../../constants");
const { DM, GROUP_DM } = constants_1.CHANNEL_TYPES;
function READY(data, shard) {
    this.handleReady(data, shard);
    return data;
}
exports.READY = READY;
function PRESENCE_UPDATE(data) {
    const { guildId } = data;
    if (guildId !== undefined) {
        const guild = this.guilds.get(guildId);
        this.handlePresence({ guild, presence: data });
    }
    return data;
}
exports.PRESENCE_UPDATE = PRESENCE_UPDATE;
function USER_UPDATE(data) {
    return this.upsertUser(data);
}
exports.USER_UPDATE = USER_UPDATE;
function MESSAGE_CREATE(data) {
    const { guildId, member, author } = data;
    if (guildId !== undefined) {
        const guild = this.guilds.get(guildId);
        if (guild !== undefined && member !== undefined) {
            member.user = data.author;
            data.member = this.cacheMemberFromEvent(guild, member);
            data.author = member.user;
        }
        this.users.get(author.id);
    }
    else {
        const user = this.users.get(author.id);
        if (user !== undefined) {
            data.author = user;
        }
    }
    return data;
}
exports.MESSAGE_CREATE = MESSAGE_CREATE;
function VOICE_STATE_UPDATE(data) {
    const { guildId, member, userId, channelId, } = data;
    if (guildId === undefined)
        return data;
    const guild = this.guilds.get(guildId);
    if (guild !== undefined) {
        member !== undefined && this.cacheMemberFromEvent(guild, member);
        if (channelId !== null) {
            return guild.upsertVoiceState(data, this);
        }
        guild.voiceStates.delete(userId);
    }
    return data;
}
exports.VOICE_STATE_UPDATE = VOICE_STATE_UPDATE;
function GUILD_MEMBER_ADD(data) {
    const guild = this.guilds.get(data.guildId);
    if (guild) {
        guild.memberCount !== undefined && ++guild.memberCount;
        return guild.upsertMember(data, this);
    }
    return data;
}
exports.GUILD_MEMBER_ADD = GUILD_MEMBER_ADD;
function GUILD_MEMBER_UPDATE(data) {
    const { guildId } = data;
    const guild = this.guilds.get(guildId);
    if (guild) {
        return guild.upsertMember(data, this);
    }
    return data;
}
exports.GUILD_MEMBER_UPDATE = GUILD_MEMBER_UPDATE;
function GUILD_MEMBER_REMOVE({ guildId, user }) {
    const guild = this.guilds.get(guildId);
    let member = { user };
    if (guild) {
        guild.memberCount !== undefined && --guild.memberCount;
        member = guild.members.get(user.id) || member;
        guild.members.delete(user.id);
        guild.presences.delete(user.id);
    }
    return member;
}
exports.GUILD_MEMBER_REMOVE = GUILD_MEMBER_REMOVE;
function GUILD_MEMBERS_CHUNK(data) {
    const { notFound, guildId, presences, members, } = data;
    if (notFound)
        return data;
    const guild = this.guilds.get(guildId);
    if (presences !== undefined)
        data.presences = presences.map((p) => this.handlePresence({ guild, presence: p }));
    if (guild !== undefined) {
        data.members = members.map((m) => this.cacheMemberFromEvent(guild, m));
    }
    return data;
}
exports.GUILD_MEMBERS_CHUNK = GUILD_MEMBERS_CHUNK;
function CHANNEL_CREATE(data) {
    var _a;
    const { type, guildId } = data;
    if (type !== DM || type !== GROUP_DM || guildId === undefined)
        return data;
    const guild = this.guilds.get(guildId);
    return (_a = guild === null || guild === void 0 ? void 0 : guild.upsertChannel(data)) !== null && _a !== void 0 ? _a : data;
}
exports.CHANNEL_CREATE = CHANNEL_CREATE;
function CHANNEL_UPDATE(data) {
    var _a;
    const { type, guildId } = data;
    if (type !== DM || type !== GROUP_DM || guildId === undefined)
        return data;
    const guild = this.guilds.get(guildId);
    return (_a = guild === null || guild === void 0 ? void 0 : guild.upsertChannel(data)) !== null && _a !== void 0 ? _a : data;
}
exports.CHANNEL_UPDATE = CHANNEL_UPDATE;
function CHANNEL_DELETE(data) {
    var _a;
    const { type, guildId } = data;
    if (type !== DM || type !== GROUP_DM || guildId === undefined)
        return data;
    let channel = data;
    const guild = this.guilds.get(guildId);
    if (guild !== undefined) {
        channel = (_a = guild.channels.get(guildId)) !== null && _a !== void 0 ? _a : channel;
        guild.channels.delete(guildId);
    }
    else {
        this.log('WARNING', `CHANNEL_DELETE received without guild in cache. guildId: ${guildId} | channel.id: ${channel.id}`);
    }
    return channel;
}
exports.CHANNEL_DELETE = CHANNEL_DELETE;
function GUILD_ROLE_CREATE({ guildId, role: data }) {
    var _a;
    const guild = this.guilds.get(guildId);
    return (_a = guild === null || guild === void 0 ? void 0 : guild.upsertRole(data)) !== null && _a !== void 0 ? _a : data;
}
exports.GUILD_ROLE_CREATE = GUILD_ROLE_CREATE;
function GUILD_ROLE_UPDATE({ guildId, role: data }) {
    var _a;
    const guild = this.guilds.get(guildId);
    return (_a = guild === null || guild === void 0 ? void 0 : guild.upsertRole(data)) !== null && _a !== void 0 ? _a : data;
}
exports.GUILD_ROLE_UPDATE = GUILD_ROLE_UPDATE;
function GUILD_ROLE_DELETE({ guildId, roleId }) {
    const guild = this.guilds.get(guildId);
    let role;
    if (guild !== undefined) {
        role = guild.roles.get(roleId);
        guild.roles.delete(roleId);
    }
    else {
        this.log('WARNING', `GUILD_ROLE_DELETE received without guild in cache. guildId: ${guildId} | roleId: ${roleId}`);
    }
    return role;
}
exports.GUILD_ROLE_DELETE = GUILD_ROLE_DELETE;
function GUILD_CREATE(data, shard) {
    return this.upsertGuild(data, shard);
}
exports.GUILD_CREATE = GUILD_CREATE;
function GUILD_UPDATE(data) {
    return this.upsertGuild(data);
}
exports.GUILD_UPDATE = GUILD_UPDATE;
function GUILD_DELETE(data) {
    const guild = this.guilds.get(data.id);
    if (guild !== undefined) {
        if (!data.unavailable) {
            this.guilds.delete(data.id);
            return guild;
        }
        guild.unavailable = true;
        return guild;
    }
    this.log('WARNING', `Received GUILD_DELETE event for uncached guild. Id: ${data.id}`);
    return undefined;
}
exports.GUILD_DELETE = GUILD_DELETE;
function GATEWAY_IDENTIFY(gateway) {
    this.safeGatewayIdentifyTimestamp = new Date().getTime() + (6 * constants_1.SECOND_IN_MILLISECONDS);
    for (const guild of this.guilds.values()) {
        if (guild.shard === gateway.id) {
            this.guilds.delete(guild.id);
        }
    }
}
exports.GATEWAY_IDENTIFY = GATEWAY_IDENTIFY;
function GATEWAY_CLOSE({ gateway, shouldReconnect }) {
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
}
exports.GATEWAY_CLOSE = GATEWAY_CLOSE;
