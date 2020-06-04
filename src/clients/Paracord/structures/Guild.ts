import { PERMISSIONS } from '../../../constants';
import {
  DefaultMessageNotificationLevel, EmojiMap, ExplicitContentFilterLevel, GuildChannel, GuildChannelMap, GuildEmoji, GuildFeature, GuildMember, GuildMemberMap, GuildMemberUpdateEventFields, GuildRole, GuildVoiceState, ISO8601timestamp, MFALevel, PremiumTier, PresenceMap, RawChannel, RawEmoji, RawGuild, RawGuildMember, RawPresence, RawRole, RawVoiceState, RoleMap, Snowflake, SystemChannelFlags, VerificationLevel, VoiceRegion, VoiceStateMap,
} from '../../../types';
import { computeChannelPerms, computeGuildPerms, timestampFromSnowflake } from '../../../utils';
import Paracord from '../Paracord';

/** A Discord guild. */
export default class Guild {
  /** guild id */
  public readonly id!: Snowflake;

  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  public readonly name!: string;

  /** icon hash */
  public readonly icon!: string | null;

  /** splash hash */
  public readonly splash!: string | null;

  /** discovery splash hash; only present for guilds with the "DISCOVERABLE" feature */
  public readonly discoverySplash!: string | null;

  /** id of owner */
  public readonly ownerId!: Snowflake;

  // /** total permissions for the user in the guild (excludes overrides) */
  // public get permissions(): number {
  //   return this.hasPermission;
  // }

  /** voice region id for the guild */
  public readonly region!: VoiceRegion;

  /** id of afk channel */
  public readonly afkChannelId!: Snowflake | null;

  /** afk timeout in seconds */
  public readonly afkTimeout!: number;

  /** true if the server widget is enabled (deprecated, replaced with `widget_enabled`) */
  public readonly embedEnabled?: boolean;

  /** the channel id that the widget will generate an invite to, or `null` if set to no invite (deprecated, replaced with `widget_channel_id`) */
  public readonly embedChannelId?: Snowflake | null;

  /** verification level required for the guild */
  public readonly verificationLevel!: VerificationLevel;

  /** default message notification level */
  public readonly defaultMessageNotifications!: DefaultMessageNotificationLevel;

  /** explicit content filter level */
  public readonly explicitContentFilter!: ExplicitContentFilterLevel;

  /** roles in the guild */
  public readonly roles: RoleMap;

  /** custom guild emojis */
  public readonly emojis: EmojiMap;

  /** enabled guild features */
  public readonly features!: GuildFeature[];

  /** required MFA Level for the guild */
  public readonly mfaLevel!: MFALevel;

  /** application id of the guild creator if it is bot-created */
  public readonly applicationId!: Snowflake | null;

  /** true if the server widget is enabled */
  public readonly widgetEnabled?: boolean;

  /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
  public readonly widgetChannelId?: Snowflake | null;

  /** the id of the channel where guild notices such as welcome messages and boost events are posted */
  public readonly systemChannelId!: Snowflake | null;

  /** system channel flags */
  public readonly systemChannelFlags!: SystemChannelFlags;

  /** the id of the channel where guilds with the "PUBLIC" feature can display rules and/or guidelines */
  public readonly rulesChannelId!: Snowflake | null;

  /** when this guild was joined at */
  public readonly joinedAt!: ISO8601timestamp;

  /** true if this is considered a large guild */
  public readonly large?: boolean;

  /** true if this guild is unavailable due to an outage */
  public unavailable: boolean;

  /** total number of members in this guild */
  public memberCount?: number;

  /** states of members currently in voice channels; lacks the `guild_id` key */
  public readonly voiceStates: VoiceStateMap;

  /** users in the guild */
  public readonly members: GuildMemberMap;

  /** channels in the guild */
  public readonly channels: GuildChannelMap;

  /** presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  public readonly presences: PresenceMap;

  /** the maximum number of presences for the guild (the default value, currently 25000, is in effect when `null` is returned) */
  public readonly maxPresences?: number | null;

  /** the maximum number of members for the guild */
  public readonly maxMembers?: number;

