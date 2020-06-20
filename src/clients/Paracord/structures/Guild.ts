/* eslint-disable max-classes-per-file */

import { PERMISSIONS } from '../../../constants';
import {
  AugmentedRawGuild, AugmentedRawGuildMember, AugmentedRawVoiceState, DefaultMessageNotificationLevel, ExplicitContentFilterLevel, GuildFeature, GuildMemberUpdateEventFields, ISO8601timestamp, MFALevel, PremiumTier, RawChannel, RawPresence, RawRole, RawUser, Snowflake, SystemChannelFlags, UnavailableGuild, VerificationLevel, VoiceRegion,
} from '../../../types';
import { computeChannelPerms, computeGuildPerms, timestampFromSnowflake } from '../../../utils';
import Paracord from '../Paracord';
import {
  FilteredProps, GuildCacheFilter, GuildChannelMap, GuildMemberMap,
} from '../types';
import Base from './Base';
import CacheMap from './CacheMap';
import GuildChannel from './GuildChannel';
import GuildMember from './GuildMember';

// const props: GuildPropFilter = ['name', 'icon', 'splash', 'discoverySplash', 'ownerId', 'region', 'afkChannelId',
//   'afkTimeout', 'embedEnabled', 'embedChannelId', 'verificationLevel', 'defaultMessageNotifications',
//   'explicitContentFilter', 'features', 'mfaLevel', 'applicationId', 'widgetEnabled', 'widgetChannelId',
//   'systemChannelId', 'systemChannelFlags', 'rulesChannelId', 'joinedAt', 'large', 'unavailable',
//   'memberCount', 'maxPresences', 'vanityUrlCode', 'description', 'banner', 'premiumTier',
//   'premiumSubscriptionCount', 'preferredLocale', 'publicUpdatesChannelId', 'maxVideoChannelUsers',
//   'owner', 'me', 'roles', 'emojiIds', 'channelIds', 'memberIds', 'presenceIds', 'voiceStateIds'];
// const caches: GuildCacheFilter = ['roles', 'emojis', 'channels', 'members', 'presences', 'voiceStates'];

type WildCardCache = GuildChannel | GuildMember | GuildRole | GuildEmoji | GuildVoiceState | Presence | undefined

/** A Discord guild. */
export default class Guild extends Base<Guild> {
  /** guild id */
  #id: Snowflake;

  #client: Paracord;

  /** channels in the guild */
  #channels: GuildChannelMap | undefined;

  /** users in the guild */
  #members: GuildMemberMap | undefined;

  /** roles in the guild */
  #roles: RoleMap | undefined;

  /** custom guild emojis */
  #emojis: EmojiMap | undefined;

  /** states of members currently in voice channels; lacks the `guild_id` key */
  #voiceStates: VoiceStateMap | undefined;

  /** presences of the members in the guild, will only include non-offline members if the size is greater than `large threshold` */
  #presences: PresenceMap | undefined;

  /** true if this guild is unavailable due to an outage */
  public unavailable: boolean;

  /** total number of members in this guild */
  public memberCount?: number;

  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  public readonly name!: string;

  /** icon hash */
  public readonly icon!: string | null;

  /** splash hash */
  public readonly splash!: string | null;

  /** discovery splash hash; only present for guilds with the "DISCOVERABLE" feature */
  public readonly discoverySplash!: string | null;

  /** id of owner */
  public ownerId!: Snowflake;

  /** voice region id for the guild */
  public readonly region!: VoiceRegion;

  /** id of afk channel */
  public readonly afkChannelId!: Snowflake | null;

  public afkChannel: GuildChannel | undefined;

  /** afk timeout in seconds */
  public readonly afkTimeout!: number;

  /** verification level required for the guild */
  public readonly verificationLevel!: VerificationLevel;

  /** default message notification level */
  public readonly defaultMessageNotifications!: DefaultMessageNotificationLevel;

  /** explicit content filter level */
  public readonly explicitContentFilter!: ExplicitContentFilterLevel;

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

  public widgetChannel: GuildChannel | undefined;

  /** the id of the channel where guild notices such as welcome messages and boost events are posted */
  public readonly systemChannelId!: Snowflake | null;

  public systemChannel: GuildChannel | undefined;

  /** system channel flags */
  public readonly systemChannelFlags!: SystemChannelFlags;

  /** the id of the channel where guilds with the "PUBLIC" feature can display rules and/or guidelines */
  public readonly rulesChannelId!: Snowflake | null;

  public rulesChannel: GuildChannel | undefined;

  /** when this guild was joined at */
  public readonly joinedAt!: ISO8601timestamp;

  /** true if this is considered a large guild */
  public readonly large?: boolean;

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

