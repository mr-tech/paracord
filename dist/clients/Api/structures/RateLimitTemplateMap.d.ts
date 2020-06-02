import { RateLimitHeaders } from '.';
import RateLimit from './RateLimit';
import RateLimitTemplate from './RateLimitTemplate';
declare const _default: {
    new (entries?: readonly (readonly [string, RateLimitTemplate])[] | null | undefined): {
        upsert(bucket: string, state: RateLimitHeaders): RateLimitTemplate;
        createAssumedRateLimit(bucket: string): RateLimit | undefined;
        clear(): void;
        delete(key: string): boolean;
        forEach(callbackfn: (value: RateLimitTemplate, key: string, map: Map<string, RateLimitTemplate>) => void, thisArg?: any): void;
        get(key: string): RateLimitTemplate | undefined;
        has(key: string): boolean;
        set(key: string, value: RateLimitTemplate): any;
        readonly size: number;
        [Symbol.iterator](): IterableIterator<[string, RateLimitTemplate]>;
        entries(): IterableIterator<[string, RateLimitTemplate]>;
        keys(): IterableIterator<string>;
        values(): IterableIterator<RateLimitTemplate>;
        readonly [Symbol.toStringTag]: string;
    };
    new (iterable: Iterable<readonly [string, RateLimitTemplate]>): {
        upsert(bucket: string, state: RateLimitHeaders): RateLimitTemplate;
        createAssumedRateLimit(bucket: string): RateLimit | undefined;
        clear(): void;
        delete(key: string): boolean;
        forEach(callbackfn: (value: RateLimitTemplate, key: string, map: Map<string, RateLimitTemplate>) => void, thisArg?: any): void;
        get(key: string): RateLimitTemplate | undefined;
        has(key: string): boolean;
        set(key: string, value: RateLimitTemplate): any;
        readonly size: number;
        [Symbol.iterator](): IterableIterator<[string, RateLimitTemplate]>;
        entries(): IterableIterator<[string, RateLimitTemplate]>;
        keys(): IterableIterator<string>;
        values(): IterableIterator<RateLimitTemplate>;
        readonly [Symbol.toStringTag]: string;
    };
    readonly [Symbol.species]: MapConstructor;
};
export = _default;
