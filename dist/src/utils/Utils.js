"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignCreatedOn = exports.uuid = exports.bindFunctionsFromFile = exports.constructGuildIcon = exports.constructUserTag = exports.constructUserAvatarUrl = exports._memberOverwrites = exports._roleOverwrites = exports._everyoneOverwrites = exports.computeChannelOverwrites = exports.computeGuildPerms = exports.computeChannelPerms = exports.coerceTokenToBotLike = exports.timestampFromSnowflake = exports.millisecondsFromNow = exports.timestampNMillisecondsInFuture = exports.timestampNSecondsInFuture = exports.clone = void 0;
const { DISCORD_EPOCH, PERMISSIONS: P, DISCORD_CDN_URL, SECOND_IN_MILLISECONDS, } = require('../constants');
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}
exports.clone = clone;
function timestampNSecondsInFuture(seconds) {
    return new Date().getTime() + (Number(seconds) * SECOND_IN_MILLISECONDS);
}
exports.timestampNSecondsInFuture = timestampNSecondsInFuture;
function timestampNMillisecondsInFuture(milliseconds) {
    return new Date().getTime() + Number(milliseconds);
}
exports.timestampNMillisecondsInFuture = timestampNMillisecondsInFuture;
function millisecondsFromNow(timestamp) {
    return Number(timestamp) - new Date().getTime();
}
exports.millisecondsFromNow = millisecondsFromNow;
function timestampFromSnowflake(snowflake) {
    const bits = BigInt(snowflake)
        .toString(2)
        .padStart(64, '0');
    return parseInt(bits.substring(0, 42), 2) + DISCORD_EPOCH;
}
exports.timestampFromSnowflake = timestampFromSnowflake;
function coerceTokenToBotLike(token) {
    if (!token.startsWith('Bot '))
        return `Bot ${token}`;
    return token;
}
exports.coerceTokenToBotLike = coerceTokenToBotLike;
function computeChannelPerms(member, guild, channel, stopOnOwnerAdmin = false) {
    const guildPerms = computeGuildPerms(member, guild, stopOnOwnerAdmin);
    if (stopOnOwnerAdmin && guildPerms & P.ADMINISTRATOR) {
        return P.ADMINISTRATOR;
    }
    return computeChannelOverwrites(guildPerms, member, guild, channel);
}
exports.computeChannelPerms = computeChannelPerms;
function computeGuildPerms(member, guild, stopOnOwnerAdmin = false) {
    if (stopOnOwnerAdmin && guild.owner_id === member.user.id) {
        return P.ADMINISTRATOR;
    }
    const { roles } = guild;
    let perms = roles.get(guild.id).permissions;
    for (const id of member.roles) {
        const role = roles.get(id);
        if (role !== undefined) {
            if ((role.permissions & P.ADMINISTRATOR) !== 0) {
                return P.ADMINISTRATOR;
            }
            perms |= role.permissions;
        }
    }
    return perms;
}
exports.computeGuildPerms = computeGuildPerms;
function computeChannelOverwrites(perms, member, guild, channel) {
    const { permission_overwrites: overwrites } = channel;
    perms = _everyoneOverwrites(perms, overwrites, guild.id);
    perms = _roleOverwrites(perms, overwrites, member.roles);
    perms = _memberOverwrites(perms, overwrites, member.user.id);
    return perms;
}
exports.computeChannelOverwrites = computeChannelOverwrites;
function _everyoneOverwrites(perms, overwrites, guildId) {
    for (const o of overwrites) {
        if (o.type === 'role' && o.id === guildId) {
            perms |= o.allow;
            perms &= ~o.deny;
            break;
        }
    }
    return perms;
}
exports._everyoneOverwrites = _everyoneOverwrites;
function _roleOverwrites(perms, overwrites, roles) {
    for (const o of overwrites) {
        if (o.type === 'role' && roles.has(o.id)) {
            perms |= o.allow;
            perms &= ~o.deny;
        }
    }
    return perms;
}
exports._roleOverwrites = _roleOverwrites;
function _memberOverwrites(perms, overwrites, memberId) {
    for (const o of overwrites) {
        if (o.type === 'member' && o.id === memberId) {
            perms |= o.allow;
            perms &= ~o.deny;
            break;
        }
    }
    return perms;
}
exports._memberOverwrites = _memberOverwrites;
function constructUserAvatarUrl(user, fileType = '') {
    if (user.avatar === null || user.avatar === undefined) {
        return `${DISCORD_CDN_URL}/embed/avatars/${Number(user.discriminator)
            % 5}${fileType ? `.${fileType}` : ''}`;
    }
    if (user.avatar.startsWith('a_')) {
        return `${DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
    }
    return `${DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
}
exports.constructUserAvatarUrl = constructUserAvatarUrl;
function constructUserTag(user) {
    return `${user.username}#${user.discriminator}`;
}
exports.constructUserTag = constructUserTag;
function constructGuildIcon(guild, fileType = '') {
    if (guild.icon.startsWith('a_')) {
        return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
    }
    return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
}
exports.constructGuildIcon = constructGuildIcon;
function bindFunctionsFromFile(obj, funcs) {
    for (const prop of Object.getOwnPropertyNames(funcs)) {
        if (typeof funcs[prop] === 'function') {
            obj[prop] = funcs[prop].bind(obj);
        }
    }
}
exports.bindFunctionsFromFile = bindFunctionsFromFile;
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuid = uuid;
function assignCreatedOn(obj) {
    if (obj.created_on === undefined) {
        obj.created_on = timestampFromSnowflake(obj.id);
    }
}
exports.assignCreatedOn = assignCreatedOn;
