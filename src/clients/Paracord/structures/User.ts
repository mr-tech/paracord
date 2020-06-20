import { RawUser } from '../../../types';
import { timestampFromSnowflake } from '../../../utils';
import { Presence, FilteredProps } from '../types';
import Base from './Base';

export default class User extends Base<User> {
  #id: string;

  public username: string | undefined;

  public discriminator: number | undefined;

  public avatar: string | undefined;

  public presence: Presence | undefined;

  public constructor(filteredProps: Partial<FilteredProps<User>> | undefined, user: RawUser) {
    super(filteredProps);
    this.#id = user.id;
    this.update(user);
  }

  //   public update(user): void{
  //     this.#tag = `${user.username}#${user.discriminator}`
  // return super.update(user);
  //   }

  public get id(): string {
    return this.#id;
  }

  public get createdOn(): number {
    return timestampFromSnowflake(this.#id);
  }

  public get tag(): string | undefined {
    return this.username && this.discriminator ? `${this.username}#${this.discriminator}` : undefined;
  }
}