  public publicUpdatesChannel: GuildChannel | undefined;

  /** the maximum amount of users in a video channel */
  public readonly maxVideoChannelUsers?: number;

  /** Shard id of the gateway connection this guild originated from. */
  public readonly shard: number;

  // Paracord Properties

  /** The guild owner's member object if cached. */
  public owner: GuildMember | undefined;

  /** The bot's member object. */
  public me: GuildMember | undefined;

  // /** total permissions for the user in the guild (excludes overrides) */
  // public get permissions(): number {
  //   return this.hasPermission;
  // }

  /**
   * Creates a new guild object.
   * @param guildData From Discord - The guild. https://discordapp.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   * @param shard Shard id of the gateway connection this guild originated from.
   */
  public constructor(filteredCaches: GuildCacheFilter, filteredProps: Partial<FilteredProps<Guild>> | undefined, guildData: AugmentedRawGuild | UnavailableGuild, client: Paracord, shard: number) {
    super(filteredProps); // TODO

    this.#client = client;
    this.shard = shard;

    const { id, unavailable } = guildData;

    this.#id = id;
    this.unavailable = unavailable ?? false;

    const {
      filteredOptions: {
        role, emoji, member, channel, presence, voiceState,
      },
    } = client;
    if (filteredCaches.includes('roles')) this.#roles = new CacheMap(role, Role);
    if (filteredCaches.includes('emojis')) this.#emojis = new CacheMap(emoji, Emoji);
    if (filteredCaches.includes('members')) this.#members = new CacheMap(GuildMember, member);
    if (filteredCaches.includes('channels')) this.#channels = new CacheMap(GuildChannel, channel);
    if (filteredCaches.includes('presences')) this.#presences = new CacheMap(presence, Presence);
    if (filteredCaches.includes('voiceStates')) this.#voiceStates = new CacheMap(voiceState, VoiceState);
    // TODO initialize caches from config

    if (!unavailable) {
      this.constructCaches(<AugmentedRawGuild>guildData);
      this.update(<AugmentedRawGuild>guildData);
    }
  }

  public get client(): Paracord {
    return this.#client;
  }

  public get channels(): GuildChannelMap {
    const channels = this.#channels;
    if (channels === undefined) throw Error('channels are not cached');
    return channels;
  }

