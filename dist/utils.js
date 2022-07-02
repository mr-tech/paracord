"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripLeadingSlash = exports.isApiError = exports.isObject = exports.constructGuildIcon = exports.constructUserAvatarUrl = exports.computeGuildPerms = exports.computeChannelPerms = exports.coerceTokenToBotLike = exports.timestampFromSnowflake = exports.millisecondsFromNow = exports.timestampNMillisecondsInFuture = exports.timestampNSecondsInFuture = exports.clone = void 0;
const constants_1 = require("./constants");
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
    const now = new Date().getTime();
    return timestamp < now ? -1 : timestamp - now;
}
exports.millisecondsFromNow = millisecondsFromNow;
function timestampFromSnowflake(snowflake) {
    const bits = BigInt(snowflake).toString(2).padStart(64, '0');
    return parseInt(bits.substring(0, 42), 2) + constants_1.DISCORD_EPOCH;
}
exports.timestampFromSnowflake = timestampFromSnowflake;
function coerceTokenToBotLike(token) {
    if (!token.startsWith('Bot '))
        return `Bot ${token}`;
    return token;
}
exports.coerceTokenToBotLike = coerceTokenToBotLike;
function computeChannelPerms({ member, guild, channel, stopOnOwnerAdmin = true, }) {
    const guildPerms = computeGuildPerms({ member, guild, stopOnOwnerAdmin });
    if (stopOnOwnerAdmin && guildPerms & constants_1.PERMISSIONS.ADMINISTRATOR) {
        return constants_1.PERMISSIONS.ADMINISTRATOR;
    }
    return computeChannelOverwrites(guildPerms, member, guild, channel);
}
exports.computeChannelPerms = computeChannelPerms;
function computeGuildPerms({ member, guild, stopOnOwnerAdmin = true }) {
    const { roles: guildRoles } = guild;
    if (guildRoles === undefined)
        throw Error('roles not cached for this guild');
    if (member.roles === undefined)
        throw Error('no roles on member object');
    const memberRoles = [];
    for (const id of member.roles) {
        const role = guildRoles.find(({ id: gId }) => id === gId);
        if (role)
            memberRoles.push(role);
    }
    if (stopOnOwnerAdmin && guild.owner_id === member.user.id) {
        return constants_1.PERMISSIONS.ADMINISTRATOR;
    }
    const everyone = guildRoles.find(({ id }) => id === guild.id);
    if (everyone === undefined)
        throw Error('no everyone role for this guild');
    if (everyone.permissions === undefined)
        throw Error('permissions are not cached on roles');
    let perms = BigInt(everyone.permissions);
    for (const role of memberRoles) {
        perms |= BigInt(role.permissions);
    }
    return perms;
}
exports.computeGuildPerms = computeGuildPerms;
function computeChannelOverwrites(perms, member, guild, channel) {
    const { permission_overwrites: overwrites } = channel;
    if (overwrites === undefined)
        throw Error('no overwrites on channel object');
    const { roles: memberRoles } = member;
    if (memberRoles === undefined)
        throw Error('no roles on member object');
    const roleOverwrites = [];
    const memberOverwrites = [];
    overwrites.forEach((o) => {
        if (o.type === constants_1.OVERWRITE_ROLE_VALUE) {
            if (o.id === guild.id) {
                perms = _applyEveryoneOverwrites(perms, o);
            }
            else if (memberRoles.includes(o.id)) {
                roleOverwrites.push(o);
            }
        }
        else if (o.id === member.user.id) {
            memberOverwrites.push(o);
        }
    });
    perms = _applyOverwrites(perms, roleOverwrites);
    perms = _applyOverwrites(perms, memberOverwrites);
    return perms;
}
function _applyEveryoneOverwrites(perms, overwrite) {
    perms &= ~BigInt(overwrite.deny);
    perms |= BigInt(overwrite.allow);
    return perms;
}
function _applyOverwrites(perms, overwrites) {
    let deny = BigInt(0);
    let allow = BigInt(0);
    for (const o of overwrites) {
        deny |= BigInt(o.deny);
        allow |= BigInt(o.allow);
    }
    perms &= ~deny;
    perms |= allow;
    return perms;
}
function constructUserAvatarUrl(user, { fileType = 'jpg', animate = false } = {}) {
    if (user.avatar === null) {
        return `${constants_1.DISCORD_CDN_URL}/embed/avatars/${Number(user.discriminator) % 5}.${fileType}`;
    }
    if (animate && user.avatar.startsWith('a_') && fileType && fileType !== 'webp') {
        fileType = 'gif';
    }
    return `${constants_1.DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
}
exports.constructUserAvatarUrl = constructUserAvatarUrl;
function constructGuildIcon(guild, fileType = '') {
    if (guild.icon_hash === null || guild.icon_hash === undefined)
        return undefined;
    if (guild.icon_hash.startsWith('a_')) {
        return `${constants_1.DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon_hash}${fileType ? `.${fileType}` : ''}`;
    }
    return `${constants_1.DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon_hash}${fileType ? `.${fileType}` : ''}`;
}
exports.constructGuildIcon = constructGuildIcon;
function isObject(v) {
    return (v !== null) && (typeof v === 'object') && (v?.constructor.name === 'Object');
}
exports.isObject = isObject;
function isApiError(val) {
    return typeof val === 'object' && val !== null && val.isApiError === true;
}
exports.isApiError = isApiError;
function stripLeadingSlash(url) {
    return url.startsWith('/') ? url.slice(1) : url;
}
exports.stripLeadingSlash = stripLeadingSlash;
