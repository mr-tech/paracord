/* eslint-disable max-classes-per-file */

import { PERMISSIONS } from '../../../../../constants';
import {
  AugmentedRawGuild, AugmentedRawGuildMember, AugmentedRawVoiceState, DefaultMessageNotificationLevel, ExplicitContentFilterLevel, GuildFeature, GuildMemberUpdateEventFields, ISO8601timestamp, MFALevel, PremiumTier, RawChannel, RawPresence, RawRole, Snowflake, SystemChannelFlags, UnavailableGuild, VerificationLevel, VoiceRegion,
} from '../../../../../types';
import { computeChannelPerms, computeGuildPerms } from '../../../../../utils';
import Paracord from '../../../Paracord';
import {
  EmojiMap, FilteredProps, GuildChannelMap, GuildMemberMap, PresenceMap, RoleMap, VoiceStateMap, RawGuildType,
} from '../../../types';
import CacheMap from '../../CacheMap';
import Resource from '../../Resource';
import Emoji from './Emoji';
import GuildChannel from './GuildChannel';
import GuildMember from './GuildMember';
import GuildVoiceState from './GuildVoiceState';
import Presence from './Presence';
import Role from './Role';

// const props: GuildPropFilter = ['name', 'icon', 'splash', 'discoverySplash', 'ownerId', 'region', 'afkChannelId',
//   'afkTimeout', 'embedEnabled', 'embedChannelId', 'verificationLevel', 'defaultMessageNotifications',
//   'explicitContentFilter', 'features', 'mfaLevel', 'applicationId', 'widgetEnabled', 'widgetChannelId',
//   'systemChannelId', 'systemChannelFlags', 'rulesChannelId', 'joinedAt', 'large', 'unavailable',
//   'memberCount', 'maxPresences', 'vanityUrlCode', 'description', 'banner', 'premiumTier',
//   'premiumSubscriptionCount', 'preferredLocale', 'publicUpdatesChannelId', 'maxVideoChannelUsers',
//   'owner', 'me', 'roles', 'emojiIds', 'channelIds', 'memberIds', 'presenceIds', 'voiceStateIds'];
// const caches: GuildCacheFilter = ['roles', 'emojis', 'channels', 'members', 'presences', 'voiceStates'];


/** A Discord guild. */
export default class Guild extends Resource<Guild, RawGuildType> {
  #client: Paracord;

  /** roles in the guild */
  #roles: RoleMap | undefined;

  /** custom guild emojis */
  #emojis: EmojiMap | undefined;

  /** users in the guild */
  #members: GuildMemberMap | undefined;

  /** channels in the guild */
  #channels: GuildChannelMap| undefined;

  /** presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  #presences: PresenceMap | undefined;

  /** states of members currently in voice channels | undefined; lacks the `guild_id` key */
  #voiceStates: VoiceStateMap | undefined;

  /** true if this guild is unavailable due to an outage */
  public unavailable: boolean | undefined;

  /** total number of members in this guild */
  public memberCount: number | undefined;

  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  public name: string | undefined;

  /** icon hash */
  public icon: string | null | undefined;

  /** splash hash */
  public splash: string | null | undefined;

  /** discovery splash hash | undefined; only present for guilds with the "DISCOVERABLE" feature */
  public discoverySplash: string | null | undefined;

  /** id of owner */
  public ownerId: Snowflake | undefined;

  /** The guild owner's member object if cached. */
  public owner: GuildMember | undefined;

  /** The bot's member object. */
  public me: GuildMember | undefined;

  /** voice region id for the guild */
  public region: VoiceRegion | undefined;

  /** id of afk channel */
  public afkChannelId: Snowflake | null | undefined;

  public afkChannel: GuildChannel | undefined;

  /** afk timeout in seconds */
  public afkTimeout: number | undefined;

  /** verification level required for the guild */
  public verificationLevel: VerificationLevel | undefined;

  /** default message notification level */
  public defaultMessageNotifications: DefaultMessageNotificationLevel | undefined;

  /** explicit content filter level */
  public explicitContentFilter: ExplicitContentFilterLevel | undefined;

  /** enabled guild features */
  public features: GuildFeature[] | undefined;

  /** required MFA Level for the guild */
  public mfaLevel: MFALevel | undefined;

  /** application id of the guild creator if it is bot-created */
  public applicationId: Snowflake | null | undefined;

