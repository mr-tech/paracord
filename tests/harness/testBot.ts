import Paracord from '../../src/clients/Paracord/Paracord';
import type { ParacordOptions } from '../../src/clients/Paracord/types';

/** A `Paracord` instance pointed at a loopback gateway server, for harness tests only. */
export function createTestBot(wsUrl: string, overrides: Partial<ParacordOptions> = {}): Paracord {
  return new Paracord('harness.token.value', {
    gatewayOptions: { wsUrl, wsParams: { v: '10', encoding: 'json' } },
    ...overrides,
  });
}
