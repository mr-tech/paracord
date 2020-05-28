
const {
  DISCORD_EPOCH, PERMISSIONS: P, DISCORD_CDN_URL, SECOND_IN_MILLISECONDS,
} = require('../constants');

/** A class of helper export functions used throughout the library. */
/**
   * Returns a new object that is a clone of the original.
   *
   * @param {Object<any, any>} object Object to clone.
   */
export function clone(object: Object) {
  return JSON.parse(JSON.stringify(object));
}

/**
   * Returns a timestamp of some time in the future.
   *
   * @param {number} seconds Number of seconds from now to base the timestamp on.
   */
export function timestampNSecondsInFuture(seconds: number) {
  return new Date().getTime() + (Number(seconds) * SECOND_IN_MILLISECONDS);
}

/**
   * Returns a timestamp of some time in the future.
   *
   * @param {number} milliseconds Number of milliseconds from now to base the timestamp on.
   */
export function timestampNMillisecondsInFuture(milliseconds: number) {
  return new Date().getTime() + Number(milliseconds);
}

export function millisecondsFromNow(timestamp: number) {
  return Number(timestamp) - new Date().getTime();
}

// export function guildShardFromID(guildId, shardCount) {
//   /* eslint-disable-next-line radix */
//   return parseInt(BigInt(guildId) >> BigInt(22)) % shardCount;
// }

/**
   * Extract a timestamp from a Discord snowflake.
   *
   * @param {string} snowflake Discord snowflake.
   */
export function timestampFromSnowflake(snowflake: string) {
  // eslint-disable-next-line no-undef
  const bits = BigInt(snowflake)
    .toString(2)
    .padStart(64, '0');

  return parseInt(bits.substring(0, 42), 2) + DISCORD_EPOCH;
}

/**
   * This is a bot library. Coerced non-compliant tokens to be bot-like.
   *
   * @param {string} token Discord token.
   */
export function coerceTokenToBotLike(token: string) {
  if (!token.startsWith('Bot ')) return `Bot ${token}`;
  return token;
}

/**
   * Compute a member's channel-level permissions.
   *
   * @param {Object<string, any>} member Member whose perms to check.
   * @param {Guild} guild Guild in which to check the member's permissions.
   * @param {Object<string, any>} channel Channel in which to check the member's permissions.
   * @param {boolean} [stopOnOwnerAdmin] Whether or not to stop and return the Administrator perm if the user qualifies.
   * @returns {number} THe Administrator perm or the new perms.
   */
export function computeChannelPerms(member: Object, guild: Object, channel: Object, stopOnOwnerAdmin: boolean = false) {
  const guildPerms = computeGuildPerms(member, guild, stopOnOwnerAdmin);

  if (stopOnOwnerAdmin && guildPerms & P.ADMINISTRATOR) {
    return P.ADMINISTRATOR;
  }

  return computeChannelOverwrites(guildPerms, member, guild, channel);
}

/**
   * Compute a member's guild-level permissions.
   *
   * @param {Object<string, any>} member Member whose perms to check.
   * @param {Guild} guild Guild in which to check the member's permissions.
   * @param {boolean} [stopOnOwnerAdmin] Whether or not to stop and return the Administrator perm if the user qualifies.
   * @returns {number} THe Administrator perm or the new perms.
   */
