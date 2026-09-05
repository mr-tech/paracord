import { describe, it, expect } from 'vitest';
import isServerErrorResponse from '../../src/clients/Api/structures/isServerErrorResponse';

/**
 * Plan 001 WP-5 step 2 (qa WP5-F1 route 1): the status half of the compound retry
 * predicate, moved into a sibling `structures/` module so the full 500..599 domain is a
 * form (a) unit test rather than 100 socket-driven cells. Range is the criterion's own
 * (AC-5.2), restated here rather than read from the code: 500..599 members, 499 and 600
 * the two boundary non-members.
 */
describe('isServerErrorResponse (WP-5 step 2)', () => {
  it('is true for every status 500..599', () => {
    for (let status = 500; status <= 599; status += 1) {
      expect(isServerErrorResponse(status)).toBe(true);
    }
  });

  it('is false for 499, the lower boundary non-member', () => {
    expect(isServerErrorResponse(499)).toBe(false);
  });

  it('is false for 600, the upper boundary non-member', () => {
    expect(isServerErrorResponse(600)).toBe(false);
  });

  it('is false for a 2xx and a 4xx status', () => {
    expect(isServerErrorResponse(200)).toBe(false);
    expect(isServerErrorResponse(400)).toBe(false);
  });
});
