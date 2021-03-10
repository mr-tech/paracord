/* eslint-disable max-classes-per-file */

import { PERMISSIONS } from '../../../../../constants';
import {
  AugmentedRawGuild, AugmentedRawGuildMember, AugmentedRawVoiceState, DefaultMessageNotificationLevel, ExplicitContentFilterLevel, GuildFeature, GuildMemberUpdateEventFields, ISO8601timestamp, MFALevel, PremiumTier, RawChannel, RawEmoji, RawGuild, RawGuildEmoji, RawPresence, RawRole, Snowflake, SystemChannelFlags, VerificationLevel, VoiceRegion,
} from '../../../../../types';
import { computeChannelPerms, computeGuildPerms, timestampFromSnowflake } from '../../../../../utils';
import Paracord from '../../../Paracord';
import {
  DiscordResource,
  EmojiMap, FilterOptions, GuildChannelMap, GuildMemberMap, PresenceMap, RawGuildType, RoleMap, VoiceStateMap,
} from '../../../types';
import CacheMap from '../../CacheMap';
import GuildEmoji from './GuildEmoji';
import GuildChannel from './GuildChannel';
import GuildMember from './GuildMember';
import GuildVoiceState from './GuildVoiceState';
import Presence from './Presence';
import Role from './Role';

/** A Discord guild. */
export default class Guild {
  #filteredProps: FilterOptions['props']['guild'] | undefined;

  #filteredEmojiProps: FilterOptions['props']['emoji'] | undefined;

  /** Shard id of the gateway connection this guild originated from. */
  #shard: number | undefined;

  #client: Paracord;

  #id: Snowflake;

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

  /** The guild owner's member object if cached. */
  #owner: GuildMember | undefined;

  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  public name: string | undefined;

  /** icon & icon_hash */
  public iconHash: string | null | undefined;

  /** splash hash */
  public splash: string | null | undefined;

  /** discovery splash hash | undefined; only present for guilds with the "DISCOVERABLE" feature */
  public discoverySplash: string | null | undefined;

  /** id of owner */
  public ownerId: Snowflake | undefined;

  /** The bot's member object. */
  public me: GuildMember | undefined;

  /** voice region id for the guild */
  public region: VoiceRegion | undefined;

  /** id of afk channel */
  public afkChannelId: Snowflake | null | undefined;

  public afkChannel: GuildChannel | undefined;

  /** afk timeout in seconds */
  public afkTimeout: number | undefined;

  /** true if the server widget is enabled */
  public widgetEnabled: boolean | undefined;

  /** the channel id that the widget will generate an invite to, or `null` if set to no invite */
  public widgetChannelId: Snowflake | null | undefined;

  public widgetChannel: GuildChannel | undefined;

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

  /** true if this guild is unavailable due to an outage */
  public unavailable: boolean | undefined;

  /** total number of members in this guild */
  public memberCount: number | undefined;

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

  // /** total permissions for the user in the guild (excludes overrides) */
  // public get permissions(): number {
  //   return this.hasPermission | undefined;
  // }

  /**
   * Creates a new guild object.
   * @param guildData From Discord - The guild. https://discord.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   * @param shard Shard id of the gateway connection this guild originated from.
   */
  public constructor(
    filteredProps: FilterOptions['props'] | undefined,
    guild: RawGuildType,
    client: Paracord,
    shard: number,
  ) {
    this.#id = guild.id;
    this.#filteredProps = filteredProps?.guild;
    this.#filteredEmojiProps = filteredProps?.emoji;
    this.#client = client;
    this.#shard = shard;

    const { unavailable } = guild;

    this.unavailable = unavailable ?? false;

    this.initialize(guild);
  }

  public get id(): Snowflake {
    return this.#id;
  }

  public get client(): Paracord {
    return this.#client;
  }

  public get owner(): GuildMember | undefined {
    return this.#owner;
  }

