"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortMethod = exports.stripLeadingSlash = exports.isApiError = exports.isObject = exports.constructGuildIcon = exports.constructUserAvatarUrl = exports.computeGuildPerms = exports.computeChannelPerms = exports.coerceTokenToBotLike = exports.timestampFromSnowflake = exports.millisecondsFromNow = exports.timestampNMillisecondsInFuture = exports.timestampNSecondsInFuture = exports.clone = void 0;
const constants_1 = require("./constants");
const discord_1 = require("./discord");
/**
 * Returns a new object that is a clone of the original.
 * @param object Object to clone.
 */
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}
exports.clone = clone;
/**
 * Returns a timestamp of some time in the future.
 * @param seconds Number of seconds from now to base the timestamp on.
 */
function timestampNSecondsInFuture(seconds) {
    return new Date().getTime() + (Number(seconds) * constants_1.SECOND_IN_MILLISECONDS);
}
exports.timestampNSecondsInFuture = timestampNSecondsInFuture;
/**
 * Returns a timestamp of some time in the future.
 * @param milliseconds Number of milliseconds from now to base the timestamp on.
 */
function timestampNMillisecondsInFuture(milliseconds) {
    return new Date().getTime() + Number(milliseconds);
}
exports.timestampNMillisecondsInFuture = timestampNMillisecondsInFuture;
/**
 * Returns a timestamp of some time in the future. -1 if provide timestamp has already passed
 * @param timestamp Unix timestamp.
 */
function millisecondsFromNow(timestamp) {
    const now = new Date().getTime();
    return timestamp < now ? -1 : timestamp - now;
}
exports.millisecondsFromNow = millisecondsFromNow;
/**
 * Extract a timestamp from a Discord snowflake.
 * @param snowflake Discord snowflake.
 */
function timestampFromSnowflake(snowflake) {
    const bits = BigInt(snowflake).toString(2).padStart(64, '0');
    return parseInt(bits.substring(0, 42), 2) + constants_1.DISCORD_EPOCH;
}
exports.timestampFromSnowflake = timestampFromSnowflake;
/**
 * This is a bot library. Coerced non-compliant tokens to be bot-like.
 * @param token Discord token.
 */
function coerceTokenToBotLike(token) {
    if (!token.startsWith('Bot '))
        return `Bot ${token}`;
    return token;
}
exports.coerceTokenToBotLike = coerceTokenToBotLike;
/**
 * Compute a member's channel-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param channel Channel in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms.
 */
function computeChannelPerms({ member, guild, channel, stopOnOwnerAdmin = true, }) {
    const guildPerms = computeGuildPerms({ member, guild, stopOnOwnerAdmin });
    if (stopOnOwnerAdmin && guildPerms & discord_1.PERMISSIONS.ADMINISTRATOR) {
        return discord_1.PERMISSIONS.ADMINISTRATOR;
    }
    return computeChannelOverwrites(guildPerms, member, guild, channel);
}
exports.computeChannelPerms = computeChannelPerms;
/**
 * Compute a member's guild-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms in BigInt form.
 */
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
        return discord_1.PERMISSIONS.ADMINISTRATOR;
    }
    const everyone = guildRoles.find(({ id }) => id === guild.id);
    if (everyone === undefined)
        throw Error('no everyone role for this guild'); // should never trigger
    if (everyone.permissions === undefined)
        throw Error('permissions are not cached on roles');
    // start with @everyone perms
    let perms = BigInt(everyone.permissions);
    for (const role of memberRoles) {
        perms |= BigInt(role.permissions);
    }
    return perms;
}
exports.computeGuildPerms = computeGuildPerms;
/**
 * Compute the channel's overriding permissions against the member's channel-level permissions.
 * @param perms GuildMember's channel-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param channel Channel in which to check the member's permissions.
 * @returns The new perms.
 */
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
/**
 * When computing channel overwrites, applies the "@everyone" overwrite.
 * @param perms GuildMember's channel-level permissions.
 * @param overwrites Channel's overwrites.
 * @param guildId id of the guild in which the permissions are being checked.
 * @returns The new perms.
 */
function _applyEveryoneOverwrites(perms, overwrite) {
    perms &= ~BigInt(overwrite.deny);
    perms |= BigInt(overwrite.allow);
    return perms;
}
/**
 * When computing channel overwrites, applies the role overwrites.
 * @param perms GuildMember's channel-level permissions.
 * @param overwrites Channel's overwrites.
 * @returns The new perms.
 */
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
/**
 * Creates the discord cdn link for a user's avatar.
 * @param user User whose avatar url to generate.
 * @param fileType File extension of the image.
 */
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
/**
 * Creates the discord cdn link for a guild's icon.
 * @param guild Guild whose icon url to generate.s
 * @param fileType File extension of the image.
 */
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
function shortMethod(method) {
    switch (method.toUpperCase()) {
        case 'GET': return 'g';
        case 'PUT': return 'p';
        case 'POST': return 'o';
        case 'PATCH': return 'a';
        case 'DELETE': return 'd';
        default: return '';
    }
}
exports.shortMethod = shortMethod;
