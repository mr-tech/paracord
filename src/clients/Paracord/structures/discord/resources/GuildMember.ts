import {
  GuildMember as AugmentedRawGuildMember, GuildMemberUpdateEventField, ISO8601timestamp, Snowflake,
} from '../../../../../types';
import { FilterOptions } from '../../../types';
import Guild from './Guild';
import Role from './Role';
import User from './User';
import { squashArrays } from '../../../../../utils';

type IUpdateTypes = AugmentedRawGuildMember | GuildMemberUpdateEventField;

// export default class GuildMember extends Resource<GuildMember, IUpdateTypes> {
export default class GuildMember {
  #filteredProps: FilterOptions['props']['guildMember'] | undefined;

  /** the user this guild member represents */
  #user: User;

  #guild: Guild;

  #id: Snowflake;

  #roleIds: Snowflake[] | undefined;

  #lastAccessed: number;

  /** this user's guild nickname */
  nick: string | null | undefined;

  /** the member's guild avatar hash */
  avatar: string | null | undefined;

  /** array of role object roles */
  roles: Map<Snowflake, Role> | undefined;

  /** when the user joined the guild */
  joinedAt: ISO8601timestamp | null | undefined;

  /** when the user started boosting the guild */
  premiumSince: ISO8601timestamp | null | undefined;

  /** whether the user is deafened in voice channels */
  deaf: boolean | undefined;

  /** whether the user is muted in voice channels */
  mute: boolean | undefined;

  /** whether the user has not yet passed the guild's Membership Screening requirements */
  pending: boolean | undefined;

  /** total permissions of the member in the channel, including overwrites, returned when in the interaction object */
  permissions: string | undefined;

  /** when the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
  communicationDisabledUntil: ISO8601timestamp | null | undefined;

  public constructor(
    filteredProps: FilterOptions['props'] | undefined,
    member: GuildMemberUpdateEventField | AugmentedRawGuildMember,
    user: User,
    guild: Guild,
  ) {
    this.#filteredProps = filteredProps?.guildMember;
    this.#user = user;
    this.#guild = guild;
    this.#id = user.id;

    user.incrementGuildCount();

    const now = new Date().getTime();
    this.#lastAccessed = now;

    if (guild.unsafe_roles !== undefined) {
      this.roles = new Map();
    }

    this.initialize(member);
  }

  public get id(): Snowflake {
    return this.#id;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public get user(): User {
    return this.#user;
  }

  public get lastAccessed(): number {
    return this.#lastAccessed;
  }

  public get roleIds(): Snowflake[] {
    return Array.from(this.roles?.keys() ?? this.#roleIds ?? []);
  }

  public refreshLastAccessed(): void {
    this.#lastAccessed = new Date().getTime();
  }

  public update(arg: IUpdateTypes): this {
    if (arg.roles !== undefined) {
      this.updateRoles(arg);
    }

    if (
      arg.nick !== undefined
      && (!this.#filteredProps || 'nick' in this)
      && arg.nick !== this.nick) this.nick = arg.nick;
    if (
      arg.premium_since !== undefined
      && (!this.#filteredProps || 'premiumSince' in this)
      && arg.premium_since !== this.premiumSince) this.premiumSince = arg.premium_since;
    if (
      arg.joined_at !== undefined
      && (!this.#filteredProps || 'joinedAt' in this)
      && arg.joined_at !== this.joinedAt) this.joinedAt = arg.joined_at;

    return this;
  }

  private updateRoles(arg: IUpdateTypes) {
    const { roles: memberRoleMap } = this;
    const { roles } = arg;

    const currentRoleCount = memberRoleMap?.size || this.roleIds.length;
    if (currentRoleCount !== roles.length) {
      if (currentRoleCount === 0) this.user.incrementActiveReferenceCount();
      else if (roles.length === 0) this.user.decrementActiveReferenceCount();
    }

    if (memberRoleMap !== undefined) {
      const roleIds = Array.from(this.roleIds);
      const removedRoleIds = squashArrays(roleIds, roles);
      roleIds.forEach((roleId) => {
        const role = this.guild.roles.get(roleId);
        if (role !== undefined) {
          (<Map<Snowflake, Role>> memberRoleMap).set(roleId, role);
        } else {
          // TODO some kind of warning or error log
        }
      });
      removedRoleIds.forEach((roleId) => {
        memberRoleMap.delete(roleId);
      });
    } else if (this.#roleIds !== undefined) {
      squashArrays(this.#roleIds, roles);
    }
  }

  private initialize(member: GuildMemberUpdateEventField | AugmentedRawGuildMember): this {
    this.initializeProperties();

    return this.update(member);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }

  // public get id(): string {
  //   return this.#user.id;
  // }

  // public username(): string | undefined {
  //   return this.#user.username;
  // }

  // public discriminator(): number | undefined {
  //   return this.#user.discriminator;
  // }

  // public get tag(): string | undefined {
  //   return this.#user.tag;
  // }

  // public get avatar(): string | undefined {
  //   return this.#user.avatar;
  // }

  // =====================================================================

  // get createdOn() {
  //   return this.user !== undefined ? this.user.createdOn : undefined;
  // }

  // upsert(newProps, guild, event) {
  //   upsertCommon(this, guildMemberFilter, newProps);

  //   const user = newProps.user || newProps.author;
  //   if (user !== undefined) {
  //     this.assignUser(user, event);

  //     newProps.user = this.user;
  //   }

  //   if (newProps.author !== undefined) {
  //     newProps.author = this.user;
  //   }

  //   if (guild.roles !== undefined) {
  //     this.assignRoles(guild, newProps);
  //   }
  // }

  // assignUser(user, event) {
  //   if (this.user === undefined || USER_UPDATE_EVENTS.includes(event)) {
  //     this.user = new client.User(user);
  //   } else {
  //     this.user.upsert(user);
  //   }
  // }

  // assignRoles(guild, { roles }) {
  //   // check if a patch on multiple roles will trigger multiple
  //   this.roles = roles.map((roleId) => guild.roles.get(roleId));
  // }
}
