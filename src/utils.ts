import {
  DISCORD_CDN_URL, DISCORD_EPOCH, OVERWRITE_ROLE_VALUE, SECOND_IN_MILLISECONDS,
} from './constants';
import {
  Guild, GuildChannel, GuildMember, Overwrite, PERMISSIONS, Snowflake, User,
} from './discord';

import type { ApiError } from './clients';

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

type PermissibleMember = Pick<Required<GuildMember>, 'user' | 'roles'>;
type PermissibleGuild = Pick<Guild, 'id' | 'owner_id' | 'roles'>;
type PermissibleChannel = Pick<GuildChannel, 'id' | 'permission_overwrites'>;

/**
 * Compute a member's channel-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param channel Channel in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms.
 */
export function computeChannelPerms({
  member, guild, channel, stopOnOwnerAdmin = true,
}: { member: PermissibleMember; guild: PermissibleGuild; channel: PermissibleChannel; stopOnOwnerAdmin?: boolean; }): bigint {
  const guildPerms = computeGuildPerms({ member, guild, stopOnOwnerAdmin });

  if (stopOnOwnerAdmin && guildPerms & PERMISSIONS.ADMINISTRATOR) {
    return PERMISSIONS.ADMINISTRATOR;
  }

  return computeChannelOverwrites(guildPerms, member, guild, channel);
}

/**
 * Compute a member's guild-level permissions.
 * @param member GuildMember whose perms to check.
 * @param guild Guild in which to check the member's permissions.
 * @param stopOnOwnerAdmin Whether or not to stop and return the Administrator perm if the user qualifies.
 * @returns The Administrator perm or the new perms in BigInt form.
 */
export function computeGuildPerms(
  { member, guild, stopOnOwnerAdmin = true }:
  { member: PermissibleMember; guild: PermissibleGuild; stopOnOwnerAdmin?: boolean; },
): bigint {
  const { roles: guildRoles } = guild;
  if (guildRoles === undefined) throw Error('roles not cached for this guild');
  if (member.roles === undefined) throw Error('no roles on member object');

  const memberRoles = [];
  for (const id of member.roles) {
    const role = guildRoles.find(({ id: gId }) => id === gId);
    if (role) memberRoles.push(role);
  }

  if (stopOnOwnerAdmin && guild.owner_id === member.user.id) {
    return PERMISSIONS.ADMINISTRATOR;
  }

  const everyone = guildRoles.find(({ id }) => id === guild.id);
  if (everyone === undefined) throw Error('no everyone role for this guild'); // should never trigger
  if (everyone.permissions === undefined) throw Error('permissions are not cached on roles');

  // start with @everyone perms
  let perms = BigInt(everyone.permissions);
  for (const role of memberRoles) {
    perms |= BigInt(role.permissions);
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
function computeChannelOverwrites(perms: bigint, member: PermissibleMember, guild: PermissibleGuild, channel: PermissibleChannel): bigint {
  const { permission_overwrites: overwrites } = channel;
  if (overwrites === undefined) throw Error('no overwrites on channel object');
  const { roles: memberRoles } = member;
  if (memberRoles === undefined) throw Error('no roles on member object');

  const roleOverwrites: Overwrite[] = [];
  const memberOverwrites: Overwrite[] = [];
  overwrites.forEach((o) => {
    if (o.type === OVERWRITE_ROLE_VALUE) {
      if (o.id === guild.id) {
        perms = _applyEveryoneOverwrites(perms, o);
      } else if (memberRoles.includes(o.id)) {
        roleOverwrites.push(o);
      }
    } else if (o.id === member.user.id) {
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

type AvatarParams = {
  fileType?: undefined | 'png' | 'jpg' | 'webp' | 'gif';
  animate?: boolean
}

/**
 * Creates the discord cdn link for a user's avatar.
 * @param user User whose avatar url to generate.
 * @param fileType File extension of the image.
 */
export function constructUserAvatarUrl(user: Pick<User, 'id' | 'avatar'> & { discriminator?: string }, { fileType = 'jpg', animate = false }: AvatarParams = {}): string {
  if (!user.avatar) {
    return `${DISCORD_CDN_URL}/embed/avatars/${(BigInt(user.id) << BigInt(22)) % BigInt(5)}.${fileType}`;
  }

  if (animate && user.avatar.startsWith('a_') && fileType && fileType !== 'webp') {
    fileType = 'gif';
  }

  return `${DISCORD_CDN_URL}/avatars/${user.id}/${user.avatar}${fileType ? `.${fileType}` : ''}`;
}

/**
 * Creates the discord cdn link for a guild's icon.
 * @param guild Guild whose icon url to generate.s
 * @param fileType File extension of the image.
 */
export function constructGuildIcon(guild: Pick<Guild, 'id' | 'icon_hash'>, fileType = ''): string | undefined {
  if (!guild.icon_hash) return undefined;

  if (guild.icon_hash.startsWith('a_')) {
    return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon_hash}${fileType ? `.${fileType}` : ''}`;
  }

  return `${DISCORD_CDN_URL}/icons/${guild.id}/${guild.icon_hash}${fileType ? `.${fileType}` : ''}`;
}

export function isObject(v: unknown): boolean {
  return (v !== null) && (typeof v === 'object') && (v?.constructor.name === 'Object');
}

export function isApiError(val: unknown): val is ApiError {
  return typeof val === 'object' && val !== null && (<Record<string, unknown>>val).isApiError === true;
}

export function stripLeadingSlash(url: string) {
  return url.startsWith('/') ? url.slice(1) : url;
}

export function shortMethod(method: string) {
  switch (method.toUpperCase()) {
    case 'GET': return 'g';
    case 'PUT': return 'p';
    case 'POST': return 'o';
    case 'PATCH': return 'a';
    case 'DELETE': return 'd';
    default: return '';
  }
}
