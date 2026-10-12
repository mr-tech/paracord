import type { ApiError } from '../../src/clients/Api/types';

declare const err: ApiError;

export const { code }: { code?: number | undefined } = err;

// @ts-expect-error code is a number, so it cannot be compared with a string literal
export const comparedWithString = err.code === 'x';

export const comparedWithNumber: boolean = err.code === 404;