export function computeGuildPerms(member: any, guild: any, stopOnOwnerAdmin: boolean = false) {
  if (stopOnOwnerAdmin && guild.owner_id === member.user.id) {
    return P.ADMINISTRATOR;
  }

  const { roles } = guild;

  // start with @everyone perms
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

/**
   * Compute the channel's overriding permissions against the member's channel-level permissions.
   *
   * @param {number} perms Member's channel-level permissions.
   * @param {Object<string, any>} member Member whose perms to check.
   * @param {Guild} guild Guild in which to check the member's permissions.
   * @param {Object<string, any>} channel Channel in which to check the member's permissions.
   * @returns {number} The new perms.
   */
export function computeChannelOverwrites(perms: number, member: any, guild: any, channel: any) {
  const { permission_overwrites: overwrites } = channel;

  perms = _everyoneOverwrites(perms, overwrites, guild.id);
  perms = _roleOverwrites(perms, overwrites, member.roles);
  perms = _memberOverwrites(perms, overwrites, member.user.id);

  return perms;
}

/**
   * When computing channel overwrites, applies the "@everyone" overwrite.
   * @private
   *
   * @param {number} perms Member's channel-level permissions.
   * @param {Object<string, string|number>[]} overwrites Channel's overwrites.
   * @param {string} guildId id of the guild in which the permissions are being checked.
   * @returns {number} The new perms.
   */
export function _everyoneOverwrites(perms: number, overwrites: any, guildId: string) {
  for (const o of overwrites) {
    if (o.type === 'role' && o.id === guildId) {
      perms |= o.allow;
      perms &= ~o.deny;
      break;
    }
  }
  return perms;
}

/**
   * When computing channel overwrites, applies the role overwrites.
   * @private
   *
   * @param {number} perms Member's channel-level permissions.
   * @param {Object<string, string|number>[]} overwrites Channel's overwrites.
   * @param {Map<string, any>} roles Roles in the guild in which the permissions are being checked.
   * @returns {number} The new perms.
   */
export function _roleOverwrites(perms: number, overwrites: any, roles: Map<string, any>) {
  for (const o of overwrites) {
    if (o.type === 'role' && roles.has(o.id)) {
      perms |= o.allow;
      perms &= ~o.deny;
    }
  }

  return perms;
}

/**
   * When computing channel overwrites, applies the member overwrites.
   * @private
   *
   * @param {number} perms Member's channel-level permissions.
   * @param {Object<string, string|number>[]} overwrites Channel's overwrites.
   * @param {string} memberId id of the member whose permissions are being checked.
   * @returns {number} The new perms.
   */
export function _memberOverwrites(perms: number, overwrites: any, memberId: string) {
  for (const o of overwrites) {
    if (o.type === 'member' && o.id === memberId) {
      perms |= o.allow;
      perms &= ~o.deny;
      break;
    }
  }
  return perms;
}

export function constructUserAvatarUrl(user: any, fileType: string = '') {
  if (user.avatar === null || user.avatar === undefined) {
    return `${DISCORD_CDN_URL}/embed/avatars/${Number(user.discriminator)
        % 5}${fileType ? `.${fileType}` : ''}`;
  }

  if (user.avatar.startsWith('a_')) {
    return `${DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
  }

  return `${DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
}

/**
   * Appends a user's username to their discriminator in a common format.
   *
   * @param {Object<string, any>} user
   */
export function constructUserTag(user: any) {
  return `${user.username}#${user.discriminator}`;
}

export function constructGuildIcon(guild: any, fileType: string = '') {
  if (guild.icon.startsWith('a_')) {
    return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
  }

  return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
}

/**
   * Assigns export functions to an object and binds that object to their `this`.
   *
   * @param {Object<string, any>} obj Object to bind to export functions and assign export functions those export functions as properties.
   * @param {Object<string, Function>} funcs Functions to assign to object.
   */
export function bindFunctionsFromFile(obj: any, funcs: any) {
  for (const prop of Object.getOwnPropertyNames(funcs)) {
    if (typeof funcs[prop] === 'function') {
      obj[prop] = funcs[prop].bind(obj);
    }
  }
}

/**
   * Generates a unique Id.
   *
   * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
   * @returns {string}
   */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    /* eslint-disable-next-line eqeqeq */
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
   * Assigns to a Discord object's the timestamp of when it was created.
   *
   * @param {Object<string, any>} obj Discord object with a snowflake ID.
   */
export function assignCreatedOn(obj: any) {
  if (obj.created_on === undefined) {
    obj.created_on = timestampFromSnowflake(obj.id);
  }
}
