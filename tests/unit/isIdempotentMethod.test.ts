import { describe, it, expect } from 'vitest';
import isIdempotentMethod from '../../src/clients/Api/structures/isIdempotentMethod';

describe('isIdempotentMethod (WP-5 step 2, D-6)', () => {
  const IDEMPOTENT = ['get', 'head', 'options', 'put', 'delete'];
  const NOT_IDEMPOTENT = ['post', 'patch', 'purge', 'link', 'unlink'];

  it.each(IDEMPOTENT.flatMap((m) => [m, m.toUpperCase()]))('is true for %s', (method) => {
    expect(isIdempotentMethod(method)).toBe(true);
  });

  it.each(NOT_IDEMPOTENT.flatMap((m) => [m, m.toUpperCase()]))('is false for %s', (method) => {
    expect(isIdempotentMethod(method)).toBe(false);
  });
});
