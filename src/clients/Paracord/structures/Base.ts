import { RawWildCard } from '../../../types';
import { snakeToCamel } from '../../../utils';
import { DiscordTypes, FilteredProps } from '../types';


export default class Base<T extends DiscordTypes, U extends RawWildCard> {
  #filteredProps: FilteredProps<T, U> | undefined;

  public constructor(filteredProps: FilteredProps<T, U> | undefined) {
    this.#filteredProps = filteredProps;

    if (filteredProps !== undefined) {
      this.initializeProperties(filteredProps);
    }
  }

  public update(newObj: U): this {
    let i = 0;
    for (const [key, newValue] of Object.entries(newObj)) {
      if (this.#filteredProps?.includes(key) ?? true) {
        this._update(key, newValue);

        if (++i === (this.#filteredProps?.length ?? -1)) {
          break;
        }
      }
    }

    return this;
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
      // TODO deep compare
      (<Record<string, unknown>> this)[camelKey] = newValue;
    }
  }
}
