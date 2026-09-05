import {
  describe, it, expect, vi,
} from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';

import type { Method } from 'axios';
import type Api from '../../src/clients/Api/Api';

/**
 * Plan 001 WP-5, AC-5.1: a transport failure (no response at all) surfaces the real
 * underlying message and gets the attempt count D-6 assigns to its method — same as a
 * 5xx response, since both take `Api`'s response-interceptor error branch and the same
 * `handleServerErrorResponse` gate. Instrument: the origin's **connection count**
 * (`tests/README.md`) — the only count destroy-on-accept mode can feed.
 */
const IDEMPOTENT_SPELLINGS: Method[] = ['GET', 'get', 'HEAD', 'head', 'OPTIONS', 'options', 'PUT', 'put', 'DELETE', 'delete'];
const NON_IDEMPOTENT_SPELLINGS: Method[] = ['POST', 'post', 'PATCH', 'patch'];
const BODY_CARRYING = new Set<Method>(['PUT', 'put', 'DELETE', 'delete', 'POST', 'post', 'PATCH', 'patch']);

async function driveDestroyOnAccept(spelling: Method): Promise<{ thrown: Error | undefined; connectionCount: number }> {
  const origin = await LoopbackApiOrigin.start();
  origin.setDestroyOnAccept(true);
  const api = await createApiAgainstOrigin(origin);
  let thrown: Error | undefined;
  try {
    await api.request(spelling, '/channels/123/messages', BODY_CARRYING.has(spelling) ? { data: { content: 'x' } } : {});
  } catch (err) {
    thrown = err as Error;
  } finally {
    api.end();
  }
  const { connectionCount } = origin;
  await origin.close();
  return { thrown, connectionCount };
}

/** Points `Api` at an arbitrary base URL — no `LoopbackApiOrigin` needed for a dead port or bad host. */
async function apiAgainstUrl(baseUrl: string): Promise<Api> {
  vi.resetModules();
  vi.doMock('../../src/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/constants')>();
    return { ...actual, DISCORD_API_URL: baseUrl };
  });
  const { default: ApiCtor } = await import('../../src/clients/Api/Api');
  return new ApiCtor('test-token', {});
}

describe('Api transport-failure retry (AC-5.1)', () => {
  const CELLS: Array<readonly [Method, boolean]> = [
    ...IDEMPOTENT_SPELLINGS.map((m) => [m, true] as const),
    ...NON_IDEMPOTENT_SPELLINGS.map((m) => [m, false] as const),
  ];

  describe.each(CELLS)('%s', (spelling, idempotent) => {
    it(`carries the real transport message and gets ${idempotent ? '3' : '1'} attempt(s)`, async () => {
      const { thrown, connectionCount } = await driveDestroyOnAccept(spelling);
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown?.message).not.toBe('');
      expect(thrown?.message).toContain('socket hang up');
      expect(connectionCount).toBe(idempotent ? 3 : 1);
    }, 20000);
  });

  it.each(['GET', 'POST'] as Method[])('%s against a refused connection: message contains the run\'s own port', async (spelling) => {
    const dead = await LoopbackApiOrigin.start();
    const deadUrl = `${dead.url}/api`;
    await dead.close();

    const api = await apiAgainstUrl(deadUrl);
    let thrown: Error | undefined;
    try {
      await api.request(spelling, '/channels/123/messages', spelling === 'POST' ? { data: { content: 'x' } } : {});
    } catch (err) {
      thrown = err as Error;
    } finally {
      api.end();
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).not.toBe('');
    expect(thrown?.message).toContain('ECONNREFUSED');
    expect(thrown?.message).toContain(String(new URL(deadUrl).port));
  }, 20000);

  it.each(['GET', 'POST'] as Method[])('%s against an unresolvable host: message contains the hostname', async (spelling) => {
    const host = 'paracord-wp5-nonexistent.invalid';
    const api = await apiAgainstUrl(`http://${host}/api`);
    let thrown: Error | undefined;
    try {
      await api.request(spelling, '/channels/123/messages', spelling === 'POST' ? { data: { content: 'x' } } : {});
    } catch (err) {
      thrown = err as Error;
    } finally {
      api.end();
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).not.toBe('');
    expect(thrown?.message).toContain(host);
  }, 20000);
});