  public set owner(member: GuildMember | undefined) {
    if (this.#owner !== member) {
      this.#owner?.user.decrementActiveReferenceCount();
    }
    member?.user.incrementActiveReferenceCount();
    this.#owner = member;
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number {
    return timestampFromSnowflake(this.#id);
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

  public get shard(): number | undefined {
    return this.#shard;
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

    if (roles !== undefined && this.#roles !== undefined) {
      roles.forEach((r) => this.insertRole(r));
    }

    if (members !== undefined && this.#members !== undefined) {
      members.forEach((m) => this.upsertMember(m));
    }

    if (presences !== undefined && this.#presences !== undefined) {
      presences.forEach((p) => this.insertRawPresence(p));
    }

    if (voice_states !== undefined && this.#voiceStates !== undefined) {
      voice_states.forEach((v) => this.upsertVoiceState(v));
    }

    if (emojis !== undefined && this.#emojis !== undefined) {
      this.updateEmojiCache(emojis);
    }
  }

  /**
   * Replace caches with newly received information about a guild.
   * @param guildData From Discord - The guild. https://discord.com/developers/docs/resources/guild#guild-object
   * @param client Paracord client.
   */
  public update(guild: RawGuildType): this {
    if (guild.unavailable) {
      this.unavailable = true;
    } else {
      this.unavailable = false;
      this.constructCaches(guild);

      if (
        (!this.#filteredProps || 'name' in this)
        && this.name !== guild.name
      ) this.name = guild.name;
      if (
        (!this.#filteredProps || 'icon' in this)
        && this.iconHash !== guild.icon
      ) this.iconHash = guild.icon;
      if (
        guild.icon_hash !== undefined
        && (!this.#filteredProps || 'iconHash' in this)
        && this.iconHash !== guild.icon_hash
      ) this.iconHash = guild.icon_hash;
      if (
        (!this.#filteredProps || 'splash' in this)
        && this.splash !== guild.splash
      ) this.splash = guild.splash;
      if (
        (!this.#filteredProps || 'discoverySplash' in this)
        && this.discoverySplash !== guild.discovery_splash
      ) this.discoverySplash = guild.discovery_splash;
      if (
        (!this.#filteredProps || 'ownerId' in this)
        && this.ownerId !== guild.owner_id
      ) {
        this.ownerId = guild.owner_id;
        this.owner = this.members.get(guild.owner_id);
      }
      if (
        (!this.#filteredProps || 'region' in this)
        && this.region !== guild.region
      ) this.region = guild.region;
      if (
        (!this.#filteredProps || 'afkChannelId' in this)
        && this.afkChannelId !== guild.afk_channel_id
      ) {
        this.afkChannelId = guild.afk_channel_id;
        if (guild.afk_channel_id !== null) {
          this.afkChannel = this.channels?.get(guild.afk_channel_id);
        }
      }
      if (!this.#filteredProps || 'afkTimeout' in this) this.afkTimeout = guild.afk_timeout;
      if (!this.#filteredProps || 'widgetEnabled' in this) this.widgetEnabled = guild.widget_enabled;
      if (
        guild.widget_channel_id !== undefined
        && (!this.#filteredProps || 'widgetChannelId' in this)
        && this.widgetChannelId !== guild.widget_channel_id
      ) {
        this.widgetChannelId = guild.widget_channel_id;
        if (guild.widget_channel_id !== null) {
          this.widgetChannel = this.channels?.get(guild.widget_channel_id);
        }
      }
      if (!this.#filteredProps || 'verificationLevel' in this) this.verificationLevel = guild.verification_level;
      if (!this.#filteredProps || 'defaultMessageNotifications' in this) this.defaultMessageNotifications = guild.default_message_notifications;
      if (!this.#filteredProps || 'explicitContentFilter' in this) this.explicitContentFilter = guild.explicit_content_filter;
      if (!this.#filteredProps || 'features' in this) this.features = guild.features;
      if (!this.#filteredProps || 'mfaLevel' in this) this.mfaLevel = guild.mfa_level;
      if (
        (!this.#filteredProps || 'applicationId' in this)
        && this.applicationId !== guild.application_id
      ) this.applicationId = guild.application_id;
      if (
        (!this.#filteredProps || 'systemChannelId' in this)
        && this.systemChannelId !== guild.system_channel_id
      ) {
        this.systemChannelId = guild.system_channel_id;
        if (guild.system_channel_id !== null) {
          this.systemChannel = this.channels?.get(guild.system_channel_id);
        }
      }
      if (!this.#filteredProps || 'systemChannelFlags' in this) this.systemChannelFlags = guild.system_channel_flags;
      if (
        (!this.#filteredProps || 'rulesChannelId' in this)
        && this.rulesChannelId !== guild.rules_channel_id
      ) {
        this.rulesChannelId = guild.rules_channel_id;
        if (guild.rules_channel_id !== null) {
          this.rulesChannel = this.channels?.get(guild.rules_channel_id);
        }
      }
      if (
        guild.joined_at !== undefined
        && (!this.#filteredProps || 'joinedAt' in this)
        && this.joinedAt !== guild.joined_at
      ) this.joinedAt = guild.joined_at;
      if (
        guild.large !== undefined
        && (!this.#filteredProps || 'large' in this)
      ) this.large = guild.large;
      if (
        guild.member_count !== undefined
        && (!this.#filteredProps || 'memberCount' in this)
      ) this.memberCount = guild.member_count;
      if (
        guild.max_presences !== undefined
        && (!this.#filteredProps || 'maxPresences' in this)
      ) this.maxPresences = guild.max_presences;
      if (
        (!this.#filteredProps || 'vanityUrlCode' in this)
        && this.vanityUrlCode !== guild.vanity_url_code
      ) this.vanityUrlCode = guild.vanity_url_code;
      if (
        (!this.#filteredProps || 'description' in this)
        && this.description !== guild.description
      ) this.description = guild.description;
      if (
        (!this.#filteredProps || 'banner' in this)
        && this.banner !== guild.banner
      ) this.banner = guild.banner;
      if (!this.#filteredProps || 'premiumTier' in this) this.premiumTier = guild.premium_tier;
      if (
        guild.premium_subscription_count !== undefined
        && (!this.#filteredProps || 'premiumSubscriptionCount' in this)
      ) this.premiumSubscriptionCount = guild.premium_subscription_count;
      if (
        (!this.#filteredProps || 'preferredLocale' in this)
        && this.preferredLocale !== guild.preferred_locale
      ) this.preferredLocale = guild.preferred_locale;
      if (
        guild.public_updates_channel_id !== undefined
        && (!this.#filteredProps || 'publicUpdatesChannelId' in this)
        && this.publicUpdatesChannelId !== guild.public_updates_channel_id
      ) {
        this.publicUpdatesChannelId = guild.public_updates_channel_id;
        if (guild.public_updates_channel_id !== null) {
          this.publicUpdatesChannel = this.channels?.get(guild.public_updates_channel_id);
        }
      }
      if (
        guild.max_video_channel_users !== undefined
        && (!this.#filteredProps || 'maxVideoChannelUsers' in this)
      ) this.maxVideoChannelUsers = guild.max_video_channel_users;
    }

    return this;
  }

  private initialize(guild: RawGuildType): this {
    this.initializeProperties();

    const {
      roles, emojis, guildMembers, guildChannels, presences, guildVoiceStates,
    } = (this.client.filterOptions?.caches ?? {});

    const props = (this.client.filterOptions?.props ?? undefined);
    if (roles ?? true) this.#roles = new CacheMap(Role, props);
    if (emojis ?? true) this.#emojis = new CacheMap(GuildEmoji, props);
    if (presences ?? true) this.#presences = new CacheMap(Presence, props);
    if (guildMembers ?? true) this.#members = new CacheMap(GuildMember, props);
    if (guildChannels ?? true) this.#channels = new CacheMap(GuildChannel, props);
    if (guildVoiceStates ?? true) this.#voiceStates = new CacheMap(GuildVoiceState, props);

    return this.update(guild);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
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
  public hasPermission(permission: number | string | bigint, member: GuildMember, adminOverride = true): boolean {
    if (this.#roles === undefined) throw Error('roles are not cached');

    const memberPermissions = computeGuildPerms({ member, guild: this, stopOnOwnerAdmin: adminOverride });

    const bigIntPermission = BigInt(permission);

    if ((memberPermissions & BigInt(PERMISSIONS.ADMINISTRATOR)) && adminOverride) {
      return true;
    }

    return Boolean(memberPermissions & bigIntPermission);
  }

  /**
   * Checks if the user has a specific permission for a channel in this guild.
   * @returns `true` if member has the permission.
   */
  public hasChannelPermission(permission: number | string | bigint, member: GuildMember, channel: GuildChannel | Snowflake, stopOnOwnerAdmin = true): boolean {
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

    const bigIntPermission = BigInt(permission);

    if (bigIntPermission & BigInt(PERMISSIONS.ADMINISTRATOR) && stopOnOwnerAdmin) {
      return true;
    }
    return Boolean(perms & bigIntPermission);
  }

  /*
   ********************************
   *********** CACHING ************
   ********************************
   */

  // private static removeFromCache(cache: Map<string, WildCardCache> | undefined, idCache: Snowflake[] | undefined, id: Snowflake): WildCardCache | undefined {
  static removeFromCache<T extends DiscordResource, U extends CacheMap<T>>(cache: U, id: Snowflake): T | undefined {
    if (cache === undefined) return undefined;

    const resource = cache.get(id);
    cache.delete(id);
    resource?.dereference();
    return resource;
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

  /**
   * Add a channel with some additional information to a map of channels.
   * @param channel https://discord.com/developers/docs/resources/channel#channel-object-channel-structure
   */
  // TODO: NO
  public insertChannel(channel: RawChannel): GuildChannel | undefined {
    const channels = this.#channels;
    if (channels === undefined) return undefined;

    const { id } = channel;
    const guildChannel = channels.add(id, channel, this);
    if ((this.afkChannelId ?? false) && id === this.afkChannelId) this.afkChannel = guildChannel;
    if ((this.rulesChannelId ?? false) && id === this.rulesChannelId) this.rulesChannel = guildChannel;
    if ((this.systemChannelId ?? false) && id === this.systemChannelId) this.systemChannel = guildChannel;
    if ((this.widgetChannelId ?? false) && id === this.widgetChannelId) this.widgetChannel = guildChannel;
    if ((this.publicUpdatesChannelId ?? false) && id === this.publicUpdatesChannelId) this.publicUpdatesChannel = guildChannel;

    return guildChannel;
  }


  public removeChannel(id: Snowflake): GuildChannel | undefined {
    return this.#channels && Guild.removeFromCache(this.#channels, id);
  }

  /**
   * Add a member with some additional information to a map of members.
   * @param member https://discord.com/developers/docs/resources/guild#guild-member-object
   */
  public upsertMember(member: AugmentedRawGuildMember | GuildMemberUpdateEventFields): GuildMember | undefined {
    const members = this.#members;
    if (members === undefined) return undefined;

    const { user, user: { id: userId } } = member;
    let cachedMember = members.get(userId);
    if (cachedMember !== undefined) {
      return cachedMember.update(member);
    }

    const voiceState = this.voiceStates.get(userId);
    if (
      !member.roles.length
      && this.ownerId !== userId
      && !voiceState
    ) return undefined;

    const cachedUser = this.#client.upsertUser(user);
    cachedMember = members.add(userId, member, cachedUser, this);

    if (this.ownerId === userId) {
      this.owner = cachedMember;
    }
    if (this.me === undefined && this.#client.user.id === userId) {
      this.me = cachedMember;
    }

    voiceState?.setMember(cachedMember);

    return cachedMember;
  }

  public removeMember(id: Snowflake): GuildMember | undefined {
    let member: GuildMember | undefined;
    if (this.#members) {
      member = this.#members.get(id);
      if (member) {
        if (member.roles?.size || member.roleIds.length) member.user.decrementActiveReferenceCount();
        this.#client.handleUserRemovedFromGuild(member.user, this);
      }

      Guild.removeFromCache(this.#members, id);
    }

    this.removePresence(id);
    return member;
  }

  public incrementMemberCount(): void {
    this.memberCount !== undefined && ++this.memberCount;
  }

  public decrementMemberCount(): void{
    this.memberCount !== undefined && --this.memberCount;
  }

  /**
   * Add a role with some additional information to a map of roles.
   * @param role https://discord.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public insertRole(role: RawRole): Role | undefined {
    const roles = this.#roles;
    if (roles === undefined) return undefined;

    const { id } = role;
    return roles.add(id, role, this);
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
   * @param emoji https://discord.com/developers/docs/topics/permissions#role-object-role-structure
   */
  public updateEmojiCache(emojis: RawGuildEmoji[]): [GuildEmoji[], GuildEmoji[]] | undefined {
    const emojiCache = this.#emojis;
    if (emojiCache === undefined) return undefined;

    const removedEmojis = Array.from(emojiCache.values());
    const newEmojis: GuildEmoji[] = [];
    while (emojis.length) {
      const emoji = <RawGuildEmoji>emojis.shift();
      const { id } = emoji;
      const cachedEmoji = emojiCache.get(id);
      if (cachedEmoji !== undefined) {
        cachedEmoji.update(emoji);
        removedEmojis.splice(removedEmojis.indexOf(cachedEmoji), 1);
      } else {
        newEmojis.push(emojiCache.add(id, emoji, this));
      }
    }
    removedEmojis.forEach(({ id }) => {
      Guild.removeFromCache(emojiCache, id);
    });
    return [newEmojis, removedEmojis];
  }

  public upsertVoiceState(voiceState: AugmentedRawVoiceState): GuildVoiceState | undefined {
    const voiceStates = this.#voiceStates;
    if (voiceStates === undefined) return undefined;

    const { user_id } = voiceState;
    const cachedVoiceState = voiceStates.get(user_id);
    if (cachedVoiceState !== undefined) {
      let channel: GuildChannel | undefined;
      if (voiceState.channel_id !== null && cachedVoiceState.channel.id !== voiceState.channel_id) {
        channel = this.channels.get(voiceState.channel_id);
      }
      return cachedVoiceState.update(voiceState, channel);
    }

    return this.insertVoiceState(voiceState);
  }

  /**
   * Add a voice state to a map of voice states.
   * @param voiceState https://discord.com/developers/docs/resources/voice
   * @param client
   */
  public insertVoiceState(voiceState: AugmentedRawVoiceState): GuildVoiceState | undefined {
    const voiceStates = this.#voiceStates;
    const { user_id: userId, member, channel_id } = voiceState;
    if (voiceStates === undefined || channel_id === null) return undefined;

    let cachedMember: GuildMember | undefined;
    if (member !== undefined) {
      cachedMember = this.upsertMember(member);
    } else {
      cachedMember = this.members.get(userId);
    }

    const user = cachedMember?.user ?? this.#client.users?.get(userId);

    return voiceStates.add(userId, voiceState, user, cachedMember, this, this.channels.get(channel_id));
  }

  /** Remove a voice state from the map of voice states and handle the cached user */
  public removeVoiceState(id: Snowflake): void {
    const voiceStates = this.#voiceStates;
    if (voiceStates === undefined) return;

    const cachedPresence = voiceStates.get(id);
    cachedPresence?.user?.decrementActiveReferenceCount();

    Guild.removeFromCache(voiceStates, id);
  }

  /**
   * Add presence to map of presences.
   * @param presence https://discord.com/developers/docs/topics/gateway#presence-update-presence-update-event-fields
   * @param client
   */
  private insertRawPresence(presence: RawPresence): RawPresence | undefined {
    const presences = this.#presences;
    if (presences === undefined) return undefined;

    const cachedPresence = this.#client.updatePresences(presence);
    if (cachedPresence !== undefined) {
      cachedPresence.incrementGuildCount();
      presences.set(cachedPresence.id, cachedPresence);
    }

    return <RawPresence>presence;
  }

  /**
   * Set a presence in this guild's presence cache.
   * @param presence
   */
  public insertCachedPresence(presence: Presence): void {
    if (this.#presences) {
      const cachedPresence = this.#presences.get(presence.id);
      if (!cachedPresence) {
        presence.incrementGuildCount();
        this.#presences.set(presence.id, presence);
      }
    }
  }

  /**
   * Remove a presence from this guild's presence cache.
   * @param userId
   */
  public removePresence(userId: Snowflake): void {
    const presences = this.#presences;
    if (presences) {
      const presence = presences?.get(userId);
      if (presence) {
        this.#client.handlePresenceRemovedFromGuild(presence);
        Guild.removeFromCache(presences, userId);
      }
    }
  }

  public dereference(): void {
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    this.#client = undefined;
  }
  // /**
  //  * Asynchronously gets the the bot's member object from Discord and stores it in the guild.
  //  * @param {Object} guild https://discord.com/developers/docs/resources/guild#guild-object
  //  * @returns {void} guild.me <- https://discord.com/developers/docs/resources/guild#guild-member-object-guild-member-structure
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
