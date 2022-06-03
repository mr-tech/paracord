/** A class of helper export functions used throughout the library. */
import {
  DISCORD_CDN_URL, DISCORD_EPOCH, PERMISSIONS, SECOND_IN_MILLISECONDS, OVERWRITE_ROLE_VALUE,
} from './constants';

import type { Snowflake } from './types';
import type {
  GuildMember, Guild, GuildChannel, Role, User, Overwrite,
} from './clients/Paracord/structures';

/**
 * Returns a new object that is a clone of the original.
 * @param object Object to clone.
 */
export function clone<T>(object: T): T {
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
  return timestamp < now ? -1 : timestamp - now;
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
  const bits = BigInt(snowflake).toString(2).padStart(64, '0');
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
}: { member: GuildMember; guild: Guild; channel: GuildChannel; stopOnOwnerAdmin?: boolean; }): bigint {
  const guildPerms = computeGuildPerms({ member, guild, stopOnOwnerAdmin });

  if (stopOnOwnerAdmin && guildPerms & BigInt(PERMISSIONS.ADMINISTRATOR)) {
    return BigInt(PERMISSIONS.ADMINISTRATOR);
  }

  return computeChannelOverwrites(guildPerms, member as GuildMember, guild, channel);
}

interface SafeRole extends Role {
  permissions: string;
}

/**
 * Compute a member's guild-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms in BigInt form.
 */
export function computeGuildPerms({ member, guild, stopOnOwnerAdmin = false }: { member: GuildMember; guild: Guild; stopOnOwnerAdmin?: boolean; }): bigint {
  const { roles: guildRoles } = guild;
  if (guildRoles === undefined) throw Error('roles not cached for this guild');
  const { roles: memberRoles } = member;
  if (memberRoles === undefined) throw Error('no roles on member object');

  if (stopOnOwnerAdmin && guild.ownerId === member.user.id) {
    return BigInt(PERMISSIONS.ADMINISTRATOR);
  }

  const everyone = guildRoles.get(guild.id);
  if (everyone === undefined) throw Error('no everyone role for this guild'); // should never trigger
  if (everyone.permissions === undefined) throw Error('permissions are not cached on roles');

  // start with @everyone perms
  let perms = BigInt(everyone.permissions);

  Array.from(memberRoles.values()).forEach((role: unknown) => {
    perms |= BigInt((<SafeRole>role).permissions);
  });

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
export function computeChannelOverwrites(perms: bigint, member: GuildMember, guild: Guild, channel: GuildChannel): bigint {
  const { permissionOverwrites: overwrites } = channel;
  if (overwrites === undefined) throw Error('no overwrites on channel object');
  const { roles: memberRoles } = member;
  if (memberRoles === undefined) throw Error('no roles on member object');

  const roleOverwrites: Overwrite[] = [];
  const memberOverwrites: Overwrite[] = [];
  overwrites.forEach((o) => {
    if (o.type === OVERWRITE_ROLE_VALUE) {
      if (o.id === guild.id) {
        perms = _applyEveryoneOverwrites(perms, o);
      } else if (memberRoles.has(o.id)) {
        roleOverwrites.push(o);
      }
    } else if (o.id === member.id) {
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
function _applyEveryoneOverwrites(perms: bigint, overwrite: Overwrite): bigint {
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
function _applyOverwrites(perms: bigint, overwrites: Overwrite[]): bigint {
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
export function constructUserAvatarUrl(user: Pick<User, 'id' | 'avatar' | 'discriminator'>, fileType = ''): string {
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
 * @param guild Guild whose icon url to generate.s
 * @param fileType File extension of the image.
 */
export function constructGuildIcon(guild: Pick<Guild, 'id' | 'iconHash'>, fileType = ''): string | undefined {
  if (guild.iconHash === null || guild.iconHash === undefined) return undefined;

  if (guild.iconHash.startsWith('a_')) {
    return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.iconHash}${fileType ? `.${fileType}` : ''}`;
  }

  return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.iconHash}${fileType ? `.${fileType}` : ''}`;
}

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

/**
 *
 * @param obj
 * @param seenObjects avoid circular assignment traps
 */
export function objectKeysSnakeToCamel<T>(obj: T, seenObjects: unknown[] = []): T {
  const camelObj: any = {};
  /* eslint-disable-next-line prefer-const */
  for (let [key, value] of Object.entries(obj)) {
    if (isObject(value) && !seenObjects.includes(value)) {
      seenObjects.push(value);
      value = objectKeysSnakeToCamel(<Record<string, unknown>>value, seenObjects);
    } else if (Array.isArray(value) && isObject(value[0])) {
      value = value.map((v) => objectKeysSnakeToCamel(v, seenObjects));
    }
    camelObj[snakeToCamel(key)] = value;
  }

  return camelObj;
}

export function isObject(v: unknown): boolean {
  return (v !== null) && (typeof v === 'object') && (v?.constructor.name === 'Object');
}

export function squashArrays <T>(oldArray: Array<T>, newArray: Array<T>): Array<T> {
  const newArrayCopy = newArray.slice();
  const removedItems = [];
  for (let i = oldArray.length; i >= 0; --i) {
    const oldItem = oldArray[i];
    const newIdx = newArrayCopy.indexOf(oldItem);
    if (newIdx > -1) { // item already in old array
      newArrayCopy.splice(newIdx, 1);
    } else { // item not in new array
      removedItems.push(...oldArray.splice(i, 1));
    }
  }

  oldArray.push(...newArrayCopy);

  return removedItems;
}
