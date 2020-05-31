import RateLimitTemplate from './RateLimitTemplate';
import { RateLimit, RateLimitHeaders } from '.';
declare const _default: {
    new (): {
        upsert(state: RateLimitHeaders): RateLimitTemplate;
        createAssumedRateLimit(bucket: string): RateLimit | undefined;
        clear(): void;
        delete(key: any): boolean;
        forEach(callbackfn: (value: any, key: any, map: Map<any, any>) => void, thisArg?: any): void;
        get(key: any): any;
        has(key: any): boolean;
        set(key: any, value: any): any;
        readonly size: number;
        [Symbol.iterator](): IterableIterator<[any, any]>;
        entries(): IterableIterator<[any, any]>;
        keys(): IterableIterator<any>;
        values(): IterableIterator<any>;
        readonly [Symbol.toStringTag]: string;
    };
    readonly [Symbol.species]: MapConstructor;
};
export = _default;
