
import { Presence } from '../../../discord-reference/altered';
import { CHANNEL_TYPES, SECOND_IN_MILLISECONDS } from '../../constants';
import {
  GuildChannel, GuildMember, GuildMemberAddExtraFields, GuildMemberRemoveEventFields, GuildMembersChunkEventFields, GuildMemberUpdateEventFields, GuildRole, GuildRoleCreateEventFields, GuildRoleDeleteEventFields, GuildRoleUpdateEventFields, GuildVoiceState, Message, RawChannel, RawGuild, RawGuildMember, RawPresence, RawRole, RawUser, RawVoiceState, ReadyEventFields, UnavailableGuild, User,
} from '../../types';
import Gateway from '../Gateway/Gateway';
import Paracord from './Paracord';
import Guild from './structures/Guild';

const { DM, GROUP_DM } = CHANNEL_TYPES;

/** The methods in ALL_CAPS correspond to a Discord gateway event (https://discordapp.com/developers/docs/topics/gateway#commands-and-events-gateway-events) and are called in the Paracord `.eventHandler()` method. */

export function READY(this: Paracord, data: ReadyEventFields, shard: number): ReadyEventFields {
  this.handleReady(data, shard);

  return data;
}

export function PRESENCE_UPDATE(this: Paracord, data: RawPresence): Presence | RawPresence {
  const { guildId } = data;
  if (guildId !== undefined) {
    const guild = this.guilds.get(guildId);
    this.handlePresence({ guild, presence: data });
  }

  return data;
}

export function USER_UPDATE(this: Paracord, data: RawUser): User {
  return this.upsertUser(data);
}

export function MESSAGE_CREATE(this: Paracord, data: Message): Message {
  const { guildId, member, author } = data;
  if (guildId !== undefined) {
    const guild = this.guilds.get(guildId);

    if (guild !== undefined && member !== undefined) {
      member.user = data.author;
      data.member = this.cacheMemberFromEvent(guild, member);
      data.author = member.user;
    }
    this.users.get(author.id);
  } else {
    const user = this.users.get(author.id);
    if (user !== undefined) {
      data.author = user;
    }
  }

  return data;
}

export const MESSAGE_UPDATE = MESSAGE_CREATE;

// export function MESSAGE_DELETE(this: Paracord, data: MessageDeleteEventFields): MessageDeleteEventFields {
//   return data;
// }

export function VOICE_STATE_UPDATE(this: Paracord, data: RawVoiceState): GuildVoiceState | RawVoiceState {
  const {
    guildId, member, userId, channelId,
  } = data;
  if (guildId === undefined) return data;

  const guild = this.guilds.get(guildId);
  if (guild !== undefined) {
    member !== undefined && this.cacheMemberFromEvent(guild, member);

    if (channelId !== null) {
      return guild.upsertVoiceState(data, this);
    }

    guild.voiceStates.delete(userId);
  }

  return data;
}

export function GUILD_MEMBER_ADD(
  this: Paracord, data: RawGuildMember & GuildMemberAddExtraFields,
): (RawGuildMember & GuildMemberAddExtraFields) | GuildMember {
  const guild = this.guilds.get(data.guildId);
  if (guild) {
    guild.memberCount !== undefined && ++guild.memberCount;
    return guild.upsertMember(data, this);
  }

  return data;
}

export function GUILD_MEMBER_UPDATE(
  this: Paracord, data: GuildMemberUpdateEventFields,
): GuildMember | GuildMemberUpdateEventFields {
  const { guildId } = data;
  const guild = this.guilds.get(guildId);
  if (guild) {
    return guild.upsertMember(data, this);
  }

  return data;
}

export function GUILD_MEMBER_REMOVE(
  this: Paracord, { guildId, user }: GuildMemberRemoveEventFields,
): GuildMember | { user: RawUser } {
  const guild = this.guilds.get(guildId);
  let member: { user: RawUser } | GuildMember = { user };
  if (guild) {
    guild.memberCount !== undefined && --guild.memberCount;
    member = guild.members.get(user.id) || member;
    guild.members.delete(user.id);
    guild.presences.delete(user.id);
  }

  return member;
}

export function GUILD_MEMBERS_CHUNK(this: Paracord, data: GuildMembersChunkEventFields): GuildMembersChunkEventFields {
  const {
    notFound, guildId, presences, members,
  } = data;
  if (notFound) return data;

  const guild = this.guilds.get(guildId);

  if (presences !== undefined) data.presences = presences.map((p) => this.handlePresence({ guild, presence: p }));
  if (guild !== undefined) {
    data.members = members.map((m) => this.cacheMemberFromEvent(guild, m));
  }

  return data;
}

