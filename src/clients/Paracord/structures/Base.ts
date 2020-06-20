import { snakeToCamel } from '../../../utils';
import { FilteredProps, Resource } from '../types';
import { WildCardRaw } from '../../../types';

export default class Base<T extends Resource, U extends WildCardRaw> {
  #filteredProps: FilteredProps<T, U> | undefined;

  #lastAccessed: number;

  #cachedTimestamp: number;

  public constructor(filteredProps: FilteredProps<T, U> | undefined) {
    this.#filteredProps = filteredProps;
    const now = new Date().getTime();
    this.#lastAccessed = now;
    this.#cachedTimestamp = now;

    if (filteredProps !== undefined) {
      this.initializeProperties(filteredProps);
    }
  }

  public get lastAccessed(): number {
    return this.#lastAccessed;
  }

  public get cachedTimestamp(): number {
    return this.#cachedTimestamp;
  }

  public refreshLastAccessed(): void {
    this.#lastAccessed = new Date().getTime();
  }

  public update(newObj: U): void {
    let i = 0;
    for (const [key, newValue] of Object.entries(newObj)) {
      if (this.#filteredProps?.includes(key) ?? true) {
        this._update(key, newValue);

        if (++i === (this.#filteredProps?.length ?? -1)) {
          break;
        }
      }
    }
  }

  private initializeProperties(filteredProps: FilteredProps<T, U>): void {
    filteredProps.forEach((prop) => {
      if (!Object.prototype.hasOwnProperty.call(this, prop)) {
        (<Record<string, unknown>> this)[prop] = undefined;
      }
    });
  }

  private _update(key: string, newValue: unknown): void {
    const camelKey = snakeToCamel(key);
    const curValue = (<Record<string, unknown>> this)[camelKey];
    if (curValue instanceof Base) {
      curValue.update(<U>newValue);
    } else if (curValue !== newValue) { // don't throw away good strings
    // deep compare
      (<Record<string, unknown>> this)[camelKey] = newValue;
    }
  }
}
