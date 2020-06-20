import { FilteredProps, GuildTypes as GuildType } from '../types';
import { Snowflake, WildCardRaw } from '../../../types';

interface BaseConstructor<T> {
  new (value: unknown, filteredProps: Partial<FilteredProps<T>> | undefined, ...args: unknown[]): T;
}

export default class CacheMap<T extends GuildType> extends Map<Snowflake, T> {
  #filteredProps: Partial<FilteredProps<T>> | undefined;

  #ItemConstructor: BaseConstructor<T>;

  public constructor(ItemConstructor: BaseConstructor<T>, filteredProps: Partial<FilteredProps<T>>) {
    super();
    this.#filteredProps = Object.freeze(filteredProps);
    this.#ItemConstructor = ItemConstructor;
  }

  public get filteredProps(): Partial<FilteredProps<T>> | undefined {
    return this.#filteredProps;
  }

  add(id: Snowflake, value: WildCardRaw, ...args: unknown[]): T {
    const item = new this.#ItemConstructor(value, this.#filteredProps, ...args);
    this.set(id, item);
    return item;
  }

  set(key: string, value: T): this {
    value.refreshLastAccessed();
    return super.set(key, value);
  }

  get(key: string): T | undefined {
    const item = super.get(key);
    if (item !== undefined) {
      item.refreshLastAccessed();
    }
    return item;
  }
}
