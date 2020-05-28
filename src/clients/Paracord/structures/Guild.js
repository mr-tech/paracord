
const Utils = require('../../../utils');
const { PERMISSIONS: P } = require('../../../constants');

/** A Discord guild. */
module.exports = class Guild {
  /**
   * Creates a new guild object.
   *
   * @param {Object<string, any>} guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param {Paracord} client Paracord client.
   */
  constructor(guildData, client, shard) {
    /** @type {Map<string, Object<string, Object<string, any>>>} Cached member objects of this guild. */
    this.members;
    /** @type {Map<string, Object<string, Object<string, any>>} Cached channel objects of this guild. */
    this.channels;
    /** @type {Map<string, Object<string, Object<string, any>>>} Cached presence objects of this guild. */
    this.presences;
    /** @type {Map<string, Object<string, Object<string, any>>>} Cached role objects of this guild. */
    this.roles;
    /** @type {Map<string, Object<string, Object<string, any>>>} Cached voice state objects of this guild. */
    this.voiceStates;
    /** @type {boolean} If this guild is currently in an unavailable state. */
    this.unavailable;
    /** @type {void|Object<string, any>} The guild owner's member object if cached. */
    this.owner;
    /** @type {Object<string, any>} The bot's member object. */
    this.me;
    /** @type {number} The epoch timestamp of when this guild was created extract from its Id. */
    this.created_on;
    /** @type {number} Gateway shard that the guild is a part of. */
    this._shard;

    this.constructorDefaults(guildData, client, shard);
  }

  get shard() {
    return this._shard;
  }

  /*
   ********************************
   ********* CONSTRUCTOR **********
   ********************************
   */

  /**
   * Assigns default values to this guild.
   * @private
   *
   * @param {Object<string, any>} guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param {Paracord} client Paracord client.
   */
  constructorDefaults(guildData, client, shard) {
    const defaults = {
      members: new Map(),
      channels: new Map(),
      presences: new Map(),
      voiceStates: new Map(),
      roles: new Map(),
      unavailable: false,
    };

    Object.assign(this, defaults);

    this._shard = shard;

    this.constructGuildFromData(guildData, client);
  }

  /**
   * Add guild to client cache along with any channels. roles, members, and their presences if applicable.
   * @private
   *
   * @param {Object<string, any>} guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param {Paracord} client Paracord client.
   */
  constructGuildFromData(guildData, client) {
    if (!guildData.unavailable) {
      this.unavailable = false;

      Utils.assignCreatedOn(guildData);

      this.assignFromGuildCreate(guildData, client);

      this.owner = this.members.get(guildData.owner_id);

      if (this.me === undefined) {
        this.me = this.members.get(client.user.id);
        if (this.me === undefined) {
          console.log(
            'This message is intentional and is made to appear when a guild is created but the bot user was not included in the initial member list.',
          );
          // Guild.lazyLoadGuildMe(client);
        }
      }
    } else {
      guildData.unavailable = true;
    }

    Object.assign(this, guildData);

    return this;
  }

  /**
   * Replace caches with newly received information about a guild.
   * @private
   *
   * @param {Object<string, any>} guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param {Paracord} client Paracord client.
   */
  assignFromGuildCreate(guildData, client) {
    if (guildData.channels !== undefined) {
      guildData.channels.forEach((c) => this.upsertChannel(c));
      delete guildData.channels;
    }

    if (guildData.roles !== undefined) {
      guildData.roles.forEach((r) => this.upsertRole(r));
      delete guildData.roles;
    }

    if (guildData.members !== undefined) {
      guildData.members.forEach((m) => this.upsertMember(m, client));
      delete guildData.members;
    }

    if (guildData.voice_states !== undefined) {
      guildData.voice_states.forEach((v) => this.upsertVoiceState(v, client));
    }

    if (guildData.presences !== undefined) {
      this.presences = Guild.mapPresences(guildData.presences, client);
      delete guildData.presences;
    }
  }

  /*
   ********************************
   *********** PUBLIC ************
   ********************************
   */

  /**
   * Checks if the user has a specific permission in this guild.
   *
   * @param {number} permission Bit value to check for.
   * @param {Object<string, any>} member Member whose perms to check.
   * @param {} [channelId] Channel to check overwrites.
   * @param {boolean} [adminOverride=true] Whether or not Administrator permissions can return `true`.
   * @returns {boolean} `true` if member has the permission.
   */
  hasPermission(permission, member, adminOverride = true) {
    const perms = Utils.computeGuildPerms(member, this, adminOverride);

    if (perms & P.ADMINISTRATOR && adminOverride) {
      return true;
    }
    return Boolean(perms & permission);
  }

  /**
   * Checks if the user has a specific permission for a channel in this guild.
   *
   * @param {number} permission Bit value to check for.
   * @param {Object<string, any>} member Member whose perms to check.
   * @param {string|Object<string, any>} channel Channel to check overwrites.
   * @param {boolean} [adminOverride=true] Whether or not Adminstrator permissions can return `true`.
   * @returns {boolean} `true` if member has the permission.
   */
  hasChannelPermission(permission, member, channel, adminOverride = true) {
    if (typeof channel === 'string') {
      channel = this.channels.get(channel);
    }

    const perms = Utils.computeChannelPerms(
      member,
      this,
      channel.adminOverride,
    );

    if (perms & P.ADMINISTRATOR && adminOverride) {
      return true;
    }
    return Boolean(perms & permission);
  }

  /*
   ********************************
   *********** CACHING ************
   ********************************
   */

  /**
   * Add a channel with some additional information to a map of channels.
   * @private
   *
   * @param {Map<string, any>} channels Map of channels keyed to their ids.
   * @param {Object<string, any>} channel https://discordapp.com/developers/docs/resources/channel#channel-object-channel-structure
   */
  upsertChannel(channel) {
    const { channels } = this;
    Utils.assignCreatedOn(channel);

    const cachedChannel = Object.assign(channels.get(channel.id) || {}, channel);
    channels.set(channel.id, cachedChannel);
    cachedChannel.guild_id = this.id;

    return cachedChannel;
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @private
   *
   * @param {Map<string, any>} roles Map of roles keyed to their ids.
   * @param {Object<string, any>} role https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  upsertRole(role) {
    const { roles } = this;
    Utils.assignCreatedOn(role);

    const cachedRole = Object.assign(roles.get(role.id) || {}, role);
    roles.set(role.id, cachedRole);

    return cachedRole;
  }

  /**
   * Add a role to a map of voice states.
   * @private
   *
   * @param {Map<string, any>} voiceStates Map of user id to voice states.
   * @param {Object<string, any>} voiceState https://discordapp.com/developers/docs/resources/voice
   * @param {Guild} guild
   * @param {Paracord} client
   */
  upsertVoiceState(voiceState, client) {
    const { voiceStates } = this;

    let member;
    if (voiceState.member !== undefined) {
      member = this.members.get(voiceState.member.user.id);
      if (member === undefined) {
        member = this.upsertMember(voiceState.member, client);
      }
    }

    if (member === undefined) {
      member = this.members.get(voiceState.user_id);
    }

    voiceState.member = member;

    voiceStates.set(voiceState.user_id, voiceState);

    return voiceState;
  }

  /**
   * Create a map of presences keyed to their user's ids.
   * @private
   *
   * @param {Object<string, any>[]} presences https://discordapp.com/developers/docs/topics/gateway#presence-update-presence-update-event-fields
   * @param {Paracord} client
   */
  static mapPresences(presences, client) {
    const presenceMap = new Map();
    presences.forEach((p) => {
      const cachedPresence = client.updatePresences(p);
      if (cachedPresence !== undefined) {
        presenceMap.set(cachedPresence.user.id, cachedPresence);
      }
    });
    return presenceMap;
  }

  /**
   * Set a presence in this guild's presence cache.
   * @private
   *
   * @param {Object<string, any>} presence
   */
  setPresence(presence) {
    this.presences.set(presence.user.id, presence);
  }

  /**
   * Remove a presence from this guild's presence cache.
   * @private
   *
   * @param {string} userId
   */
  deletePresence(userId) {
    this.presences.delete(userId);
  }

  /**
   * Cache members and create a map of them keyed to their user ids.
   * @private
   *
   * @param {Object<string, any>[]} members https://discordapp.com/developers/docs/resources/guild#guild-member-object
   */
  static mapMembers(members, guild, client) {
    members.forEach((m) => guild.upsertMember(m, client));
  }

  /**
   * Add a member with some additional information to a map of members.
   * @private
   *
   * @param {Object} member https://discordapp.com/developers/docs/resources/guild#guild-member-object
   * @param {Paracord} client
   */
  upsertMember(member, client) {
    const now = new Date().getTime();
    const readOnly = {
      get cachedTimestamp() {
        return now;
      },
    };

    member = { ...member, ...readOnly };

    member.user = client.upsertUser(member.user);

    const cachedMember = this.members.get(member.user.id);
    if (cachedMember !== undefined) {
      member = Object.assign(cachedMember, member);
    } else {
      this.members.set(member.user.id, member);
    }

    if (this.owner_id === member.user.id) {
      this.owner = cachedMember;
    }

    return member;
  }

  // /**
  //  * Asynchronously gets the the bot's member object from Discord and stores it in the guild.
  //  * @private
  //  *
  //  * @param {Object} guild https://discordapp.com/developers/docs/resources/guild#guild-object
  //  * @returns {void} guild.me <- https://discordapp.com/developers/docs/resources/guild#guild-member-object-guild-member-structure
  //  */
  // async lazyLoadGuildMe(client) {
  //   const res = await client.fetchMember(this, client.user.id);

  //   if (res.status === 200) {
  //     // eslint-disable-next-line require-atomic-updates
  //     this.me = res.data;

  //     return this.me;
  //   } else {
  //     console.error(`Unable to get me for ${this.name} (ID: ${this.id}).`);
  //   }
  // }
};
