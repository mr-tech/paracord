"use strict";
const Utils = require('../../../utils');
const { PERMISSIONS: P } = require('../../../constants');
module.exports = class Guild {
    constructor(guildData, client, shard) {
        this.members;
        this.channels;
        this.presences;
        this.roles;
        this.voiceStates;
        this.unavailable;
        this.owner;
        this.me;
        this.created_on;
        this._shard;
        this.constructorDefaults(guildData, client, shard);
    }
    get shard() {
        return this._shard;
    }
    constructorDefaults(guildData, client, shard) {
        const defaults = {
            members: new Map(),
            channels: new Map(),
            presences: new Map(),
            voiceStates: new Map(),
            roles: new Map(),
            unavailable: false,
        };
        Object.assign(this, defaults);
        this._shard = shard;
        this.constructGuildFromData(guildData, client);
    }
    constructGuildFromData(guildData, client) {
        if (!guildData.unavailable) {
            this.unavailable = false;
            Utils.assignCreatedOn(guildData);
            this.assignFromGuildCreate(guildData, client);
            this.owner = this.members.get(guildData.owner_id);
            if (this.me === undefined) {
                this.me = this.members.get(client.user.id);
                if (this.me === undefined) {
                    console.log('This message is intentional and is made to appear when a guild is created but the bot user was not included in the initial member list.');
                }
            }
        }
        else {
            guildData.unavailable = true;
        }
        Object.assign(this, guildData);
        return this;
    }
    assignFromGuildCreate(guildData, client) {
        if (guildData.channels !== undefined) {
            guildData.channels.forEach((c) => this.upsertChannel(c));
            delete guildData.channels;
        }
        if (guildData.roles !== undefined) {
            guildData.roles.forEach((r) => this.upsertRole(r));
            delete guildData.roles;
        }
        if (guildData.members !== undefined) {
            guildData.members.forEach((m) => this.upsertMember(m, client));
            delete guildData.members;
        }
        if (guildData.voice_states !== undefined) {
            guildData.voice_states.forEach((v) => this.upsertVoiceState(v, client));
        }
        if (guildData.presences !== undefined) {
            this.presences = Guild.mapPresences(guildData.presences, client);
            delete guildData.presences;
        }
    }
    hasPermission(permission, member, adminOverride = true) {
        const perms = Utils.computeGuildPerms(member, this, adminOverride);
        if (perms & P.ADMINISTRATOR && adminOverride) {
            return true;
        }
        return Boolean(perms & permission);
    }
    hasChannelPermission(permission, member, channel, adminOverride = true) {
        if (typeof channel === 'string') {
            channel = this.channels.get(channel);
        }
        const perms = Utils.computeChannelPerms(member, this, channel.adminOverride);
        if (perms & P.ADMINISTRATOR && adminOverride) {
            return true;
        }
        return Boolean(perms & permission);
    }
    upsertChannel(channel) {
        const { channels } = this;
        Utils.assignCreatedOn(channel);
        const cachedChannel = Object.assign(channels.get(channel.id) || {}, channel);
        channels.set(channel.id, cachedChannel);
        cachedChannel.guild_id = this.id;
        return cachedChannel;
    }
    upsertRole(role) {
        const { roles } = this;
        Utils.assignCreatedOn(role);
        const cachedRole = Object.assign(roles.get(role.id) || {}, role);
        roles.set(role.id, cachedRole);
        return cachedRole;
    }
    upsertVoiceState(voiceState, client) {
        const { voiceStates } = this;
        let member;
        if (voiceState.member !== undefined) {
            member = this.members.get(voiceState.member.user.id);
            if (member === undefined) {
                member = this.upsertMember(voiceState.member, client);
            }
        }
        if (member === undefined) {
            member = this.members.get(voiceState.user_id);
        }
        voiceState.member = member;
        voiceStates.set(voiceState.user_id, voiceState);
        return voiceState;
    }
    static mapPresences(presences, client) {
        const presenceMap = new Map();
        presences.forEach((p) => {
            const cachedPresence = client.updatePresences(p);
            if (cachedPresence !== undefined) {
                presenceMap.set(cachedPresence.user.id, cachedPresence);
            }
        });
        return presenceMap;
    }
    setPresence(presence) {
        this.presences.set(presence.user.id, presence);
    }
    deletePresence(userId) {
        this.presences.delete(userId);
    }
    static mapMembers(members, guild, client) {
        members.forEach((m) => guild.upsertMember(m, client));
    }
    upsertMember(member, client) {
        const now = new Date().getTime();
        const readOnly = {
            get cachedTimestamp() {
                return now;
            },
        };
        member = Object.assign(Object.assign({}, member), readOnly);
        member.user = client.upsertUser(member.user);
        const cachedMember = this.members.get(member.user.id);
        if (cachedMember !== undefined) {
            member = Object.assign(cachedMember, member);
        }
        else {
            this.members.set(member.user.id, member);
        }
        if (this.owner_id === member.user.id) {
            this.owner = cachedMember;
        }
        return member;
    }
};
