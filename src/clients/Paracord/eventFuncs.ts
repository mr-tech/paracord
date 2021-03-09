import { SECOND_IN_MILLISECONDS } from '../../constants';
import {
  AugmentedRawGuild, AugmentedRawGuildMember, AugmentedRawMessage, AugmentedRawVoiceState, GuildEmojisUpdateEventFields, GuildMemberAddExtraFields, GuildMemberRemoveEventFields, GuildMemberUpdateEventFields, GuildRoleCreateEventFields, GuildRoleDeleteEventFields, GuildRoleUpdateEventFields, RawChannel, RawEmoji, RawGuildMember, RawPresence, RawUser, RawVoiceState, ReadyEventFields, UnavailableGuild,
} from '../../types';
import Gateway from '../Gateway/Gateway';
import Paracord from './Paracord';
import GuildEmoji from './structures/discord/resources/GuildEmoji';
import Guild from './structures/discord/resources/Guild';
import GuildChannel from './structures/discord/resources/GuildChannel';
import GuildMember from './structures/discord/resources/GuildMember';
import GuildVoiceState from './structures/discord/resources/GuildVoiceState';
import Role from './structures/discord/resources/Role';
import User from './structures/discord/resources/User';
import { GatewayCloseEvent } from '../Gateway/types';
import Presence from './structures/discord/resources/Presence';

/** The methods in ALL_CAPS correspond to a Discord gateway event (https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events) and are called in the Paracord `.eventHandler()` method. */

export function READY(this: Paracord, data: ReadyEventFields, shard: number): ReadyEventFields {
  this.handleReady(data, shard);

  return data;
}

/**
 * @param identity From a gateway client.
 */
export function GATEWAY_IDENTIFY(this: Paracord, gateway: Gateway): Gateway {
  this.safeGatewayIdentifyTimestamp = new Date().getTime() + (6 * SECOND_IN_MILLISECONDS);

  for (const guild of this.guilds.values()) {
    if (guild.shard === gateway.id) {
      this.guilds.delete(guild.id);
    }
  }

  return gateway;
}

// { gateway, shouldReconnect }: { gateway: Gateway, shouldReconnect: boolean },
/**
 * @param gateway Gateway that emitted the event.
 * @param shouldReconnect Whether or not to attempt to login again.
 */
export function GATEWAY_CLOSE(
  this: Paracord, data: GatewayCloseEvent,
): GatewayCloseEvent {
  const { gateway, shouldReconnect } = data;
  if (shouldReconnect) {
    if (gateway.resumable) {
      gateway.login();
    } else if (this.startingGateway === gateway) {
      this.clearStartingShardState();
      this.clearShardGuilds(gateway.id);
      this.gatewayLoginQueue.unshift(gateway);
    } else {
      this.clearShardGuilds(gateway.id);
      this.gatewayLoginQueue.push(gateway);
    }
  } else {
    this.clearShardGuilds(gateway.id);
  }

  return data;
}

export function GUILD_CREATE(this: Paracord, data: AugmentedRawGuild, shard: number): Guild | AugmentedRawGuild {
  return this.upsertGuild(data, shard) ?? data;
}

export function GUILD_UPDATE(this: Paracord, data: AugmentedRawGuild, shard: number): Guild | AugmentedRawGuild {
  return this.upsertGuild(data, shard) ?? data;
}

export function GUILD_DELETE(this: Paracord, data: UnavailableGuild): Guild | UnavailableGuild {
  const guild = this.guilds.get(data.id);
  if (guild === undefined) {
    this.log('WARNING', `Received GUILD_DELETE event for uncached guild. Id: ${data.id}`);
    return data;
  }

  if (!data.unavailable) {
    this.removeGuild(guild);
    return guild;
  }

  guild.unavailable = true;
  return guild;
}

export function USER_UPDATE(this: Paracord, data: RawUser): User | RawUser {
  return this.upsertUser(data) ?? data;
}

export function PRESENCE_UPDATE(this: Paracord, data: RawPresence): Presence | RawPresence {
  const { guild_id: guildId } = data;

  const guild = guildId ? this.guilds.get(guildId) : undefined;
  const presence = this.handlePresence(data, guild);

  return presence || data;
}

export function MESSAGE_CREATE(this: Paracord, data: AugmentedRawMessage): AugmentedRawMessage {
  const { guild_id: guildId, member } = data;

  if (data.member !== undefined) {
    data.member.user = data.author;
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    data.member = this.guilds?.get(guildId)?.upsertMember(member) ?? member;
    data.author = data.member.user;
  }

  return data;
}

