import {
  AugmentedRawGuildMember, GuildMemberUpdateEventFields, ISO8601timestamp, Snowflake,
} from '../../../../../types';
import { FilteredProps } from '../../../types';
import Guild from './Guild';
import Resource from '../../Resource';
import Role from './Role';
import User from './User';
import { squashArrays } from '../../../../../utils';

type IUpdateTypes = AugmentedRawGuildMember | GuildMemberUpdateEventFields

export default class GuildMember extends Resource<GuildMember, IUpdateTypes> {
  #user: User;

  #guild: Guild;

  /** this users guild nickname */
  nick: string | null | undefined;

  /** array of role object ids */
  roles: Map<Snowflake, Role> | undefined;

  #roleIds: Snowflake[] | undefined;

  /** when the user joined the guild */
  joinedAt: ISO8601timestamp | undefined;

  /** when the user started boosting the guild */
  premiumSince: ISO8601timestamp | null | undefined;

  /** whether the user is deafened in voice channels */
  deaf: boolean | undefined;

  /** whether the user is muted in voice channels */
  mute: boolean | undefined;

  public constructor(filteredProps: FilteredProps<GuildMember, IUpdateTypes> | undefined, member: AugmentedRawGuildMember, user: User, guild: Guild) {
    super(filteredProps, user.id);
    this.#user = user;
    this.#guild = guild;

    if (guild.unsafe_roles !== undefined) {
      this.roles = new Map();
    }

    this.update(member);
  }

  public get user(): User {
    return this.#user;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public get roleIds(): Snowflake[] {
    return Array.from(this.roles?.keys() ?? this.#roleIds ?? []);
  }

  public update(arg: IUpdateTypes): this {
    delete arg.user;

    if (arg.roles !== undefined) {
      const { roles } = arg;
      delete arg.roles;

      if (this.roles !== undefined) {
        const roleIds = Array.from(this.roleIds);
        squashArrays(roleIds, roles);
        if (this.id === '158446181310136320') {
          console.log('ping2');
          console.log(this.guild.roles);
        }
        roleIds.forEach((roleId) => {
          const role = this.guild.roles.get(roleId);
          if (this.id === '158446181310136320') {
            console.log('ping3');
            console.log(roleId);
            console.log(role);
          }
          if (role !== undefined) {
            (<Map<Snowflake, Role>> this.roles).set(roleId, role);
          } else {
            // TODO some kind of warning or error log
          }
        });
      } else if (this.#roleIds !== undefined) {
        squashArrays(this.#roleIds, roles);
      }
    }
    // update roleIds
    return super.update(arg);
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
