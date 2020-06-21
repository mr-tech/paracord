import { RawUser } from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import Presence from './Presence';

export default class User extends Resource<User, RawUser> {
  public username: string | undefined;

  public discriminator: number | undefined;

  public avatar: string | undefined;

  public presence: Presence | undefined;

  public constructor(filteredProps: FilteredProps<User, RawUser> | undefined, user: RawUser) {
    super(filteredProps, user.id);
    this.update(user);
  }

  public update(arg: RawUser): this {
    return super.update(arg);
  }

  public get tag(): string | undefined {
    return this.username && this.discriminator ? `${this.username}#${this.discriminator}` : undefined;
  }
}
