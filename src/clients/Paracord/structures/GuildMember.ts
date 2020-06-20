import {
  AugmentedRawGuildMember, Snowflake, ISO8601timestamp, GuildMemberUpdateEventFields,
} from '../../../types';
import { FilteredProps } from '../types';
import User from './User';
import Guild from './Guild';
import Base from './Base';

export default class GuildMember extends Base<GuildMember> {
  #user: User;

  #guild: Guild;

  /** this users guild nickname */
  nick: string | null | undefined;

  /** array of role object ids */
  roles: RoleMap | Snowflake[] | undefined;

  /** when the user joined the guild */
  joinedAt: ISO8601timestamp | undefined;

  /** when the user started boosting the guild */
  premiumSince: ISO8601timestamp | null | undefined;

  /** whether the user is deafened in voice channels */
  deaf: boolean | undefined;

  /** whether the user is muted in voice channels */
  mute: boolean | undefined;

  public constructor(filteredProps: Partial<FilteredProps<GuildMember>> | undefined, member: AugmentedRawGuildMember, user: User, guild: Guild) {
    super(filteredProps);
    this.#user = user;
    this.#guild = guild;
    this.update(member);
  }

  public get user(): User {
    return this.#user;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public update(args: AugmentedRawGuildMember | GuildMemberUpdateEventFields): void{
    super.update(args);
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
