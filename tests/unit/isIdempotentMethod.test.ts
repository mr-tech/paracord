import { describe, it, expect } from 'vitest';
import isIdempotentMethod from '../../src/clients/Api/structures/isIdempotentMethod';

/**
 * Plan 001 WP-5 step 2 (D-6, restated here rather than read from the code): the method
 * half of the compound retry predicate. GET, HEAD, OPTIONS, PUT, DELETE keep the 5xx/
 * transport retry's 3 attempts; every other method axios's `Method` type admits —
 * POST, PATCH, and the PURGE/LINK/UNLINK residue D-6's *only* covers — gets 1. Exercised
 * over all 20 spellings (10 methods x 2 cases) so the spelling dimension is real.
 */
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