  public get members(): GuildMemberMap {
    if (this.#members === undefined) throw Error('members are not cached');
    return this.#members;
  }

  public get presences(): PresenceMap {
    if (this.#presences === undefined) throw Error('presences are not cached');
    return this.#presences;
  }

  public get voiceStates(): VoiceStateMap {
    if (this.#voiceStates === undefined) throw Error('voiceStates are not cached');
    return this.#voiceStates;
  }

  public get roles(): RoleMap {
    if (this.#roles === undefined) throw Error('roles are not cached');
    return this.#roles;
  }

  public get emojis(): EmojiMap {
    if (this.#emojis === undefined) throw Error('emojis are not cached');
    return this.#emojis;
  }

  public get unsafe_channels(): GuildChannelMap | undefined {
    return this.#channels;
  }

  public get unsafe_members(): GuildMemberMap | undefined {
    return this.#members;
  }

  public get unsafe_presences(): PresenceMap | undefined {
    return this.#presences;
  }

  public get unsafe_voiceStates(): VoiceStateMap | undefined {
    return this.#voiceStates;
  }

  public get unsafe_roles(): RoleMap | undefined {
    return this.#roles;
  }

  public get unsafe_emojis(): EmojiMap | undefined {
    return this.#emojis;
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
  public update(guildData: AugmentedRawGuild): void {
    if (!guildData.unavailable && this.unavailable) {
      this.constructCaches(guildData);
    }

    super.update(guildData);
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
  private static removeFromCache(cache: Map<string, WildCardCache> | undefined, id: Snowflake): WildCardCache | undefined {
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
    const guildChannel = this.cacheChannel(channels, id, channel);
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
    if (cachedChannel === undefined) {
      return this.cacheChannel(channels, id, channel);
    }

    return <GuildChannel>Object.assign(cachedChannel, channel);
  }

  private cacheChannel(channels: GuildChannelMap, id: RawChannel['id'], channel: RawChannel): GuildChannel {
    (<GuildChannel>channel).guild = this;
    channels.set(id, <GuildChannel>channel);

    return <GuildChannel>channel;
  }

  public removeChannel(id: RawChannel['id']): GuildChannel | undefined {
    return <GuildChannel | undefined>Guild.removeFromCache(this.#channels, id);
  }

  /**
   * Add a member with some additional information to a map of members.
   * @param member https://discordapp.com/developers/docs/resources/guild#guild-member-object
   * @param client
   */
  public upsertMember(member: AugmentedRawGuildMember): GuildMember | undefined {
    const members = this.#members;
    if (members === undefined) return undefined;

    const { user, user: { id } } = member;
    const cachedMember = members.add(id, member, user, this);

    if (cachedMember !== undefined) {
      cachedMember.update(member);
    } else {
      if (this.owner === undefined && this.ownerId === id) {
        this.owner = cachedMember;
        this.ownerId = id;
      }
      if (this.me === undefined && this.#client.user.id === id) {
        this.me = cachedMember;
        user.id = this.#client.user.id;
      }
    }

    return cachedMember;
  }

  public updateMember(member: GuildMemberUpdateEventFields): GuildMember | undefined {
    const members = this.#members;
    if (members === undefined) return undefined;

    const cachedMember = members.get(member.user.id);
    if (cachedMember === undefined) return undefined;

    cachedMember.update(member);
    return cachedMember;
  }

  public incrementMemberCount(): void{
    this.memberCount !== undefined && ++this.memberCount;
  }

  public decrementMemberCount(): void{
    this.memberCount !== undefined && --this.memberCount;
  }

  public removeMember(id: AugmentedRawGuildMember['user']['id']): GuildMember | undefined {
    const presences = this.#presences;
    if (presences !== undefined) this.presences.delete(id);
    return <GuildMember | undefined>Guild.removeFromCache(this.#members, id);
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param role https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public insertRole(role: RawRole): GuildRole | undefined {
    const roles = this.#roles;
    if (roles === undefined) return undefined;

    const { id } = role;
    return this.cacheRole(roles, id, role);
  }

  public updateRole(role: RawRole): GuildRole | undefined {
    const roles = this.#roles;
    if (roles === undefined) return undefined;

    const { id } = role;
    const cachedRole = roles.get(id);
    if (cachedRole === undefined) {
      return this.cacheRole(roles, id, role);
    }

    return <GuildRole>Object.assign(cachedRole, role);
  }

  private cacheRole(roles: RoleMap, id: RawRole['id'], role: RawRole): GuildRole {
    (<GuildRole>role).guild = this;
    roles.set(id, <GuildRole>role);

    return <GuildRole>role;
  }

  public removeRole(id: RawRole['id']): GuildRole | undefined {
    return <GuildRole | undefined>Guild.removeFromCache(this.#roles, id);
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param emoji https://discordapp.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public updateEmojiCache(emojis: GuildEmoji[]): [GuildEmoji[], GuildEmoji[]] | undefined {
    const emojiCache = this.#emojis;
    if (emojiCache === undefined) return undefined;

    const removedEmojis = Array.from(emojiCache.values());
    const newEmojis: GuildEmoji[] = [];
    while (emojis.length) {
      const emoji = <GuildEmoji>emojis.shift();
      const { id } = emoji;
      const cachedEmoji = emojiCache.get(id);
      if (cachedEmoji !== undefined) {
        removedEmojis.splice(removedEmojis.indexOf(emoji), 1);
      } else {
        newEmojis.push(<GuildEmoji> this.cacheEmoji(emojiCache, id, emoji));
      }
    }
    removedEmojis.forEach(({ id }) => emojiCache.delete(id));
    return [newEmojis, removedEmojis];
  }

  private cacheEmoji(emojis: EmojiMap, id: GuildEmoji['id'], emoji: GuildEmoji): GuildEmoji {
    (<GuildEmoji>emoji).guild = this;
    emojis.set(id, <GuildEmoji>emoji);

    return <GuildEmoji>emoji;
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

    const members = this.#members;
    if (members !== undefined) {
      const cachedMember = members.get(userId) ?? this.updateMember(member);
      if (cachedMember !== undefined) {
        voiceState.member = cachedMember;
      }
    }

    voiceStates.set(userId, <GuildVoiceState>voiceState);

    return <GuildVoiceState>voiceState;
  }

  /**
   * Create a map of presences keyed to their user's ids.
   * @param presence https://discordapp.com/developers/docs/topics/gateway#presence-update-presence-update-event-fields
   * @param client
   */
  private insertPresence(presence: RawPresence): RawPresence | undefined {
    const presences = this.#presences;
    if (presences === undefined) return undefined;

    const cachedPresence = <RawPresence | undefined> this.#client.updatePresences(presence);
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
    const presences = this.#presences;
    if (presences !== undefined) presences.set(presence.user.id, presence);
  }

  /**
   * Remove a presence from this guild's presence cache.
   * @param userId
   */
  public deletePresence(userId: RawUser['id']): void {
    const presences = this.#presences;
    if (presences !== undefined) presences.delete(userId);
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
