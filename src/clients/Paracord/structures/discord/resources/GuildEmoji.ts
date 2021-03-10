import { RawGuildEmoji, Snowflake } from '../../../../../types';
import { FilterOptions } from '../../../types';
import { timestampFromSnowflake, squashArrays } from '../../../../../utils';
import Role from './Role';
import Guild from './Guild';

export default class GuildEmoji {
  #filteredProps: FilterOptions['props']['emoji'] | undefined;

  /** the user's id */
  #id: Snowflake; // identify

  /** user that created this emoji */
  #userId: Snowflake | undefined; // purposefully just id

  #roleIds: Snowflake[] | undefined;

  #guild: Guild;

  /** emoji name */
  public name: string | null | undefined;

  /** array of role object ids */
  public roles: Map<Snowflake, Role> | undefined;

  /** whether this emoji must be wrapped in colons */
  public requireColons: boolean | undefined;

  /** whether this emoji is managed */
  public managed: boolean | undefined;

  /** whether this emoji is animated */
  public animated: boolean | undefined;

  /** whether this emoji can be used, may be false due to loss of Server Boosts */
  public available: boolean | undefined;

  public constructor(filteredProps: FilterOptions['props'] | undefined, emoji: RawGuildEmoji, guild: Guild) {
    this.#filteredProps = filteredProps?.emoji;
    this.#id = emoji.id;
    this.#userId = emoji?.user?.id;
    this.#guild = guild;

    this.initialize(emoji);
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number {
    return timestampFromSnowflake(this.#id);
  }

  public get id(): Snowflake {
    return this.#id;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public get userId(): Snowflake | undefined {
    return this.#userId;
  }

  public get roleIds(): Snowflake[] {
    return Array.from(this.roles?.keys() ?? this.#roleIds ?? []);
  }

  public update(arg: RawGuildEmoji): this {
    if (arg.roles !== undefined) {
      this.updateRoles(arg);
    }

    if (
      (this.#filteredProps === undefined || 'name' in this)
      && arg.name !== this.name
    ) this.name = arg.name;

    if (
      arg.available !== undefined
      && (this.#filteredProps === undefined || 'available' in this)
    ) this.available = arg.available;

    return this;
  }

  private updateRoles(arg: RawGuildEmoji) {
    const { roles: thisRoleMap } = this;
    const { roles } = arg;

    if (roles !== undefined) {
      const newRoleIds = roles.map(({ id }) => id);
      if (thisRoleMap !== undefined) {
        const roleIds = Array.from(this.roleIds);
        const removedRoleIds = squashArrays(roleIds, newRoleIds);
        roleIds.forEach((roleId) => {
          const role = this.guild.roles.get(roleId);
          if (role !== undefined) {
            (<Map<Snowflake, Role>> thisRoleMap).set(roleId, role);
          } else {
            // TODO some kind of warning or error log
          }
        });
        removedRoleIds.forEach((roleId) => {
          thisRoleMap.delete(roleId);
        });
      } else if (this.#roleIds !== undefined) {
        squashArrays(this.#roleIds, newRoleIds);
      }
    }
  }

  private initialize(emoji: RawGuildEmoji): this {
    this.initializeProperties();

    if (
      emoji.managed !== undefined
      && (this.#filteredProps === undefined || 'managed' in this)
    ) this.managed = emoji.managed;
    if (
      emoji.animated !== undefined
      && (this.#filteredProps === undefined || 'animated' in this)
    ) this.animated = emoji.animated;
    if (
      emoji.require_colons !== undefined
      && (this.#filteredProps === undefined || 'requireColons' in this)
    ) this.requireColons = emoji.require_colons;

    return this.update(emoji);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }

  public dereference(): void {
    this.#filteredProps = undefined;
    this.roles = undefined;
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    this.#guild = undefined;
  }
}