export function VOICE_STATE_UPDATE(this: Paracord, data: AugmentedRawVoiceState): GuildVoiceState | RawVoiceState {
  const {
    guild_id: guildId, user_id: userId, channel_id: channelId,
  } = data;
  if (guildId === undefined) return data;

  const guild = this.guilds.get(guildId);
  if (guild !== undefined) {
    if (channelId !== null) {
      return guild.upsertVoiceState(data) ?? data;
    }

    guild.removeVoiceState(userId);
  }

  return data;
}

export function CHANNEL_CREATE(this: Paracord, data: RawChannel): GuildChannel | RawChannel {
  const { guild_id: guildId } = data;

  if (guildId === undefined) return data;

  const guild = this.guilds.get(guildId);
  return guild?.insertChannel(data) ?? data;
}

export function CHANNEL_UPDATE(this: Paracord, data: RawChannel): GuildChannel | RawChannel {
  const { guild_id: guildId } = data;
  if (guildId === undefined) return data;

  const guild = this.guilds.get(guildId);
  return guild?.updateChannel(data) ?? data;
}

export function CHANNEL_DELETE(this: Paracord, data: RawChannel): GuildChannel | RawChannel {
  const { guild_id: guildId, id } = data;
  if (guildId === undefined) return data;

  const guild = this.guilds.get(guildId);

  let channel;
  if (guild !== undefined) {
    channel = guild.removeChannel(id);
  }

  return channel ?? data;
}

export function GUILD_MEMBER_ADD(
  this: Paracord, data: AugmentedRawGuildMember & GuildMemberAddExtraFields,
): (RawGuildMember & GuildMemberAddExtraFields) | GuildMember {
  const guild = this.guilds.get(data.guild_id);
  if (guild !== undefined) {
    guild.incrementMemberCount();
    return guild.upsertMember(data) ?? data;
  }

  return data;
}

export function GUILD_MEMBER_UPDATE(
  this: Paracord, data: GuildMemberUpdateEventFields,
): GuildMember | GuildMemberUpdateEventFields {
  const { guild_id: guildId } = data;
  const guild = this.guilds.get(guildId);
  return guild?.upsertMember(data) ?? data;
}

export function GUILD_MEMBER_REMOVE(
  this: Paracord, data: GuildMemberRemoveEventFields,
): GuildMember | { user: RawUser } {
  const { guild_id: guildId, user } = data;
  const guild = this.guilds.get(guildId);
  if (guild !== undefined) {
    guild.decrementMemberCount();
    return guild.removeMember(user.id) ?? data;
  }

  return data;
}

// export function GUILD_MEMBERS_CHUNK(this: Paracord, data: AugmentedGuildMembersChunkEventFields): GuildMembersChunk | AugmentedGuildMembersChunkEventFields {
//   const {
//     not_found: notFound, guild_id: guildId, presences, members,
//   } = data;
//   if (notFound) return data;

//   const guild = this.guilds.get(guildId);

//   if (presences !== undefined) data.presences = presences.map((p) => this.handlePresence(p, guild));
//   if (guild !== undefined) {
//     data.members = members.map((m) => cacheMemberFromEvent(guild, m));
//   }

//   return data;
// }

export function GUILD_ROLE_CREATE(
  this: Paracord, data: GuildRoleCreateEventFields,
): Role | GuildRoleCreateEventFields {
  const { guild_id: guildId, role } = data;
  const guild = this.guilds.get(guildId);
  return guild?.insertRole(role) ?? data;
}

export function GUILD_ROLE_UPDATE(
  this: Paracord, data: GuildRoleUpdateEventFields,
): Role | GuildRoleUpdateEventFields {
  const { guild_id: guildId, role } = data;
  const guild = this.guilds.get(guildId);
  return guild?.upsertRole(role) ?? data;
}

export function GUILD_ROLE_DELETE(
  this: Paracord, data: GuildRoleDeleteEventFields,
): Role | GuildRoleDeleteEventFields {
  const { guild_id: guildId, role_id: roleId } = data;
  const guild = this.guilds.get(guildId);
  return guild?.removeRole(roleId) ?? data;
}

export function GUILE_EMOJIS_UPDATE(
  this: Paracord, data: GuildEmojisUpdateEventFields,
): [GuildEmoji[], GuildEmoji[]] | GuildEmojisUpdateEventFields {
  const { guild_id: guildId, emojis } = data;
  const guild = this.guilds.get(guildId);
  return guild?.updateEmojiCache(emojis) ?? data;
}
