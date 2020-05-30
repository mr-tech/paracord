"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnCreatedOn = exports.createUnsafeUuid = exports.constructGuildIcon = exports.constructUserAvatarUrl = exports.computeChannelOverwrites = exports.computeGuildPerms = exports.computeChannelPerms = exports.coerceTokenToBotLike = exports.timestampFromSnowflake = exports.millisecondsFromNow = exports.timestampNMillisecondsInFuture = exports.timestampNSecondsInFuture = exports.clone = void 0;
const constants_1 = require("../constants");
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}
exports.clone = clone;
function timestampNSecondsInFuture(seconds) {
    return new Date().getTime() + (Number(seconds) * constants_1.SECOND_IN_MILLISECONDS);
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
    return parseInt(bits.substring(0, 42), 2) + constants_1.DISCORD_EPOCH;
}
exports.timestampFromSnowflake = timestampFromSnowflake;
function coerceTokenToBotLike(token) {
    if (!token.startsWith('Bot '))
        return `Bot ${token}`;
    return token;
}
exports.coerceTokenToBotLike = coerceTokenToBotLike;
function computeChannelPerms(member, guild, channel, stopOnOwnerAdmin = false) {
    const { roles: guildRoles } = guild;
    const { roles: memberRoles } = member;
    if (guildRoles === undefined || memberRoles === undefined)
        throw Error('roles not cached for this guild');
    const guildPerms = computeGuildPerms(member, guild, stopOnOwnerAdmin);
    if (stopOnOwnerAdmin && guildPerms & constants_1.PERMISSIONS.ADMINISTRATOR) {
        return constants_1.PERMISSIONS.ADMINISTRATOR;
    }
    return computeChannelOverwrites(guildPerms, member, guild, channel);
}
exports.computeChannelPerms = computeChannelPerms;
function computeGuildPerms(member, guild, stopOnOwnerAdmin = false) {
    const { roles: guildRoles } = guild;
    const { roles: memberRoles } = member;
    if (guildRoles === undefined || memberRoles === undefined)
        throw Error('roles not cached for this guild');
    if (stopOnOwnerAdmin && guild.ownerId === member.user.id) {
        return constants_1.PERMISSIONS.ADMINISTRATOR;
    }
    const everyone = guildRoles.get(guild.id);
    if (everyone === undefined)
        throw Error('roles not cached for this guild');
    let perms = everyone.permissions;
    for (const role of memberRoles.values()) {
        if ((role.permissions & constants_1.PERMISSIONS.ADMINISTRATOR) !== 0) {
            return constants_1.PERMISSIONS.ADMINISTRATOR;
        }
        perms |= role.permissions;
    }
    return perms;
}
exports.computeGuildPerms = computeGuildPerms;
function computeChannelOverwrites(perms, member, guild, channel) {
    const { permissionOverwrites: overwrites } = channel;
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
function _roleOverwrites(perms, overwrites, roles) {
    for (const o of overwrites) {
        if (o.type === 'role' && roles.has(o.id)) {
            perms |= o.allow;
            perms &= ~o.deny;
        }
    }
    return perms;
}
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
function constructUserAvatarUrl(user, fileType = '') {
    if (user.avatar === null || user.avatar === undefined) {
        return `${constants_1.DISCORD_CDN_URL}/embed/avatars/${Number(user.discriminator)
            % 5}${fileType ? `.${fileType}` : ''}`;
    }
    if (user.avatar.startsWith('a_')) {
        return `${constants_1.DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
    }
    return `${constants_1.DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
}
exports.constructUserAvatarUrl = constructUserAvatarUrl;
function constructGuildIcon(guild, fileType = '') {
    if (guild.icon.startsWith('a_')) {
        return `${constants_1.DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
    }
    return `${constants_1.DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
}
exports.constructGuildIcon = constructGuildIcon;
function createUnsafeUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.createUnsafeUuid = createUnsafeUuid;
function returnCreatedOn(resource) {
    return timestampFromSnowflake(resource.id);
}
exports.returnCreatedOn = returnCreatedOn;
