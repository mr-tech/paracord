import {
  describe, it, expect,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin, type ScriptedResponse } from '../harness/loopbackApiOrigin';

import type { Method } from 'axios';

/**
 * Plan 001 WP-5, AC-5.2: the compound retry predicate — status in 500..599 **and**
 * method not idempotent — decides whether a 5xx response is retried. The status half's
 * full domain (500..599, 499, 600) is a form (a) unit test
 * (`tests/unit/isServerErrorResponse.test.ts`); this file drives the method class and
 * the conjunct/independence checks at the socket, per qa's decomposition (WP5-F1 route
 * 1) — each conjunct is the sole carrier of the decision in at least one fixture here.
 * Instrument: the origin's **request receipts**, never the connection count (WP5-F6).
 */
const IDEMPOTENT_SPELLINGS: Method[] = ['GET', 'get', 'HEAD', 'head', 'OPTIONS', 'options', 'PUT', 'put', 'DELETE', 'delete'];
const NON_IDEMPOTENT_SPELLINGS: Method[] = ['POST', 'post', 'PATCH', 'patch'];
const BODY_CARRYING: Method[] = ['PUT', 'put', 'POST', 'post', 'PATCH', 'patch'];

async function drive(
  origin: LoopbackApiOrigin,
  method: Method,
  withData: boolean,
): Promise<{ thrown: (Error & { code?: number }) | undefined; resolved: boolean }> {
  const api = await createApiAgainstOrigin(origin);
  let thrown: (Error & { code?: number }) | undefined;
  let resolved = false;
  try {
    await api.request(method, '/channels/123/messages', withData ? { data: { content: `x-${method}` } } : {});
    resolved = true;
  } catch (err) {
    thrown = err as Error & { code?: number };
  } finally {
    api.end();
  }
  return { thrown, resolved };
}

describe('Api 5xx retry, method class (AC-5.2)', () => {
  const CELLS: Array<readonly [Method, boolean]> = [
    ...IDEMPOTENT_SPELLINGS.map((m) => [m, true] as const),
    ...NON_IDEMPOTENT_SPELLINGS.map((m) => [m, false] as const),
  ];

  describe.each(CELLS)('%s x 503', (spelling, idempotent) => {
    it(`reaches the origin ${idempotent ? '3' : '1'} time(s)`, async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status: 503 }]);
      const { thrown } = await drive(origin, spelling, BODY_CARRYING.includes(spelling));
      await origin.close();

      expect(thrown?.code).toBe(503);
      expect(origin.requestReceipts).toHaveLength(idempotent ? 3 : 1);
    }, 20000);
  });

  describe.each([500, 599])('status %i x {GET, POST} — the independence cross-check', (status) => {
    it('GET reaches the origin 3 times', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status }]);
      const { thrown } = await drive(origin, 'GET', false);
      await origin.close();

      expect(thrown?.code).toBe(status);
      expect(origin.requestReceipts).toHaveLength(3);
    }, 20000);

    it('POST reaches the origin 1 time', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status }]);
      const { thrown } = await drive(origin, 'POST', true);
      await origin.close();

      expect(thrown?.code).toBe(status);
      expect(origin.requestReceipts).toHaveLength(1);
    }, 20000);
  });

  describe('the 2x2 conjunct matrix — each conjunct alone decides in one cell', () => {
    it('GET x 400 (non-member x idempotent): 1 receipt — status conjunct alone decides', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status: 400, body: { message: 'bad request' } }]);
      const { thrown } = await drive(origin, 'GET', false);
      await origin.close();

      expect(thrown?.code).toBe(400);
      expect(origin.requestReceipts).toHaveLength(1);
    }, 20000);

    it('POST x 400 (non-member x non-idempotent): 1 receipt, neither conjunct true', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status: 400, body: { message: 'bad request' } }]);
      const { thrown } = await drive(origin, 'POST', true);
      await origin.close();

      expect(thrown?.code).toBe(400);
      expect(origin.requestReceipts).toHaveLength(1);
    }, 20000);

    it('POST x 200 (2xx x non-idempotent): resolves, 1 receipt', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status: 200, body: { ok: true } }]);
      const { thrown, resolved } = await drive(origin, 'POST', true);
      await origin.close();

      expect(thrown).toBeUndefined();
      expect(resolved).toBe(true);
      expect(origin.requestReceipts).toHaveLength(1);
    }, 20000);
  });

  describe("AC-5.2 (ii) control — a 429 is outside this class, unchanged by WP-5", () => {
    const RATE_LIMITED: ScriptedResponse = {
      status: 429,
      headers: {
        'x-ratelimit-limit': '5', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '0.1', 'x-ratelimit-bucket': 'wp5-control', 'retry-after': '0.1',
      },
      body: { message: 'You are being rate limited.', retry_after: 0.1, global: false },
    };
    const OK: ScriptedResponse = { status: 200, body: { ok: true } };

    it('a 429 re-queues a POST and re-sends its body, then resolves', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([RATE_LIMITED, OK]);
      const { thrown, resolved } = await drive(origin, 'POST', true);
      await origin.close();

      expect(thrown).toBeUndefined();
      expect(resolved).toBe(true);
      expect(origin.requestReceipts).toHaveLength(2);
      expect(origin.requestReceipts.every((r) => r.bodyReceived)).toBe(true);
    }, 20000);
  });

  describe('body agreement — the six body-carrying spellings', () => {
    it.each(BODY_CARRYING)('%s: every receipt carries the body sent', async (spelling) => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status: 200, body: { ok: true } }]);
      const { resolved } = await drive(origin, spelling, true);
      await origin.close();

      expect(resolved).toBe(true);
      expect(origin.requestReceipts).toHaveLength(1);
      expect(origin.requestReceipts[0]?.bodyReceived).toBe(true);
      expect(origin.requestReceipts[0]?.body).toContain(`x-${spelling}`);
    }, 20000);

    it("DELETE's body is stripped client-side — never in this class's domain", async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([{ status: 200, body: { ok: true } }]);
      const { resolved } = await drive(origin, 'DELETE', true);
      await origin.close();

      expect(resolved).toBe(true);
      expect(origin.requestReceipts[0]?.bodyReceived).toBe(false);
    }, 20000);
  });
});
