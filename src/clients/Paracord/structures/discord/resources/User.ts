import { RawUser, Snowflake } from '../../../../../types';
import { FilterOptions } from '../../../types';
import { timestampFromSnowflake } from '../../../../../utils';
import Presence from './Presence';

export default class User {
  #filteredProps: FilterOptions['props']['user'] | undefined;

  #lastAccessed: number;

  /** the user's id */
  #id: Snowflake; // identify

  /** the user's username, not unique across the platform */
  public username: string | undefined; // identify

  /** the user's 4-digit discord-tag */
  public discriminator: string | undefined; // identify

  /** the user's avatar hash */
  public avatar: string | null | undefined; // identify

  /** whether the user belongs to an OAuth2 application */
  public bot: boolean | undefined; // identify

  /** whether the user is an Official Discord System user (part of the urgent message system) */
  // public system: boolean | undefined; // identify

  /** whether the user has two factor enabled on their account */
  // public mfaEnabled: boolean | undefined; // identify

  /** the user's chosen language option */
  // public locale: string | undefined; // identify

  /** whether the email on this account has been verified */
  // public verified: boolean | undefined; // email

  /** the user's email */
  // public email: string | null | undefined; // email

  /** the flags on a user's account */
  // public flags: number | undefined; // identify

  /** the type of Nitro subscription on a user's account */
  // public premiumType: number | undefined; // identify

  /** the public flags on a user's account */
  public publicFlags: number | undefined; // identify

  public presence: Presence | undefined;

  public constructor(filteredProps: FilterOptions['props'] | undefined, user: RawUser) {
    this.#filteredProps = filteredProps?.user;
    this.#id = user.id;

    const now = new Date().getTime();
    this.#lastAccessed = now;

    this.initialize(user);
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
      (this.#filteredProps === undefined || 'username' in this)
      && arg.username !== this.username
    ) this.username = arg.username;
    if (
      (this.#filteredProps === undefined || 'discriminator' in this)
      && arg.discriminator !== this.discriminator
    ) this.discriminator = arg.discriminator;
    if (
      (this.#filteredProps === undefined || 'avatar' in this)
      && arg.avatar !== this.avatar
    ) this.avatar = arg.avatar;
    if (
      arg.public_flags !== undefined
      && (this.#filteredProps === undefined || 'publicFlags' in this)
    ) this.publicFlags = arg.public_flags;

    return this;
  }

  private initialize(user: RawUser): this {
    this.initializeProperties();

    if (this.#filteredProps === undefined || 'bot' in this) this.bot = !!user.bot;

    return this.update(user);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }
}
