import { Snowflake } from '../../../types';
import { timestampFromSnowflake } from '../../../utils';
import { DiscordResource, FilteredProps } from '../types';
import Base from './Base';

export default class Resource<T extends DiscordResource, U> extends Base<T, U> {
  #id: Snowflake;

  #lastAccessed: number;

  #cachedTimestamp: number;

  public constructor(filteredProps: FilteredProps<T, U> | undefined, id: Snowflake) {
    super(filteredProps);
    const now = new Date().getTime();
    this.#id = id;
    this.#lastAccessed = now;
    this.#cachedTimestamp = now;
  }

  public get lastAccessed(): number {
    return this.#lastAccessed;
  }

  public get cachedTimestamp(): number {
    return this.#cachedTimestamp;
  }

  public set id(value: Snowflake) {
    this.#id = value;
  }

  public get id(): Snowflake {
    return this.#id;
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number | undefined {
    return timestampFromSnowflake(this.#id);
  }

  public refreshLastAccessed(): void {
    this.#lastAccessed = new Date().getTime();
  }
}
