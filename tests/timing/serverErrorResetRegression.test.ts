import {
  describe, it, expect, afterEach,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin, type ScriptedResponse } from '../harness/loopbackApiOrigin';

import type Api from '../../src/clients/Api/Api';

const IF: ScriptedResponse = { status: 429, headers: { 'content-type': 'application/json' }, body: { message: 'You are being rate limited.' } };
const E5: ScriptedResponse = { status: 500, headers: { 'content-type': 'application/json' }, body: { message: 'Internal Server Error' } };
const OK: ScriptedResponse = { status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } };

const TICK = 1000;
const S = [1000, 2000, 4000];
const D3_FLOOR = 0.8 * S[2]!;

describe('5xx resets the information-free 429 schedule at WP-5\'s tip (AC-5.2 (i))', () => {
  let origin: LoopbackApiOrigin | undefined;
  let api: Api | undefined;

  afterEach(async () => {
    api?.end();
    await origin?.close();
    origin = undefined;
    api = undefined;
  });

  const runControl = async (): Promise<number> => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([IF, IF, IF, IF, OK]);
    api = await createApiAgainstOrigin(origin);
    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);
    await origin.waitForAccept(4, 30000);
    expect(origin.requestCount).toHaveLength(4);
    const t = origin.requestCount;
    const thirdGap = t[3]! - t[2]!;
    api.end();
    await origin.close();
    origin = undefined;
    api = undefined;
    return thirdGap;
  };

  const runTreatment = async (): Promise<number> => {
    origin = await LoopbackApiOrigin.start();
    origin.setScript([IF, E5, IF, IF, IF, OK]);
    api = await createApiAgainstOrigin(origin);
    void api.request('GET', '/channels/1', { local: true }).catch(() => undefined);
    await origin.waitForAccept(5, 30000);
    expect(origin.requestCount).toHaveLength(5);
    const t = origin.requestCount;
    const finalGap = t[4]! - t[3]!;
    api.end();
    await origin.close();
    origin = undefined;
    api = undefined;
    return finalGap;
  };

  it('control x3: reaches the ~4000ms family at n = 3 (positive control)', async () => {
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const thirdGap = await runControl();
      expect(thirdGap, `control run ${i + 1}`).toBeGreaterThanOrEqual(D3_FLOOR);
      expect(thirdGap, `control run ${i + 1}`).toBeLessThanOrEqual(1.2 * S[2]! + TICK);
    }
  }, 120000);

  it('treatment x3: a 5xx resets the schedule — the final gap stays outside the ~4000ms family', async () => {
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const finalGap = await runTreatment();
      expect(finalGap, `treatment run ${i + 1}`).toBeLessThan(D3_FLOOR);
    }
  }, 120000);
});
