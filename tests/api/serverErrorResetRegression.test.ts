import {
  describe, it, expect, afterEach,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin, type ScriptedResponse } from '../harness/loopbackApiOrigin';

import type Api from '../../src/clients/Api/Api';

/**
 * Plan 001 WP-5, AC-5.2 (i) — a regression clause over unchanged behaviour: step 2
 * rewrites the branch that carries `#informationFreeRetryCounts.delete(request)`
 * (AC-9.8's reset clause), so a 5xx between information-free 429s must still reset the
 * schedule at WP-5's tip. Landed here as a real, collected, asserting spec — the
 * predecessor instrument (`verification/001/wp9b-5xx-reset-differential.spec.ts`)
 * recorded `accepts=`/`gaps=` lines for a human to read and contained no `expect`, so
 * it could not be seen to fail (qa WP5-F3). The acceptance predicate below is WP5-F3's
 * own, re-run at this tree rather than accepted from the earlier capture.
 *
 * Bounds follow `informationFreeBackoff.test.ts` (AC-9.8)'s own form and constants,
 * restated here rather than imported from src (AC-9.5): s_n = [1000, 2000, 4000]ms,
 * one 1000ms queue tick per gap. The control arm is the positive control WP5-F3 names:
 * if it does not reach the ~4000ms family at n = 3, the instrument is not
 * discriminating on this machine and the run is void rather than a data point — the
 * same reason an arm short of its own scripted accept count is a failed run, not one.
 */
const IF: ScriptedResponse = { status: 429, headers: { 'content-type': 'application/json' }, body: { message: 'You are being rate limited.' } };
const E5: ScriptedResponse = { status: 500, headers: { 'content-type': 'application/json' }, body: { message: 'Internal Server Error' } };
const OK: ScriptedResponse = { status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } };

const TICK = 1000;
const S = [1000, 2000, 4000];
/** The floor of d_3 (~4000ms family) — the discriminating bound between "grew to n = 3" and "reset". */
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
