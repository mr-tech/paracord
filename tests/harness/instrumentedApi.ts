import { vi } from 'vitest';

import type LoopbackApiOrigin from './loopbackApiOrigin';
import type Api from '../../src/clients/Api/Api';
import type { ApiOptions } from '../../src/clients/Api/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Counts { constructed: number; closed: number; services: any[] }

export async function createInstrumentedApi(origin: LoopbackApiOrigin, counts: Counts, options: ApiOptions = {}): Promise<Api> {
  vi.resetModules();
  vi.doMock('../../src/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/constants')>();
    return { ...actual, DISCORD_API_URL: `${origin.url}/api` };
  });
  vi.doMock('../../src/rpc', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/rpc')>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countClose = (create: (opts: any) => any) => (opts: any) => {
      const service = create(opts);
      counts.constructed += 1;
      counts.services.push(service);
      const originalClose = service.close.bind(service);
      service.close = () => {
        counts.closed += 1;
        originalClose();
      };
      return service;
    };
    return {
      ...actual,
      createRateLimitService: countClose(actual.createRateLimitService),
      createRequestService: countClose(actual.createRequestService),
    };
  });

  const { default: ApiCtor } = await import('../../src/clients/Api/Api');
  return new ApiCtor('test-token', options);
}