export function CHANNEL_CREATE(this: Paracord, data: RawChannel): GuildChannel | RawChannel {
  const { type, guildId } = data;
  if (type !== DM || type !== GROUP_DM || guildId === undefined) return data;

  const guild = this.guilds.get(guildId);
  return guild?.upsertChannel(data) ?? data;
}

export function CHANNEL_UPDATE(this: Paracord, data: RawChannel): GuildChannel | RawChannel {
  const { type, guildId } = data;
  if (type !== DM || type !== GROUP_DM || guildId === undefined) return data;

  const guild = this.guilds.get(guildId);
  return guild?.upsertChannel(data) ?? data;
}

export function CHANNEL_DELETE(this: Paracord, data: RawChannel): GuildChannel | RawChannel {
  const { type, guildId } = data;
  if (type !== DM || type !== GROUP_DM || guildId === undefined) return data;

  let channel: RawChannel | GuildChannel = data;
  const guild = this.guilds.get(guildId);
  if (guild !== undefined) {
    channel = guild.channels.get(guildId) ?? channel;
    guild.channels.delete(guildId);
  } else { // TODO: fallback to periodically scanning cache for channel
    this.log('WARNING', `CHANNEL_DELETE received without guild in cache. guildId: ${guildId} | channel.id: ${channel.id}`);
  }

  return channel;
}

export function GUILD_ROLE_CREATE(
  this: Paracord, { guildId, role: data }: GuildRoleCreateEventFields,
): GuildRole | RawRole {
  const guild = this.guilds.get(guildId);
  return guild?.upsertRole(data) ?? data;
}

export function GUILD_ROLE_UPDATE(
  this: Paracord, { guildId, role: data }: GuildRoleUpdateEventFields,
): GuildRole | RawRole {
  const guild = this.guilds.get(guildId);
  return guild?.upsertRole(data) ?? data;
}

export function GUILD_ROLE_DELETE(
  this: Paracord, { guildId, roleId }: GuildRoleDeleteEventFields,
): GuildRole | undefined {
  const guild = this.guilds.get(guildId);
  let role;
  if (guild !== undefined) {
    role = guild.roles.get(guildId);
    guild.roles.delete(guildId);
  } else {
    this.log('WARNING', `GUILD_ROLE_DELETE received without guild in cache. guildId: ${guildId} | roleId: ${roleId}`);
  }

  return role;
}

export function GUILD_CREATE(this: Paracord, data: RawGuild, shard: number): Guild | undefined {
  return this.upsertGuild(data, shard);
}

export function GUILD_UPDATE(this: Paracord, data: RawGuild): Guild | undefined {
  return this.upsertGuild(data);
}

export function GUILD_DELETE(this: Paracord, data: UnavailableGuild): Guild | UnavailableGuild | undefined {
  const guild = this.guilds.get(data.id);
  if (guild !== undefined) {
    if (!data.unavailable) {
      this.guilds.delete(data.id);
      return guild;
    }

    guild.unavailable = true;
    return guild;
  }

  this.log('WARNING', `Received GUILD_DELETE event for uncached guild. Id: ${data.id}`);
  return undefined;
}

/**
 * @param identity From a gateway client.
 */
export function GATEWAY_IDENTIFY(this: Paracord, gateway: Gateway): void {
  this.safeGatewayIdentifyTimestamp = new Date().getTime() + (6 * SECOND_IN_MILLISECONDS);

  for (const guild of this.guilds.values()) {
    if (guild.shard === gateway.id) {
      this.guilds.delete(guild.id);
    }
  }
}

/**
 * @param gateway Gateway that emitted the event.
 * @param shouldReconnect Whether or not to attempt to login again.
 */
export function GATEWAY_CLOSE(
  this: Paracord, { gateway, shouldReconnect }: { gateway: Gateway, shouldReconnect: boolean },
): void {
  if (shouldReconnect) {
    if (gateway.resumable) {
      gateway.login();
    } else if (this.startingGateway === gateway) {
      this.clearStartingShardState();
      this.gatewayLoginQueue.unshift(gateway);
    } else {
      this.gatewayLoginQueue.push(gateway);
    }
  }
}
