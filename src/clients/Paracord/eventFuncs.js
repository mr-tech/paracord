'use strict';

const { SECOND_IN_MILLISECONDS } = require('../../constants');

const Guild = require('./structures/Guild');
const { CHANNEL_TYPES } = require('../../constants');

/** The methods in ALL_CAPS correspond to a Discord gateway event (https://discordapp.com/developers/docs/topics/gateway#commands-and-events-gateway-events) and are called in the Paracord `.eventHandler()` method. */

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.READY = function READY(data, shard) {
  this.handleReady(data, shard);

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.PRESENCE_UPDATE = function PRESENCE_UPDATE(data) {
  this.handlePresence(this.guilds.get(data.guild_id), data);

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.USER_UPDATE = function USER_UPDATE(data) {
  return this.upsertUser(data);
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.MESSAGE_CREATE = function MESSAGE_CREATE(data) {
  if (data.member !== undefined) {
    data.member.user = data.author;
    data.member = this.cacheMemberFromEvent(
      this.guilds.get(data.guild_id),
      data.member,
    );

    data.author = data.member.user;
  }

  return data;
};
/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.MESSAGE_EDIT = function MESSAGE_EDIT(data) {
  if (data.member !== undefined) {
    data.member.user = data.author;
    data.member = this.cacheMemberFromEvent(
      this.guilds.get(data.guild_id),
      data.member,
    );
    data.author = data.member.user;
  }

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.MESSAGE_DELETE = function MESSAGE_DELETE(data) {
  if (data.member !== undefined) {
    data.member.user = data.author;
    data.member = this.cacheMemberFromEvent(
      this.guilds.get(data.guild_id),
      data.member,
      data.author.id,
    );
    data.author = data.member.user;
  }

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.VOICE_STATE_UPDATE = function VOICE_STATE_UPDATE(data) {
  const guild = this.guilds.get(data.guild_id);

  if (guild) {
    this.cacheMemberFromEvent(
      this.guilds.get(data.guild_id), data.member, data.member.user.id,
    );

    if (data.channel_id !== null) {
      return guild.upsertVoiceState(data, this);
    }
    guild.voiceStates.delete(data.user_id);
  }
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_MEMBER_ADD = function GUILD_MEMBER_ADD(data) {
  const guild = this.guilds.get(data.guild_id);
  if (guild) {
    ++guild.member_count;
    return guild.upsertMember(data, this);
  }

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_MEMBER_UPDATE = function GUILD_MEMBER_UPDATE(data) {
  const guild = this.guilds.get(data.guild_id);
  if (guild) {
    return guild.upsertMember(data, this);
  }

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_MEMBER_REMOVE = function GUILD_MEMBER_REMOVE(data) {
  const guild = this.guilds.get(data.guild_id);
  if (guild) {
    --guild.member_count;
    const member = guild.members.get(data.user_id);
    guild.members.delete(data.user.id);
    guild.presences.delete(data.user.id);
    return member;
  }

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_MEMBERS_CHUNK = function GUILD_MEMBERS_CHUNK(data) {
  const guild = this.guilds.get(data.guild_id);
  if (data.presences !== undefined) {
    data.presences.forEach((p) => this.handlePresence(guild, p));
  }
  data.members.forEach((m) => this.cacheMemberFromEvent(guild, m, m.user.id));

  return data;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.CHANNEL_CREATE = function CHANNEL_CREATE(data) {
  if (data.type !== CHANNEL_TYPES.DM && data.type !== CHANNEL_TYPES.GROUP_DM) {
    const guild = this.guilds.get(data.guild_id);
    if (guild) {
      return guild.upsertChannel(data);
    }
  }

  return undefined;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.CHANNEL_UPDATE = function CHANNEL_UPDATE(data) {
  const guild = this.guilds.get(data.guild_id);
  return guild.upsertChannel(data);
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.CHANNEL_DELETE = function CHANNEL_DELETE(data) {
  const guild = this.guilds.get(data.guild_id);
  const channel = guild.channels.get(data.id);
  guild.channels.delete(data.id);
  return channel;
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_ROLE_CREATE = function GUILD_ROLE_CREATE(data) {
  const guild = this.guilds.get(data.guild_id);
  return { role: guild.upsertRole(data.role), guild_id: data.guild_id };
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_ROLE_UPDATE = function GUILD_ROLE_UPDATE(data) {
  const guild = this.guilds.get(data.guild_id);
  return { role: guild.upsertRole(data.role), guild_id: data.guild_id };
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_ROLE_DELETE = function GUILD_ROLE_DELETE(data) {
  const guild = this.guilds.get(data.guild_id);
  const role = guild.roles.get(data.role_id);
  guild.roles.delete(data.role_id);

  return { role, guild_id: data.guild_id };
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_CREATE = function GUILD_CREATE(data, shard) {
  return this.upsertGuild(data, shard);
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_UPDATE = function GUILD_UPDATE(data) {
  return this.upsertGuild(data);
};

/**
 * @private
 * @this {Paracord}
 * @param {Object<string, any>} data From Discord.
 */
exports.GUILD_DELETE = function GUILD_DELETE(data) {
  const guild = this.guilds.get(data.id);
  if (guild !== undefined) {
    if (!data.unavailable) {
      this.guilds.delete(data.id);
      return guild;
    }
    return guild;
  }

  if (data.unavailable) {
    return this.upsertGuild(data);
  }

  return guild;
};

/**
 * @private
 * @this {Paracord}
 * @param {Identity} identity From a gateway client.
 */
exports.GATEWAY_IDENTIFY = function GATEWAY_IDENTIFY(identity) {
  this.safeGatewayIdentifyTimestamp = new Date().getTime() + (5 * SECOND_IN_MILLISECONDS);

  const { shard: { 0: shard } } = identity;
  for (const guild of this.guilds.values()) {
    if (guild.shard === shard) {
      this.guilds.delete(guild.id);
    }
  }
};

/**
 * @private
 * @this {Paracord}
 * @param {Object} data
 * @param {Gateway} data.gateway Gateway that emitted the event.
 * @param {boolean} data.shouldReconnect Whether or not to attempt to login again.
 */
exports.GATEWAY_CLOSE = function GATEWAY_CLOSE({ gateway, shouldReconnect }) {
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
};
