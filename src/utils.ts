/** A class of helper export functions used throughout the library. */
import {
  DISCORD_CDN_URL, DISCORD_EPOCH, PERMISSIONS, SECOND_IN_MILLISECONDS,
} from './constants';
import type {
  GuildChannel, GuildMember, Overwrite, Snowflake, User,
} from './types';
import Guild from './clients/Paracord/structures/Guild';

/**
 * Returns a new object that is a clone of the original.
 * @param object Object to clone.
 */
export function clone(object: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(object));
}

/**
 * Returns a timestamp of some time in the future.
 * @param seconds Number of seconds from now to base the timestamp on.
 */
export function timestampNSecondsInFuture(seconds: number): number {
  return new Date().getTime() + (Number(seconds) * SECOND_IN_MILLISECONDS);
}

/**
 * Returns a timestamp of some time in the future.
 * @param milliseconds Number of milliseconds from now to base the timestamp on.
 */
export function timestampNMillisecondsInFuture(milliseconds: number): number {
  return new Date().getTime() + Number(milliseconds);
}

/**
 * Returns a timestamp of some time in the future. -1 if provide timestamp has already passed
 * @param timestamp Unix timestamp.
 */
export function millisecondsFromNow(timestamp: number): number {
  const now = new Date().getTime();
  return timestamp < now ? -1 : timestamp - new Date().getTime();
}

// export function guildShardFromID(guildId, shardCount) {
//   /* eslint-disable-next-line radix */
//   return parseInt(BigInt(guildId) >> BigInt(22)) % shardCount;
// }

/**
 * Extract a timestamp from a Discord snowflake.
 * @param snowflake Discord snowflake.
 */
export function timestampFromSnowflake(snowflake: Snowflake): number {
  // eslint-disable-next-line no-undef
  const bits = BigInt(snowflake)
    .toString(2)
    .padStart(64, '0');

  return parseInt(bits.substring(0, 42), 2) + DISCORD_EPOCH;
}

/**
 * This is a bot library. Coerced non-compliant tokens to be bot-like.
 * @param token Discord token.
 */
export function coerceTokenToBotLike(token: string): string {
  if (!token.startsWith('Bot ')) return `Bot ${token}`;
  return token;
}

/**
 * Compute a member's channel-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param channel Channel in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms.
 */
export function computeChannelPerms({
  member, guild, channel, stopOnOwnerAdmin = false,
}: { member: GuildMember; guild: Guild; channel: GuildChannel; stopOnOwnerAdmin?: boolean; }): number {
  const { roles: guildRoles } = guild;
  const { roles: memberRoles } = member;
  if (guildRoles === undefined || memberRoles === undefined) throw Error('roles not cached for this guild');

  const guildPerms = computeGuildPerms({ member, guild, stopOnOwnerAdmin });

  if (stopOnOwnerAdmin && guildPerms & PERMISSIONS.ADMINISTRATOR) {
    return PERMISSIONS.ADMINISTRATOR;
  }

  return computeChannelOverwrites(guildPerms, member as GuildMember, guild, channel);
}

/**
 * Compute a member's guild-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms.
 */
export function computeGuildPerms({ member, guild, stopOnOwnerAdmin = false }: { member: GuildMember; guild: Guild; stopOnOwnerAdmin?: boolean; }): number {
  const { roles: guildRoles } = guild;
  const { roles: memberRoles } = member;
  if (guildRoles === undefined) throw Error('roles not cached for this guild');
  if (memberRoles === undefined) throw Error('no roles on member object');

  if (stopOnOwnerAdmin && guild.ownerId === member.user.id) {
    return PERMISSIONS.ADMINISTRATOR;
  }

  const everyone = guildRoles.get(guild.id);

  if (everyone === undefined) throw Error('roles not cached for this guild');

  // start with @everyone perms
  let perms: number = everyone.permissions;

  for (const roleId of memberRoles) {
    const role = guildRoles.get(roleId);
    if (role !== undefined) {
      if ((role.permissions & PERMISSIONS.ADMINISTRATOR) !== 0) {
        return PERMISSIONS.ADMINISTRATOR;
      }

      perms |= role.permissions;
    }
  }

  return perms;
}

/**
 * Compute the channel's overriding permissions against the member's channel-level permissions.
 * @param perms GuildMember's channel-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param channel Channel in which to check the member's permissions.
 * @returns The new perms.
 */
export function computeChannelOverwrites(perms: number, member: GuildMember, guild: Guild, channel: GuildChannel): number {
  const { permissionOverwrites: overwrites } = channel;

  perms = _everyoneOverwrites(perms, overwrites, guild.id);
  perms = _roleOverwrites(perms, overwrites, member.roles);
  perms = _memberOverwrites(perms, overwrites, member.user.id);

  return perms;
}

