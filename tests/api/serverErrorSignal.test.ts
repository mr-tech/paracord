import {
  describe, it, expect,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin, type ScriptedResponse } from '../harness/loopbackApiOrigin';

import type { Method } from 'axios';

async function driveServerErrorSignal(
  origin: LoopbackApiOrigin,
  method: Method,
  withData: boolean,
): Promise<{ count: number; thrown: boolean }> {
  const api = await createApiAgainstOrigin(origin);
  let count = 0;
  api.on('SERVER_ERROR', () => { count += 1; });
  let thrown = false;
  try {
    await api.request(method, '/channels/123/messages', withData ? { data: { content: 'x' } } : {});
  } catch {
    thrown = true;
  } finally {
    api.end();
  }
  return { count, thrown };
}

describe('SERVER_ERROR event population (AC-5.5)', () => {
  it('GET x 503: exactly 2 events (the exhausting third response stays silent)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([{ status: 503 }]);
    const { count, thrown } = await driveServerErrorSignal(origin, 'GET', false);
    await origin.close();

    expect(thrown).toBe(true);
    expect(count).toBe(2);
  }, 20000);

  it('HEAD x 503: exactly 2 events', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([{ status: 503 }]);
    const { count, thrown } = await driveServerErrorSignal(origin, 'HEAD', false);
    await origin.close();

    expect(thrown).toBe(true);
    expect(count).toBe(2);
  }, 20000);

  it('POST x 503: exactly 1 event (its single response, restored by D-40)', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([{ status: 503 }]);
    const { count, thrown } = await driveServerErrorSignal(origin, 'POST', true);
    await origin.close();

    expect(thrown).toBe(true);
    expect(count).toBe(1);
  }, 20000);

  it('PATCH x 503: exactly 1 event', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([{ status: 503 }]);
    const { count, thrown } = await driveServerErrorSignal(origin, 'PATCH', true);
    await origin.close();

    expect(thrown).toBe(true);
    expect(count).toBe(1);
  }, 20000);

  it('GET x transport failure (destroy-on-accept): exactly 2 events', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDestroyOnAccept(true);
    const { count, thrown } = await driveServerErrorSignal(origin, 'GET', false);
    await origin.close();

    expect(thrown).toBe(true);
    expect(count).toBe(2);
  }, 20000);

  it('POST x transport failure (destroy-on-accept): exactly 1 event', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDestroyOnAccept(true);
    const { count, thrown } = await driveServerErrorSignal(origin, 'POST', true);
    await origin.close();

    expect(thrown).toBe(true);
    expect(count).toBe(1);
  }, 20000);

  describe('the composite member (F-70) — the count gate exhausted before this response arrives', () => {
    const RATE_LIMITED: ScriptedResponse = {
      status: 429,
      headers: {
        'x-ratelimit-limit': '5', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '0.1', 'x-ratelimit-bucket': 'wp5-step4', 'retry-after': '0.1',
      },
      body: { message: 'You are being rate limited.', retry_after: 0.1, global: false },
    };

    it('POST x two 429 re-queues then 503: exactly 0 events — attempts = 3 at the gate', async () => {
      const origin = await LoopbackApiOrigin.start();
      origin.setScript([RATE_LIMITED, RATE_LIMITED, { status: 503 }]);
      const { count, thrown } = await driveServerErrorSignal(origin, 'POST', true);
      await origin.close();

      expect(thrown).toBe(true);
      expect(count).toBe(0);
    }, 20000);
  });
});
