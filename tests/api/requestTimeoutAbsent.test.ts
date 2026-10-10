import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';

import type { Method } from 'axios';
import type { RequestOptions } from '../../src/clients/Api/types';

const SHORT_TIMEOUT_MS = 300;
const ORIGIN_DELAY_MS = 3 * SHORT_TIMEOUT_MS;
const SETTLE_GUARD_MS = 8000;

interface Cell {
  label: string;
  clientDefault: RequestOptions;
  perRequest: RequestOptions;
}

const CELLS: Cell[] = [
  { label: 'no timeout anywhere', clientDefault: {}, perRequest: {} },
  { label: 'client default 0', clientDefault: { timeout: 0 }, perRequest: {} },
  { label: 'per-request 0, no client default', clientDefault: {}, perRequest: { timeout: 0 } },
  { label: 'per-request 0 over a non-zero client default', clientDefault: { timeout: SHORT_TIMEOUT_MS }, perRequest: { timeout: 0 } },
];

const METHODS: Method[] = ['GET', 'POST'];

describe('AC-2.3 — an absent or zero resolved timeout changes nothing about request timing', () => {
  describe.each(CELLS)('$label', ({ clientDefault, perRequest }) => {
    it.each(METHODS)('%s against an origin that answers after three times the short timeout: succeeds on one send', async (method) => {
      const origin = await LoopbackApiOrigin.start();
      origin.setDefaultResponse({ status: 200, body: { ok: true }, delayMs: ORIGIN_DELAY_MS });
      const api = await createApiAgainstOrigin(origin, 'test-token', { requestOptions: clientDefault });

      const body = method === 'POST' ? { data: { content: 'x' } } : {};
      const guard = new Promise<'hung'>((resolve) => { setTimeout(() => resolve('hung'), SETTLE_GUARD_MS).unref(); });
      const outcome = await Promise.race([
        api.request(method, '/channels/123/messages', { ...body, ...perRequest }).then((res) => res.status, (err: { response?: { status?: number } }) => `rejected ${err.response?.status}`),
        guard,
      ]);
      const receipts = origin.requestReceipts.length;

      api.end();
      await origin.close();

      expect(outcome).toBe(200);
      expect(receipts).toBe(1);
    });
  });
});
