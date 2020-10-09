import { RawUser, Snowflake } from '../../../../../types';
import { FilteredProps } from '../../../types';
import { timestampFromSnowflake } from '../../../../../utils';
// import Resource from '../../Resource';
import Presence from './Presence';

// export default class User extends Resource<User, RawUser> {
export default class User {
  /** the user's id */
  #id: Snowflake; // identify

  /** the user's username, not unique across the platform */
  public username: string | undefined; // identify

  /** the user's 4-digit discord-tag */
  public discriminator: string | undefined; // identify

  /** the user's avatar hash */
  public avatar: string | null| undefined; // identify

  /** whether the user belongs to an OAuth2 application */
  public bot: boolean | undefined; // identify

  /** whether the user is an Official Discord System user (part of the urgent message system) */
  public system: boolean | undefined; // identify

  /** whether the user has two factor enabled on their account */
  public mfaEnabled: boolean | undefined; // identify

  /** the user's chosen language option */
  public locale: string | undefined; // identify

  /** whether the email on this account has been verified */
  public verified: boolean | undefined; // email

  /** the user's email */
  public email: string | null | undefined; // email

  /** the flags on a user's account */
  public flags: number | undefined; // identify

  /** the type of Nitro subscription on a user's account */
  public premiumType: number | undefined; // identify

  /** the public flags on a user's account */
  public publicFlags: number | undefined; // identify

  public presence: Presence | undefined;

  #filteredProps: FilteredProps<User, RawUser> | undefined;

  #lastAccessed: number;

  public constructor(filteredProps: FilteredProps<User, RawUser> | undefined, user: RawUser) {
    this.#filteredProps = filteredProps;
    this.#id = user.id;

    const now = new Date().getTime();
    this.#lastAccessed = now;

    if (filteredProps !== undefined) {
      this.initializeProperties(filteredProps);
    }

    this.update(user);
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number | undefined {
    return timestampFromSnowflake(this.#id);
  }

  public get id(): Snowflake {
    return this.#id;
  }

  public get lastAccessed(): number {
    return this.#lastAccessed;
  }

  public get tag(): string | undefined {
    return this.username !== undefined && this.discriminator !== undefined ? `${this.username}#${this.discriminator}` : undefined;
  }

  public refreshLastAccessed(): void {
    this.#lastAccessed = new Date().getTime();
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
    if (
      arg.bot !== undefined
        && (this.#filteredProps === undefined || 'bot' in this)
        && arg.bot !== this.bot
    ) this.bot = arg.bot;
    if (
      arg.system !== undefined
        && (this.#filteredProps === undefined || 'system' in this)
        && arg.system !== this.system
    ) this.system = arg.system;

    // TODO: add remaining props

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