  /** true if the server widget is enabled */
  public widgetEnabled: boolean | undefined;

  /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
  public widgetChannelId: Snowflake | null | undefined;

  public widgetChannel: GuildChannel | undefined;

  /** the id of the channel where guild notices such as welcome messages and boost events are posted */
  public systemChannelId: Snowflake | null | undefined;

  public systemChannel: GuildChannel | undefined;

  /** system channel flags */
  public systemChannelFlags: SystemChannelFlags | undefined;

  /** the id of the channel where guilds with the "PUBLIC" feature can display rules and/or guidelines */
  public rulesChannelId: Snowflake | null | undefined;

  public rulesChannel: GuildChannel | undefined;

  /** when this guild was joined at */
  public joinedAt: ISO8601timestamp | undefined;

  /** true if this is considered a large guild */
  public large: boolean | undefined;

  /** the maximum number of presences for the guild (the default value, currently 25000, is in effect when `null` is returned) */
  public maxPresences: number | null | undefined;

  /** the maximum number of members for the guild */
  public maxMembers: number | undefined;

  /** the vanity url code for the guild */
  public vanityUrlCode: string | null | undefined;

  /** the description for the guild, if the guild is discoverable */
  public description: string | null | undefined;

  /** banner hash */
  public banner: string | null | undefined;

  /** server Boost level */
  public premiumTier: PremiumTier | undefined;

  /** the number of boosts this guild currently has */
  public premiumSubscriptionCount: number | undefined;

  /** the preferred locale of a guild with the "PUBLIC" feature | undefined; used in server discovery and notices from Discord | undefined; defaults to "en-US" */
  public preferredLocale: string | undefined;

  /** the id of the channel where admins and moderators of guilds with the "PUBLIC" feature receive notices from Discord */
  public publicUpdatesChannelId: Snowflake | null | undefined;

  public publicUpdatesChannel: GuildChannel | undefined;

  /** the maximum amount of users in a video channel */
  public maxVideoChannelUsers: number | undefined;

  /** Shard id of the gateway connection this guild originated from. */
  public shard: number | undefined;

  // /** total permissions for the user in the guild (excludes overrides) */
  // public get permissions(): number {
  //   return this.hasPermission | undefined;
  // }

  /**
   * Creates a new guild object.
   * @param guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   * @param shard Shard id of the gateway connection this guild originated from.
   */
  public constructor(
    filteredProps: FilteredProps<Guild, RawGuildType> | undefined,
    guild: RawGuildType,
    client: Paracord,
    shard: number,
  ) {
    super(filteredProps, guild.id); // TODO

    this.#client = client;
    this.shard = shard;

    const { unavailable } = guild;

    this.unavailable = unavailable ?? false;

    const {
      role, emoji, guildMember, guildChannel, presence, guildVoiceState,
    } = (client.filterOptions?.props ?? {});
    const {
      roles, emojis, guildMembers, guildChannels, presences, guildVoiceStates,
    } = (client.filterOptions?.caches ?? {});

    if (roles ?? true) this.#roles = new CacheMap(Role, role);
    if (emojis ?? true) this.#emojis = new CacheMap(Emoji, emoji);
    if (presences ?? true) this.#presences = new CacheMap(Presence, presence);
    if (guildMembers ?? true) this.#members = new CacheMap(GuildMember, guildMember);
    if (guildChannels ?? true) this.#channels = new CacheMap(GuildChannel, guildChannel);
    if (guildVoiceStates ?? true) this.#voiceStates = new CacheMap(GuildVoiceState, guildVoiceState);

    if (!unavailable) {
      this.constructCaches(<AugmentedRawGuild>guild);
      this.update(<AugmentedRawGuild>guild);
    }
  }

  public get client(): Paracord {
    return this.#client;
  }

