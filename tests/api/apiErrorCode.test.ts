import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type { ApiError } from '../../src/clients/Api/types';

async function thrownBy(call: () => Promise<unknown>): Promise<ApiError> {
  try {
    await call();
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('the call did not reject');
}

function expectStatusCode(err: ApiError, status: number): void {
  expect(err.isApiError).toBe(true);
  expect(typeof err.code).toBe('number');
  expect(err.code).toBe(status);
  expect((err.toJSON() as { code?: number }).code).toBe(status);
}

const EXHAUSTED_BUCKET = {
  status: 200,
  headers: {
    'x-ratelimit-bucket': 'ac61-bucket', 'x-ratelimit-limit': '1', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '30',
  },
  body: {},
};

describe('AC-6.1 — an ApiError carries the response status as a number, from every createError site', () => {
  it('Api#request validateStatus: a 404 response', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse({ status: 404, body: { message: 'Unknown Channel', code: 10003 } });
    const api = await createApiAgainstOrigin(origin);

    const err = await thrownBy(() => api.request('GET', '/channels/1/messages'));
    api.end();
    await origin.close();

    expectStatusCode(err, 404);
  });

  it('Api#handleServerErrorResponse: a 500 response to a POST', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse({ status: 500, body: { message: 'boom' } });
    const api = await createApiAgainstOrigin(origin);

    const err = await thrownBy(() => api.request('POST', '/channels/1/messages', { data: { content: 'x' } }));
    api.end();
    await origin.close();

    expectStatusCode(err, 500);
  });

  it('Api#handleRateLimitResponse: a 429 response with returnOnRateLimit', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse({
      status: 429,
      headers: {
        'x-ratelimit-bucket': 'ac61-429', 'x-ratelimit-limit': '1', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '30',
      },
      body: { message: 'rate limited', retry_after: 30, global: false },
    });
    const api = await createApiAgainstOrigin(origin);

    const err = await thrownBy(() => api.request('GET', '/channels/2/messages', { returnOnRateLimit: true }));
    api.end();
    await origin.close();

    expectStatusCode(err, 429);
  });

  it('Api#sendRequest: a request refused locally while the bucket is exhausted, with returnOnRateLimit', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([EXHAUSTED_BUCKET]);
    const api = await createApiAgainstOrigin(origin);

    await api.request('GET', '/channels/3/messages');
    const err = await thrownBy(() => api.request('GET', '/channels/3/messages', { returnOnRateLimit: true }));
    const receipts = origin.requestReceipts.length;
    api.end();
    await origin.close();

    expectStatusCode(err, 429);
    expect(receipts).toBe(1);
  });

  it('on the proxy path, Api#request validateStatus over a response the proxy resolved', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse({ status: 404, body: { message: 'Unknown Channel', code: 10003 } });
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin, { requestOptions: { validateStatus: null } });
    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    const err = await thrownBy(() => api.request('GET', '/channels/4/messages'));
    api.end();
    await origin.close();
    rpc.forceClose();

    expectStatusCode(err, 404);
  });
});
