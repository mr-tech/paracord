import { timestampFromSnowflake } from '../../../../../utils';

import type { User as RawUser, Snowflake, UserFlags } from '../../../../../types';
import type Paracord from '../../..';
import type { FilterOptions } from '../../../types';
import type Presence from './Presence';

let nextCacheCheckOffset = 0;

export default class User {
  #client: Paracord;

  #filteredProps: FilterOptions['props']['user'] | undefined;

  #lastAccessed: number;

  /** how many guilds in this client that this user belongs to (might deprecate) */
  #guildCount: number;

  /** how many "active objects" (presences, voice states, guild owner) in this client that this user is referenced by. */
  #activeReferenceCount: number;

  public presence: Presence | undefined;

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
  // system?: boolean; // identify

  /** whether the user has two factor enabled on their account */
  // mfa_enabled?: boolean; // identify

  /** the user's banner hash */
  // banner?: string | null; // identify

  /** the user's banner color encoded as an integer representation of hexadecimal color code */
  // accent_color?: number | null; // identify

  /** the user's chosen language option */
  // locale?: string; // identify

  /** whether the email on this account has been verified */
  // verified?: boolean; // email

  /** the user's email */
  // email?: string | null; // email

  /** the flags on a user's account */
  public flags: UserFlags | undefined; // identify

  /** the type of Nitro subscription on a user's account */
  public premiumType: number | undefined; // identify

  /** the public flags on a user's account */
  public publicFlags: number | undefined; // identify

  public constructor(filteredProps: FilterOptions['props'] | undefined, user: RawUser, client: Paracord) {
    this.#client = client;
    this.#filteredProps = filteredProps?.user;
    this.#id = user.id;
    this.#guildCount = 0;
    this.#activeReferenceCount = 0;
    nextCacheCheckOffset += 10;
    if (nextCacheCheckOffset >= 60) {
      nextCacheCheckOffset = 0;
    }

    const now = new Date().getTime();
    this.#lastAccessed = now;

    this.initialize(user);
  }

  public get guildCount(): number {
    return this.#guildCount;
  }

  public get activeReferenceCount(): number {
    return this.#activeReferenceCount;
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number {
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

  public incrementGuildCount(): void {
    this.#guildCount++;
  }

  public decrementGuildCount(): void {
    this.#guildCount--;
  }

  public incrementActiveReferenceCount(): void {
    this.#activeReferenceCount++;
  }

  public decrementActiveReferenceCount(): void {
    if (--this.#activeReferenceCount === 0 && !this.bot) this.#client.removeUserWithNoReferences(this);
  }

  public resetActiveReferenceCount(): void {
    this.#activeReferenceCount = 0;
  }
}