/**
 * When computing channel overwrites, applies the "@everyone" overwrite.
 * @param perms GuildMember's channel-level permissions.
 * @param overwrites Channel's overwrites.
 * @param guildId id of the guild in which the permissions are being checked.
 * @returns The new perms.
 */
function _everyoneOverwrites(perms: number, overwrites: Overwrite[], guildId: string): number {
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
 * @param perms GuildMember's channel-level permissions.
 * @param overwrites Channel's overwrites.
 * @param roles Roles in the guild in which the permissions are being checked.
 * @returns The new perms.
 */
function _roleOverwrites(perms: number, overwrites: Overwrite[], roles: string[]): number {
  for (const o of overwrites) {
    if (o.type === 'role' && roles.includes(o.id)) {
      perms |= o.allow;
      perms &= ~o.deny;
    }
  }

  return perms;
}

/**
 * When computing channel overwrites, applies the member overwrites.
 * @param perms GuildMember's channel-level permissions.
 * @param overwrites Channel's overwrites.
 * @param memberId id of the member whose permissions are being checked.
 * @returns The new perms.
 */
function _memberOverwrites(perms: number, overwrites: Overwrite[], memberId: string): number {
  for (const o of overwrites) {
    if (o.type === 'member' && o.id === memberId) {
      perms |= o.allow;
      perms &= ~o.deny;
      break;
    }
  }
  return perms;
}

/**
 * Creates the discord cdn link for a user's avatar.
 * @param user User whose avatar url to generate.
 * @param fileType File extension of the image.
 */
export function constructUserAvatarUrl(user: User, fileType = ''): string {
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
 * Creates the discord cdn link for a guild's icon.
 * @param guild Guild whose icon url to generate.
 * @param fileType File extension of the image.
 */
export function constructGuildIcon(guild: Guild, fileType = ''): string | undefined {
  if (guild.icon === null) return undefined;

  if (guild.icon.startsWith('a_')) {
    return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
  }

  return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon}${fileType ? `.${fileType}` : ''}`;
}

// /**
//  * Assigns export functions to an object and binds that object to their `this`.
//  * @param obj Object to bind to export functions and assign export functions those export functions as properties.
//  * @param funcs Functions to assign to object.
//  */
// export function bindEventFunctionsFromFile(obj: Record<string, unknown> | unknown, funcs: Record<string, unknown>): void {
//   for (const prop of Object.getOwnPropertyNames(funcs)) {
//     if (typeof funcs[prop] === 'function') {
//       obj.events[prop] = funcs[prop].bind(obj);
//     }
//   }
// }

/**
   * Generates a unique Id.
   * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
   */
export function createUnsafeUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
   * Assigns to a Discord object's the timestamp of when it was created.
   * @param obj Discord object with a snowflake ID.
   */
export function returnCreatedOn(resource: Record<'id', Snowflake>): number {
  return timestampFromSnowflake(resource.id);
}

const camelToSnakeRegex = /[\w]([A-Z])/g;
export function camelToSnake(str: string): string {
  return str.replace(camelToSnakeRegex, (m) => `${m[0]}_${m[1]}`).toLowerCase();
}

export function objectKeysCamelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const snakedObj: Record<string, unknown> = {};
  /* eslint-disable-next-line prefer-const */
  for (let [key, value] of Object.entries(obj)) {
    if (isObject(value)) {
      value = objectKeysCamelToSnake(<Record<string, unknown>>value);
    } else if (Array.isArray(value) && isObject(value[0])) {
      value = value.map(objectKeysCamelToSnake);
    }
    snakedObj[camelToSnake(key)] = value;
  }

  return snakedObj;
}

const snakeToCamelRegex = /([-_][a-z])/g;
export function snakeToCamel(str: string): string {
  return str.replace(
    snakeToCamelRegex,
    (group) => group.toUpperCase()
      .replace('-', '')
      .replace('_', ''),
  );
}

export function objectKeysSnakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const camelObj: Record<string, unknown> = {};
  /* eslint-disable-next-line prefer-const */
  for (let [key, value] of Object.entries(obj)) {
    if (isObject(value)) {
      value = objectKeysSnakeToCamel(<Record<string, unknown>>value);
    } else if (Array.isArray(value) && isObject(value[0])) {
      value = value.map(objectKeysSnakeToCamel);
    }
    camelObj[snakeToCamel(key)] = value;
  }

  return camelObj;
}

function isObject(v: unknown): boolean {
  return typeof v === 'object' && v?.constructor.name === 'Object';
}