  /** the vanity url code for the guild */
  public readonly vanityUrlCode!: string | null;

  /** the description for the guild, if the guild is discoverable */
  public readonly description!: string | null;

  /** banner hash */
  public readonly banner!: string | null;

  /** server Boost level */
  public readonly premiumTier!: PremiumTier;

  /** the number of boosts this guild currently has */
  public readonly premiumSubscriptionCount?: number;

  /** the preferred locale of a guild with the "PUBLIC" feature; used in server discovery and notices from Discord; defaults to "en-US" */
  public readonly preferredLocale!: string;

  /** the id of the channel where admins and moderators of guilds with the "PUBLIC" feature receive notices from Discord */
  public readonly publicUpdatesChannelId!: Snowflake | null;

  /** the maximum amount of users in a video channel */
  public readonly maxVideoChannelUsers?: number;

  /** The guild owner's member object if cached. */
  public owner?: GuildMember;

  /** The bot's member object. */
  public me!: GuildMember;

  /** Shard id of the gateway connection this guild originated from. */
  public readonly shard: number;

  /**
   * Creates a new guild object.
   * @param guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   * @param shard Shard id of the gateway connection this guild originated from.
   */
  public constructor(guildCreate: Partial<RawGuild>, client: Paracord, shard: number) {
    this.members = new Map();
    this.channels = new Map();
    this.presences = new Map();
    this.voiceStates = new Map();
    this.roles = new Map();
    this.emojis = new Map();
    this.unavailable = guildCreate.unavailable ?? false;
    this.shard = shard;

    this.mergeGuildData(guildCreate, client);
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number {
    return timestampFromSnowflake(this.id);
  }

  /*
   ********************************
   ********* CONSTRUCTOR **********
   ********************************
   */

  /**
   * Replace caches with newly received information about a guild.
   * @param guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   */
  public mergeGuildData(guildData: Partial<RawGuild>, client: Paracord): Guild {
    if (guildData.channels !== undefined && this.channels !== undefined) {
      guildData.channels.forEach((c) => this.upsertChannel(c));
      delete guildData.channels;
    }

    if (guildData.roles !== undefined) {
      guildData.roles.forEach((r) => this.upsertRole(r));
      delete guildData.roles;
    }

    if (guildData.emojis !== undefined) {
      guildData.emojis.forEach((e) => this.upsertEmoji(e));
      delete guildData.emojis;
    }

    if (guildData.members !== undefined) {
      guildData.members.forEach((m) => this.upsertMember(m, client));
      delete guildData.members;
    }

    if (guildData.voiceStates !== undefined) {
      guildData.voiceStates.forEach((v) => this.upsertVoiceState(v, client));
      delete guildData.voiceStates;
    }

    if (guildData.presences !== undefined) {
      guildData.presences.forEach((p) => this.upsertPresence(p, client));
      delete guildData.presences;
    }

    Object.assign(this, guildData);

    return this;
  }

  // /*
  //  ********************************
  //  *********** PUBLIC ************
  //  ********************************
  //  */

  /**
   * Checks if the user has a specific permission in this guild.
   * @returns `true` if member has the permission.
   */
  public hasPermission(permission: number, member: GuildMember, adminOverride = true): boolean {
    const perms = computeGuildPerms({ member, guild: this, stopOnOwnerAdmin: adminOverride });

    if (perms & PERMISSIONS.ADMINISTRATOR && adminOverride) {
      return true;
    }
    return Boolean(perms & permission);
  }

  /**
   * Checks if the user has a specific permission for a channel in this guild.
   * @returns `true` if member has the permission.
   */
  public hasChannelPermission(permission: number, member: GuildMember, channel: GuildChannel | Snowflake, stopOnOwnerAdmin = true): boolean {
    if (typeof channel === 'string') {
      channel = this.channels.get(channel) ?? channel;
    }

    if (typeof channel === 'string') {
      throw Error('channel not found'); // TODO: better error design
    }

    const perms = computeChannelPerms({
      member, guild: this, channel, stopOnOwnerAdmin,
    });

    if (perms & PERMISSIONS.ADMINISTRATOR && stopOnOwnerAdmin) {
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
   * @param channel https://discordapp.com/developers/docs/resources/channel#channel-object-channel-structure
   */
  public upsertChannel(channel: RawChannel): GuildChannel {
    const { channels } = this;
    const cachedChannel = <GuildChannel>Object.assign(channels.get(channel.id) || {}, channel);
    channels.set(channel.id, cachedChannel);
    cachedChannel.guildId = this.id;

    return cachedChannel;
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param role https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public upsertRole(role: RawRole): GuildRole {
    const { roles } = this;

    const cachedRole = <GuildRole>Object.assign(roles.get(role.id) || {}, role);
    roles.set(role.id, cachedRole);

    return cachedRole;
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param emoji https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  private upsertEmoji(emoji: RawEmoji): RawEmoji | GuildEmoji {
    const { id } = emoji;
    const { emojis } = this;

    if (id !== null) {
      emoji = <GuildEmoji>Object.assign(emojis.get(id) || {}, emoji);
      emojis.set(id, emoji);
    }

    return emoji;
  }

  /**
   * Add a member with some additional information to a map of members.
   * @param member https://discordapp.com/developers/docs/resources/guild#guild-member-object
   * @param client
   */
  public upsertMember(member: RawGuildMember | GuildMemberUpdateEventFields, client: Paracord): GuildMember {
    const { user } = member;

    const now = new Date().getTime();
    const readOnly = {
      get cachedTimestamp() {
        return now;
      },
    };

    member = { ...member, ...readOnly };

    member.user = client.upsertUser(user);

    const { members } = this;
    const cachedMember = <GuildMember>Object.assign(members.get(user.id) || {}, member);
    members.set(user.id, cachedMember);


    if (this.ownerId === user.id) {
      this.owner = cachedMember;
    }
    if (client.user.id === user.id) {
      this.me = cachedMember;
    }

    return <GuildMember>member;
  }

  /**
   * Add a role to a map of voice states.
   * @param voiceState https://discordapp.com/developers/docs/resources/voice
   * @param client
   */
  public upsertVoiceState(voiceState: RawVoiceState, client: Paracord): GuildVoiceState {
    const { userId, member } = voiceState;

    const cachedMember = this.members.get(userId) ?? (member !== undefined ? this.upsertMember(member, client) : undefined);

    if (cachedMember !== undefined) {
      voiceState.member = cachedMember;
    }

    const { voiceStates } = this;
    voiceStates.set(userId, <GuildVoiceState>voiceState);

    return <GuildVoiceState>voiceState;
  }

  /**
   * Create a map of presences keyed to their user's ids.
   * @param presence https://discordapp.com/developers/docs/topics/gateway#presence-update-presence-update-event-fields
   * @param client
   */
  private upsertPresence(presence: RawPresence, client: Paracord): RawPresence {
    const { presences } = this;

    const cachedPresence = <RawPresence | undefined>client.updatePresences(presence);
    if (cachedPresence !== undefined) {
      presences.set(cachedPresence.user.id, cachedPresence);
    }

    return <RawPresence>presence;
  }

  /**
   * Set a presence in this guild's presence cache.
   * @param presence
   */
  public setPresence(presence: RawPresence): void {
    this.presences.set(presence.user.id, presence);
  }

  /**
   * Remove a presence from this guild's presence cache.
   * @param userId
   */
  public deletePresence(userId: Snowflake): void {
    this.presences.delete(userId);
  }

  // /**
  //  * Asynchronously gets the the bot's member object from Discord and stores it in the guild.
  //  * @param {Object} guild https://discordapp.com/developers/docs/resources/guild#guild-object
  //  * @returns {void} guild.me <- https://discordapp.com/developers/docs/resources/guild#guild-member-object-guild-member-structure
  //  */
  // private async lazyLoadGuildMe(client) Promise<GuildMember> | undefined {
  //   const res = await client.fetchMember(this, client.user.id);

  //   if (res.status === 200) {
  //     // eslint-disable-next-line require-atomic-updates
  //     this.me = res.data;

  //     return this.me;
  //   } else {
  //     console.error(`Unable to get me for ${this.name} (ID: ${this.id}).`);
  //   }
  // }
}