  public get roles(): RoleMap {
    if (this.#roles === undefined) throw Error('roles are not cached');
    return this.#roles;
  }

  public get emojis(): EmojiMap {
    if (this.#emojis === undefined) throw Error('emojis are not cached');
    return this.#emojis;
  }

  public get members(): GuildMemberMap {
    if (this.#members === undefined) throw Error('members are not cached');
    return this.#members;
  }

  public get channels(): GuildChannelMap {
    const channels = this.#channels;
    if (channels === undefined) throw Error('channels are not cached');
    return channels;
  }

  public get presences(): PresenceMap {
    if (this.#presences === undefined) throw Error('presences are not cached');
    return this.#presences;
  }

  public get voiceStates(): VoiceStateMap {
    if (this.#voiceStates === undefined) throw Error('voiceStates are not cached');
    return this.#voiceStates;
  }

  public get unsafe_roles(): RoleMap | undefined {
    return this.#roles;
  }

  public get unsafe_emojis(): EmojiMap | undefined {
    return this.#emojis;
  }

  public get unsafe_members(): GuildMemberMap | undefined {
    return this.#members;
  }

  public get unsafe_channels(): GuildChannelMap | undefined {
    return this.#channels;
  }

  public get unsafe_presences(): PresenceMap | undefined {
    return this.#presences;
  }

  public get unsafe_voiceStates(): VoiceStateMap | undefined {
    return this.#voiceStates;
  }

  /*
   ********************************
   ********* CONSTRUCTOR **********
   ********************************
   */

  private constructCaches(guildData: AugmentedRawGuild): void {
    const {
      channels, roles, emojis, members, voice_states, presences,
    } = guildData;

    if (channels !== undefined && this.#channels !== undefined) {
      channels.forEach((c) => this.insertChannel(c));
    }

    if (members !== undefined && this.#members !== undefined) {
      members.forEach((m) => this.upsertMember(m));
    }

    if (roles !== undefined && this.#roles !== undefined) {
      roles.forEach((r) => this.insertRole(r));
    }

    if (presences !== undefined && this.#presences !== undefined) {
      presences.forEach((p) => this.insertPresence(p));
    }

    if (voice_states !== undefined && this.#voiceStates !== undefined) {
      voice_states.forEach((v) => this.insertVoiceState(v));
    }

    if (emojis !== undefined && this.#emojis !== undefined) {
      this.updateEmojiCache(emojis);
    }
  }

  /**
   * Replace caches with newly received information about a guild.
   * @param guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   */
  public update(guildData: RawGuildType): this {
    if (!guildData.unavailable && this.unavailable) {
      this.constructCaches(guildData);
    }

    return super.update(guildData);
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
    if (this.#roles === undefined) throw Error('roles are not cached');

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
    if (this.#roles === undefined) throw Error('roles are not cached');
    if (this.#channels === undefined) throw Error('channels are not cached');

    if (typeof channel === 'string') {
      channel = this.#channels.get(channel) ?? channel;
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

  // private static removeFromCache(cache: Map<string, WildCardCache> | undefined, idCache: Snowflake[] | undefined, id: Snowflake): WildCardCache | undefined {
  private static removeFromCache<T, U extends Map<Snowflake, T>>(cache: U, id: Snowflake): T | undefined {
    if (cache === undefined) return undefined;

    const resource = cache.get(id);
    cache.delete(id);
    return resource;
  }

  /**
   * Add a channel with some additional information to a map of channels.
   * @param channel https://discordapp.com/developers/docs/resources/channel#channel-object-channel-structure
   */
  // TODO: NO
  public insertChannel(channel: RawChannel): GuildChannel | undefined {
    const channels = this.#channels;
    if (channels === undefined) return undefined;

    const { id } = channel;
    const guildChannel = channels.add(id, channel);
    if ((this.afkChannelId ?? false) && id === this.afkChannelId) this.afkChannel = guildChannel;
    if ((this.rulesChannelId ?? false) && id === this.rulesChannelId) this.rulesChannel = guildChannel;
    if ((this.systemChannelId ?? false) && id === this.systemChannelId) this.systemChannel = guildChannel;
    if ((this.widgetChannelId ?? false) && id === this.widgetChannelId) this.widgetChannel = guildChannel;
    if ((this.publicUpdatesChannelId ?? false) && id === this.publicUpdatesChannelId) this.publicUpdatesChannel = guildChannel;

    return guildChannel;
  }

  public updateChannel(channel: RawChannel): GuildChannel | undefined {
    const channels = this.#channels;
    if (channels === undefined) return undefined;

    const { id } = channel;
    const cachedChannel = channels.get(id);
    if (cachedChannel !== undefined) {
      return cachedChannel.update(channel);
    }

    return this.insertChannel(channel);
  }

  public removeChannel(id: Snowflake): GuildChannel | undefined {
    return this.#channels && Guild.removeFromCache(this.#channels, id);
  }

  /**
   * Add a member with some additional information to a map of members.
   * @param member https://discordapp.com/developers/docs/resources/guild#guild-member-object
   */
  public upsertMember(member: AugmentedRawGuildMember): GuildMember | undefined {
    const members = this.#members;
    if (members === undefined) return undefined;

    const { user, user: { id } } = member;
    const cachedMember = this.updateMember(member) ?? members.add(id, member, user, this);

    if (this.owner === undefined && this.ownerId === id) {
      this.owner = cachedMember;
      this.ownerId = id;
    }
    if (this.me === undefined && this.#client.user.id === id) {
      this.me = cachedMember;
      user.id = this.#client.user.id;
    }

    return cachedMember;
  }

  public updateMember(member: GuildMemberUpdateEventFields | AugmentedRawGuildMember): GuildMember | undefined {
    return this.#members?.get(member.user.id)?.update(member);
  }

  public removeMember(id: Snowflake): GuildMember | undefined {
    const presences = this.#presences;
    if (presences !== undefined) presences.delete(id);
    return this.#members && Guild.removeFromCache(this.#members, id);
  }

  public incrementMemberCount(): void {
    this.memberCount !== undefined && ++this.memberCount;
  }

  public decrementMemberCount(): void{
    this.memberCount !== undefined && --this.memberCount;
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param role https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public insertRole(role: RawRole): Role | undefined {
    const roles = this.#roles;
    if (roles === undefined) return undefined;

    const { id } = role;
    return roles.add(id, role);
  }

  public upsertRole(role: RawRole): Role | undefined {
    const roles = this.#roles;
    if (roles === undefined) return undefined;

    const { id } = role;
    const cachedRole = roles.get(id);
    if (cachedRole !== undefined) {
      return cachedRole.update(role);
    }

    return this.insertRole(role);
  }

  public removeRole(id: Snowflake): Role | undefined {
    return this.#roles && Guild.removeFromCache(this.#roles, id);
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param emoji https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public updateEmojiCache(emojis: Emoji[]): [Emoji[], Emoji[]] | undefined {
    const emojiCache = this.#emojis;
    if (emojiCache === undefined) return undefined;

    const removedEmojis = Array.from(emojiCache.values());
    const newEmojis: Emoji[] = [];
    while (emojis.length) {
      const emoji = <Emoji>emojis.shift();
      const { id } = emoji;
      const cachedEmoji = emojiCache.get(id);
      if (cachedEmoji !== undefined) {
        removedEmojis.splice(removedEmojis.indexOf(emoji), 1);
      } else {
        newEmojis.push(emojiCache.add(id, emoji));
      }
    }
    removedEmojis.forEach(({ id }) => emojiCache.delete(id));
    return [newEmojis, removedEmojis];
  }

  /**
   * Add a role to a map of voice states.
   * @param voiceState https://discordapp.com/developers/docs/resources/voice
   * @param client
   */
  public insertVoiceState(voiceState: AugmentedRawVoiceState): GuildVoiceState | undefined {
    const voiceStates = this.#voiceStates;
    if (voiceStates === undefined) return undefined;

    const { user_id: userId, member } = voiceState;

    const cachedMember = this.upsertMember(member);
    const user = cachedMember?.user ?? this.#client.users?.get(userId);

    return voiceStates.add(userId, voiceState, user, member);
  }

  /**
   * Create a map of presences keyed to their user's ids.
   * @param presence https://discordapp.com/developers/docs/topics/gateway#presence-update-presence-update-event-fields
   * @param client
   */
  private insertPresence(presence: RawPresence): RawPresence | undefined {
    const presences = this.#presences;
    if (presences === undefined) return undefined;

    const cachedPresence = this.#client.updatePresences(presence);
    if (cachedPresence !== undefined) {
      presences.set(cachedPresence.user.id, cachedPresence);
    }

    return <RawPresence>presence;
  }

  /**
   * Set a presence in this guild's presence cache.
   * @param presence
   */
  public setPresence(presence: Presence): void {
    this.#presences?.set(presence.user.id, presence);
  }

  /**
   * Remove a presence from this guild's presence cache.
   * @param userId
   */
  public deletePresence(userId: Snowflake): void {
    this.#presences?.delete(userId);
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
