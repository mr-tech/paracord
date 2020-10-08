import { RawUser } from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import Presence from './Presence';

export default class User extends Resource<User, RawUser> {
  public username: string | undefined;

  public discriminator: string | undefined;

  public avatar: string | null | undefined;

  public presence: Presence | undefined;

  #filteredProps: FilteredProps<User, RawUser> | undefined;

  public constructor(filteredProps: FilteredProps<User, RawUser> | undefined, user: RawUser) {
    super(filteredProps, user.id);
    this.#filteredProps = filteredProps;
    this.update(user);
  }

  public update(arg: RawUser): this {
    if (
      arg.username !== undefined
        && (!this.#filteredProps || 'username' in this)
        && arg.username !== this.username) this.username = arg.username;
    if (
      arg.discriminator !== undefined
        && (!this.#filteredProps || 'discriminator' in this)
        && arg.discriminator !== this.discriminator) this.discriminator = arg.discriminator;
    if (
      arg.avatar !== undefined
        && (!this.#filteredProps || 'avatar' in this)
        && arg.avatar !== this.avatar) this.avatar = arg.avatar;

    return this;
  }

  public get tag(): string | undefined {
    return this.username && this.discriminator ? `${this.username}#${this.discriminator}` : undefined;
  }
}
