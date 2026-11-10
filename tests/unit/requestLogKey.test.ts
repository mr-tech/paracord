import { describe, it, expect } from 'vitest';

import Api from '../../src/clients/Api/Api';
import BaseRequest from '../../src/clients/Api/structures/BaseRequest';

function requestFor(method: 'GET' | 'POST', url: string): BaseRequest {
  const [tlr, tlrID, bucketHashKey] = Api.extractBucketHashKey(method, url);
  return new BaseRequest(method, url, tlr, tlrID, undefined, bucketHashKey);
}

describe('BaseRequest.logKey', () => {
  it('names the top-level resource once, then the method and minor parameters', () => {
    expect(requestFor('GET', '/channels/111').logKey).toBe('channels-g');
    expect(requestFor('GET', '/guilds/222/members').logKey).toBe('guilds-g-m');
    expect(requestFor('POST', '/channels/111/messages').logKey).toBe('channels-o-s');
  });
});
