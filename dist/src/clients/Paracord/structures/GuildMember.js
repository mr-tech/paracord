"use strict";
const { upsertCommon, camelToSnake } = require('./common');
const tmp_u_filter = ['username', 'discriminator', 'bot', 'system'].map(camelToSnake);
const tmp_g_filter = ['nick', 'premiumSince', 'joinedAt', 'deaf', 'mute'].map(camelToSnake);
const tmp_client = {};
tmp_client.filters = {
    user: Object.freeze({
        whitelist: true,
        properties: tmp_u_filter,
    }),
    guildMember: Object.freeze({
        whitelist: false,
        properties: tmp_g_filter,
        roles: false,
        user: true,
    }),
};
const USER_UPDATE_EVENTS = ['USER_UPDATE', 'GUILD_MEMBER_UPDATE'];
module.exports = (client) => {
    const { filter: { guildMember: guildMemberFilter } } = client;
    return class GuildMember {
        constructor(properties, guild) {
            this.user = undefined;
            this.nick = undefined;
            this.roles = undefined;
            this.joinedAt = undefined;
            this.premiumSince = undefined;
            this.upsert(properties, guild);
        }
        get id() {
            return this.user !== undefined ? this.user.id : undefined;
        }
        get tag() {
            return this.user !== undefined ? this.user.tag : undefined;
        }
        get avatarUrl() {
            return this.user !== undefined ? this.user.avatarUrl : undefined;
        }
        get createdOn() {
            return this.user !== undefined ? this.user.createdOn : undefined;
        }
        upsert(newProps, guild, event) {
            upsertCommon(this, guildMemberFilter, newProps);
            const user = newProps.user || newProps.author;
            if (user !== undefined) {
                this.assignUser(user, event);
                newProps.user = this.user;
            }
            if (newProps.author !== undefined) {
                newProps.author = this.user;
            }
            if (guild.roles !== undefined) {
                this.assignRoles(guild, newProps);
            }
        }
        assignUser(user, event) {
            if (this.user === undefined || USER_UPDATE_EVENTS.includes(event)) {
                this.user = new client.User(user);
            }
            else {
                this.user.upsert(user);
            }
        }
        assignRoles(guild, { roles }) {
            this.roles = roles.map((roleId) => guild.roles.get(roleId));
        }
    };
};
