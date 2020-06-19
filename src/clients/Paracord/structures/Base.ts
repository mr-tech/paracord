import { snakeToCamel } from '../../../utils';
import { FilteredProps } from '../types';

export default class Base {
  #filteredProps: Partial<FilteredProps> | undefined;

  constructor(filteredProps?: Partial<FilteredProps>) {
    this.#filteredProps = filteredProps;
  }

  protected update(newObj: Record<string, unknown>): void {
    let i = 0;
    for (const [key, newValue] of Object.entries(newObj)) {
      if (this.#filteredProps?.props?.includes(key) ?? true) {
        const camelKey = snakeToCamel(key);
        const curValue = (<Record<string, unknown>> this)[camelKey];
        if (curValue instanceof Base) {
          if (typeof newValue === 'object' && newValue?.constructor.name === 'Object') {
            curValue.update(<Record<string, unknown>>newValue);
          }
        } else if (curValue !== newValue) { // don't throw away good strings
        // deep compare
          (<Record<string, unknown>> this)[camelKey] = newValue;
        }

        if (++i === this.#filteredProps?.props?.length) {
          break;
        }
      }
    }
  }
}
