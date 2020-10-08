import { RawUser, Snowflake } from '../../../../../types';
import { FilteredProps } from '../../../types';
// import Resource from '../../Resource';
import Presence from './Presence';

// export default class User extends Resource<User, RawUser> {
export default class User {
  id: Snowflake;

  public username: string | undefined;

  public discriminator: string | undefined;

  public avatar: string | null | undefined;

  public presence: Presence | undefined;

  #filteredProps: FilteredProps<User, RawUser> | undefined;

  public constructor(filteredProps: FilteredProps<User, RawUser> | undefined, user: RawUser) {
    // super(filteredProps, user.id);
    this.#filteredProps = filteredProps;
    this.id = user.id;

    if (filteredProps !== undefined) {
      this.initializeProperties(filteredProps);
    }

    this.update(user);
  }

  public get tag(): string | undefined {
    return this.username !== undefined && this.discriminator !== undefined ? `${this.username}#${this.discriminator}` : undefined;
  }

  public update(arg: RawUser): this {
    if (
      arg.username !== undefined
        && (this.#filteredProps === undefined || 'username' in this)
        && arg.username !== this.username
    ) this.username = arg.username;
    if (
      arg.discriminator !== undefined
        && (this.#filteredProps === undefined || 'discriminator' in this)
        && arg.discriminator !== this.discriminator
    ) this.discriminator = arg.discriminator;
    if (
      arg.avatar !== undefined
        && (this.#filteredProps === undefined || 'avatar' in this)
        && arg.avatar !== this.avatar
    ) this.avatar = arg.avatar;

    return this;
  }

  private initializeProperties(filteredProps: FilteredProps<User, RawUser>): void {
    filteredProps.forEach((prop) => {
      if (!Object.prototype.hasOwnProperty.call(this, prop)) {
        (<Record<string, unknown>> this)[prop] = undefined;
      }
    });
  }
}
