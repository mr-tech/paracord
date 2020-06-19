import { FilteredProps } from '../types';
export default class Base {
    #private;
    constructor(filteredProps?: Partial<FilteredProps>);
    protected update(newObj: Record<string, unknown>): void;
    isCached(prop: string): boolean;
    isInProps(prop: string): boolean;
}
