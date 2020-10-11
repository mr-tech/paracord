import { RawWildCard, Snowflake } from '../../../types';
import { DiscordResource, FilterOptions } from '../types';

interface BaseConstructor<T extends DiscordResource, U extends RawWildCard> {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  new (filteredProps: FilterOptions['props'] | undefined, value: U, ...args: any[]): T;
}

export default class CacheMap<T extends DiscordResource, U extends RawWildCard> extends Map<Snowflake, T> {
  #filteredProps: FilterOptions['props'] | undefined;

  #ItemConstructor: BaseConstructor<T, U>;

  public constructor(ItemConstructor: BaseConstructor<T, U>, filteredProps: FilterOptions['props'] | undefined) {
    super();
    this.#ItemConstructor = ItemConstructor;
    this.#filteredProps = filteredProps;
  }

  public get filteredProps(): FilterOptions['props'] | undefined {
    return this.#filteredProps;
  }

  add(id: Snowflake, value: U, ...args: unknown[]): T {
    const item = new this.#ItemConstructor(this.#filteredProps, value, ...args);
    this.set(id, item);
    return item;
  }

  set(id: Snowflake, value: T): this {
    return super.set(id, value);
  }

  get(id: Snowflake): T | undefined {
    const item = super.get(id);
    // if (item !== undefined) {
    //   item.refreshLastAccessed();
    // }
    return item;
  }
}
