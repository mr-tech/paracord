import Paracord from '../../src/clients/Paracord/Paracord';
import type { ParacordOptions } from '../../src/clients/Paracord/types';

export function createTestBot(wsUrl: string, overrides: Partial<ParacordOptions> = {}): Paracord {
  return new Paracord('harness.token.value', {
    gatewayOptions: { wsUrl, wsParams: { v: '10', encoding: 'json' } },
    ...overrides,
  });
}
