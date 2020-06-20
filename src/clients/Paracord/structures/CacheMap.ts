import { FilteredProps, Resource } from '../types';
import { Snowflake, WildCardRaw } from '../../../types';

interface BaseConstructor<T extends Resource, U extends WildCardRaw> {
  new (filteredProps: FilteredProps<T, U> | undefined, value: U, ...args: unknown[]): T;
}

export default class CacheMap<T extends Resource, U extends WildCardRaw> extends Map<Snowflake, T> {
  #filteredProps: FilteredProps<T, U> | undefined;

  #ItemConstructor: BaseConstructor<T, U>;

  public constructor(ItemConstructor: BaseConstructor<T, U>, filteredProps: FilteredProps<T, U>) {
    super();
    this.#filteredProps = filteredProps;
    this.#ItemConstructor = ItemConstructor;
  }

  public get filteredProps(): FilteredProps<T, U> | undefined {
    return this.#filteredProps;
  }

  add(id: Snowflake, value: U, ...args: unknown[]): T {
    const item = new this.#ItemConstructor(this.#filteredProps, value, ...args);
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
